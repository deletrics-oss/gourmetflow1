require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Tratamento para evitar crash com webhooks retornando payloads inválidas (Exemplo erro V2 "@")
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        console.error('[GourmetFlow] ❌ Payload JSON inválida recebida (rejeitando):', err.message);
        return res.status(400).send({ status: 400, message: err.message }); // Evita stack trace gigante de sintaxe
    }
    next();
});

const PORT = process.env.PORT || 3088;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || 'https://evolution2.deletrics.site').replace(/\/$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'chatbot_premium_key_2026';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://npxhdsodvboqxrauwuwy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
const RESTAURANT_ID = process.env.RESTAURANT_ID || null;
const EVOLUTION_WEBHOOK_URL = process.env.EVOLUTION_WEBHOOK_URL || 'http://localhost:3088/api/webhook/evolution';

// ============================================
// LOGGER — prefixo [GourmetFlow] em todos os logs
// ============================================
const LOG_PREFIX = '[GourmetFlow]';
function gLog(...args) { console.log(LOG_PREFIX, ...args); }
function gErr(...args) { console.error(LOG_PREFIX, '❌', ...args); }

// ============================================
// SUPABASE CLIENT
// ============================================
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================
// GEMINI AI SDK INITIALIZATION
// ============================================
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
const aiModel = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1' }) : null;

// ============================================
// EVOLUTION API HELPER
// ============================================
async function evoFetch(endpoint, options = {}) {
    const url = `${EVOLUTION_API_URL}${endpoint}`;
    const headers = { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json', ...options.headers };
    try {
        const res = await fetch(url, { ...options, headers });
        const text = await res.text();
        try { return JSON.parse(text); } catch { return text; }
    } catch (err) {
        console.error(`[EVO] Error ${endpoint}:`, err.message);
        return null;
    }
}

// ============================================
// HELPER: map Evo Status
// ============================================
const mapStatus = (evoStatus) => {
    const s = String(evoStatus).toLowerCase();
    if (s.includes('open') || s.includes('connected')) return 'connected';
    if (s.includes('qr') || s.includes('waiting')) return 'qr_ready';
    if (s.includes('close') || s.includes('disconnect')) return 'disconnected';
    return 'connecting';
};

// ============================================
// HELPER: get restaurant_id (from header, query, body, or env)
// ============================================
const getRestaurantId = (req) => {
    let id = req.headers['x-restaurant-id'] || req.query.restaurantId || req.body.restaurantId;
    if (id === 'null' || id === 'undefined') id = null;
    let fallback = RESTAURANT_ID === 'null' || RESTAURANT_ID === 'undefined' ? null : RESTAURANT_ID;
    return id || fallback;
};

// ============================================
// HELPER: set webhook for instance
// ============================================
async function setEvolutionWebhook(instanceName) {
    if (!EVOLUTION_WEBHOOK_URL || EVOLUTION_WEBHOOK_URL.includes('localhost')) {
        gLog(`⚠️ Ignorando webhook para "${instanceName}" (EVOLUTION_WEBHOOK_URL não configurada ou local)`);
        return false;
    }
    if (instanceName === 'unknown') return false;
    
    gLog(`🔗 Configurando webhook para instância "${instanceName}" -> ${EVOLUTION_WEBHOOK_URL}`);
    // PRIMARY: V2 format
    const v2Result = await evoFetch(`/webhook/set/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
            webhook: {
                enabled: true,
                url: EVOLUTION_WEBHOOK_URL,
                webhookByEvents: false,
                webhookBase64: false,
                events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
            }
        })
    });

    if (v2Result && !v2Result.error && v2Result.status !== 400) {
        gLog(`✅ Webhook (v2) configurado com sucesso para "${instanceName}"!`);
        return true;
    } else {
        // FALLBACK: V1 format
        const v1Result = await evoFetch(`/webhook/set/${instanceName}`, {
            method: 'POST',
            body: JSON.stringify({
                enabled: true,
                url: EVOLUTION_WEBHOOK_URL,
                webhookByEvents: false,
                webhookBase64: false,
                events: [
                    "MESSAGES_UPSERT",
                    "CONNECTION_UPDATE"
                ]
            })
        });
        
        if (v1Result && !v1Result.error) {
            gLog(`✅ Webhook configurado com sucesso para "${instanceName}"!`);
            return true;
        }
        
        gErr(`❌ Falha ao configurar webhook para "${instanceName}":`, JSON.stringify(v2Result || v1Result));
        return false;
    }
}

// ============================================
// API: DEVICES
// ============================================

// GET /api/devices — list instances, sync status from Evolution to Supabase
app.get('/api/devices', async (req, res) => {
    try {
        const restaurantId = getRestaurantId(req);
        console.log(`[GET /api/devices] restaurantId recebido: "${restaurantId}"`);
        if (!restaurantId) return res.json([]);

        // 1. Get devices that BELONG TO THIS RESTAURANT from Supabase
        const { data: dbDevices, error } = await supabase
            .from('whatsapp_devices')
            .select('*')
            .eq('restaurant_id', restaurantId);

        if (error || !dbDevices) {
            gErr('[GET /api/devices] Erro Supabase:', error?.message);
            return res.json([]);
        }

        const devices = [];

        // 2. For each device, optionally check real-time status from Evolution API
        for (const d of dbDevices) {
            let status = d.connection_status || 'disconnected';
            let phone = d.phone_number;

            try {
                // Fetch specific instance state to ensure 100% accurate frontend status
                const evoState = await evoFetch(`/instance/connectionState/${d.name}`);
                if (evoState && evoState.instance) {
                    const realState = evoState.instance.state || evoState.instance.status;
                    status = mapStatus(realState);
                    
                    if (status === 'connected' && evoState.instance.owner) {
                        phone = evoState.instance.owner.replace('@s.whatsapp.net', '');
                    }

                    // Update Supabase if out of sync
                    if (status !== d.connection_status || phone !== d.phone_number) {
                        await supabase.from('whatsapp_devices').update({
                            connection_status: status,
                            phone_number: phone,
                            ...(status === 'connected' ? { last_connected_at: new Date().toISOString() } : {})
                        }).eq('id', d.id);
                    }
                }
            } catch (err) {
                // Instance might be offline or deleted in Evolution
                gLog(`⚠️ Não foi possível checar status de "${d.name}" na Evolution.`);
            }

            devices.push({
                id: d.id, 
                name: d.name,
                connectionStatus: status,
                phoneNumber: phone, 
                qrCode: d.qr_code,
                activeLogicId: d.active_logic_id,
                integration: 'EVOLUTION',
            });
        }

        res.json(devices);
    } catch (err) {
        gErr('[GET /api/devices] Erro Geral:', err.message);
        res.json([]);
    }
});

// POST /api/devices — create instance
app.post('/api/devices', async (req, res) => {
    try {
        const { name } = req.body;
        const restaurantId = getRestaurantId(req);
        if (!restaurantId) {
            console.error('[POST /api/devices] FATAL: restaurantId is undefined! Skipping Evolution API creation to prevent orphaned ghost devices. Check frontend useRestaurant() hooks or Auth session.');
            return res.status(400).json({ error: 'restaurantId é obrigatório. Seu usuário pode não estar vinculado corretamente a um restaurante no novo Supabase.' });
        }

        const instanceName = (name || 'device-' + Date.now()).toLowerCase().replace(/[^a-z0-9-]/g, '-');

        const result = await evoFetch('/instance/create', {
            method: 'POST',
            body: JSON.stringify({
                instanceName, integration: 'WHATSAPP-BAILEYS',
                qrcode: true, reject_call: false, always_online: true,
            }),
        });

        console.log('[CREATE] Evolution response:', JSON.stringify(result));
        const qr = result?.qrcode?.base64 || result?.qrcode?.code || null;

        // Save to Supabase
        const newId = uuidv4();
        if (restaurantId) {
            console.log(`[POST /api/devices] Inserindo record para "${instanceName}" no Supabase para restaurant: ${restaurantId}`);
            const { error: insErr } = await supabase.from('whatsapp_devices').insert({
                id: newId, name: instanceName,
                connection_status: qr ? 'qr_ready' : 'connecting',
                restaurant_id: restaurantId,
            });
            if (insErr) {
                gErr(`❌ ERRO FATAL ao inserir device "${instanceName}" no Supabase:`, insErr.message);
                return res.status(500).json({ error: 'Erro ao salvar no banco: ' + insErr.message });
            }
        }

        // If no QR returned, try to connect
        let finalQr = qr;
        if (!qr) {
            await new Promise(r => setTimeout(r, 2000));
            const connectResult = await evoFetch(`/instance/connect/${instanceName}`);
            finalQr = connectResult?.base64 || connectResult?.code || null;
        }

        if (finalQr && restaurantId) {
            await supabase.from('whatsapp_devices').update({
                connection_status: 'qr_ready', qr_code: finalQr,
            }).eq('id', newId);
        }

        // Configure webhook automatically
        await setEvolutionWebhook(instanceName);

        res.json({ id: newId, name: instanceName, connectionStatus: finalQr ? 'qr_ready' : 'connecting', qrCode: finalQr });
    } catch (err) {
        console.error('[POST /api/devices]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/devices/:id — reconnect / get QR
app.post('/api/devices/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get device name from Supabase
        const { data: device } = await supabase.from('whatsapp_devices').select('*').eq('id', id).single();
        const instanceName = device?.name || id;

        // Check state
        const stateResult = await evoFetch(`/instance/connectionState/${instanceName}`);
        const currentState = mapStatus(stateResult?.instance);

        if (currentState === 'connected') {
            await supabase.from('whatsapp_devices').update({
                connection_status: 'connected', qr_code: null,
                last_connected_at: new Date().toISOString(),
            }).eq('id', id);
            return res.json({ connectionStatus: 'connected', qrCode: null, message: 'Já conectado!' });
        }

        // Get QR
        const connectResult = await evoFetch(`/instance/connect/${instanceName}`);
        const qr = connectResult?.base64 || connectResult?.code || null;

        if (qr) {
            await supabase.from('whatsapp_devices').update({
                connection_status: 'qr_ready', qr_code: qr,
            }).eq('id', id);
        }

        // Ensure webhook is set when reconnecting
        await setEvolutionWebhook(instanceName);

        res.json({ connectionStatus: qr ? 'qr_ready' : currentState, qrCode: qr, message: qr ? 'Escaneie o QR Code' : 'Reconectando...' });
    } catch (err) {
        console.error('[POST /api/devices/:id]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET /api/devices/:id/contacts — Import contacts from phone memory
app.get('/api/devices/:id/contacts', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: device } = await supabase.from('whatsapp_devices').select('*').eq('id', id).single();
        if (!device) return res.status(404).json({ error: 'Dispositivo não encontrado' });

        const instanceName = device.name;
        
        // Evolution endpoint to find contacts
        const contactsResult = await evoFetch(`/chat/findContacts/${instanceName}`, { 
            method: 'POST', 
            body: JSON.stringify({}) 
        });
        
        res.json({ success: true, count: Array.isArray(contactsResult) ? contactsResult.length : 0, data: contactsResult });
    } catch (err) {
        console.error('[GET /api/devices/:id/contacts] Erro:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/devices/:id — update logic, etc.
app.patch('/api/devices/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { logicId, isGlobalSdr } = req.body;
        const updates = {};
        if (logicId !== undefined) updates.active_logic_id = logicId;

        const { data, error } = await supabase.from('whatsapp_devices').update(updates).eq('id', id).select().single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/devices/:id/logic — legacy route for cached frontends
app.patch('/api/devices/:id/logic', async (req, res) => {
    try {
        const { id } = req.params;
        const { logicId } = req.body;
        const updates = {};
        if (logicId !== undefined) updates.active_logic_id = logicId;

        console.log(`[GourmetFlow] ♻️ Legacy route /api/devices/${id}/logic used by cached frontend!`);
        const { data: devices, error } = await supabase.from('whatsapp_devices').update(updates).eq('id', id).select().limit(1);
        if (error) throw error;
        const data = devices && devices.length > 0 ? devices[0] : null;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/devices/:id
app.delete('/api/devices/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: devices } = await supabase.from('whatsapp_devices').select('name').eq('id', id).limit(1);
        const device = devices && devices.length > 0 ? devices[0] : null;

        if (device) {
            await evoFetch(`/instance/delete/${device.name}`, { method: 'DELETE' });
        }

        // Delete from Supabase (cascades conversations/messages via FK)
        await supabase.from('whatsapp_devices').delete().eq('id', id);
        res.json({ success: true });
    } catch (err) {
        console.error('[DELETE /api/devices/:id]', err.message);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/whatsapp/reconnect/:id
app.post('/api/whatsapp/reconnect/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: devices } = await supabase.from('whatsapp_devices').select('name').eq('id', id).limit(1);
        const device = devices && devices.length > 0 ? devices[0] : null;
        const instanceName = device?.name || id;

        if (req.body?.forceReset) {
            await evoFetch(`/instance/logout/${instanceName}`, { method: 'DELETE' });
            await new Promise(r => setTimeout(r, 1000));
        }

        const connectResult = await evoFetch(`/instance/connect/${instanceName}`);
        const qr = connectResult?.base64 || connectResult?.code || null;

        if (qr) {
            await supabase.from('whatsapp_devices').update({ connection_status: 'qr_ready', qr_code: qr }).eq('id', id);
        }

        res.json({ success: true, qrCode: qr, status: qr ? 'qr_ready' : 'connecting' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// API: LOGICS (read from Supabase)
// ============================================
app.get('/api/logics', async (req, res) => {
    try {
        const restaurantId = getRestaurantId(req);
        let query = supabase.from('whatsapp_logic_configs').select('*');
        if (restaurantId) query = query.eq('restaurant_id', restaurantId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        res.json((data || []).map(l => ({
            id: l.id, name: l.name, description: l.description,
            logicType: l.logic_type, logicJson: l.logic_json,
            aiPrompt: l.ai_prompt, 
            knowledgeBase: l.knowledge_base, // Adicionado knowledgeBase
            isActive: l.is_active,
        })));
    } catch (err) {
        res.json([]);
    }
});

// POST /api/logics
app.post('/api/logics', async (req, res) => {
    try {
        const restaurantId = getRestaurantId(req);
        const { name, description, logicType, logicJson, aiPrompt, knowledgeBase } = req.body;
        
        const { data: logics, error } = await supabase.from('whatsapp_logic_configs').insert({
            restaurant_id: restaurantId,
            name,
            description,
            logic_type: logicType,
            logic_json: logicJson,
            ai_prompt: aiPrompt,
            knowledge_base: knowledgeBase,
            is_active: true
        }).select().limit(1);

        if (error) throw error;
        res.json(logics && logics.length > 0 ? logics[0] : null);
    } catch (err) {
        console.error('[POST /api/logics] ERRO:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/logics/:id
app.patch('/api/logics/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, logicType, logicJson, aiPrompt, knowledgeBase, isActive } = req.body;
        
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (logicType !== undefined) updates.logic_type = logicType;
        if (logicJson !== undefined) updates.logic_json = logicJson;
        if (aiPrompt !== undefined) updates.ai_prompt = aiPrompt;
        if (knowledgeBase !== undefined) updates.knowledge_base = knowledgeBase;
        if (isActive !== undefined) updates.is_active = isActive;

        const { data, error } = await supabase.from('whatsapp_logic_configs')
            .update(updates).eq('id', id).select().single();

        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('[PATCH /api/logics/:id] ERRO:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/logics/:id
app.delete('/api/logics/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('whatsapp_logic_configs').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (err) {
        console.error('[DELETE /api/logics/:id] ERRO:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// API: BROADCASTS (Disparo em Massa)
// ============================================
const activeBroadcasts = new Set();

async function processBroadcast(broadcastId) {
    if (activeBroadcasts.has(broadcastId)) return;
    activeBroadcasts.add(broadcastId);

    try {
        console.log(`[BROADCAST] Iniciando processamento do ID: ${broadcastId}`);
        
        while (activeBroadcasts.has(broadcastId)) {
            // 1. Pegar próximo contato pendente
            const { data: contacts, error: contactError } = await supabase
                .from('whatsapp_broadcast_contacts')
                .select('*')
                .eq('broadcast_id', broadcastId)
                .eq('status', 'pending')
                .limit(1);

            if (contactError || !contacts || contacts.length === 0) {
                console.log(`[BROADCAST] Fim do processamento para ID: ${broadcastId}`);
                await supabase.from('whatsapp_broadcasts').update({ status: 'completed' }).eq('id', broadcastId);
                activeBroadcasts.delete(broadcastId);
                break;
            }

            const contact = contacts[0];
            const { data: broadcast } = await supabase.from('whatsapp_broadcasts').select('*').eq('id', broadcastId).single();

            if (!broadcast || broadcast.status === 'paused') {
                activeBroadcasts.delete(broadcastId);
                break;
            }

            try {
                // 2. Enviar mensagem via Evolution API
                const evolutionUrl = process.env.EVOLUTION_API_URL;
                const apiKey = process.env.EVOLUTION_API_KEY;
                const instance = broadcast.device_id; // Assumindo que deviceId é o nome da instância

                const payload = {
                    number: contact.phone,
                    text: broadcast.message
                };

                const response = await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': apiKey
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    await supabase.from('whatsapp_broadcast_contacts').update({ status: 'sent', sent_at: new Date() }).eq('id', contact.id);
                    await supabase.rpc('increment_broadcast_sent', { b_id: broadcastId });
                } else {
                    throw new Error(await response.text());
                }
            } catch (err) {
                console.error(`[BROADCAST] Erro ao enviar para ${contact.phone}:`, err.message);
                await supabase.from('whatsapp_broadcast_contacts').update({ status: 'failed', error: err.message }).eq('id', contact.id);
                await supabase.rpc('increment_broadcast_failed', { b_id: broadcastId });
            }

            // 3. Aguardar delay
            await new Promise(resolve => setTimeout(resolve, (broadcast.delay || 20) * 1000));
        }
    } catch (err) {
        console.error(`[BROADCAST FATAL] Erro no loop:`, err.message);
    } finally {
        activeBroadcasts.delete(broadcastId);
    }
}

app.get('/api/broadcasts', async (req, res) => {
    try {
        const restaurantId = getRestaurantId(req);
        const { data, error } = await supabase.from('whatsapp_broadcasts')
            .select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false });
        if (error) throw error;
        res.json(data.map(b => ({
            id: b.id, name: b.name, message: b.message, status: b.status,
            totalContacts: b.total_contacts, sentCount: b.sent_count, failedCount: b.failed_count,
            deviceId: b.device_id, delay: b.delay, created_at: b.created_at
        })));
    } catch (err) {
        res.json([]);
    }
});

app.post('/api/broadcasts', async (req, res) => {
    try {
        const restaurantId = getRestaurantId(req);
        const { name, deviceId, message, contacts, delay, scheduledFor, mediaUrls } = req.body;

        const { data: broadcast, error } = await supabase.from('whatsapp_broadcasts').insert({
            restaurant_id: restaurantId,
            name,
            device_id: deviceId,
            message,
            total_contacts: contacts.length,
            delay: delay || 20,
            status: scheduledFor ? 'scheduled' : 'pending',
            scheduled_for: scheduledFor,
            media_urls: mediaUrls
        }).select().single();

        if (error) throw error;

        const contactsPayload = contacts.map(c => ({
            broadcast_id: broadcast.id,
            phone: c.phone,
            name: c.name,
            status: 'pending'
        }));

        await supabase.from('whatsapp_broadcast_contacts').insert(contactsPayload);

        res.json(broadcast);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/broadcasts/:id/start', async (req, res) => {
    try {
        const { id } = req.params;
        await supabase.from('whatsapp_broadcasts').update({ status: 'running' }).eq('id', id);
        processBroadcast(id); // Inicia o loop em background
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/broadcasts/:id/pause', async (req, res) => {
    try {
        const { id } = req.params;
        await supabase.from('whatsapp_broadcasts').update({ status: 'paused' }).eq('id', id);
        activeBroadcasts.delete(id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/broadcasts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await supabase.from('whatsapp_broadcast_contacts').delete().eq('broadcast_id', id);
        await supabase.from('whatsapp_broadcasts').delete().eq('id', id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// API: CONVERSATIONS (from Supabase)
// ============================================
app.get('/api/conversations', async (req, res) => {
    try {
        const restaurantId = getRestaurantId(req);
        const { deviceId } = req.query;
        let query = supabase.from('whatsapp_conversations').select('*');
        if (restaurantId) query = query.eq('restaurant_id', restaurantId);
        if (deviceId) query = query.eq('device_id', deviceId);
        const { data } = await query.order('last_message_at', { ascending: false });
        res.json(data || []);
    } catch (err) {
        res.json([]);
    }
});

app.get('/api/conversations/:id/messages', async (req, res) => {
    try {
        const { data } = await supabase.from('whatsapp_messages')
            .select('*').eq('conversation_id', req.params.id)
            .order('created_at', { ascending: true });
        res.json(data || []);
    } catch (err) {
        res.json([]);
    }
});

// ============================================
// API: SEND MESSAGE
// ============================================
app.post('/api/messages/send', async (req, res) => {
    try {
        const { instanceName, number, text, deviceId, restaurantId } = req.body;
        const result = await evoFetch(`/message/sendText/${instanceName}`, {
            method: 'POST',
            body: JSON.stringify({ number: number.replace(/\D/g, ''), text }),
        });

        // Save to Supabase
        if (deviceId && restaurantId) {
            await supabase.from('whatsapp_messages').insert({
                device_id: deviceId, restaurant_id: restaurantId,
                phone_number: number, message_content: text,
                message_type: 'text', direction: 'outgoing',
                remetente: 'sistema', is_from_bot: false,
            });
        }

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// WEBHOOK — receive messages from Evolution
// Aceita AMBAS as rotas: /api/webhook e /api/webhook/evolution
// ============================================
async function handleEvolutionWebhook(req, res) {
    try {
        const { event, data, instance } = req.body;
        gLog(`📩 WEBHOOK recebido: evento="${event}" instancia="${instance}"`);

        // Handle connection status updates
        if (event === 'connection.update') {
            const state = data?.state || data?.status;
            const status = mapStatus({ state });
            
            const { data: device, error: devErr } = await supabase.from('whatsapp_devices')
                .select('id').eq('name', instance).maybeSingle();

            if (devErr) gErr('Erro ao buscar device:', devErr.message);

            if (device) {
                const updates = { connection_status: status };
                if (status === 'connected') {
                    updates.last_connected_at = new Date().toISOString();
                    updates.qr_code = null;
                }
                const { error: updErr } = await supabase.from('whatsapp_devices').update(updates).eq('id', device.id);
                if (updErr) gErr('Erro ao atualizar device:', updErr.message);
                gLog(`🔌 Device "${instance}" -> ${status} (salvo no Supabase ✅)`);
            } else {
                gLog(`⚠️ Device "${instance}" não encontrado no Supabase — ignorando connection.update`);
            }
        }

        // Handle incoming messages
        if (event === 'messages.upsert' && data) {
            // Log exactly what Evolution is sending
            gLog(`[DEBUG] Raw payload: ` + JSON.stringify(data));

            // Support both data={key, message} and data={message: {key, message}} structures (v1/v2 variations)
            const msgObj = data.messages?.[0] || data.message || data;
            const key = msgObj.key || data.key;
            
            if (!key) {
                gLog(`⏭️ Payload sem .key ignorado`);
                return res.json({ ok: true });
            }

            const messageId = key.id;

            // Deduplicação
            if (messageId) {
                try {
                    const { data: existingLog } = await supabase
                        .from('whatsapp_sdr_logs')
                        .select('id')
                        .eq('message_id', messageId)
                        .maybeSingle();

                    if (existingLog) {
                        gLog(`⏭️ Mensagem ${messageId} já processada (deduplicação)`);
                        return res.json({ ok: true });
                    }
                } catch (err) {
                    gLog(`⚠️ Erro ao checar deduplicação: ${err.message}`);
                }
            }

            const phone = key?.remoteJid?.replace('@s.whatsapp.net', '');
            if (!phone || phone.includes('@g.us') || key?.fromMe) {
                gLog(`⏭️ Mensagem ignorada (grupo/fromMe/inválido) de ${key?.remoteJid}`);
                return res.json({ ok: true });
            }

            const actualMessage = msgObj.message || data.message || {};
            const content = actualMessage.conversation ||
                actualMessage.extendedTextMessage?.text || '[Media]';
            const contactName = msgObj.pushName || data.pushName || phone;

            gLog(`💬 Mensagem recebida de ${contactName} (${phone}): "${content.substring(0, 80)}${content.length > 80 ? '...' : ''}"`);

            // Find device in Supabase
            const { data: devices, error: devErr } = await supabase.from('whatsapp_devices')
                .select('id, restaurant_id, active_logic_id')
                .eq('name', instance)
                .limit(1); // MAIS RESILIENTE: pega o primeiro se houver duplicidade

            if (devErr) gErr('Erro ao buscar device:', devErr.message);
            
            const device = devices && devices.length > 0 ? devices[0] : null;

            if (!device) {
                gLog(`⚠️ Device "${instance}" não encontrado no Supabase — mensagem não processada`);
                return res.json({ ok: true });
            }

            gLog(`📱 Device encontrado: id=${device.id}, restaurant_id=${device.restaurant_id}`);

            // Registrar log inicial para evitar corrida (race condition) de webhook duplicado
            if (messageId) {
                await supabase.from('whatsapp_sdr_logs').insert({
                    message_id: messageId,
                    restaurant_id: device.restaurant_id,
                    instance_name: instance,
                    contact: phone,
                    message_in: content,
                    status: 'received'
                }).select().maybeSingle();
            }

            // Find or create conversation
            const { data: existingConv } = await supabase.from('whatsapp_conversations')
                .select('id, unread_count').eq('device_id', device.id).eq('contact_phone', phone).maybeSingle();

            let convId;
            if (existingConv) {
                convId = existingConv.id;
                await supabase.from('whatsapp_conversations').update({
                    contact_name: contactName,
                    last_message_at: new Date().toISOString(),
                    unread_count: (existingConv.unread_count || 0) + 1,
                }).eq('id', convId);
                gLog(`💬 Conversa existente atualizada: ${convId}`);
            } else {
                const { data: newConv, error: convErr } = await supabase.from('whatsapp_conversations').insert({
                    device_id: device.id, 
                    restaurant_id: device.restaurant_id,
                    contact_name: contactName, 
                    contact_phone: phone,
                    phone_number: phone, // Suporte para colunas com nome diferente
                    last_message_at: new Date().toISOString(), 
                    unread_count: 1,
                }).select('id').single();
                if (convErr) gErr('Erro ao criar conversa:', convErr.message);
                convId = newConv?.id;
                gLog(`💬 Nova conversa criada: ${convId}`);
            }

            // Save incoming message to Supabase
            const { error: msgErr } = await supabase.from('whatsapp_messages').insert({
                device_id: device.id, restaurant_id: device.restaurant_id,
                conversation_id: convId, phone_number: phone,
                message_content: content, message_type: 'text',
                direction: 'incoming', remetente: contactName,
                is_from_bot: false,
            });

            if (msgErr) {
                gErr(`Erro ao salvar mensagem no Supabase:`, msgErr.message);
            } else {
                gLog(`✅ Mensagem salva no Supabase com sucesso! (phone=${phone}, conv=${convId})`);
            }

            // Check for review response FIRST (before AI)
            if (convId) {
                const reviewResponse = await handleReviewResponse(content, convId, device.restaurant_id, phone, device.id);
                if (reviewResponse) {
                    gLog(`⭐ Avaliação recebida de ${phone}: "${content}" → respondendo...`);
                    const { data: deviceData } = await supabase.from('whatsapp_devices')
                        .select('name').eq('id', device.id).single();
                    if (deviceData) {
                        await evoFetch(`/message/sendText/${deviceData.name}`, {
                            method: 'POST',
                            body: JSON.stringify({ number: phone, text: reviewResponse }),
                        });
                        await supabase.from('whatsapp_messages').insert({
                            device_id: device.id, restaurant_id: device.restaurant_id,
                            conversation_id: convId, phone_number: phone,
                            message_content: reviewResponse, message_type: 'text',
                            direction: 'outgoing', remetente: 'bot', is_from_bot: true,
                        });
                    }
                    return res.json({ ok: true });
                }
            }

            // Auto-respond with AI if logic is active
            if (device.active_logic_id) {
                gLog(`🤖 Lógica ativa encontrada: ${device.active_logic_id} — gerando resposta AI...`);
                const { data: logic } = await supabase.from('whatsapp_logic_configs')
                    .select('*').eq('id', device.active_logic_id).eq('is_active', true).maybeSingle();

                if (logic) {
                    // Verificação de regras de SDR: global, whitelist, off
                    if (logic.sdr_mode === 'off') {
                        gLog(`⏭️ Lógica encontrada, mas SDR está DESLIGADO (sdr_mode=off)`);
                        return res.json({ ok: true });
                    }

                    if (logic.sdr_mode === 'whitelist') {
                        const whitelist = Array.isArray(logic.whitelist_phones) ? logic.whitelist_phones : [];
                        if (!whitelist.includes(phone)) {
                            gLog(`⏭️ SDR ignorado -> Modo Whitelist ativado e o número ${phone} não está na lista`);
                            return res.json({ ok: true });
                        }
                    }

                    const response = await generateBotResponse(content, logic, device.restaurant_id, phone);
                    if (response) {
                        gLog(`🤖 Resposta AI gerada: "${response.substring(0, 80)}${response.length > 80 ? '...' : ''}"`);
                        await evoFetch(`/message/sendText/${instance}`, {
                            method: 'POST',
                            body: JSON.stringify({ number: phone, text: response }),
                        });

                        await supabase.from('whatsapp_messages').insert({
                            device_id: device.id, restaurant_id: device.restaurant_id,
                            conversation_id: convId, phone_number: phone,
                            message_content: response, message_type: 'text',
                            direction: 'outgoing', remetente: 'bot',
                            is_from_bot: true, ai_response: response,
                        });
                        gLog(`✅ Resposta AI enviada e salva no Supabase!`);

                        if (messageId) {
                            await supabase.from('whatsapp_sdr_logs')
                                .update({ message_out: response, status: 'replied' })
                                .eq('message_id', messageId);
                        }
                    } else {
                        gLog(`⚠️ AI não gerou resposta para esta mensagem`);
                        if (messageId) {
                            await supabase.from('whatsapp_sdr_logs')
                                .update({ error: 'AI failed to generate response', status: 'error' })
                                .eq('message_id', messageId);
                        }
                    }
                } else {
                    gLog(`⚠️ Lógica ${device.active_logic_id} não encontrada ou inativa`);
                }
            } else {
                gLog(`ℹ️ Nenhuma lógica ativa para este device — mensagem apenas salva`);
            }
        }

        res.json({ ok: true });
    } catch (err) {
        gErr('WEBHOOK ERRO:', err.message, err.stack);
        res.json({ ok: true });
    }
}

// Rota principal
app.post('/api/webhook', handleEvolutionWebhook);
// Alias — para quem configurou webhook como /api/webhook/evolution
app.post('/api/webhook/evolution', handleEvolutionWebhook);

// ============================================
// AI BOT RESPONSE (with FULL restaurant + CRM context)
// ============================================
async function generateBotResponse(message, logic, restaurantId, customerPhone) {
    try {
        // Rule-based matching first
        if (logic.logic_type === 'json' || logic.logic_type === 'hybrid') {
            const rules = logic.logic_json || {};
            if (rules.rules) {
                for (const rule of rules.rules) {
                    const trigger = (rule.trigger || '').toLowerCase();
                    const msg = message.toLowerCase();
                    const match =
                        rule.triggerType === 'exact' ? msg === trigger :
                        rule.triggerType === 'startsWith' ? msg.startsWith(trigger) :
                        msg.includes(trigger);
                    if (match) {
                        let response = rule.response;
                        if (response.includes('#CARDAPIO') && restaurantId) {
                            const menu = await getRestaurantMenu(restaurantId);
                            response = response.replace('#CARDAPIO', menu);
                        }
                        return response;
                    }
                }
                if (rules.default_reply && logic.logic_type === 'json') {
                    let reply = rules.default_reply;
                    if (reply.includes('#CARDAPIO') && restaurantId) {
                        reply = reply.replace('#CARDAPIO', await getRestaurantMenu(restaurantId));
                    }
                    return reply;
                }
            }
        }

        // ===================================================
        // AI response (Gemini) — SDR OMNICHANNEL MODE
        // ===================================================
        if ((logic.logic_type === 'ai' || logic.logic_type === 'hybrid' || logic.logic_type === 'ai_scheduling') && GEMINI_API_KEY) {
            let systemPrompt = logic.ai_prompt || 'Você é um assistente profissional de atendimento de um restaurante.';
            
            const restaurantContext = [];
            const customerContext = [];
            
            // -----------------------------------------------
            // 1. CRM COMPLETO — Perfil + Pontos + Cupons
            // -----------------------------------------------
            if (customerPhone) {
                const { data: customer } = await supabase.from('customers')
                    .select('id, name, loyalty_points, notes, cpf, address, created_at')
                    .eq('phone', customerPhone)
                    .eq('restaurant_id', restaurantId)
                    .maybeSingle();
                
                if (customer) {
                    customerContext.push(`- Nome do Cliente: ${customer.name}`);
                    customerContext.push(`- Cliente desde: ${new Date(customer.created_at).toLocaleDateString('pt-BR')}`);
                    customerContext.push(`- Pontos de Fidelidade: ${customer.loyalty_points || 0}`);
                    
                    // Calcular valor em reais dos pontos
                    const { data: settings } = await supabase.from('restaurant_settings')
                        .select('loyalty_enabled, loyalty_points_per_real, loyalty_redemption_value')
                        .eq('restaurant_id', restaurantId)
                        .maybeSingle();
                    
                    if (settings && settings.loyalty_enabled && customer.loyalty_points > 0) {
                        const cashValue = (customer.loyalty_points * (settings.loyalty_redemption_value || 0.01)).toFixed(2);
                        customerContext.push(`- Valor dos pontos em R$: R$ ${cashValue} (pode usar no próximo pedido!)`);
                    }
                    
                    if (customer.notes) {
                        customerContext.push(`- Observações do perfil: ${customer.notes}`);
                    }
                    if (customer.address) {
                        const addr = typeof customer.address === 'string' ? JSON.parse(customer.address) : customer.address;
                        customerContext.push(`- Endereço salvo: ${addr.street || ''} ${addr.number || ''} - ${addr.neighborhood || ''} ${addr.city || ''}`);
                    }
                } else {
                    customerContext.push(`- Novo cliente (primeiro contato)`);
                }

                // Contagem total de pedidos anteriores
                const { count: orderCount } = await supabase.from('orders')
                    .select('id', { count: 'exact', head: true })
                    .eq('customer_phone', customerPhone)
                    .eq('restaurant_id', restaurantId);
                
                customerContext.push(`- Total de Pedidos Já Realizados: ${orderCount || 0}`);

                // Últimos 3 pedidos (histórico recente)
                const { data: recentOrders } = await supabase.from('orders')
                    .select('order_number, status, total, delivery_type, created_at')
                    .eq('customer_phone', customerPhone)
                    .eq('restaurant_id', restaurantId)
                    .order('created_at', { ascending: false })
                    .limit(3);
                
                if (recentOrders && recentOrders.length > 0) {
                    customerContext.push(`\n# HISTÓRICO RECENTE DE PEDIDOS:`);
                    for (const ro of recentOrders) {
                        const statusLabel = translateStatus(ro.status);
                        customerContext.push(`  - #${ro.order_number} | ${statusLabel} | R$ ${Number(ro.total).toFixed(2)} | ${ro.delivery_type} | ${new Date(ro.created_at).toLocaleDateString('pt-BR')}`);
                    }
                }

                // -----------------------------------------------
                // 2. PEDIDO ATIVO — Com itens, motoboy, tempo
                // -----------------------------------------------
                const { data: activeOrder } = await supabase.from('orders')
                    .select('id, order_number, status, total, delivery_type, delivery_address, delivery_fee, motoboy_id, estimated_delivery_time, notes, created_at, order_source')
                    .eq('customer_phone', customerPhone)
                    .eq('restaurant_id', restaurantId)
                    .not('status', 'in', '("completed","cancelled")')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (activeOrder) {
                    customerContext.push(`\n# 🔥 PEDIDO ATIVO AGORA:`);
                    customerContext.push(`- Pedido: #${activeOrder.order_number}`);
                    customerContext.push(`- Status: ${translateStatus(activeOrder.status)}`);
                    customerContext.push(`- Valor Total: R$ ${Number(activeOrder.total).toFixed(2)}`);
                    customerContext.push(`- Tipo: ${activeOrder.delivery_type === 'delivery' ? 'Entrega' : activeOrder.delivery_type === 'pickup' ? 'Retirada' : 'Mesa'}`);
                    customerContext.push(`- Origem: ${activeOrder.order_source || 'pdv'}`);
                    customerContext.push(`- Feito em: ${new Date(activeOrder.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
                    
                    if (activeOrder.delivery_fee > 0) {
                        customerContext.push(`- Taxa de entrega: R$ ${Number(activeOrder.delivery_fee).toFixed(2)}`);
                    }
                    if (activeOrder.estimated_delivery_time) {
                        customerContext.push(`- Previsão de entrega: ${new Date(activeOrder.estimated_delivery_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
                    }
                    if (activeOrder.notes) {
                        customerContext.push(`- Observações: ${activeOrder.notes}`);
                    }
                    if (activeOrder.delivery_address) {
                        const addr = typeof activeOrder.delivery_address === 'string' ? JSON.parse(activeOrder.delivery_address) : activeOrder.delivery_address;
                        customerContext.push(`- Endereço de entrega: ${addr.street || ''} ${addr.number || ''} - ${addr.neighborhood || ''} ${addr.city || ''}`);
                    }

                    // Buscar itens do pedido ativo
                    const { data: orderItems } = await supabase.from('order_items')
                        .select('name, quantity, unit_price, notes')
                        .eq('order_id', activeOrder.id);
                    
                    if (orderItems && orderItems.length > 0) {
                        customerContext.push(`- Itens pedidos:`);
                        for (const item of orderItems) {
                            customerContext.push(`    • ${item.quantity}x ${item.name} (R$ ${Number(item.unit_price).toFixed(2)})${item.notes ? ` [${item.notes}]` : ''}`);
                        }
                    }

                    // Buscar motoboy se em entrega
                    if (activeOrder.motoboy_id) {
                        const { data: motoboys } = await supabase.from('motoboys')
                            .select('name, phone')
                            .eq('id', activeOrder.motoboy_id)
                            .limit(1);
                        const motoboy = motoboys && motoboys.length > 0 ? motoboys[0] : null;
                        if (motoboy) {
                            customerContext.push(`- 🛵 Motoboy: ${motoboy.name}${motoboy.phone ? ` (${motoboy.phone})` : ''}`);
                        }
                    }

                    // Última atualização de status
                    const { data: lastHistory } = await supabase.from('order_status_history')
                        .select('new_status, created_at')
                        .eq('order_id', activeOrder.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    
                    if (lastHistory) {
                        customerContext.push(`- Última atualização: ${translateStatus(lastHistory.new_status)} às ${new Date(lastHistory.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`);
                    }
                }

                // -----------------------------------------------
                // 3. CUPONS DE DESCONTO ATIVOS
                // -----------------------------------------------
                const { data: activeCoupons } = await supabase.from('coupons')
                    .select('code, type, discount_value, min_order_value, valid_until')
                    .eq('is_active', true)
                    .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`)
                    .limit(5);
                
                if (activeCoupons && activeCoupons.length > 0) {
                    customerContext.push(`\n# 🎫 CUPONS DE DESCONTO DISPONÍVEIS:`);
                    for (const c of activeCoupons) {
                        const discountText = c.type === 'percentage' 
                            ? `${c.discount_value}% de desconto`
                            : `R$ ${Number(c.discount_value).toFixed(2)} de desconto`;
                        const minText = c.min_order_value > 0 ? ` (pedido mínimo R$ ${Number(c.min_order_value).toFixed(2)})` : '';
                        const validText = c.valid_until ? ` válido até ${new Date(c.valid_until).toLocaleDateString('pt-BR')}` : '';
                        customerContext.push(`  - Código: *${c.code}* → ${discountText}${minText}${validText}`);
                    }
                }
            }

            // -----------------------------------------------
            // 4. CONTEXTO DO RESTAURANTE
            // -----------------------------------------------
            if (restaurantId) {
                const { data: restaurants } = await supabase.from('restaurants')
                    .select('name, phone, street, number, neighborhood, city, state')
                    .eq('id', restaurantId).limit(1);
                const restaurant = restaurants && restaurants.length > 0 ? restaurants[0] : null;
                
                if (restaurant) {
                    restaurantContext.push(`NOME DO RESTAURANTE: ${restaurant.name}`);
                    const address = [restaurant.street, restaurant.number, restaurant.neighborhood, restaurant.city, restaurant.state].filter(Boolean).join(', ');
                    restaurantContext.push(`ENDEREÇO: ${address || 'Não informado'}`);
                    restaurantContext.push(`TELEFONE/CONTATO: ${restaurant.phone || 'Não informado'}`);
                }

                // Horário de funcionamento
                const { data: settings } = await supabase.from('restaurant_settings')
                    .select('business_hours, payment_methods, delivery_options')
                    .eq('restaurant_id', restaurantId).maybeSingle();
                
                if (settings) {
                    if (settings.business_hours) {
                        restaurantContext.push(`\nHORÁRIO DE FUNCIONAMENTO: ${JSON.stringify(settings.business_hours)}`);
                    }
                    if (settings.payment_methods) {
                        restaurantContext.push(`FORMAS DE PAGAMENTO ACEITAS: ${JSON.stringify(settings.payment_methods)}`);
                    }
                    if (settings.delivery_options) {
                        restaurantContext.push(`OPÇÕES DE ENTREGA: ${JSON.stringify(settings.delivery_options)}`);
                    }
                }

                // Zonas de entrega
                const { data: deliveryZones } = await supabase.from('delivery_zones')
                    .select('min_distance, max_distance, fee')
                    .eq('restaurant_id', restaurantId)
                    .eq('is_active', true)
                    .order('min_distance');
                
                if (deliveryZones && deliveryZones.length > 0) {
                    restaurantContext.push(`\nTAXAS DE ENTREGA:`);
                    for (const zone of deliveryZones) {
                        restaurantContext.push(`  - ${zone.min_distance}-${zone.max_distance}km: R$ ${Number(zone.fee).toFixed(2)}`);
                    }
                }
                
                // Cardápio
                const menu = await getRestaurantMenu(restaurantId);
                restaurantContext.push(`\nCARDÁPIO ATUALIZADO (Use para informar preços e detalhes):\n${menu}`);
            }

            // 4b. Knowledge Base
            if (logic.knowledge_base) {
                restaurantContext.push(`\nINFORMAÇÕES ADICIONAIS / FAQ:\n${logic.knowledge_base}`);
            }

            // -----------------------------------------------
            // 5. PERSONA SDR OMNICHANNEL COMPLETA
            // -----------------------------------------------
            const sdrInstructions = `
# INSTRUÇÕES DE PERSONA (RECEPCIONISTA SDR OMNICHANNEL):
- Você é o recepcionista inteligente do restaurante. Seu objetivo primário é receber o cliente com excelência, responder dúvidas e SEMPRE direcioná-lo a fazer o pedido pelo site oficial.
- O SITE OFICIAL PARA PEDIDOS É: https://iapedido.deletrics.site/customer-menu?restaurantId=${restaurantId}
- NUNCA tente anotar pedidos pelo WhatsApp e NÃO processe pagamentos aqui. O sistema é automatizado.

## REGRAS DE ATENDIMENTO:
1. Se o cliente é NOVO: Dê boas-vindas calorosas e apresente o link do cardápio
2. Se o cliente é RECORRENTE: Reconheça-o pelo nome, mencione seus pontos de fidelidade
3. Se há PEDIDO ATIVO: Informe o status EXATO (ex: "está na cozinha agora, ~10 min!"). Use os dados acima.
4. Se pedido está com MOTOBOY: Diga o nome do motoboy e que está a caminho
5. Se o cliente perguntar "cadê meu pedido?": Consulte PEDIDO ATIVO acima e dê uma resposta precisa
6. Se perguntar sobre CUPONS: Informe os cupons disponíveis (veja lista acima)
7. Se perguntar sobre PONTOS/FIDELIDADE: Informe pontos e valor em reais disponível
8. Se o cliente quiser pedir: Envie o link → https://iapedido.deletrics.site/customer-menu?restaurantId=${restaurantId} com mensagem entusiasmada
9. Se reclamação ou problema complexo: Peça desculpa e diga que vai chamar um atendente humano
10. NUNCA invente informações! Se não souber, diga com honestidade.

## TOM DE VOZ:
- Natural, curto e direto. Nada de textão!
- Use emojis moderadamente (1-2 por mensagem)
- Fale como um atendente humano profissional, NÃO como robô
- Se for VIP (5+ pedidos), trate como cliente especial
`;

            const fullPrompt = `
${systemPrompt}

# PERFIL DO CLIENTE:
${customerContext.length > 0 ? customerContext.join('\n') : '- Novo cliente (primeiro contato)'}

# CONTEXTO DO RESTAURANTE:
${restaurantContext.join('\n')}

${sdrInstructions}

# CONTEXTO DO MOMENTO:
- Data/Hora Atual: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
`;

            if (!aiModel) {
                throw new Error("Gemini AI SDK não inicializado (chave ausente)");
            }

            // MODO DE COMPATIBILIDADE TOTAL: Prompt Único (Sem Roles/History)
            const combinedPrompt = `${fullPrompt}\n\n[CLIENTE DIZ]: "${message}"\n\n[RESPOSTA SDR]:`;
            
            const result = await aiModel.generateContent(combinedPrompt);
            const response = await result.response;
            const botMsg = response.text();

            if (!botMsg) {
                gLog('⚠️ Gemini retornou estrutura sem texto');
                return null;
            }

            return botMsg;
        }
    } catch (e) { gErr('Bot error:', e.message); }
    return null;
}

// ============================================
// HELPER: Traduzir status de pedido
// ============================================
function translateStatus(status) {
    const map = {
        'new': '🆕 Novo (Recebido)',
        'confirmed': '✅ Confirmado',
        'preparing': '👨‍🍳 Na Cozinha (Preparando)',
        'ready': '✨ Pronto para envio',
        'out_for_delivery': '🛵 Saiu para Entrega',
        'completed': '🎉 Entregue/Concluído',
        'cancelled': '❌ Cancelado',
        'ready_for_payment': '💳 Aguardando Pagamento',
        'pending_receipt': '📋 Aguardando Confirmação'
    };
    return map[status] || status;
}

// ============================================
// Get restaurant menu from Supabase
// ============================================
async function getRestaurantMenu(restaurantId) {
    try {
        const { data: categories } = await supabase
            .from('categories')
            .select('id, name, sort_order')
            .eq('restaurant_id', restaurantId)
            .eq('is_active', true)
            .order('sort_order');

        if (!categories || categories.length === 0) return 'Cardápio não disponível no momento.';

        let menu = '';
        for (const cat of categories) {
            const { data: products } = await supabase
                .from('menu_items')
                .select('name, description, price, promotional_price, is_available, preparation_time')
                .eq('category_id', cat.id)
                .eq('is_available', true)
                .order('name');

            if (products && products.length > 0) {
                menu += `\n📋 *${cat.name}*\n`;
                for (const p of products) {
                    const priceText = p.promotional_price && p.promotional_price < p.price
                        ? `~R$ ${Number(p.price).toFixed(2)}~ por R$ ${Number(p.promotional_price).toFixed(2)} 🔥`
                        : `R$ ${Number(p.price).toFixed(2)}`;
                    const timeText = p.preparation_time ? ` ⏱️${p.preparation_time}min` : '';
                    menu += `  • ${p.name} - ${priceText}${timeText}${p.description ? ` (${p.description})` : ''}\n`;
                }
            }
        }

        return menu || 'Cardápio não disponível no momento.';
    } catch {
        return 'Cardápio não disponível no momento.';
    }
}

// ============================================
// PROACTIVE ORDER STATUS NOTIFICATIONS
// (Supabase Realtime → Evolution API)
// ============================================
async function setupOrderStatusListener() {
    gLog('🔔 Iniciando listener proativo de status de pedidos...');
    
    const channel = supabase
        .channel('order-status-proactive')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'orders'
            },
            async (payload) => {
                try {
                    const oldStatus = payload.old?.status;
                    const newStatus = payload.new?.status;
                    const customerPhone = payload.new?.customer_phone;
                    const orderNumber = payload.new?.order_number;
                    const restaurantId = payload.new?.restaurant_id;
                    const orderId = payload.new?.id;
                    const motoboyId = payload.new?.motoboy_id;

                    // Ignorar se status não mudou ou não tem telefone
                    if (!oldStatus || oldStatus === newStatus || !customerPhone) return;
                    // Ignorar pedidos já notificados nesta transição
                    if (payload.new?.whatsapp_notified && newStatus !== 'completed') return;

                    gLog(`📢 STATUS CHANGE detectado: #${orderNumber} ${oldStatus} → ${newStatus} (cliente: ${customerPhone})`);

                    // Buscar dispositivo WhatsApp conectado do restaurante
                    const { data: device } = await supabase.from('whatsapp_devices')
                        .select('id, name')
                        .eq('restaurant_id', restaurantId)
                        .eq('connection_status', 'connected')
                        .maybeSingle();

                    if (!device) {
                        gLog(`⚠️ Sem dispositivo WhatsApp conectado para restaurant ${restaurantId}`);
                        return;
                    }

                    // Buscar nome do motoboy se aplicável
                    let motoboyName = null;
                    if (motoboyId && (newStatus === 'out_for_delivery' || newStatus === 'completed')) {
                        const { data: motoboy } = await supabase.from('motoboys')
                            .select('name').eq('id', motoboyId).single();
                        motoboyName = motoboy?.name;
                    }

                    // Gerar mensagem humanizada via Gemini
                    const notification = await generateStatusNotification(oldStatus, newStatus, orderNumber, motoboyName);
                    
                    if (notification) {
                        // Enviar via Evolution API
                        await evoFetch(`/message/sendText/${device.name}`, {
                            method: 'POST',
                            body: JSON.stringify({ number: customerPhone, text: notification }),
                        });
                        gLog(`✅ Notificação proativa enviada para ${customerPhone}: "${notification.substring(0, 60)}..."`);

                        // Salvar na conversa
                        const { data: conversations } = await supabase.from('whatsapp_conversations')
                            .select('id').eq('device_id', device.id)
                            .eq('contact_phone', customerPhone).limit(1);
                        const conv = conversations && conversations.length > 0 ? conversations[0] : null;
                        
                        if (conv) {
                            await supabase.from('whatsapp_messages').insert({
                                device_id: device.id, restaurant_id: restaurantId,
                                conversation_id: conv.id, phone_number: customerPhone,
                                message_content: notification, message_type: 'text',
                                direction: 'outgoing', remetente: 'bot',
                                is_from_bot: true,
                            });
                        }

                        // Marcar pedido como notificado
                        await supabase.from('orders')
                            .update({ whatsapp_notified: true })
                            .eq('id', orderId);

                        // Registrar no histórico
                        await supabase.from('order_status_history').insert({
                            order_id: orderId,
                            old_status: oldStatus,
                            new_status: newStatus,
                            customer_notified: true
                        });

                        // Se pedido COMPLETED → solicitar avaliação após 2 min
                        if (newStatus === 'completed') {
                            setTimeout(async () => {
                                const reviewMsg = `⭐ Obrigado por pedir com a gente!\n\nComo foi sua experiência? Responda com uma nota de *1 a 5* e nos ajude a melhorar! 😊\n\n⭐ = Ruim | ⭐⭐⭐ = OK | ⭐⭐⭐⭐⭐ = Excelente`;
                                await evoFetch(`/message/sendText/${device.name}`, {
                                    method: 'POST',
                                    body: JSON.stringify({ number: customerPhone, text: reviewMsg }),
                                });
                                gLog(`⭐ Pedido de avaliação enviado para ${customerPhone}`);

                                // Marcar conversa como aguardando review
                                if (conv) {
                                    await supabase.from('whatsapp_conversations')
                                        .update({ context: { awaiting_review: true, order_id: orderId } })
                                        .eq('id', conv.id);
                                    await supabase.from('whatsapp_messages').insert({
                                        device_id: device.id, restaurant_id: restaurantId,
                                        conversation_id: conv.id, phone_number: customerPhone,
                                        message_content: reviewMsg, message_type: 'text',
                                        direction: 'outgoing', remetente: 'bot',
                                        is_from_bot: true,
                                    });
                                }
                            }, 2 * 60 * 1000); // 2 minutos após entrega
                        }
                    }
                } catch (err) {
                    gErr('Erro no listener de status:', err.message);
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                gLog('✅ Listener proativo de pedidos ATIVO! Monitorando mudanças de status...');
            } else {
                gLog(`📡 Status do listener proativo: ${status}`);
            }
        });

    return channel;
}

