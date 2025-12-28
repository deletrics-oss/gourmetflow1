const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3089;
const DATA_FILE = path.join(__dirname, 'sites.json');
const SESSIONS = new Map();

const ADMIN_USER = 'admin';
const ADMIN_PASS = 'suporte@1';

const DEFAULT_SITES = [
    { id: '1', icon: 'pizza', title: 'IA Pedido', desc: 'Sistema de pedidos com WhatsApp e IA', url: 'https://iapedido.deletrics.site', color: '#f97316', order: 1 },
    { id: '2', icon: 'robot', title: 'Chatbot', desc: 'Chatbot SaaS para atendimento', url: 'https://chatbot.deletrics.site', color: '#8b5cf6', order: 2 },
    { id: '3', icon: 'calendar', title: 'Agendamento', desc: 'Sistema de agendamentos', url: 'https://agendamento.deletrics.site', color: '#10b981', order: 3 },
    { id: '4', icon: 'chart', title: 'Gestao Pro', desc: 'Sistema de gestao empresarial', url: 'https://gestaopro.deletrics.site', color: '#3b82f6', order: 4 },
    { id: '5', icon: 'headset', title: 'Suporte', desc: 'Sistema de tickets de suporte', url: 'https://suporte.deletrics.site', color: '#ec4899', order: 5 },
    { id: '6', icon: 'gamepad', title: 'Fight Arcade', desc: 'Site Fight Arcade', url: 'https://www.fightarcade.com.br', color: '#ef4444', order: 6 },
    { id: '7', icon: 'cloud', title: 'CloudPanel', desc: 'Painel de controle do servidor', url: 'https://206.183.130.29:8443/', color: '#06b6d4', order: 7 },
];

const ICONS = {
    pizza: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>',
    robot: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2M7.5 13A2.5 2.5 0 005 15.5 2.5 2.5 0 007.5 18a2.5 2.5 0 002.5-2.5A2.5 2.5 0 007.5 13m9 0a2.5 2.5 0 00-2.5 2.5 2.5 2.5 0 002.5 2.5 2.5 2.5 0 002.5-2.5 2.5 2.5 0 00-2.5-2.5z"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19a2 2 0 002 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.5 18.49l6-6.01 4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z"/></svg>',
    headset: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a9 9 0 00-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7a9 9 0 00-9-9z"/></svg>',
    gamepad: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
    cloud: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>',
};

function loadSites() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (e) { console.error('Error loading sites:', e); }
    saveSites(DEFAULT_SITES);
    return DEFAULT_SITES;
}

function saveSites(sites) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(sites, null, 2));
}

function generateId() {
    return crypto.randomBytes(8).toString('hex');
}

function generateSession() {
    return crypto.randomBytes(32).toString('hex');
}

