'use strict';
/**
 * CalcObra — Backend REST (Node.js >= 18, sin dependencias externas).
 *  - Autenticación: contraseñas con scrypt + salt, token firmado HMAC-SHA256 (7 días).
 *  - Persistencia: archivo JSON (data/db.json) con escritura atómica.
 *  - CRUD de cálculos por usuario + gestión de cuenta.
 *  - Sirve el frontend desde /public.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SECRET_FILE = path.join(DATA_DIR, 'secret.key');
const PUBLIC_DIR = path.join(__dirname, 'public');
const TOKEN_TTL = 7 * 24 * 3600 * 1000;
const MAX_PER_TYPE = 20;
const TYPES = ['muro', 'viga', 'col', 'contra', 'techo', 'piso', 'pintura'];

/* ---------- Persistencia ---------- */
fs.mkdirSync(DATA_DIR, { recursive: true });
let db = { users: [], calculations: [] };
if (fs.existsSync(DB_FILE)) db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

function save() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}

let SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  if (fs.existsSync(SECRET_FILE)) SECRET = fs.readFileSync(SECRET_FILE, 'utf8');
  else {
    SECRET = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SECRET_FILE, SECRET, { mode: 0o600 });
  }
}

/* ---------- Seguridad: contraseñas y tokens ---------- */
function hashPw(pw) {
  const salt = crypto.randomBytes(16);
  return salt.toString('hex') + ':' + crypto.scryptSync(pw, salt, 64).toString('hex');
}
function checkPw(pw, stored) {
  const [s, h] = stored.split(':');
  const test = crypto.scryptSync(pw, Buffer.from(s, 'hex'), 64);
  return crypto.timingSafeEqual(test, Buffer.from(h, 'hex'));
}
function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return body + '.' + sig;
}
function verify(token) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    return p.exp > Date.now() ? p : null;
  } catch { return null; }
}

/* ---------- Lógica de cálculo (rendimientos) ---------- */
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const r4 = n => parseFloat(n.toFixed(4));
const fmt = n => String(r4(n));
function num(v, name) {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > 100000)
    throw new HttpError(400, `${name}: ingresa un valor válido mayor a 0.`);
  return n;
}
const mats = list => list.map(([m, q, u]) => [m, r4(q), u]);