// ============================================
// GENERATE HUMANIZED STATUS NOTIFICATION (Gemini)
// ============================================
async function generateStatusNotification(oldStatus, newStatus, orderNumber, motoboyName) {
    // Fallback messages (used if Gemini fails)
    const fallbackMessages = {
        'confirmed': `✅ Pedido #${orderNumber} confirmado! Já estamos preparando.`,
        'preparing': `👨‍🍳 Pedido #${orderNumber} entrou na cozinha! O preparo começou.`,
        'ready': `✨ Pedido #${orderNumber} pronto! ${motoboyName ? 'Motoboy já vai buscar!' : 'Aguardando retirada.'}`,
        'out_for_delivery': `🛵 Pedido #${orderNumber} saiu para entrega!${motoboyName ? ` Motoboy: ${motoboyName}` : ''}`,
        'completed': `🎉 Pedido #${orderNumber} entregue! Obrigado pela preferência!`,
        'cancelled': `❌ Pedido #${orderNumber} foi cancelado. Qualquer dúvida é só chamar!`
    };

    if (!aiModel) return fallbackMessages[newStatus] || `📋 Pedido #${orderNumber}: status atualizado para ${translateStatus(newStatus)}`;

    try {
        const prompt = `Você é o SDR WhatsApp de um restaurante. Gere UMA ÚNICA mensagem curta e humanizada (máximo 2 linhas) para notificar o cliente sobre a mudança de status do pedido.

Pedido: #${orderNumber}
Status anterior: ${translateStatus(oldStatus)}
Novo status: ${translateStatus(newStatus)}
${motoboyName ? `Motoboy: ${motoboyName}` : ''}

Regras:
- Seja natural e simpático, como um atendente humano
- Use 1-2 emojis relevantes
- NÃO use formatação markdown pesada
- Varie o texto (não seja repetitivo)
- Se for entrega, mencione o nome do motoboy se disponível
- Responda APENAS com a mensagem, nada mais`;

        const result = await aiModel.generateContent(prompt);
        const response = await result.response;
        const msg = response.text();
        return msg?.trim() || fallbackMessages[newStatus];
    } catch (err) {
        gErr('Erro ao gerar notificação IA:', err.message);
        return fallbackMessages[newStatus];
    }
}

