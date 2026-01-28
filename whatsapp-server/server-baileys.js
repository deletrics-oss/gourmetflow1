require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.BAILEYS_PORT || 3089;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ============================================
// JSON FILE DATABASE
// ============================================
const DB_PATH = path.join(__dirname, 'database-baileys.json');

function loadDB() {
    try {
        if (fs.existsSync(DB_PATH)) {
            return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        }
    } catch (e) {
        console.error('Error loading database:', e);
    }
    return {
        devices: [],
        conversations: [],
        messages: [],
        broadcasts: [],
        logics: [],
        templates: []
    };
}

function saveDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error saving database:', e);
    }
}

let db = loadDB();

// Helper functions
function findById(collection, id) {
    return db[collection].find(item => item.id === id);
}

function findWhere(collection, predicate) {
    return db[collection].find(predicate);
}

function filterWhere(collection, predicate) {
    return db[collection].filter(predicate);
}

function insertItem(collection, item) {
    db[collection].push(item);
    saveDB(db);
    return item;
}

function updateItem(collection, id, updates) {
    const index = db[collection].findIndex(item => item.id === id);
    if (index !== -1) {
        db[collection][index] = { ...db[collection][index], ...updates };
        saveDB(db);
        return db[collection][index];
    }
    return null;
}

function deleteItem(collection, id) {
    const index = db[collection].findIndex(item => item.id === id);
    if (index !== -1) {
        db[collection].splice(index, 1);
        saveDB(db);
        return true;
    }
    return false;
}

// ============================================
// BAILEYS SESSION MANAGEMENT
// ============================================
const sessions = new Map();
const AUTH_DIR = path.join(__dirname, '.baileys_auth');

if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
}

async function createBaileysSession(deviceId) {
    const sessionDir = path.join(AUTH_DIR, deviceId);

    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const sessionData = {
        socket: null,
        status: 'disconnected',
        qrCode: null,
        phoneNumber: null,
        saveCreds
    };

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['GourmetFlow', 'Chrome', '120.0.0'],
        generateHighQualityLinkPreview: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log(`[${deviceId}] QR Code received`);
            try {
                const qrDataUrl = await QRCode.toDataURL(qr);
                sessionData.qrCode = qrDataUrl;
                sessionData.status = 'qr_ready';
                updateItem('devices', deviceId, { connectionStatus: 'qr_ready' });
            } catch (err) {
                console.error('Error generating QR:', err);
            }
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`[${deviceId}] Connection closed. Reconnect: ${shouldReconnect}`);

            sessionData.status = 'disconnected';
            sessionData.qrCode = null;
            updateItem('devices', deviceId, { connectionStatus: 'disconnected' });

            if (shouldReconnect) {
                setTimeout(() => {
                    console.log(`[${deviceId}] Attempting reconnection...`);
                    createBaileysSession(deviceId);
                }, 5000);
            }
        } else if (connection === 'open') {
            console.log(`[${deviceId}] Connected!`);
            sessionData.status = 'connected';
            sessionData.qrCode = null;
            sessionData.phoneNumber = sock.user?.id?.split(':')[0] || null;
            updateItem('devices', deviceId, {
                connectionStatus: 'connected',
                phoneNumber: sessionData.phoneNumber
            });
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            if (msg.key.fromMe) continue;

            const phone = msg.key.remoteJid?.replace('@s.whatsapp.net', '');
            if (!phone || phone.includes('@g.us')) continue; // Ignore groups

            const content = msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text ||
                '[Media]';

            console.log(`[${deviceId}] Message from ${phone}: ${content}`);
            await handleIncomingMessage(deviceId, phone, content, msg.pushName || phone);
        }
    });

    sessionData.socket = sock;
    sessions.set(deviceId, sessionData);

    return sessionData;
}

