let espesorMuro = 20;

/* ── Utilitarios ── */
function fmt(n) {
  if (n === 0) return '0';
  if (Number.isInteger(n)) return n.toString();
  return parseFloat(n.toFixed(4)).toString();
}

function buildRows(materials) {
  return materials
    .map(([mat, qty, unit]) =>
      `<tr>
        <td>${mat}</td>
        <td class="qty">${fmt(qty)}</td>
        <td>${unit}</td>
      </tr>`
    )
    .join('');
}

function showResult(id) {
  document.getElementById(id).classList.add('visible');
}

function setEspesor(v) {
  espesorMuro = v;
  document.getElementById('esp-20').classList.toggle('active', v === 20);
  document.getElementById('esp-30').classList.toggle('active', v === 30);
}

function calcMuro() {
  const largo = parseFloat(document.getElementById('muro-largo').value) || 0;
  const alto  = parseFloat(document.getElementById('muro-alto').value)  || 0;
  if (largo <= 0 || alto <= 0) return alert('Ingresa valores válidos mayores a 0.');

  const sup = largo * alto;

  // Rendimientos por m² según espesor
  let cemento, arena, ladrillos;
  if (espesorMuro === 20) {
    cemento   = sup * 15.2;
    arena     = sup * 0.115;
    ladrillos = Math.ceil(sup * 120);
  } else {
    cemento   = sup * 22;
    arena     = sup * 0.17;
    ladrillos = Math.ceil(sup * 130);
  }

  const materials = [
    ['Cemento',   cemento,   'kg'],
    ['Arena',     arena,     'm³'],
    ['Ladrillos', ladrillos, 'unidades'],
  ];

  document.getElementById('muro-sup').textContent   = fmt(sup);
  document.getElementById('muro-tbody').innerHTML   = buildRows(materials);
  showResult('res-muro');

  addToHistory(
    'muro',
    `Muro ${espesorMuro}cm — ${largo}m × ${alto}m`,
    `Sup: ${fmt(sup)} m² | Cem: ${fmt(cemento)} kg | Ladrillos: ${ladrillos}`
  );
}

function calcViga() {
  const largo = parseFloat(document.getElementById('viga-largo').value) || 0;
  if (largo <= 0) return alert('Ingresa un valor válido mayor a 0.');

  // Rendimientos por metro lineal
  const cemento  = largo * 9;
  const arena    = largo * 0.02;
  const piedra   = largo * 0.02;
  const hierro8  = largo * 4;
  const hierro4  = largo * 3;

  const materials = [
    ['Cemento',   cemento,  'kg'],
    ['Arena',     arena,    'm³'],
    ['Piedra',    piedra,   'm³'],
    ['Hierro Ø8', hierro8,  'm'],
    ['Hierro Ø4', hierro4,  'm'],
  ];

  document.getElementById('viga-tbody').innerHTML = buildRows(materials);
  showResult('res-viga');

  addToHistory(
    'viga',
    `Viga — ${largo} m`,
    `Cem: ${fmt(cemento)} kg | H8: ${fmt(hierro8)} m`
  );
}