function getCookie(req, name) {
    const cookies = req.headers.cookie || '';
    const match = cookies.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

function isAuthenticated(req) {
    const session = getCookie(req, 'session');
    return session && SESSIONS.has(session);
}

function getIcon(iconName) {
    return ICONS[iconName] || ICONS.link;
}

const CSS = `
:root {
    --bg-dark: #0f172a;
    --bg-card: #1e293b;
    --bg-card-hover: #334155;
    --text-primary: #f8fafc;
    --text-secondary: #94a3b8;
    --accent: #3b82f6;
    --success: #22c55e;
    --danger: #ef4444;
    --border: #334155;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { 
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
    background: var(--bg-dark);
    color: var(--text-primary);
    min-height: 100vh;
    line-height: 1.6;
}
.container { max-width: 1200px; margin: 0 auto; padding: 60px 24px; }
.header { text-align: center; margin-bottom: 60px; }
.header h1 { 
    font-size: 3rem; 
    font-weight: 700; 
    background: linear-gradient(135deg, #60a5fa, #a78bfa);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 12px;
}
.header p { color: var(--text-secondary); font-size: 1.1rem; }
.grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); 
    gap: 24px; 
}
.card { 
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 16px; 
    padding: 28px;
    text-decoration: none; 
    display: block;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
}
.card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--card-color);
}
.card:hover { 
    transform: translateY(-8px); 
    background: var(--bg-card-hover);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    border-color: var(--card-color);
}
.card-icon { 
    width: 56px; 
    height: 56px; 
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 20px;
    background: var(--card-color);
}
.card-icon svg { width: 28px; height: 28px; color: white; }
.card-title { 
    font-size: 1.35rem; 
    font-weight: 600; 
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
}
.status-dot {
    width: 10px;
    height: 10px;
    background: var(--success);
    border-radius: 50%;
    animation: pulse 2s infinite;
}
@keyframes pulse { 
    0%, 100% { opacity: 1; transform: scale(1); } 
    50% { opacity: 0.6; transform: scale(0.95); } 
}
.card-desc { color: var(--text-secondary); margin-bottom: 16px; font-size: 0.95rem; }
.card-url { 
    color: var(--accent); 
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 6px;
}
.card-url::after { content: ' ->'; }
.admin-float { 
    position: fixed; 
    bottom: 30px; 
    right: 30px; 
    background: var(--bg-card);
    border: 1px solid var(--border);
    color: var(--text-primary); 
    padding: 14px 24px; 
    border-radius: 50px; 
    text-decoration: none; 
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.3s;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
}
.admin-float:hover { background: var(--bg-card-hover); transform: translateY(-3px); }
.admin-float svg { width: 20px; height: 20px; }

/* Admin Styles */
.admin-container { max-width: 900px; margin: 0 auto; padding: 40px 24px; }
.back-link { 
    color: var(--accent); 
    text-decoration: none; 
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 30px;
    font-size: 0.95rem;
}
.back-link:hover { text-decoration: underline; }
.panel { 
    background: var(--bg-card); 
    border: 1px solid var(--border);
    border-radius: 16px; 
    padding: 32px;
    margin-bottom: 24px;
}
.panel h2 { font-size: 1.5rem; margin-bottom: 24px; }
.panel h3 { font-size: 1.1rem; margin: 24px 0 16px; color: var(--text-secondary); }
.form-row { 
    display: grid; 
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
    gap: 16px; 
    margin-bottom: 16px;
}
.form-group { margin-bottom: 16px; }
.form-group label { 
    display: block; 
    margin-bottom: 8px; 
    color: var(--text-secondary);
    font-size: 0.9rem;
}
.form-group input, .form-group select, .form-group textarea { 
    width: 100%; 
    padding: 12px 16px; 
    border: 1px solid var(--border);
    border-radius: 8px; 
    background: var(--bg-dark);
    color: var(--text-primary); 
    font-size: 1rem;
    transition: border-color 0.2s;
}
.form-group input:focus, .form-group select:focus { 
    outline: none; 
    border-color: var(--accent); 
}
.btn { 
    background: var(--accent);
    color: white; 
    padding: 12px 24px; 
    border: none; 
    border-radius: 8px; 
    font-size: 1rem; 
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
}
.btn:hover { filter: brightness(1.1); transform: translateY(-2px); }
.btn-full { width: 100%; justify-content: center; }
.btn-sm { padding: 8px 16px; font-size: 0.85rem; }
.btn-danger { background: var(--danger); }
.btn-outline { 
    background: transparent; 
    border: 1px solid var(--border);
    color: var(--text-primary);
}
.btn-outline:hover { background: var(--bg-card-hover); }
.site-list { margin-top: 20px; }
.site-item { 
    background: var(--bg-dark);
    padding: 20px;
    border-radius: 12px; 
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    border: 1px solid var(--border);
}
.site-info { flex: 1; min-width: 200px; }
.site-info strong { font-size: 1.1rem; display: block; margin-bottom: 4px; }
.site-info small { color: var(--text-secondary); }
.actions { display: flex; gap: 8px; }
.msg { 
    padding: 14px 20px; 
    border-radius: 8px; 
    margin-bottom: 20px;
    font-size: 0.95rem;
}
.msg-success { background: rgba(34,197,94,0.15); color: var(--success); border: 1px solid rgba(34,197,94,0.3); }
.msg-error { background: rgba(239,68,68,0.15); color: var(--danger); border: 1px solid rgba(239,68,68,0.3); }

/* Login */
.login-wrapper { 
    min-height: 100vh; 
    display: flex; 
    align-items: center; 
    justify-content: center;
    padding: 20px;
}
.login-box { 
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 48px;
    width: 100%;
    max-width: 420px;
}
.login-box h2 { 
    text-align: center; 
    margin-bottom: 32px;
    font-size: 1.75rem;
}
.icon-select { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
.icon-option { 
    padding: 12px; 
    border: 2px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    text-align: center;
    transition: all 0.2s;
}
.icon-option:hover { border-color: var(--accent); }
.icon-option.selected { border-color: var(--accent); background: rgba(59,130,246,0.1); }
.icon-option svg { width: 24px; height: 24px; }
.color-select { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.color-option { 
    width: 36px; 
    height: 36px; 
    border-radius: 8px;
    cursor: pointer;
    border: 3px solid transparent;
    transition: all 0.2s;
}
.color-option:hover { transform: scale(1.1); }
.color-option.selected { border-color: white; }
`;

function renderPortal(sites) {
    const cards = sites.sort((a, b) => a.order - b.order).map(site => `
        <a href="${site.url}" class="card" style="--card-color: ${site.color || '#3b82f6'}" target="_blank" rel="noopener">
            <div class="card-icon" style="background: ${site.color || '#3b82f6'}">
                ${getIcon(site.icon)}
            </div>
            <div class="card-title">
                <span class="status-dot"></span>
                ${site.title}
            </div>
            <div class="card-desc">${site.desc}</div>
            <div class="card-url">${site.url.replace('https://', '').replace('http://', '').split('/')[0]}</div>
        </a>
    `).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Deletrics - Portal de Sistemas</title>
    <style>${CSS}</style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Deletrics Systems</h1>
            <p>Portal de acesso rapido aos sistemas</p>
        </div>
        <div class="grid">${cards}</div>
    </div>
    <a href="/admin" class="admin-float">
        ${ICONS.settings}
        <span>Admin</span>
    </a>
</body>
</html>`;
}

function renderLogin(error = '') {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Portal Admin</title>
    <style>${CSS}</style>
</head>
<body>
    <div class="login-wrapper">
        <div class="login-box">
            <h2>Login Admin</h2>
            ${error ? `<div class="msg msg-error">${error}</div>` : ''}
            <form method="POST" action="/login">
                <div class="form-group">
                    <label>Usuario</label>
                    <input type="text" name="username" required autocomplete="username">
                </div>
                <div class="form-group">
                    <label>Senha</label>
                    <input type="password" name="password" required autocomplete="current-password">
                </div>
                <button type="submit" class="btn btn-full">Entrar</button>
            </form>
        </div>
    </div>
</body>
</html>`;
}

function renderAdmin(sites, msg = '', msgType = '') {
    const iconOptions = Object.keys(ICONS).map(key => `
        <div class="icon-option" data-icon="${key}" onclick="selectIcon('${key}')">
            ${ICONS[key]}
        </div>
    `).join('');

    const colors = ['#f97316', '#8b5cf6', '#10b981', '#3b82f6', '#ec4899', '#ef4444', '#06b6d4', '#eab308', '#84cc16'];
    const colorOptions = colors.map(c => `
        <div class="color-option" style="background: ${c}" data-color="${c}" onclick="selectColor('${c}')"></div>
    `).join('');

    const siteList = sites.sort((a, b) => a.order - b.order).map(site => `
        <div class="site-item">
            <div class="site-info">
                <strong style="color: ${site.color || '#3b82f6'}">${site.title}</strong>
                <small>${site.url}</small>
            </div>
            <div class="actions">
                <a href="/admin/edit/${site.id}" class="btn btn-sm btn-outline">Editar</a>
                <form method="POST" action="/admin/delete/${site.id}" style="display:inline" onsubmit="return confirm('Remover este site?')">
                    <button type="submit" class="btn btn-sm btn-danger">Remover</button>
                </form>
            </div>
        </div>
    `).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin - Portal Deletrics</title>
    <style>${CSS}</style>
</head>
<body>
    <div class="admin-container">
        <a href="/" class="back-link">Voltar ao Portal</a>
        
        <div class="panel">
            <h2>Gerenciar Sites</h2>
            ${msg ? `<div class="msg msg-${msgType}">${msg}</div>` : ''}
            
            <h3>Adicionar Novo Site</h3>
            <form method="POST" action="/admin/add">
                <div class="form-row">
                    <div class="form-group">
                        <label>Titulo</label>
                        <input type="text" name="title" placeholder="Nome do Site" required>
                    </div>
                    <div class="form-group">
                        <label>URL</label>
                        <input type="url" name="url" placeholder="https://exemplo.com" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Descricao</label>
                    <input type="text" name="desc" placeholder="Descricao curta do site" required>
                </div>
                <div class="form-group">
                    <label>Icone</label>
                    <div class="icon-select">${iconOptions}</div>
                    <input type="hidden" name="icon" id="selectedIcon" value="link">
                </div>
                <div class="form-group">
                    <label>Cor</label>
                    <div class="color-select">${colorOptions}</div>
                    <input type="hidden" name="color" id="selectedColor" value="#3b82f6">
                </div>
                <div class="form-group">
                    <label>Ordem</label>
                    <input type="number" name="order" value="${sites.length + 1}" min="1">
                </div>
                <button type="submit" class="btn btn-full">Adicionar Site</button>
            </form>
        </div>

        <div class="panel">
            <h2>Sites Cadastrados (${sites.length})</h2>
            <div class="site-list">${siteList || '<p style="color: var(--text-secondary)">Nenhum site cadastrado.</p>'}</div>
        </div>

        <div style="text-align: center; margin-top: 24px;">
            <a href="/logout" class="btn btn-danger">Sair</a>
        </div>
    </div>
    <script>
        function selectIcon(icon) {
            document.querySelectorAll('.icon-option').forEach(el => el.classList.remove('selected'));
            document.querySelector('[data-icon="'+icon+'"]').classList.add('selected');
            document.getElementById('selectedIcon').value = icon;
        }
        function selectColor(color) {
            document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
            document.querySelector('[data-color="'+color+'"]').classList.add('selected');
            document.getElementById('selectedColor').value = color;
        }
        document.querySelector('.icon-option').classList.add('selected');
        document.querySelector('.color-option').classList.add('selected');
    </script>
</body>
</html>`;
}

function renderEdit(site) {
    const iconOptions = Object.keys(ICONS).map(key => `
        <div class="icon-option ${site.icon === key ? 'selected' : ''}" data-icon="${key}" onclick="selectIcon('${key}')">
            ${ICONS[key]}
        </div>
    `).join('');

    const colors = ['#f97316', '#8b5cf6', '#10b981', '#3b82f6', '#ec4899', '#ef4444', '#06b6d4', '#eab308', '#84cc16'];
    const colorOptions = colors.map(c => `
        <div class="color-option ${site.color === c ? 'selected' : ''}" style="background: ${c}" data-color="${c}" onclick="selectColor('${c}')"></div>
    `).join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Editar Site - Portal Deletrics</title>
    <style>${CSS}</style>
</head>
<body>
    <div class="admin-container">
        <a href="/admin" class="back-link">Voltar ao Admin</a>
        
        <div class="panel">
            <h2>Editar Site</h2>
            <form method="POST" action="/admin/update/${site.id}">
                <div class="form-group">
                    <label>Titulo</label>
                    <input type="text" name="title" value="${site.title}" required>
                </div>
                <div class="form-group">
                    <label>URL</label>
                    <input type="url" name="url" value="${site.url}" required>
                </div>
                <div class="form-group">
                    <label>Descricao</label>
                    <input type="text" name="desc" value="${site.desc}" required>
                </div>
                <div class="form-group">
                    <label>Icone</label>
                    <div class="icon-select">${iconOptions}</div>
                    <input type="hidden" name="icon" id="selectedIcon" value="${site.icon}">
                </div>
                <div class="form-group">
                    <label>Cor</label>
                    <div class="color-select">${colorOptions}</div>
                    <input type="hidden" name="color" id="selectedColor" value="${site.color || '#3b82f6'}">
                </div>
                <div class="form-group">
                    <label>Ordem</label>
                    <input type="number" name="order" value="${site.order}" min="1">
                </div>
                <button type="submit" class="btn btn-full">Salvar Alteracoes</button>
            </form>
        </div>
    </div>
    <script>
        function selectIcon(icon) {
            document.querySelectorAll('.icon-option').forEach(el => el.classList.remove('selected'));
            document.querySelector('[data-icon="'+icon+'"]').classList.add('selected');
            document.getElementById('selectedIcon').value = icon;
        }
        function selectColor(color) {
            document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
            document.querySelector('[data-color="'+color+'"]').classList.add('selected');
            document.getElementById('selectedColor').value = color;
        }
    </script>
</body>
</html>`;
}

function parseBody(req) {
    return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            const params = new URLSearchParams(body);
            const data = {};
            for (const [key, value] of params) {
                data[key] = value;
            }
            resolve(data);
        });
    });
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    let sites = loadSites();

    if (pathname === '/' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(renderPortal(sites));
    }

    if (pathname === '/admin' && req.method === 'GET') {
        if (!isAuthenticated(req)) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end(renderLogin());
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(renderAdmin(sites));
    }

    if (pathname === '/login' && req.method === 'POST') {
        const data = await parseBody(req);
        if (data.username === ADMIN_USER && data.password === ADMIN_PASS) {
            const session = generateSession();
            SESSIONS.set(session, { user: ADMIN_USER, created: Date.now() });
            res.writeHead(302, {
                'Location': '/admin',
                'Set-Cookie': `session=${session}; Path=/; HttpOnly; Max-Age=86400`
            });
            return res.end();
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(renderLogin('Usuario ou senha incorretos'));
    }

    if (pathname === '/logout') {
        const session = getCookie(req, 'session');
        if (session) SESSIONS.delete(session);
        res.writeHead(302, {
            'Location': '/',
            'Set-Cookie': 'session=; Path=/; Max-Age=0'
        });
        return res.end();
    }

    if (pathname.startsWith('/admin/') && !isAuthenticated(req)) {
        res.writeHead(302, { 'Location': '/admin' });
        return res.end();
    }

    if (pathname === '/admin/add' && req.method === 'POST') {
        const data = await parseBody(req);
        const newSite = {
            id: generateId(),
            icon: data.icon || 'link',
            title: data.title,
            url: data.url,
            desc: data.desc,
            color: data.color || '#3b82f6',
            order: parseInt(data.order) || sites.length + 1
        };
        sites.push(newSite);
        saveSites(sites);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(renderAdmin(sites, 'Site adicionado com sucesso!', 'success'));
    }

    if (pathname.startsWith('/admin/edit/') && req.method === 'GET') {
        const id = pathname.split('/').pop();
        const site = sites.find(s => s.id === id);
        if (!site) {
            res.writeHead(302, { 'Location': '/admin' });
            return res.end();
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(renderEdit(site));
    }

    if (pathname.startsWith('/admin/update/') && req.method === 'POST') {
        const id = pathname.split('/').pop();
        const data = await parseBody(req);
        const index = sites.findIndex(s => s.id === id);
        if (index !== -1) {
            sites[index] = {
                ...sites[index],
                title: data.title,
                url: data.url,
                desc: data.desc,
                icon: data.icon,
                color: data.color,
                order: parseInt(data.order)
            };
            saveSites(sites);
        }
        res.writeHead(302, { 'Location': '/admin' });
        return res.end();
    }

    if (pathname.startsWith('/admin/delete/') && req.method === 'POST') {
        const id = pathname.split('/').pop();
        sites = sites.filter(s => s.id !== id);
        saveSites(sites);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(renderAdmin(sites, 'Site removido!', 'success'));
    }

    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 - Pagina nao encontrada</h1>');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Portal Deletrics running on port ${PORT}`);
    console.log(`Admin: http://localhost:${PORT}/admin`);
    console.log(`User: admin | Pass: suporte@1`);
});