// ============================================
// HANDLE REVIEW RESPONSE (1-5 stars)
// ============================================
async function handleReviewResponse(message, conversationId, restaurantId, customerPhone, deviceId) {
    // Verificar se a conversa está aguardando review
    const { data: conv } = await supabase.from('whatsapp_conversations')
        .select('context').eq('id', conversationId).single();
    
    if (!conv?.context?.awaiting_review) return null;

    const rating = parseInt(message.trim());
    if (isNaN(rating) || rating < 1 || rating > 5) return null;

    const orderId = conv.context.order_id;

    // Salvar avaliação
    try {
        await supabase.from('order_reviews').insert({
            order_id: orderId,
            restaurant_id: restaurantId,
            customer_phone: customerPhone,
            rating: rating,
            source: 'whatsapp'
        });
    } catch (err) {
        // Tabela pode não existir ainda, criar inline se necessário
        gLog(`⚠️ Erro ao salvar review (tabela pode não existir): ${err.message}`);
    }

    // Limpar flag de review
    await supabase.from('whatsapp_conversations')
        .update({ context: { awaiting_review: false } })
        .eq('id', conversationId);

    const responses = {
        1: 'Poxa, sentimos muito por não ter atendido suas expectativas 😞 Vamos trabalhar para melhorar! Obrigado pelo feedback.',
        2: 'Obrigado pelo feedback! Vamos melhorar na próxima. Conte com a gente! 💪',
        3: 'Valeu pela nota! Bom saber que foi razoável. Vamos caprichar mais na próxima! 😊',
        4: 'Que bom! Ficamos felizes que gostou! 🎉 Volte sempre!',
        5: 'UAU! Nota máxima! 🌟🌟🌟🌟🌟 Obrigado demais! Você é especial pra gente! ❤️'
    };

    return responses[rating] || 'Obrigado pelo feedback! 🙏';
}

