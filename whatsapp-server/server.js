require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3088;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ============================================
// JSON FILE DATABASE (No native compilation needed!)
// ============================================
const DB_PATH = path.join(__dirname, 'database.json');

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
        templates: [],
        clients: []
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
// WHATSAPP SESSION MANAGEMENT
// ============================================
const sessions = new Map();

function getOrCreateClient(deviceId) {
    if (sessions.has(deviceId)) {
        return sessions.get(deviceId);
    }

    const sessionData = {
        client: null,
        status: 'disconnected',
        qrCode: null,
        phoneNumber: null,
    };

    const client = new Client({
        authStrategy: new LocalAuth({ clientId: deviceId }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        }
    });

    client.on('qr', async (qr) => {
        console.log(`[${deviceId}] QR Code received`);
        try {
            const qrDataUrl = await qrcode.toDataURL(qr);
            sessionData.qrCode = qrDataUrl;
            sessionData.status = 'qr_ready';
            updateItem('devices', deviceId, { connectionStatus: 'qr_ready' });
        } catch (err) {
            console.error('Error generating QR:', err);
        }
    });

    client.on('ready', () => {
        console.log(`[${deviceId}] Client is ready!`);
        sessionData.status = 'connected';
        sessionData.qrCode = null;
        sessionData.phoneNumber = client.info?.wid?.user || null;
        updateItem('devices', deviceId, {
            connectionStatus: 'connected',
            phoneNumber: sessionData.phoneNumber
        });
    });

    client.on('authenticated', () => {
        console.log(`[${deviceId}] Authenticated`);
        sessionData.status = 'connecting';
    });

    client.on('auth_failure', (msg) => {
        console.error(`[${deviceId}] Auth failure:`, msg);
        sessionData.status = 'disconnected';
        sessionData.qrCode = null;
        updateItem('devices', deviceId, { connectionStatus: 'disconnected' });
    });

    client.on('disconnected', (reason) => {
        console.log(`[${deviceId}] Disconnected:`, reason);
        sessionData.status = 'disconnected';
        sessionData.qrCode = null;
        sessionData.phoneNumber = null;
        updateItem('devices', deviceId, { connectionStatus: 'disconnected', phoneNumber: null });
    });

    client.on('message', async (msg) => {
        console.log(`[${deviceId}] Message from ${msg.from}: ${msg.body}`);
        await handleIncomingMessage(deviceId, msg);
    });

    sessionData.client = client;
    sessions.set(deviceId, sessionData);

    return sessionData;
}

async function handleIncomingMessage(deviceId, msg) {
    const phone = msg.from.replace('@c.us', '');
    const contact = await msg.getContact();
    const contactName = contact.pushname || contact.name || phone;

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
        content: msg.body,
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
            const response = await generateBotResponse(msg.body, logic);
            if (response) {
                await sessions.get(deviceId)?.client?.sendMessage(msg.from, response);
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

        if ((logic.logicType === 'ai' || logic.logicType === 'hybrid' || logic.logicType === 'ai_scheduling') && GEMINI_API_KEY) {
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

        const session = getOrCreateClient(id);

        try {
            await session.client.initialize();
        } catch (err) {
            console.error('Error initializing client:', err);
        }

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

        // Destroy existing session if any
        if (sessions.has(id)) {
            try {
                await sessions.get(id).client?.destroy();
            } catch (e) {
                console.log('Error destroying old session:', e.message);
            }
            sessions.delete(id);
        }

        const session = getOrCreateClient(id);
        await session.client.initialize();

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
                await sessions.get(id).client?.destroy();
            } catch (e) {
                console.log('Error destroying session:', e.message);
            }
            sessions.delete(id);
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
        const { content, mediaUrl, mediaType } = req.body;

        const conversation = findById('conversations', id);
        if (!conversation) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const session = sessions.get(conversation.deviceId);
        if (!session?.client) {
            return res.status(400).json({ error: 'Device not connected' });
        }

        const recipient = `${conversation.contactPhone}@c.us`;

        if (mediaUrl) {
            const media = await MessageMedia.fromUrl(mediaUrl);
            await session.client.sendMessage(recipient, media, { caption: content });
        } else {
            await session.client.sendMessage(recipient, content);
        }

        const messageId = uuidv4();
        const message = insertItem('messages', {
            id: messageId,
            conversationId: id,
            content,
            direction: 'outgoing',
            timestamp: new Date().toISOString(),
            mediaUrl,
            mediaType,
            isFromBot: 0
        });

        updateItem('conversations', id, { lastMessageAt: new Date().toISOString() });

        res.json(message);
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/conversations/:id/pause', (req, res) => {
    const { id } = req.params;
    const { isPaused } = req.body;

    const updated = updateItem('conversations', id, { isPaused: isPaused ? 1 : 0 });
    if (updated) {
        res.json(updated);
    } else {
        res.status(404).json({ error: 'Conversation not found' });
    }
});