async function handleIncomingMessage(deviceId, phone, content, contactName) {
    // Find or create conversation
    let conversation = findWhere('conversations', c => c.deviceId === deviceId && c.contactPhone === phone);

    if (!conversation) {
        const conversationId = uuidv4();
        conversation = insertItem('conversations', {
            id: conversationId,
            deviceId,
            contactName,
            contactPhone: phone,
            contactProfilePic: null,
            lastMessageAt: new Date().toISOString(),
            unreadCount: 1,
            isPaused: 0
        });
    } else {
        updateItem('conversations', conversation.id, {
            lastMessageAt: new Date().toISOString(),
            unreadCount: (conversation.unreadCount || 0) + 1,
            contactName
        });
    }

    // Save message
    const messageId = uuidv4();
    insertItem('messages', {
        id: messageId,
        conversationId: conversation.id,
        content,
        direction: 'incoming',
        timestamp: new Date().toISOString(),
        mediaUrl: null,
        mediaType: null,
        isFromBot: 0
    });

    // Check for active logic and auto-respond
    const device = findById('devices', deviceId);
    if (device?.activeLogicId) {
        const logic = findWhere('logics', l => l.id === device.activeLogicId && l.isActive);
        if (logic) {
            const response = await generateBotResponse(content, logic);
            if (response) {
                const session = sessions.get(deviceId);
                if (session?.socket) {
                    await session.socket.sendMessage(`${phone}@s.whatsapp.net`, { text: response });

                    // Save bot response
                    const botMsgId = uuidv4();
                    insertItem('messages', {
                        id: botMsgId,
                        conversationId: conversation.id,
                        content: response,
                        direction: 'outgoing',
                        timestamp: new Date().toISOString(),
                        mediaUrl: null,
                        mediaType: null,
                        isFromBot: 1
                    });
                }
            }
        }
    }
}

async function generateBotResponse(message, logic) {
    try {
        if (logic.logicType === 'json' || logic.logicType === 'hybrid') {
            const rules = JSON.parse(logic.logicJson || '{}');
            if (rules.rules) {
                for (const rule of rules.rules) {
                    const keywords = rule.keywords || [rule.trigger];
                    for (const keyword of keywords) {
                        if (message.toLowerCase().includes(keyword.toLowerCase())) {
                            return rule.response;
                        }
                    }
                }
                if (rules.default_reply && logic.logicType === 'json') {
                    return rules.default_reply;
                }
            }
        }

        if ((logic.logicType === 'ai' || logic.logicType === 'hybrid') && GEMINI_API_KEY) {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            { role: 'user', parts: [{ text: logic.aiPrompt || 'Você é um assistente prestativo.' }] },
                            { role: 'model', parts: [{ text: 'Entendido! Estou pronto para ajudar.' }] },
                            { role: 'user', parts: [{ text: message }] }
                        ],
                        generationConfig: { maxOutputTokens: 512, temperature: 0.7 }
                    })
                }
            );
            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        }
    } catch (error) {
        console.error('Error generating bot response:', error);
    }
    return null;
}

// ============================================
// API ROUTES - DEVICES
// ============================================
app.get('/api/devices', (req, res) => {
    const devices = db.devices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const result = devices.map(d => {
        const session = sessions.get(d.id);
        return {
            ...d,
            connectionStatus: session?.status || d.connectionStatus,
            qrCode: session?.qrCode,
            phoneNumber: session?.phoneNumber || d.phoneNumber
        };
    });
    res.json(result);
});

app.post('/api/devices', async (req, res) => {
    try {
        const { name } = req.body;
        const id = uuidv4();
        const device = insertItem('devices', {
            id,
            name,
            connectionStatus: 'disconnected',
            phoneNumber: null,
            activeLogicId: null,
            createdAt: new Date().toISOString()
        });

        const session = await createBaileysSession(id);

        res.json({
            ...device,
            qrCode: session.qrCode,
            connectionStatus: session.status
        });
    } catch (error) {
        console.error('Error creating device:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/whatsapp/reconnect/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const device = findById('devices', id);
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }

        // Close existing session if any
        if (sessions.has(id)) {
            try {
                const oldSession = sessions.get(id);
                await oldSession.socket?.logout();
            } catch (e) {
                console.log('Error closing old session:', e.message);
            }
            sessions.delete(id);
        }

        // Remove auth folder for fresh start
        const sessionDir = path.join(AUTH_DIR, id);
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }

        const session = await createBaileysSession(id);
        res.json({ success: true, status: session.status, qrCode: session.qrCode });
    } catch (error) {
        console.error('Error reconnecting:', error);
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/devices/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (sessions.has(id)) {
            try {
                await sessions.get(id).socket?.logout();
            } catch (e) {
                console.log('Error closing session:', e.message);
            }
            sessions.delete(id);
        }

        // Remove auth folder
        const sessionDir = path.join(AUTH_DIR, id);
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }

        deleteItem('devices', id);

        // Also delete related conversations and messages
        const convs = filterWhere('conversations', c => c.deviceId === id);
        convs.forEach(c => {
            db.messages = db.messages.filter(m => m.conversationId !== c.id);
        });
        db.conversations = db.conversations.filter(c => c.deviceId !== id);
        saveDB(db);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting device:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/devices/:id/status', (req, res) => {
    const { id } = req.params;
    const session = sessions.get(id);
    const device = findById('devices', id);

    res.json({
        id,
        status: session?.status || device?.connectionStatus || 'disconnected',
        qrCode: session?.qrCode,
        phoneNumber: session?.phoneNumber || device?.phoneNumber
    });
});