// ============================================
// HEALTH CHECK — verifica conexão com Supabase
// ============================================
app.get('/health', async (req, res) => {
    let supabaseStatus = 'unknown';
    let supabaseError = null;
    let restaurantCount = 0;
    try {
        const { data, error, count } = await supabase
            .from('restaurants')
            .select('id', { count: 'exact', head: true });
        if (error) {
            supabaseStatus = 'error';
            supabaseError = error.message;
        } else {
            supabaseStatus = 'connected';
            restaurantCount = count || 0;
        }
    } catch (e) {
        supabaseStatus = 'unreachable';
        supabaseError = e.message;
    }

    res.json({
        status: supabaseStatus === 'connected' ? 'ok' : 'degraded',
        type: 'gourmetflow-whatsapp-server',
        evolutionApi: EVOLUTION_API_URL,
        evolutionWebhook: EVOLUTION_WEBHOOK_URL,
        supabase: {
            url: SUPABASE_URL,
            status: supabaseStatus,
            error: supabaseError,
            restaurants: restaurantCount,
            hasServiceKey: !!SUPABASE_SERVICE_KEY,
        },
        geminiAi: GEMINI_API_KEY ? 'configured' : 'not configured',
        proactiveNotifications: 'active',
        timestamp: new Date().toISOString(),
    });
});

