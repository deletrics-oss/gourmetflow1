require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3088;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || 'https://evolution2.deletrics.site').replace(/\/$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'chatbot_premium_key_2026';

// ============================================
// JSON FILE DATABASE (for logics, conversations, messages)
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
    return { devices: [], conversations: [], messages: [], broadcasts: [], logics: [], templates: [] };
}

function saveDB(data) {
    try { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); } catch (e) { console.error('Error saving DB:', e); }
}

let db = loadDB();

function findById(collection, id) { return db[collection]?.find(item => item.id === id); }
function insertItem(collection, item) { if (!db[collection]) db[collection] = []; db[collection].push(item); saveDB(db); return item; }
function updateItem(collection, id, updates) {
    const idx = db[collection]?.findIndex(i => i.id === id);
    if (idx !== undefined && idx !== -1) { db[collection][idx] = { ...db[collection][idx], ...updates }; saveDB(db); return db[collection][idx]; }
    return null;
}
function deleteItem(collection, id) {
    if (!db[collection]) return false;
    const idx = db[collection].findIndex(i => i.id === id);
    if (idx !== -1) { db[collection].splice(idx, 1); saveDB(db); return true; }
    return false;
}

// ============================================
// EVOLUTION API HELPER
// ============================================
async function evoFetch(endpoint, options = {}) {
    const url = `${EVOLUTION_API_URL}${endpoint}`;
    const headers = {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json',
        ...options.headers,
    };
    try {
        const res = await fetch(url, { ...options, headers });
        const text = await res.text();
        try { return JSON.parse(text); } catch { return text; }
    } catch (err) {
        console.error(`[EVO] Error ${endpoint}:`, err.message);
        return null;
    }
}

// Map Evolution status to our status
function mapStatus(state) {
    if (!state) return 'disconnected';
    const s = (state.state || state.status || state || '').toLowerCase();
    if (s === 'open' || s === 'connected') return 'connected';
    if (s === 'connecting') return 'connecting';
    if (s === 'close' || s === 'disconnected') return 'disconnected';
    return 'disconnected';
}

// ============================================
// API ROUTES - DEVICES (proxied to Evolution API)
// ============================================

// GET /api/devices — list all instances
app.get('/api/devices', async (req, res) => {
    try {
        const instances = await evoFetch('/instance/fetchInstances');
        if (!Array.isArray(instances)) {
            return res.json(db.devices || []);
        }

        const devices = instances.map(inst => {
            const name = inst.instance?.instanceName || inst.instanceName || 'unknown';
            const id = inst.instance?.instanceId || inst.instanceId || name;
            const state = inst.instance?.state || inst.instance?.status || 'disconnected';
            const phone = inst.instance?.owner || null;

            // Sync to local DB
            let local = findById('devices', id);
            if (!local) {
                local = insertItem('devices', {
                    id, name, connectionStatus: mapStatus(state),
                    phoneNumber: phone, activeLogicId: null, isGlobalSdr: false,
                    integration: 'EVOLUTION', createdAt: new Date().toISOString()
                });
            } else {
                updateItem('devices', id, { connectionStatus: mapStatus(state), phoneNumber: phone });
            }

            return {
                id, name,
                connectionStatus: mapStatus(state),
                phoneNumber: phone,
                qrCode: null,
                isGlobalSdr: local?.isGlobalSdr || false,
                integration: 'EVOLUTION',
                activeLogicId: local?.activeLogicId || null,
            };
        });

        res.json(devices);
    } catch (err) {
        console.error('[GET /api/devices] Error:', err.message);
        res.json(db.devices || []);
    }
});

