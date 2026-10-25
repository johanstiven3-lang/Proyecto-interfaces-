// Pruebas de integración de la API (sin dependencias): npm test
const assert = require('assert');
const os = require('os'), fs = require('fs'), path = require('path');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'calcobra-'));
const server = require('./server');

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = 'http://localhost:' + server.address().port;
  let token;
  const call = async (method, url, body, tk = token) => {
    const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(tk ? { Authorization: 'Bearer ' + tk } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: res.status, data: await res.json().catch(() => ({})) };
  };
  const ok = (name) => console.log('✔', name);

  let r = await call('POST', '/api/register', { username: 'ana', password: '1234' });
  assert.equal(r.status, 201); token = r.data.token; ok('registro');
  assert.equal((await call('POST', '/api/register', { username: 'ANA', password: '1234' })).status, 409); ok('usuario duplicado rechazado');
  assert.equal((await call('POST', '/api/login', { username: 'ana', password: 'mal' })).status, 401); ok('login incorrecto rechazado');
  r = await call('POST', '/api/login', { username: 'ana', password: '1234' }); assert.equal(r.status, 200); ok('login');
  assert.equal((await call('GET', '/api/calculations', null, 'falso')).status, 401); ok('sin token → 401');

  r = await call('POST', '/api/calculations', { type: 'muro', inputs: { espesor: 20, largo: 2, alto: 3 } });
  assert.equal(r.status, 201);
  assert.equal(r.data.result.sup, 6);
  assert.equal(r.data.result.materials[0][1], 91.2); // 6 * 15.2
  assert.equal(r.data.result.materials[2][1], 720);  // 6 * 120
  const id = r.data.id; ok('CREATE cálculo (muro)');

  assert.equal((await call('POST', '/api/calculations', { type: 'muro', inputs: { espesor: 20, largo: -1, alto: 3 } })).status, 400); ok('validación rechaza valores <= 0');
  assert.equal((await call('POST', '/api/calculations', { type: 'xx', inputs: {} })).status, 400); ok('tipo inválido rechazado');

  r = await call('GET', '/api/calculations?type=muro'); assert.equal(r.data.items.length, 1); ok('READ lista');
  r = await call('PUT', '/api/calculations/' + id, { inputs: { espesor: 30, largo: 2, alto: 3 } });
  assert.equal(r.status, 200); assert.equal(r.data.result.materials[0][1], 132); ok('UPDATE cálculo');

  for (const [type, inputs] of [['viga', { largo: 2 }], ['col', { largo: 2 }], ['contra', { esp: 0.1, ancho: 2, largo: 3 }], ['techo', { esp: 0.1, ancho: 2, largo: 3 }], ['piso', { ancho: 2, largo: 3 }], ['pintura', { sup: 12 }]]) {
    assert.equal((await call('POST', '/api/calculations', { type, inputs })).status, 201);
  }
  ok('los 7 tipos de cálculo funcionan');
  r = await call('POST', '/api/calculations', { type: 'piso', inputs: { ancho: 2, largo: 3 } });
  assert.equal(r.data.result.total, 6.6); ok('piso +10 %');

  const other = (await call('POST', '/api/register', { username: 'beto', password: 'abcd' })).data.token;
  assert.equal((await call('DELETE', '/api/calculations/' + id, null, other)).status, 404); ok('aislamiento entre usuarios');

  assert.equal((await call('DELETE', '/api/calculations/' + id)).status, 200);
  assert.equal((await call('GET', '/api/calculations?type=muro')).data.items.length, 0); ok('DELETE cálculo');

  assert.equal((await call('PUT', '/api/me', { currentPassword: 'x', newPassword: 'nueva1' })).status, 403);
  assert.equal((await call('PUT', '/api/me', { currentPassword: '1234', newPassword: 'nueva1' })).status, 200);
  assert.equal((await call('POST', '/api/login', { username: 'ana', password: 'nueva1' })).status, 200); ok('cambio de contraseña');
  assert.equal((await call('DELETE', '/api/me', { password: 'nueva1' })).status, 200);
  assert.equal((await call('POST', '/api/login', { username: 'ana', password: 'nueva1' })).status, 401); ok('eliminar cuenta');

  const page = await fetch(base + '/'); assert.equal(page.status, 200); assert((await page.text()).includes('CalcObra')); ok('sirve el frontend');
  assert.equal((await fetch(base + '/..%2Fserver.js')).status, 403 || 404); ok('bloquea path traversal');
  console.log('\nTodas las pruebas pasaron.');
  server.close(); process.exit(0);
})().catch(e => { console.error('✘', e.message); process.exit(1); });