// ============================================
// START + PROACTIVE LISTENER
// ============================================
async function saveMessageToSupabase(data, retryCount = 3) {
    for (let i = 0; i < retryCount; i++) {
        try {
            const { error } = await supabase.from('whatsapp_messages').insert(data);
            if (error) throw error;
            console.log(`[GourmetFlow] ✅ Mensagem salva no Supabase com sucesso! (phone=${data.customer_phone}, conv=${data.conversation_id})`);
            return true;
        } catch (err) {
            console.error(`[GourmetFlow] ❌ Tentativa ${i + 1}/${retryCount} - Erro ao salvar mensagem:`, err.message);
            if (i === retryCount - 1) {
                console.error('[GourmetFlow] ❌ Erro FINAL ao salvar no Supabase:', err);
                return false;
            }
            // Espera curta antes de tentar de novo (1s, 2s, 3s...)
            await new Promise(res => setTimeout(res, (i + 1) * 1000));
        }
    }
}

async function checkSupabase() {
    try {
        const { data, error } = await supabase.from('restaurants').select('id').limit(1);
        if (error) {
            console.error('[GourmetFlow] ❌ Erro RLS/DB Supabase:', error.message);
            return;
        }
        console.log('[GourmetFlow] ✅ Conexão com Supabase verificada com sucesso!');
    } catch (err) {
        console.error('[GourmetFlow] ❌ ❌ FALHA CRÍTICA de rede com Supabase:', err.message);
        console.error('[DETALHES]:', err);
    }
}
app.listen(PORT, async () => {
    gLog('========================================');
    gLog('🚀 GourmetFlow WhatsApp SDR Omnichannel iniciado!');
    gLog(`🔗 Evolution API: ${EVOLUTION_API_URL}`);
    gLog(`🗄️  Supabase URL: ${SUPABASE_URL}`);
    gLog(`🔑 Supabase Key: ${SUPABASE_SERVICE_KEY ? '✅ configurada' : '❌ NÃO CONFIGURADA'}`);
    gLog(`🤖 Gemini AI: ${GEMINI_API_KEY ? `✅ configurado (${GEMINI_API_KEY.substring(0, 10)}...)` : '❌ não configurado'}`);
    gLog(`📡 Porta: ${PORT}`);
    gLog('========================================');

    // Verificar conexão com Supabase ao iniciar
    try {
        const { error } = await supabase.from('restaurants').select('id').limit(1);
        if (error) {
            gErr(`❌ FALHA na conexão com Supabase: ${error.message}`);
            gErr('Verifique SUPABASE_URL e SUPABASE_SERVICE_KEY no .env');
        } else {
            gLog('✅ Conexão com Supabase verificada com sucesso!');

            // Iniciar listener proativo de status de pedidos
            await setupOrderStatusListener();
            gLog('🔔 Sistema de notificações proativas ATIVADO!');
        }
    } catch (e) {
        gErr(`❌ Supabase inacessível: ${e.message}`);
    }
});