// POST /api/devices — create new instance
app.post('/api/devices', async (req, res) => {
    try {
        const { name, isGlobalSdr } = req.body;
        const instanceName = (name || 'device-' + Date.now()).toLowerCase().replace(/[^a-z0-9-]/g, '-');

        // Create instance on Evolution
        const result = await evoFetch('/instance/create', {
            method: 'POST',
            body: JSON.stringify({
                instanceName,
                integration: 'WHATSAPP-BAILEYS',
                qrcode: true,
                reject_call: false,
                always_online: true,
            }),
        });

        console.log('[CREATE] Evolution response:', JSON.stringify(result));

        const instanceId = result?.instance?.instanceId || result?.instance?.instanceName || instanceName;
        const qr = result?.qrcode?.base64 || result?.qrcode?.code || null;

        // Save locally
        const device = insertItem('devices', {
            id: instanceId, name: instanceName,
            connectionStatus: qr ? 'qr_ready' : 'connecting',
            phoneNumber: null, activeLogicId: null,
            isGlobalSdr: isGlobalSdr || false,
            integration: 'EVOLUTION',
            createdAt: new Date().toISOString()
        });

        // Wait a moment for QR generation
        if (!qr) {
            await new Promise(r => setTimeout(r, 2000));
            const connectResult = await evoFetch(`/instance/connect/${instanceName}`);
            const qr2 = connectResult?.base64 || connectResult?.code || null;
            return res.json({ ...device, qrCode: qr2 });
        }

        res.json({ ...device, qrCode: qr });
    } catch (err) {
        console.error('[POST /api/devices] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/devices/:id — reconnect / get QR
app.post('/api/devices/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const device = findById('devices', id);
        const instanceName = device?.name || id;

        // Try to get connection state first
        const stateResult = await evoFetch(`/instance/connectionState/${instanceName}`);
        const currentState = mapStatus(stateResult?.instance);

        if (currentState === 'connected') {
            return res.json({ ...device, connectionStatus: 'connected', qrCode: null, message: 'Já conectado!' });
        }

        // Try to connect and get QR
        const connectResult = await evoFetch(`/instance/connect/${instanceName}`);
        const qr = connectResult?.base64 || connectResult?.code || null;

        if (qr) {
            updateItem('devices', id, { connectionStatus: 'qr_ready' });
            return res.json({ ...device, connectionStatus: 'qr_ready', qrCode: qr, message: 'Escaneie o QR Code' });
        }

        res.json({ ...device, connectionStatus: currentState, qrCode: null, message: 'Tentando reconectar...' });
    } catch (err) {
        console.error('[POST /api/devices/:id] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/devices/:id/status — get connection state
app.get('/api/devices/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const device = findById('devices', id);
        const instanceName = device?.name || id;
        const stateResult = await evoFetch(`/instance/connectionState/${instanceName}`);

        res.json({
            id,
            status: mapStatus(stateResult?.instance),
            phoneNumber: device?.phoneNumber,
        });
    } catch (err) {
        res.json({ id: req.params.id, status: 'disconnected' });
    }
});

// PATCH /api/devices/:id — update device settings (logicId, isGlobalSdr)
app.patch('/api/devices/:id', (req, res) => {
    const { id } = req.params;
    const { logicId, isGlobalSdr } = req.body;
    const updates = {};
    if (logicId !== undefined) updates.activeLogicId = logicId;
    if (isGlobalSdr !== undefined) updates.isGlobalSdr = isGlobalSdr;

    const updated = updateItem('devices', id, updates);
    if (updated) {
        res.json(updated);
    } else {
        res.status(404).json({ error: 'Device not found' });
    }
});

// DELETE /api/devices/:id — delete instance
app.delete('/api/devices/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const device = findById('devices', id);
        const instanceName = device?.name || id;

        // Delete on Evolution
        await evoFetch(`/instance/delete/${instanceName}`, { method: 'DELETE' });

        // Delete locally
        deleteItem('devices', id);

        // Clean conversations/messages
        const convs = (db.conversations || []).filter(c => c.deviceId === id);
        convs.forEach(c => {
            db.messages = (db.messages || []).filter(m => m.conversationId !== c.id);
        });
        db.conversations = (db.conversations || []).filter(c => c.deviceId !== id);
        saveDB(db);

        res.json({ success: true });
    } catch (err) {
        console.error('[DELETE /api/devices/:id] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/whatsapp/reconnect/:id — alias for reconnect
app.post('/api/whatsapp/reconnect/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const device = findById('devices', id);
        const instanceName = device?.name || id;

        if (req.body?.forceReset) {
            // Logout first, then reconnect
            await evoFetch(`/instance/logout/${instanceName}`, { method: 'DELETE' });
            await new Promise(r => setTimeout(r, 1000));
        }

        const connectResult = await evoFetch(`/instance/connect/${instanceName}`);
        const qr = connectResult?.base64 || connectResult?.code || null;

        res.json({
            success: true,
            qrCode: qr,
            status: qr ? 'qr_ready' : 'connecting',
            message: qr ? 'Escaneie o QR Code' : 'Reconectando...',
        });
    } catch (err) {
        console.error('[RECONNECT] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// API ROUTES - SEND MESSAGE
// ============================================
app.post('/api/messages/send', async (req, res) => {
    try {
        const { instanceName, number, text } = req.body;
        const result = await evoFetch(`/message/sendText/${instanceName}`, {
            method: 'POST',
            body: JSON.stringify({
                number: number.replace(/\D/g, ''),
                text,
            }),
        });
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// API ROUTES - CONVERSATIONS
// ============================================
app.get('/api/conversations', (req, res) => {
    const { deviceId } = req.query;
    let conversations = db.conversations || [];
    if (deviceId) conversations = conversations.filter(c => c.deviceId === deviceId);
    res.json(conversations.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)));
});

app.get('/api/conversations/:id/messages', (req, res) => {
    const messages = (db.messages || []).filter(m => m.conversationId === req.params.id)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    res.json(messages);
});

app.post('/api/conversations/:id/messages', async (req, res) => {
    try {
        const conversation = findById('conversations', req.params.id);
        if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

        const device = findById('devices', conversation.deviceId);
        if (!device) return res.status(400).json({ error: 'Device not found' });

        const { content } = req.body;
        const result = await evoFetch(`/message/sendText/${device.name}`, {
            method: 'POST',
            body: JSON.stringify({ number: conversation.contactPhone, text: content }),
        });

        const msg = insertItem('messages', {
            id: uuidv4(), conversationId: req.params.id,
            content, direction: 'outgoing',
            timestamp: new Date().toISOString(), isFromBot: 0,
        });

        updateItem('conversations', req.params.id, { lastMessageAt: new Date().toISOString() });
        res.json(msg);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// API ROUTES - LOGICS
// ============================================
app.get('/api/logics', (req, res) => {
    res.json((db.logics || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/logics', (req, res) => {
    const { name, description, logicType, logicJson, aiPrompt, isSystemIntegrated } = req.body;
    const logic = insertItem('logics', {
        id: uuidv4(), name, description,
        logicType: logicType || 'json',
        logicJson: logicJson || '{}', aiPrompt,
        isActive: 1, isSystemIntegrated: isSystemIntegrated ?? 1,
        createdAt: new Date().toISOString()
    });
    res.json(logic);
});

app.patch('/api/logics/:id', (req, res) => {
    const updated = updateItem('logics', req.params.id, req.body);
    updated ? res.json(updated) : res.status(404).json({ error: 'Logic not found' });
});

app.delete('/api/logics/:id', (req, res) => {
    deleteItem('logics', req.params.id);
    res.json({ success: true });
});

// ============================================
// WEBHOOK (receive messages from Evolution)
// ============================================
app.post('/api/webhook', async (req, res) => {
    try {
        const { event, data, instance } = req.body;
        console.log(`[WEBHOOK] ${event} from ${instance}`);

        if (event === 'messages.upsert' && data?.message) {
            const msg = data.message;
            const phone = msg.key?.remoteJid?.replace('@s.whatsapp.net', '');
            if (!phone || phone.includes('@g.us') || msg.key?.fromMe) return res.json({ ok: true });

            const content = msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text || '[Media]';
            const contactName = msg.pushName || phone;
            const deviceName = instance;

            // Find device
            const device = (db.devices || []).find(d => d.name === deviceName);
            if (!device) return res.json({ ok: true });

            // Find or create conversation
            let conv = (db.conversations || []).find(c => c.deviceId === device.id && c.contactPhone === phone);
            if (!conv) {
                conv = insertItem('conversations', {
                    id: uuidv4(), deviceId: device.id,
                    contactName, contactPhone: phone,
                    lastMessageAt: new Date().toISOString(),
                    unreadCount: 1, isPaused: 0,
                });
            } else {
                updateItem('conversations', conv.id, {
                    lastMessageAt: new Date().toISOString(),
                    unreadCount: (conv.unreadCount || 0) + 1, contactName,
                });
            }

            // Save message
            insertItem('messages', {
                id: uuidv4(), conversationId: conv.id,
                content, direction: 'incoming',
                timestamp: new Date().toISOString(), isFromBot: 0,
            });

            // Auto-respond with AI if logic is active
            if (device.activeLogicId) {
                const logic = (db.logics || []).find(l => l.id === device.activeLogicId && l.isActive);
                if (logic) {
                    const response = await generateBotResponse(content, logic);
                    if (response) {
                        await evoFetch(`/message/sendText/${deviceName}`, {
                            method: 'POST',
                            body: JSON.stringify({ number: phone, text: response }),
                        });
                        insertItem('messages', {
                            id: uuidv4(), conversationId: conv.id,
                            content: response, direction: 'outgoing',
                            timestamp: new Date().toISOString(), isFromBot: 1,
                        });
                    }
                }
            }
        }

        res.json({ ok: true });
    } catch (err) {
        console.error('[WEBHOOK] Error:', err.message);
        res.json({ ok: true });
    }
});

// ============================================
// AI BOT RESPONSE
// ============================================
async function generateBotResponse(message, logic) {
    try {
        if (logic.logicType === 'json' || logic.logicType === 'hybrid') {
            const rules = JSON.parse(logic.logicJson || '{}');
            if (rules.rules) {
                for (const rule of rules.rules) {
                    const keywords = rule.keywords || [rule.trigger];
                    for (const kw of keywords) {
                        if (message.toLowerCase().includes(kw.toLowerCase())) return rule.response;
                    }
                }
                if (rules.default_reply && logic.logicType === 'json') return rules.default_reply;
            }
        }

        if ((logic.logicType === 'ai' || logic.logicType === 'hybrid') && GEMINI_API_KEY) {
            const resp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            { role: 'user', parts: [{ text: logic.aiPrompt || 'Você é um assistente.' }] },
                            { role: 'model', parts: [{ text: 'Entendido!' }] },
                            { role: 'user', parts: [{ text: message }] }
                        ],
                        generationConfig: { maxOutputTokens: 512, temperature: 0.7 }
                    })
                }
            );
            const data = await resp.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        }
    } catch (e) { console.error('Bot error:', e); }
    return null;
}

// ============================================
// HEALTH CHECK
// ============================================
app.get('/health', (req, res) => {
    res.json({
        status: 'ok', type: 'evolution-proxy',
        evolutionApi: EVOLUTION_API_URL,
        database: 'json-file',
        geminiAi: GEMINI_API_KEY ? 'configured' : 'not configured',
    });
});

// ============================================
// START
// ============================================
app.listen(PORT, () => {
    console.log(`🚀 WhatsApp Server (Evolution Proxy) running on port ${PORT}`);
    console.log(`🔗 Evolution API: ${EVOLUTION_API_URL}`);
    console.log(`📦 Database: JSON file (${DB_PATH})`);
    console.log(`🤖 Gemini AI: ${GEMINI_API_KEY ? 'Configured' : 'Not configured'}`);
});
