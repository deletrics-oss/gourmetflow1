require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 3088;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || 'https://evolution2.deletrics.site').replace(/\/$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'chatbot_premium_key_2026';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://npxhdsodvboqxrauwuwy.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
const RESTAURANT_ID = process.env.RESTAURANT_ID || null;

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

function mapStatus(state) {
    if (!state) return 'disconnected';
    const s = (state.state || state.status || state || '').toString().toLowerCase();
    if (s === 'open' || s === 'connected') return 'connected';
    if (s === 'connecting') return 'connecting';
    return 'disconnected';
}

// ============================================
// HELPER: get restaurant_id (from header, query, or env)
// ============================================
function getRestaurantId(req) {
    return req.query.restaurantId || req.headers['x-restaurant-id'] || RESTAURANT_ID;
}

// ============================================
// API: DEVICES
// ============================================

// GET /api/devices — list instances, sync to Supabase
app.get('/api/devices', async (req, res) => {
    try {
        const restaurantId = getRestaurantId(req);
        
        // Fetch instances from Evolution API
        const instances = await evoFetch('/instance/fetchInstances');
        
        if (!Array.isArray(instances) || instances.length === 0) {
            // Fallback: return from Supabase
            if (restaurantId) {
                const { data } = await supabase.from('whatsapp_devices').select('*').eq('restaurant_id', restaurantId);
                return res.json((data || []).map(d => ({
                    id: d.id, name: d.name,
                    connectionStatus: d.connection_status || 'disconnected',
                    phoneNumber: d.phone_number, qrCode: d.qr_code,
                    activeLogicId: d.active_logic_id,
                    integration: 'EVOLUTION',
                })));
            }
            return res.json([]);
        }

        const devices = [];
        for (const inst of instances) {
            const name = inst.instance?.instanceName || inst.instanceName || 'unknown';
            const instanceId = inst.instance?.instanceId || inst.instanceId || name;
            const state = inst.instance?.state || inst.instance?.status || 'disconnected';
            const phone = inst.instance?.owner?.replace('@s.whatsapp.net', '') || null;
            const status = mapStatus(state);

            // Sync to Supabase: upsert by name
            if (restaurantId) {
                const { data: existing } = await supabase
                    .from('whatsapp_devices')
                    .select('id')
                    .eq('name', name)
                    .eq('restaurant_id', restaurantId)
                    .maybeSingle();

                if (existing) {
                    await supabase.from('whatsapp_devices').update({
                        connection_status: status,
                        phone_number: phone,
                        ...(status === 'connected' ? { last_connected_at: new Date().toISOString() } : {}),
                    }).eq('id', existing.id);

                    devices.push({
                        id: existing.id, name, connectionStatus: status,
                        phoneNumber: phone, qrCode: null,
                        activeLogicId: null, integration: 'EVOLUTION',
                    });

                    // Fetch active_logic_id
                    const { data: full } = await supabase.from('whatsapp_devices').select('active_logic_id').eq('id', existing.id).single();
                    if (full) devices[devices.length - 1].activeLogicId = full.active_logic_id;
                } else {
                    const newId = uuidv4();
                    await supabase.from('whatsapp_devices').insert({
                        id: newId, name, connection_status: status,
                        phone_number: phone, restaurant_id: restaurantId,
                    });
                    devices.push({
                        id: newId, name, connectionStatus: status,
                        phoneNumber: phone, qrCode: null,
                        activeLogicId: null, integration: 'EVOLUTION',
                    });
                }
            } else {
                devices.push({
                    id: instanceId, name, connectionStatus: status,
                    phoneNumber: phone, qrCode: null,
                    activeLogicId: null, integration: 'EVOLUTION',
                });
            }
        }

        res.json(devices);
    } catch (err) {
        console.error('[GET /api/devices]', err.message);
        res.json([]);
    }
});

// POST /api/devices — create instance
app.post('/api/devices', async (req, res) => {
    try {
        const { name } = req.body;
        const restaurantId = getRestaurantId(req);
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
            await supabase.from('whatsapp_devices').insert({
                id: newId, name: instanceName,
                connection_status: qr ? 'qr_ready' : 'connecting',
                restaurant_id: restaurantId,
            });
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

        res.json({ connectionStatus: qr ? 'qr_ready' : currentState, qrCode: qr, message: qr ? 'Escaneie o QR Code' : 'Reconectando...' });
    } catch (err) {
        console.error('[POST /api/devices/:id]', err.message);
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

// DELETE /api/devices/:id
app.delete('/api/devices/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: device } = await supabase.from('whatsapp_devices').select('name').eq('id', id).single();

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
        const { data: device } = await supabase.from('whatsapp_devices').select('name').eq('id', id).single();
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
            aiPrompt: l.ai_prompt, isActive: l.is_active,
        })));
    } catch (err) {
        res.json([]);
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
        if (event === 'messages.upsert' && data?.message) {
            const msg = data.message;
            const phone = msg.key?.remoteJid?.replace('@s.whatsapp.net', '');
            if (!phone || phone.includes('@g.us') || msg.key?.fromMe) {
                gLog(`⏭️ Mensagem ignorada (grupo/fromMe/inválido) de ${msg.key?.remoteJid}`);
                return res.json({ ok: true });
            }

            const content = msg.message?.conversation ||
                msg.message?.extendedTextMessage?.text || '[Media]';
            const contactName = msg.pushName || phone;

            gLog(`💬 Mensagem recebida de ${contactName} (${phone}): "${content.substring(0, 80)}${content.length > 80 ? '...' : ''}"`);

            // Find device in Supabase
            const { data: device, error: devErr } = await supabase.from('whatsapp_devices')
                .select('id, restaurant_id, active_logic_id').eq('name', instance).maybeSingle();

            if (devErr) gErr('Erro ao buscar device:', devErr.message);
            if (!device) {
                gLog(`⚠️ Device "${instance}" não encontrado no Supabase — mensagem não processada`);
                return res.json({ ok: true });
            }

            gLog(`📱 Device encontrado: id=${device.id}, restaurant_id=${device.restaurant_id}`);

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
                    device_id: device.id, restaurant_id: device.restaurant_id,
                    contact_name: contactName, contact_phone: phone,
                    last_message_at: new Date().toISOString(), unread_count: 1,
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

            // Auto-respond with AI if logic is active
            if (device.active_logic_id) {
                gLog(`🤖 Lógica ativa encontrada: ${device.active_logic_id} — gerando resposta AI...`);
                const { data: logic } = await supabase.from('whatsapp_logic_configs')
                    .select('*').eq('id', device.active_logic_id).eq('is_active', true).maybeSingle();

                if (logic) {
                    const response = await generateBotResponse(content, logic, device.restaurant_id);
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
                    } else {
                        gLog(`⚠️ AI não gerou resposta para esta mensagem`);
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
// AI BOT RESPONSE (with restaurant menu context)
// ============================================
async function generateBotResponse(message, logic, restaurantId) {
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
                        // Handle special actions
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

        // AI response (Gemini)
        if ((logic.logic_type === 'ai' || logic.logic_type === 'hybrid') && GEMINI_API_KEY) {
            let systemPrompt = logic.ai_prompt || 'Você é um assistente de restaurante.';

            // Inject restaurant menu into AI context
            if (restaurantId) {
                const menu = await getRestaurantMenu(restaurantId);
                const { data: restaurant } = await supabase.from('restaurants')
                    .select('name, phone, address').eq('id', restaurantId).single();

                systemPrompt += `\n\nINFORMAÇÕES DO RESTAURANTE:\nNome: ${restaurant?.name || 'Restaurante'}\nTelefone: ${restaurant?.phone || ''}\nEndereço: ${restaurant?.address || ''}\n\nCARDÁPIO COMPLETO:\n${menu}`;
            }

            const resp = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [
                            { role: 'user', parts: [{ text: systemPrompt }] },
                            { role: 'model', parts: [{ text: 'Entendido! Estou pronto para atender.' }] },
                            { role: 'user', parts: [{ text: message }] }
                        ],
                        generationConfig: { maxOutputTokens: 512, temperature: 0.7 }
                    })
                }
            );
            const data = await resp.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
        }
    } catch (e) { console.error('Bot error:', e.message); }
    return null;
}

