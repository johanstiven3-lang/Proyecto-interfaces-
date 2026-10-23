
let currentUser = null;

function showRegister() {
  document.getElementById('login-form').style.display = 'none';
  document.getElementById('register-form').style.display = 'block';
  clearErrors();
}

function showLogin() {
  document.getElementById('register-form').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
  clearErrors();
}

function clearErrors() {
  document.getElementById('login-error').style.display = 'none';
  document.getElementById('register-error').style.display = 'none';
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.style.display = 'block';
}

function getUsers() {
  return JSON.parse(localStorage.getItem('calcobra_users') || '{}');
}

function saveUsers(u) {
  localStorage.setItem('calcobra_users', JSON.stringify(u));
}

function doLogin() {
  clearErrors();
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (!user || !pass) return showError('login-error', 'Completa todos los campos.');

  const users = getUsers();
  if (!users[user] || users[user].password !== btoa(pass)) {
    return showError('login-error', 'Usuario o contraseña incorrectos.');
  }
  loginSuccess(user);
}

function doRegister() {
  clearErrors();
  const user  = document.getElementById('reg-user').value.trim();
  const pass  = document.getElementById('reg-pass').value;
  const pass2 = document.getElementById('reg-pass2').value;

  if (!user || !pass) return showError('register-error', 'Completa todos los campos.');
  if (pass.length < 4)  return showError('register-error', 'La contraseña debe tener al menos 4 caracteres.');
  if (pass !== pass2)   return showError('register-error', 'Las contraseñas no coinciden.');

  const users = getUsers();
  if (users[user]) return showError('register-error', 'Ese nombre de usuario ya existe.');

  users[user] = { password: btoa(pass), created: Date.now() };
  saveUsers(users);
  loginSuccess(user);
}

function loginSuccess(user) {
  currentUser = user;
  document.getElementById('topbar-username').textContent = user;
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app-screen').style.display  = 'flex';
  document.getElementById('help-btn').style.display    = 'flex';
  loadAllHistory();
}

function doLogout() {
  currentUser = null;
  document.getElementById('app-screen').style.display = 'none';
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('help-btn').style.display    = 'none';
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
  showLogin();
}
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const loginVisible = document.getElementById('login-form').style.display !== 'none';
  loginVisible ? doLogin() : doRegister();
});

function switchCalc(idx) {
  document.querySelectorAll('.calc-panel').forEach((p, i) => {
    p.classList.toggle('active', i === idx);
  });
  document.querySelectorAll('.sidebar-item').forEach((n, i) => {
    n.classList.toggle('active', i === idx);
  });
}

const CALC_TYPES = ['muro', 'viga', 'col', 'contra', 'techo', 'piso', 'pintura'];

function storageKey(type) {
  return `calcobra_${currentUser}_${type}`;
}

function getHistory(type) {
  return JSON.parse(localStorage.getItem(storageKey(type)) || '[]');
}

function saveHistory(type, arr) {
  localStorage.setItem(storageKey(type), JSON.stringify(arr));
}

function addToHistory(type, label, detail) {
  const h = getHistory(type);
  h.unshift({ id: Date.now(), label, detail, ts: new Date().toLocaleString('es-CO') });
  if (h.length > 20) h.pop();
  saveHistory(type, h);
  renderHistory(type);
}

function deleteFromHistory(type, id) {
  const h = getHistory(type).filter(x => x.id !== id);
  saveHistory(type, h);
  renderHistory(type);
}

function renderHistory(type) {
  const container = document.getElementById(`hist-${type}`);
  const h = getHistory(type);

  if (!h.length) {
    container.innerHTML = '<div class="history-empty">Sin cálculos guardados.</div>';
    return;
  }

  container.innerHTML = h.map(item => `
    <div class="history-item">
      <div class="hi-left">
        <strong>${item.label}</strong>
        <small>${item.detail} &nbsp;·&nbsp; ${item.ts}</small>
      </div>
      <div class="hi-right">
        <button class="btn-del" onclick="deleteFromHistory('${type}', ${item.id})">✕ Eliminar</button>
      </div>
    </div>
  `).join('');
}

function loadAllHistory() {
  CALC_TYPES.forEach(t => renderHistory(t));
}
