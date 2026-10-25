'use strict';
/* ══════════════════════════════════════════════════════════════
   CalcObra — Frontend conectado al Backend REST
   Autenticación y CRUD (Create / Read / Update / Delete)
   de cálculos mediante la API en /api/*
   ══════════════════════════════════════════════════════════════ */

let currentUser = null;
let authToken   = null;
const CALC_TYPES = ['muro', 'viga', 'col', 'contra', 'techo', 'piso', 'pintura'];

/* ── Inicialización ─────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
  authToken = localStorage.getItem('calcobra_token');
  const saved = localStorage.getItem('calcobra_user');
  if (authToken && saved) {
    try {
      currentUser = JSON.parse(saved);
      showApp();
    } catch { clearAuth(); }
  }
});

/* ── Helper de API ──────────────────────────────────────────── */
async function apiCall(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (authToken) opts.headers['Authorization'] = 'Bearer ' + authToken;
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('Error ' + res.status));
  return data;
}

/* ── Autenticación ──────────────────────────────────────────── */
function showRegister() {
  document.getElementById('login-form').style.display    = 'none';
  document.getElementById('register-form').style.display = 'block';
  clearErrors();
}
function showLogin() {
  document.getElementById('register-form').style.display = 'none';
  document.getElementById('login-form').style.display    = 'block';
  clearErrors();
}
function clearErrors() {
  document.getElementById('login-error').style.display    = 'none';
  document.getElementById('register-error').style.display = 'none';
}
function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent  = msg;
  el.style.display = 'block';
}

async function doLogin() {
  clearErrors();
  const username = document.getElementById('login-user').value.trim();
  const password = document.getElementById('login-pass').value;
  if (!username || !password) return showError('login-error', 'Completa todos los campos.');
  const btn = document.querySelector('#login-form .btn-primary');
  setBtnLoading(btn, true, 'Ingresando...');
  try {
    const data = await apiCall('POST', '/api/login', { username, password });
    storeSession(data);
    showApp();
  } catch (e) {
    showError('login-error', e.message);
  } finally {
    setBtnLoading(btn, false, 'Ingresar');
  }
}

async function doRegister() {
  clearErrors();
  const username = document.getElementById('reg-user').value.trim();
  const password = document.getElementById('reg-pass').value;
  const pass2    = document.getElementById('reg-pass2').value;
  if (!username || !password) return showError('register-error', 'Completa todos los campos.');
  if (password.length < 4) return showError('register-error', 'La contraseña debe tener al menos 4 caracteres.');
  if (password !== pass2)  return showError('register-error', 'Las contraseñas no coinciden.');
  const btn = document.querySelector('#register-form .btn-primary');
  setBtnLoading(btn, true, 'Creando cuenta...');
  try {
    const data = await apiCall('POST', '/api/register', { username, password });
    storeSession(data);
    showApp();
  } catch (e) {
    showError('register-error', e.message);
  } finally {
    setBtnLoading(btn, false, 'Registrarse');
  }
}

function storeSession(data) {
  authToken   = data.token;
  currentUser = data.user;
  localStorage.setItem('calcobra_token', authToken);
  localStorage.setItem('calcobra_user', JSON.stringify(currentUser));
}

function clearAuth() {
  authToken   = null;
  currentUser = null;
  localStorage.removeItem('calcobra_token');
  localStorage.removeItem('calcobra_user');
}

function showApp() {
  document.getElementById('topbar-username').textContent = currentUser.username;
  document.getElementById('auth-screen').style.display  = 'none';
  document.getElementById('app-screen').style.display   = 'flex';
  document.getElementById('help-btn').style.display     = 'flex';
  loadAllHistory();
}

function doLogout() {
  cancelEdit();
  clearAuth();
  document.getElementById('app-screen').style.display  = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('help-btn').style.display    = 'none';
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  showLogin();
}

/* Enter en formularios de auth */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const loginVisible = document.getElementById('login-form').style.display !== 'none';
  loginVisible ? doLogin() : doRegister();
});

/* ── Navegación ─────────────────────────────────────────────── */
function switchCalc(idx) {
  cancelEdit();
  document.querySelectorAll('.calc-panel').forEach((p, i) => p.classList.toggle('active', i === idx));
  document.querySelectorAll('.sidebar-item').forEach((n, i) => n.classList.toggle('active', i === idx));
}

/* ── Estado de edición (UPDATE) ─────────────────────────────── */
let editingId   = null;
let editingType = null;

function cancelEdit() {
  if (!editingId) return;
  editingId   = null;
  editingType = null;
  const bar = document.getElementById('edit-bar');
  if (bar) bar.style.display = 'none';
  document.querySelectorAll('.btn-calc').forEach(btn => {
    btn.textContent = 'Calcular';
    btn.classList.remove('btn-updating');
    btn.disabled = false;
  });
}

/**
 * Activa el modo edición: rellena los campos con los inputs guardados
 * y cambia el botón "Calcular" a "Actualizar".
 */