function calculate(type, i = {}) {
  switch (type) {
    case 'muro': {
      const espesor = Number(i.espesor);
      if (![20, 30].includes(espesor)) throw new HttpError(400, 'Espesor: debe ser 20 o 30 cm.');
      const largo = num(i.largo, 'Largo'), alto = num(i.alto, 'Alto');
      const sup = largo * alto;
      const k = espesor === 20 ? [15.2, 0.115, 120] : [22, 0.17, 130];
      const cemento = sup * k[0], arena = sup * k[1], ladrillos = Math.ceil(sup * k[2]);
      return {
        inputs: { espesor, largo, alto },
        label: `Muro ${espesor}cm — ${largo}m × ${alto}m`,
        detail: `Sup: ${fmt(sup)} m² | Cem: ${fmt(cemento)} kg | Ladrillos: ${ladrillos}`,
        result: { sup: r4(sup), materials: mats([['Cemento', cemento, 'kg'], ['Arena', arena, 'm³'], ['Ladrillos', ladrillos, 'unidades']]) }
      };
    }
    case 'viga': {
      const largo = num(i.largo, 'Largo');
      const cemento = largo * 9, h8 = largo * 4;
      return {
        inputs: { largo },
        label: `Viga — ${largo} m`,
        detail: `Cem: ${fmt(cemento)} kg | H8: ${fmt(h8)} m`,
        result: { materials: mats([['Cemento', cemento, 'kg'], ['Arena', largo * 0.02, 'm³'], ['Piedra', largo * 0.02, 'm³'], ['Hierro Ø8', h8, 'm'], ['Hierro Ø4', largo * 3, 'm']]) }
      };
    }
    case 'col': {
      const largo = num(i.largo, 'Largo');
      const cemento = largo * 7.5, h10 = largo * 6;
      return {
        inputs: { largo },
        label: `Columna — ${largo} m`,
        detail: `Cem: ${fmt(cemento)} kg | H10: ${fmt(h10)} m`,
        result: { materials: mats([['Cemento', cemento, 'kg'], ['Arena', largo * 0.016, 'm³'], ['Piedra', largo * 0.016, 'm³'], ['Hierro Ø10', h10, 'm'], ['Hierro Ø4', largo * 3, 'm']]) }
      };
    }
    case 'contra': {
      const esp = num(i.esp, 'Espesor'), ancho = num(i.ancho, 'Ancho'), largo = num(i.largo, 'Largo');
      const vol = esp * ancho * largo, cemento = vol * 105;
      return {
        inputs: { esp, ancho, largo },
        label: `Contrapiso — ${esp}×${ancho}×${largo} m`,
        detail: `Vol: ${fmt(vol)} m³ | Cem: ${fmt(cemento)} kg`,
        result: { vol: r4(vol), materials: mats([['Cemento', cemento, 'kg'], ['Arena', vol * 0.45, 'm³'], ['Piedra', vol * 0.9, 'm³']]) }
      };
    }
    case 'techo': {
      const esp = num(i.esp, 'Espesor'), ancho = num(i.ancho, 'Ancho'), largo = num(i.largo, 'Largo');
      const sup = ancho * largo, b = sup * esp, cemento = b * 33;
      return {
        inputs: { esp, ancho, largo },
        label: `Techo — ${ancho}×${largo} m (e=${esp} m)`,
        detail: `Sup: ${fmt(sup)} m² | Cem: ${fmt(cemento)} kg`,
        result: { sup: r4(sup), materials: mats([['Cemento', cemento, 'kg'], ['Arena', b * 0.072, 'm³'], ['Piedra', b * 0.072, 'm³'], ['Hierro Ø8', b * 7, 'm'], ['Hierro Ø6', b * 4, 'm']]) }
      };
    }
    case 'piso': {
      const ancho = num(i.ancho, 'Ancho'), largo = num(i.largo, 'Largo');
      const neta = ancho * largo, recorte = neta * 0.1, total = neta + recorte;
      return {
        inputs: { ancho, largo },
        label: `Piso — ${ancho} × ${largo} m`,
        detail: `Neta: ${fmt(neta)} m² | Total+10%: ${fmt(total)} m²`,
        result: { neta: r4(neta), recorte: r4(recorte), total: r4(total) }
      };
    }
    case 'pintura': {
      const sup = num(i.sup, 'Superficie'), RENDIMIENTO = 6;
      const litros = sup / RENDIMIENTO;
      return {
        inputs: { sup },
        label: `Pintura — ${fmt(sup)} m²`,
        detail: `Litros necesarios: ${fmt(litros)}`,
        result: { litros: r4(litros), rendimiento: RENDIMIENTO }
      };
    }
    default:
      throw new HttpError(400, 'Tipo de cálculo no válido.');
  }
}

/* ---------- Utilidades HTTP ---------- */
function send(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > 20 * 1024) { reject(new HttpError(413, 'Solicitud demasiado grande.')); req.destroy(); }
      else chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new HttpError(400, 'JSON inválido.')); }
    });
    req.on('error', reject);
  });
}
function authUser(req) {
  const h = req.headers.authorization || '';
  const p = verify(h.startsWith('Bearer ') ? h.slice(7) : '');
  const user = p && db.users.find(u => u.id === p.sub);
  if (!user) throw new HttpError(401, 'Sesión inválida o expirada. Inicia sesión de nuevo.');
  return user;
}
const publicUser = u => ({ id: u.id, username: u.username, created: u.created });
const session = u => ({ token: sign({ sub: u.id, exp: Date.now() + TOKEN_TTL }), user: publicUser(u) });

function validCreds(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password)
    throw new HttpError(400, 'Completa todos los campos.');
  if (!/^[\w.\-]{3,30}$/.test(username.trim()))
    throw new HttpError(400, 'El usuario debe tener 3-30 caracteres (letras, números, . _ -).');
  if (password.length < 4) throw new HttpError(400, 'La contraseña debe tener al menos 4 caracteres.');
  if (password.length > 128) throw new HttpError(400, 'La contraseña es demasiado larga.');
}

/* Límite simple contra fuerza bruta: 10 intentos fallidos / 10 min por IP */
const fails = new Map();
function checkRate(ip) {
  const f = fails.get(ip);
  if (f && f.until > Date.now() && f.n >= 10) throw new HttpError(429, 'Demasiados intentos. Espera unos minutos.');
}
function noteFail(ip) {
  const f = fails.get(ip);
  if (!f || f.until < Date.now()) fails.set(ip, { n: 1, until: Date.now() + 600000 });
  else f.n++;
}