app.post('/api/conversations/sync-messages', async (req, res) => {
    const { deviceId } = req.body;

    const session = sessions.get(deviceId);
    if (!session?.client) {
        return res.status(400).json({ error: 'Device not connected' });
    }

    try {
        const chats = await session.client.getChats();
        let syncedCount = 0;

        for (const chat of chats.slice(0, 50)) {
            if (chat.isGroup) continue;

            const phone = chat.id._serialized.replace('@c.us', '');
            let conversation = findWhere('conversations', c => c.deviceId === deviceId && c.contactPhone === phone);

            if (!conversation) {
                const conversationId = uuidv4();
                conversation = insertItem('conversations', {
                    id: conversationId,
                    deviceId,
                    contactName: chat.name || phone,
                    contactPhone: phone,
                    contactProfilePic: null,
                    lastMessageAt: new Date().toISOString(),
                    unreadCount: chat.unreadCount || 0,
                    isPaused: 0
                });
            }

            syncedCount++;
        }

        res.json({ success: true, syncedConversations: syncedCount });
    } catch (error) {
        console.error('Error syncing messages:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// API ROUTES - BROADCASTS
// ============================================
app.get('/api/broadcasts', (req, res) => {
    const broadcasts = db.broadcasts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(broadcasts);
});

app.post('/api/broadcasts', (req, res) => {
    const { name, deviceId, message, contacts, mediaUrls, delay, scheduledFor } = req.body;

    const id = uuidv4();
    const broadcast = insertItem('broadcasts', {
        id,
        name,
        deviceId,
        message,
        contacts: JSON.stringify(contacts),
        mediaUrls: mediaUrls ? JSON.stringify(mediaUrls) : null,
        delay: delay || 20,
        status: 'pending',
        totalContacts: contacts.length,
        sentCount: 0,
        failedCount: 0,
        scheduledFor,
        createdAt: new Date().toISOString()
    });

    res.json(broadcast);
});

app.post('/api/broadcasts/:id/start', async (req, res) => {
    const { id } = req.params;
    const broadcast = findById('broadcasts', id);

    if (!broadcast) {
        return res.status(404).json({ error: 'Broadcast not found' });
    }

    const session = sessions.get(broadcast.deviceId);
    if (!session?.client) {
        return res.status(400).json({ error: 'Device not connected' });
    }

    updateItem('broadcasts', id, { status: 'sending' });

    // Start sending in background
    const contacts = JSON.parse(broadcast.contacts);
    const mediaUrls = broadcast.mediaUrls ? JSON.parse(broadcast.mediaUrls) : [];

    (async () => {
        let sentCount = 0;
        let failedCount = 0;

        for (const contact of contacts) {
            const current = findById('broadcasts', id);
            if (current.status === 'paused') break;

            try {
                const recipient = `${contact}@c.us`;

                if (mediaUrls.length > 0) {
                    for (const url of mediaUrls) {
                        const media = await MessageMedia.fromUrl(url);
                        await session.client.sendMessage(recipient, media);
                    }
                }

                await session.client.sendMessage(recipient, broadcast.message);
                sentCount++;
            } catch (err) {
                console.error(`Failed to send to ${contact}:`, err.message);
                failedCount++;
            }

            updateItem('broadcasts', id, { sentCount, failedCount });

            // Wait between messages
            await new Promise(resolve => setTimeout(resolve, (broadcast.delay || 20) * 1000));
        }

        const finalStatus = sentCount === contacts.length ? 'completed' :
            (findById('broadcasts', id).status === 'paused' ? 'paused' : 'completed');
        updateItem('broadcasts', id, { status: finalStatus });
    })();

    res.json({ success: true, status: 'sending' });
});

app.post('/api/broadcasts/:id/pause', (req, res) => {
    const { id } = req.params;
    const updated = updateItem('broadcasts', id, { status: 'paused' });
    res.json(updated || { error: 'Not found' });
});

app.delete('/api/broadcasts/:id', (req, res) => {
    const { id } = req.params;
    deleteItem('broadcasts', id);
    res.json({ success: true });
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
// API ROUTES - TEMPLATES
// ============================================
app.get('/api/templates', (req, res) => {
    const templates = db.templates.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(templates);
});

app.post('/api/templates', (req, res) => {
    const { name, content, category } = req.body;

    const id = uuidv4();
    const template = insertItem('templates', {
        id,
        name,
        content,
        category: category || 'broadcast',
        createdAt: new Date().toISOString()
    });

    res.json(template);
});

app.delete('/api/templates/:id', (req, res) => {
    const { id } = req.params;
    deleteItem('templates', id);
    res.json({ success: true });
});

// ============================================
// API ROUTES - AI FEATURES
// ============================================
app.post('/api/ai/generate-broadcast', async (req, res) => {
    if (!GEMINI_API_KEY) {
        return res.status(400).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const { prompt, context } = req.body;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [{
                            text: `Crie uma mensagem de WhatsApp para broadcast/disparo em massa. 
                            Contexto: ${context || 'restaurante'}
                            Objetivo: ${prompt}
                            
                            A mensagem deve ser:
                            - Curta e direta (máximo 500 caracteres)
                            - Profissional porém amigável
                            - Sem usar markdown ou formatação especial
                            - Em português brasileiro
                            
                            Responda APENAS com a mensagem, sem explicações.`
                        }]
                    }],
                    generationConfig: { maxOutputTokens: 256, temperature: 0.8 }
                })
            }
        );

        const data = await response.json();
        const generatedMessage = data.candidates?.[0]?.content?.parts?.[0]?.text;

        res.json({ message: generatedMessage });
    } catch (error) {
        console.error('Error generating broadcast:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/ai/generate-logic-prompt', async (req, res) => {
    if (!GEMINI_API_KEY) {
        return res.status(400).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const { businessType, objectives } = req.body;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        role: 'user',
                        parts: [{
                            text: `Crie um prompt de sistema para um bot de WhatsApp.
                            
                            Tipo de negócio: ${businessType}
                            Objetivos: ${objectives}
                            
                            O prompt deve instruir a IA a:
                            - Responder de forma amigável e profissional
                            - Ajudar com dúvidas sobre o negócio
                            - Direcionar para atendimento humano quando necessário
                            - Usar português brasileiro
                            
                            Responda APENAS com o prompt de sistema, sem explicações.`
                        }]
                    }],
                    generationConfig: { maxOutputTokens: 512, temperature: 0.7 }
                })
            }
        );

        const data = await response.json();
        const prompt = data.candidates?.[0]?.content?.parts?.[0]?.text;

        res.json({ prompt });
    } catch (error) {
        console.error('Error generating logic prompt:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/transcribe', async (req, res) => {
    res.status(501).json({ error: 'Audio transcription not implemented - use Whisper API' });
});

// ============================================
// API ROUTES - CONTACTS
// ============================================
app.get('/api/whatsapp/contacts/:deviceId', async (req, res) => {
    const { deviceId } = req.params;
    const session = sessions.get(deviceId);

    if (!session?.client) {
        return res.status(400).json({ error: 'Device not connected' });
    }

    try {
        const contacts = await session.client.getContacts();
        const result = contacts
            .filter(c => c.isMyContact && !c.isGroup)
            .map(c => ({
                id: c.id._serialized,
                name: c.pushname || c.name || c.number,
                number: c.number
            }));

        res.json(result);
    } catch (error) {
        console.error('Error getting contacts:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// API ROUTES - CLIENTS
// ============================================
app.get('/api/clients', (req, res) => {
    const clients = db.clients.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(clients);
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        sessions: sessions.size,
        database: 'json-file'
    });
});

// ============================================
// START SERVER
// ============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 WhatsApp Server running on port ${PORT}`);
    console.log(`📦 Database: JSON file (${DB_PATH})`);
    console.log(`🤖 Gemini AI: ${GEMINI_API_KEY ? 'Configured' : 'Not configured'}`);

    // Auto-reconnect saved devices
    db.devices.forEach(device => {
        if (device.connectionStatus !== 'disconnected') {
            console.log(`Attempting to restore session for device: ${device.name}`);
            const session = getOrCreateClient(device.id);
            session.client.initialize().catch(err => {
                console.log(`Could not restore session for ${device.name}:`, err.message);
            });
        }
    });
});