function calcColumna() {
  const largo = parseFloat(document.getElementById('col-largo').value) || 0;
  if (largo <= 0) return alert('Ingresa un valor válido mayor a 0.');

  const cemento  = largo * 7.5;
  const arena    = largo * 0.016;
  const piedra   = largo * 0.016;
  const hierro10 = largo * 6;
  const hierro4  = largo * 3;

  const materials = [
    ['Cemento',    cemento,  'kg'],
    ['Arena',      arena,    'm³'],
    ['Piedra',     piedra,   'm³'],
    ['Hierro Ø10', hierro10, 'm'],
    ['Hierro Ø4',  hierro4,  'm'],
  ];

  document.getElementById('col-tbody').innerHTML = buildRows(materials);
  showResult('res-col');

  addToHistory(
    'col',
    `Columna — ${largo} m`,
    `Cem: ${fmt(cemento)} kg | H10: ${fmt(hierro10)} m`
  );
}
function calcContra() {
  const esp   = parseFloat(document.getElementById('contra-esp').value)   || 0;
  const ancho = parseFloat(document.getElementById('contra-ancho').value) || 0;
  const largo = parseFloat(document.getElementById('contra-largo').value) || 0;
  if (esp <= 0 || ancho <= 0 || largo <= 0) return alert('Ingresa valores válidos mayores a 0.');

  const vol = esp * ancho * largo;

  // Rendimientos por m³ de hormigón magro
  const cemento = vol * 105;
  const arena   = vol * 0.45;
  const piedra  = vol * 0.9;

  const materials = [
    ['Cemento', cemento, 'kg'],
    ['Arena',   arena,   'm³'],
    ['Piedra',  piedra,  'm³'],
  ];

  document.getElementById('contra-vol').textContent  = fmt(vol);
  document.getElementById('contra-tbody').innerHTML  = buildRows(materials);
  showResult('res-contra');

  addToHistory(
    'contra',
    `Contrapiso — ${esp}×${ancho}×${largo} m`,
    `Vol: ${fmt(vol)} m³ | Cem: ${fmt(cemento)} kg`
  );
}

function calcTecho() {
  const esp   = parseFloat(document.getElementById('techo-esp').value)   || 0;
  const ancho = parseFloat(document.getElementById('techo-ancho').value) || 0;
  const largo = parseFloat(document.getElementById('techo-largo').value) || 0;
  if (esp <= 0 || ancho <= 0 || largo <= 0) return alert('Ingresa valores válidos mayores a 0.');

  const sup = ancho * largo;

  const cemento  = sup * esp * 33;
  const arena    = sup * esp * 0.072;
  const piedra   = sup * esp * 0.072;
  const hierro8  = sup * esp * 7;
  const hierro6  = sup * esp * 4;

  const materials = [
    ['Cemento',   cemento,  'kg'],
    ['Arena',     arena,    'm³'],
    ['Piedra',    piedra,   'm³'],
    ['Hierro Ø8', hierro8,  'm'],
    ['Hierro Ø6', hierro6,  'm'],
  ];

  document.getElementById('techo-sup').textContent  = fmt(sup);
  document.getElementById('techo-tbody').innerHTML  = buildRows(materials);
  showResult('res-techo');

  addToHistory(
    'techo',
    `Techo — ${ancho}×${largo} m (e=${esp} m)`,
    `Sup: ${fmt(sup)} m² | Cem: ${fmt(cemento)} kg`
  );
}

function calcPiso() {
  const ancho = parseFloat(document.getElementById('piso-ancho').value) || 0;
  const largo = parseFloat(document.getElementById('piso-largo').value) || 0;
  if (ancho <= 0 || largo <= 0) return alert('Ingresa valores válidos mayores a 0.');

  const neta    = ancho * largo;
  const recorte = neta * 0.1;
  const total   = neta + recorte;

  document.getElementById('piso-neta').textContent    = `${fmt(neta)} m²`;
  document.getElementById('piso-recorte').textContent = `+${fmt(recorte)} m²`;
  document.getElementById('piso-total').textContent   = fmt(total);
  showResult('res-piso');

  addToHistory(
    'piso',
    `Piso — ${ancho} × ${largo} m`,
    `Neta: ${fmt(neta)} m² | Total+10%: ${fmt(total)} m²`
  );
}

function calcPintura() {
  const sup = parseFloat(document.getElementById('pintura-sup').value) || 0;
  if (sup <= 0) return alert('Ingresa un valor válido mayor a 0.');

  const RENDIMIENTO = 6; // m² por litro
  const litros = sup / RENDIMIENTO;

  document.getElementById('pintura-litros').textContent  = fmt(litros);
  document.getElementById('pintura-formula').textContent = `${fmt(sup)} m² ÷ ${RENDIMIENTO} m²/litro`;
  showResult('res-pintura');

  addToHistory(
    'pintura',
    `Pintura — ${fmt(sup)} m²`,
    `Litros necesarios: ${fmt(litros)}`
  );
}