/* ---------- Rutas API ---------- */
async function api(req, res, url) {
  const method = req.method, p = url.pathname, ip = req.socket.remoteAddress;

  if (method === 'POST' && p === '/api/register') {
    const { username, password } = await readBody(req);
    validCreds(username, password);
    const name = username.trim();
    if (db.users.some(u => u.username.toLowerCase() === name.toLowerCase()))
      throw new HttpError(409, 'Ese nombre de usuario ya existe.');
    const user = { id: crypto.randomUUID(), username: name, password: hashPw(password), created: Date.now() };
    db.users.push(user); save();
    return send(res, 201, session(user));
  }

  if (method === 'POST' && p === '/api/login') {
    checkRate(ip);
    const { username, password } = await readBody(req);
    if (typeof username !== 'string' || typeof password !== 'string' || !username.trim() || !password)
      throw new HttpError(400, 'Completa todos los campos.');
    const user = db.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!user || !checkPw(password, user.password)) {
      noteFail(ip);
      throw new HttpError(401, 'Usuario o contraseña incorrectos.');
    }
    fails.delete(ip);
    return send(res, 200, session(user));
  }

  const user = authUser(req); // todo lo siguiente requiere sesión

  if (p === '/api/me') {
    if (method === 'GET') return send(res, 200, { user: publicUser(user) });
    if (method === 'PUT') { // cambiar contraseña
      const { currentPassword, newPassword } = await readBody(req);
      if (typeof currentPassword !== 'string' || !checkPw(currentPassword, user.password))
        throw new HttpError(403, 'La contraseña actual es incorrecta.');
      validCreds(user.username, newPassword);
      user.password = hashPw(newPassword); save();
      return send(res, 200, { ok: true });
    }
    if (method === 'DELETE') { // eliminar cuenta y sus datos
      const { password } = await readBody(req);
      if (typeof password !== 'string' || !checkPw(password, user.password))
        throw new HttpError(403, 'La contraseña es incorrecta.');
      db.users = db.users.filter(u => u.id !== user.id);
      db.calculations = db.calculations.filter(c => c.userId !== user.id);
      save();
      return send(res, 200, { ok: true });
    }
  }

  if (p === '/api/calculations') {
    if (method === 'GET') {
      const type = url.searchParams.get('type');
      if (type && !TYPES.includes(type)) throw new HttpError(400, 'Tipo de cálculo no válido.');
      const list = db.calculations
        .filter(c => c.userId === user.id && (!type || c.type === type))
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(({ userId, ...rest }) => rest);
      return send(res, 200, { items: list });
    }
    if (method === 'POST') {
      const { type, inputs } = await readBody(req);
      const calc = calculate(type, inputs);
      const now = Date.now();
      const item = { id: crypto.randomUUID(), userId: user.id, type, ...calc, createdAt: now, updatedAt: now };
      db.calculations.push(item);
      const mine = db.calculations.filter(c => c.userId === user.id && c.type === type)
        .sort((a, b) => b.createdAt - a.createdAt);
      mine.slice(MAX_PER_TYPE).forEach(old => { db.calculations = db.calculations.filter(c => c.id !== old.id); });
      save();
      const { userId, ...out } = item;
      return send(res, 201, out);
    }
  }

  const m = p.match(/^\/api\/calculations\/([\w-]+)$/);
  if (m) {
    const item = db.calculations.find(c => c.id === m[1] && c.userId === user.id);
    if (!item) throw new HttpError(404, 'Cálculo no encontrado.');
    if (method === 'GET') { const { userId, ...out } = item; return send(res, 200, out); }
    if (method === 'PUT') {
      const { inputs } = await readBody(req);
      Object.assign(item, calculate(item.type, inputs), { updatedAt: Date.now() });
      save();
      const { userId, ...out } = item;
      return send(res, 200, out);
    }
    if (method === 'DELETE') {
      db.calculations = db.calculations.filter(c => c.id !== item.id); save();
      return send(res, 200, { ok: true });
    }
  }

  throw new HttpError(404, 'Ruta no encontrada.');
}

/* ---------- Archivos estáticos ---------- */
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function serveStatic(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Método no permitido.' });
  let p;
  try { p = decodeURIComponent(url.pathname); } catch { return send(res, 400, { error: 'URL inválida.' }); }
  if (p === '/') p = '/inicio.html';
  const file = path.normalize(path.join(PUBLIC_DIR, p));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, { error: 'Acceso denegado.' });
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, { error: 'No encontrado.' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  });
}

/* ---------- Servidor ---------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else serveStatic(req, res, url);
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.status, { error: e.message });
    console.error(e);
    send(res, 500, { error: 'Error interno del servidor.' });
  }
});

if (require.main === module) {
  server.listen(PORT, () => console.log(`CalcObra en http://localhost:${PORT}`));
}
module.exports = server;