function startEdit(id, type, inputs) {
  cancelEdit();
  editingId   = id;
  editingType = type;

  const idx = CALC_TYPES.indexOf(type);
  /* Ir al panel sin cancelar (ya limpiamos antes) */
  document.querySelectorAll('.calc-panel').forEach((p, i) => p.classList.toggle('active', i === idx));
  document.querySelectorAll('.sidebar-item').forEach((n, i) => n.classList.toggle('active', i === idx));

  /* Pre-rellenar campos */
  fillInputs(type, inputs);

  /* Cambiar botón del panel activo */
  const panel = document.getElementById('panel-' + idx);
  const calcBtn = panel.querySelector('.btn-calc');
  calcBtn.textContent = 'Actualizar';
  calcBtn.classList.add('btn-updating');

  /* Barra de aviso de edición */
  let bar = document.getElementById('edit-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'edit-bar';
    bar.className = 'edit-bar';
    bar.innerHTML =
      '<span>✏ Modo edición activo — modifica los valores y pulsa <strong>Actualizar</strong></span>' +
      '<button class="btn-cancel-edit" onclick="cancelEdit()">✕ Cancelar</button>';
    panel.insertBefore(bar, panel.firstChild);
  } else {
    bar.style.display = 'flex';
    panel.insertBefore(bar, panel.firstChild);
  }
  /* Scroll suave al inicio del panel */
  document.querySelector('.main-content').scrollTo({ top: 0, behavior: 'smooth' });
}

function fillInputs(type, inputs) {
  const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
  switch (type) {
    case 'muro':
      setEspesor(inputs.espesor || 20);
      set('muro-largo', inputs.largo);
      set('muro-alto',  inputs.alto);
      break;
    case 'viga':    set('viga-largo',    inputs.largo); break;
    case 'col':     set('col-largo',     inputs.largo); break;
    case 'contra':
      set('contra-esp',   inputs.esp);
      set('contra-ancho', inputs.ancho);
      set('contra-largo', inputs.largo);
      break;
    case 'techo':
      set('techo-esp',   inputs.esp);
      set('techo-ancho', inputs.ancho);
      set('techo-largo', inputs.largo);
      break;
    case 'piso':
      set('piso-ancho', inputs.ancho);
      set('piso-largo', inputs.largo);
      break;
    case 'pintura': set('pintura-sup', inputs.sup); break;
  }
}

/* ── CRUD: guardar (Create o Update) ───────────────────────── */
async function saveCalc(type, inputs) {
  if (editingId) {
    /* UPDATE: recalcular con nuevos datos */
    const data = await apiCall('PUT', '/api/calculations/' + editingId, { inputs });
    cancelEdit();
    await renderHistory(type);
    return data;
  }
  /* CREATE: nuevo cálculo */
  const data = await apiCall('POST', '/api/calculations', { type, inputs });
  await renderHistory(type);
  return data;
}

/* ── CRUD: eliminar ─────────────────────────────────────────── */
async function deleteCalc(id, type) {
  if (!confirm('¿Eliminar este cálculo del historial?')) return;
  try {
    await apiCall('DELETE', '/api/calculations/' + id);
    await renderHistory(type);
  } catch (e) {
    alert('Error al eliminar: ' + e.message);
  }
}

/* ── Historial (READ) ───────────────────────────────────────── */
async function loadAllHistory() {
  for (const type of CALC_TYPES) {
    renderHistory(type); /* paralelo sin await para cargar más rápido */
  }
}

async function renderHistory(type) {
  const container = document.getElementById('hist-' + type);
  if (!container) return;
  container.innerHTML = '<div class="history-empty">Cargando...</div>';
  try {
    const data  = await apiCall('GET', '/api/calculations?type=' + type);
    const items = data.items || [];
    if (!items.length) {
      container.innerHTML = '<div class="history-empty">Sin cálculos guardados.</div>';
      return;
    }
    container.innerHTML = items.map(item => {
      const inputsJson = escAttr(JSON.stringify(item.inputs));
      const fecha = new Date(item.createdAt).toLocaleString('es-CO');
      return (
        '<div class="history-item">' +
          '<div class="hi-left">' +
            '<strong>' + escHtml(item.label) + '</strong>' +
            '<small>' + escHtml(item.detail) + ' &nbsp;·&nbsp; ' + fecha + '</small>' +
          '</div>' +
          '<div class="hi-right">' +
            '<button class="btn-edit" ' +
              'onclick=\'startEdit("' + item.id + '","' + item.type + '",' + inputsJson + ')\'' +
            '>✏ Editar</button>' +
            '<button class="btn-del" ' +
              'onclick="deleteCalc(\'' + item.id + '\',\'' + type + '\')"' +
            '>✕ Eliminar</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  } catch (e) {
    container.innerHTML = '<div class="history-empty">Error al cargar el historial.</div>';
    /* Si el token expiró, volver al login */
    if (e.message.includes('401') || e.message.includes('Sesión')) doLogout();
  }
}

/* ── Utilidades ─────────────────────────────────────────────── */
function setBtnLoading(btn, loading, label) {
  if (!btn) return;
  btn.disabled    = loading;
  btn.textContent = loading ? label : (btn.dataset.origLabel || label);
  if (!loading) btn.dataset.origLabel = label;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(s) {
  /* Para atributos onclick que ya están entre comillas simples */
  return String(s).replace(/'/g, '\\\'');
}