app.patch('/api/devices/:id/logic', (req, res) => {
    const { id } = req.params;
    const { logicId } = req.body;

    const updated = updateItem('devices', id, { activeLogicId: logicId || null });
    if (updated) {
        res.json(updated);
    } else {
        res.status(404).json({ error: 'Device not found' });
    }
});

// ============================================
// API ROUTES - CONVERSATIONS
// ============================================
app.get('/api/conversations', (req, res) => {
    const { deviceId } = req.query;
    let conversations = db.conversations;

    if (deviceId) {
        conversations = filterWhere('conversations', c => c.deviceId === deviceId);
    }

    conversations = conversations.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
    res.json(conversations);
});

app.get('/api/conversations/:id/messages', (req, res) => {
    const { id } = req.params;
    const messages = filterWhere('messages', m => m.conversationId === id)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    res.json(messages);
});

app.post('/api/conversations/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        const conversation = findById('conversations', id);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const session = sessions.get(conversation.deviceId);
        if (!session?.socket) {
            return res.status(400).json({ error: 'Device not connected' });
        }

        const recipient = `${conversation.contactPhone}@s.whatsapp.net`;
        await session.socket.sendMessage(recipient, { text: content });

        const messageId = uuidv4();
        const message = insertItem('messages', {
            id: messageId,
            conversationId: id,
            content,
            direction: 'outgoing',
            timestamp: new Date().toISOString(),
            mediaUrl: null,
            mediaType: null,
            isFromBot: 0
        });

        updateItem('conversations', id, { lastMessageAt: new Date().toISOString() });

        res.json(message);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// API ROUTES - LOGICS
// ============================================
app.get('/api/logics', (req, res) => {
    const logics = db.logics.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(logics);
});

app.post('/api/logics', (req, res) => {
    const { name, description, logicType, logicJson, aiPrompt, isSystemIntegrated } = req.body;

    const id = uuidv4();
    const logic = insertItem('logics', {
        id,
        name,
        description,
        logicType: logicType || 'json',
        logicJson: logicJson || '{}',
        aiPrompt,
        isActive: 1,
        isSystemIntegrated: isSystemIntegrated !== undefined ? isSystemIntegrated : 1,
        createdAt: new Date().toISOString()
    });

    res.json(logic);
});

app.patch('/api/logics/:id', (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    const updated = updateItem('logics', id, updates);
    if (updated) {
        res.json(updated);
    } else {
        res.status(404).json({ error: 'Logic not found' });
    }
});

app.delete('/api/logics/:id', (req, res) => {
    const { id } = req.params;
    deleteItem('logics', id);
    res.json({ success: true });
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        type: 'baileys',
        sessions: sessions.size,
        database: 'json-file'
    });
});

// ============================================
// STARTUP
// ============================================
app.listen(PORT, async () => {
    console.log(`🚀 Baileys WhatsApp Server running on port ${PORT}`);
    console.log(`📦 Database: JSON file (${DB_PATH})`);
    console.log(`🤖 Gemini AI: ${GEMINI_API_KEY ? 'Configured' : 'Not configured'}`);

    // Restore existing sessions
    for (const device of db.devices) {
        console.log(`Attempting to restore session for device: ${device.name}`);
        try {
            await createBaileysSession(device.id);
        } catch (e) {
            console.error(`Failed to restore session for ${device.name}:`, e.message);
        }
    }
});