// Get restaurant menu from Supabase
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
                .from('products')
                .select('name, description, price, is_available')
                .eq('category_id', cat.id)
                .eq('is_available', true)
                .order('name');

            if (products && products.length > 0) {
                menu += `\n📋 *${cat.name}*\n`;
                for (const p of products) {
                    menu += `  • ${p.name} - R$ ${Number(p.price).toFixed(2)}${p.description ? ` (${p.description})` : ''}\n`;
                }
            }
        }

        return menu || 'Cardápio não disponível no momento.';
    } catch {
        return 'Cardápio não disponível no momento.';
    }
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
        supabase: {
            url: SUPABASE_URL,
            status: supabaseStatus,
            error: supabaseError,
            restaurants: restaurantCount,
            hasServiceKey: !!SUPABASE_SERVICE_KEY,
        },
        geminiAi: GEMINI_API_KEY ? 'configured' : 'not configured',
        timestamp: new Date().toISOString(),
    });
});

// ============================================
// START
// ============================================
app.listen(PORT, async () => {
    gLog('========================================');
    gLog('🚀 GourmetFlow WhatsApp Server iniciado!');
    gLog(`🔗 Evolution API: ${EVOLUTION_API_URL}`);
    gLog(`🗄️  Supabase URL: ${SUPABASE_URL}`);
    gLog(`🔑 Supabase Key: ${SUPABASE_SERVICE_KEY ? '✅ configurada' : '❌ NÃO CONFIGURADA'}`);
    gLog(`🤖 Gemini AI: ${GEMINI_API_KEY ? '✅ configurado' : '❌ não configurado'}`);
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
        }
    } catch (e) {
        gErr(`❌ Supabase inacessível: ${e.message}`);
    }
});
