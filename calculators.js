'use strict';
/* ══════════════════════════════════════════════════════════════
   CalcObra — Lógica de calculadoras
   Cada función recopila los inputs, los envía al backend REST
   (via saveCalc definido en app.js) y muestra el resultado.
   ══════════════════════════════════════════════════════════════ */

let espesorMuro = 20;

/* ── Formato numérico ──────────────────────────────────────── */
function fmt(n) {
  if (n === 0) return '0';
  if (Number.isInteger(n)) return n.toString();
  return parseFloat(n.toFixed(4)).toString();
}

/* ── Renderizar tabla de materiales ───────────────────────── */
function buildRows(materials) {
  return materials
    .map(([mat, qty, unit]) =>
      '<tr>' +
        '<td>' + mat + '</td>' +
        '<td class="qty">' + fmt(qty) + '</td>' +
        '<td>' + unit + '</td>' +
      '</tr>'
    ).join('');
}

/* ── Mostrar caja de resultado ────────────────────────────── */
function showResult(id) {
  document.getElementById(id).classList.add('visible');
}

/* ── Toggle espesor de muro ───────────────────────────────── */
function setEspesor(v) {
  espesorMuro = v;
  document.getElementById('esp-20').classList.toggle('active', v === 20);
  document.getElementById('esp-30').classList.toggle('active', v === 30);
}

/* ── Helper: estado de carga en botón ────────────────────── */
function setCalcLoading(panelId, loading) {
  const btn = document.querySelector('#' + panelId + ' .btn-calc');
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    btn.dataset.origText = btn.textContent;
    btn.textContent = 'Cargando...';
  } else {
    btn.textContent = btn.dataset.origText || btn.textContent;
  }
}

/* ══════════════════════════════════════════════════════════════
   1. MURO DE LADRILLO
   ══════════════════════════════════════════════════════════════ */
async function calcMuro() {
  const largo = parseFloat(document.getElementById('muro-largo').value) || 0;
  const alto  = parseFloat(document.getElementById('muro-alto').value)  || 0;
  if (largo <= 0 || alto <= 0) return alert('Ingresa valores válidos mayores a 0.');

  setCalcLoading('panel-0', true);
  try {
    const data = await saveCalc('muro', { espesor: espesorMuro, largo, alto });
    const r = data.result;
    document.getElementById('muro-sup').textContent  = fmt(r.sup);
    document.getElementById('muro-tbody').innerHTML  = buildRows(r.materials);
    showResult('res-muro');
  } catch (e) {
    alert('Error al calcular: ' + e.message);
  } finally {
    setCalcLoading('panel-0', false);
  }
}

/* ══════════════════════════════════════════════════════════════
   2. VIGA DE HORMIGÓN
   ══════════════════════════════════════════════════════════════ */
async function calcViga() {
  const largo = parseFloat(document.getElementById('viga-largo').value) || 0;
  if (largo <= 0) return alert('Ingresa un valor válido mayor a 0.');

  setCalcLoading('panel-1', true);
  try {
    const data = await saveCalc('viga', { largo });
    document.getElementById('viga-tbody').innerHTML = buildRows(data.result.materials);
    showResult('res-viga');
  } catch (e) {
    alert('Error al calcular: ' + e.message);
  } finally {
    setCalcLoading('panel-1', false);
  }
}

/* ══════════════════════════════════════════════════════════════
   3. COLUMNAS DE HORMIGÓN
   ══════════════════════════════════════════════════════════════ */
async function calcColumna() {
  const largo = parseFloat(document.getElementById('col-largo').value) || 0;
  if (largo <= 0) return alert('Ingresa un valor válido mayor a 0.');

  setCalcLoading('panel-2', true);
  try {
    const data = await saveCalc('col', { largo });
    document.getElementById('col-tbody').innerHTML = buildRows(data.result.materials);
    showResult('res-col');
  } catch (e) {
    alert('Error al calcular: ' + e.message);
  } finally {
    setCalcLoading('panel-2', false);
  }
}

/* ══════════════════════════════════════════════════════════════
   4. CONTRAPISOS
   ══════════════════════════════════════════════════════════════ */
async function calcContra() {
  const esp   = parseFloat(document.getElementById('contra-esp').value)   || 0;
  const ancho = parseFloat(document.getElementById('contra-ancho').value) || 0;
  const largo = parseFloat(document.getElementById('contra-largo').value) || 0;
  if (esp <= 0 || ancho <= 0 || largo <= 0) return alert('Ingresa valores válidos mayores a 0.');

  setCalcLoading('panel-3', true);
  try {
    const data = await saveCalc('contra', { esp, ancho, largo });
    const r = data.result;
    document.getElementById('contra-vol').textContent = fmt(r.vol);
    document.getElementById('contra-tbody').innerHTML = buildRows(r.materials);
    showResult('res-contra');
  } catch (e) {
    alert('Error al calcular: ' + e.message);
  } finally {
    setCalcLoading('panel-3', false);
  }
}

/* ══════════════════════════════════════════════════════════════
   5. TECHO
   ══════════════════════════════════════════════════════════════ */
async function calcTecho() {
  const esp   = parseFloat(document.getElementById('techo-esp').value)   || 0;
  const ancho = parseFloat(document.getElementById('techo-ancho').value) || 0;
  const largo = parseFloat(document.getElementById('techo-largo').value) || 0;
  if (esp <= 0 || ancho <= 0 || largo <= 0) return alert('Ingresa valores válidos mayores a 0.');

  setCalcLoading('panel-4', true);
  try {
    const data = await saveCalc('techo', { esp, ancho, largo });
    const r = data.result;
    document.getElementById('techo-sup').textContent = fmt(r.sup);
    document.getElementById('techo-tbody').innerHTML = buildRows(r.materials);
    showResult('res-techo');
  } catch (e) {
    alert('Error al calcular: ' + e.message);
  } finally {
    setCalcLoading('panel-4', false);
  }
}

/* ══════════════════════════════════════════════════════════════
   6. PISOS
   ══════════════════════════════════════════════════════════════ */
async function calcPiso() {
  const ancho = parseFloat(document.getElementById('piso-ancho').value) || 0;
  const largo = parseFloat(document.getElementById('piso-largo').value) || 0;
  if (ancho <= 0 || largo <= 0) return alert('Ingresa valores válidos mayores a 0.');

  setCalcLoading('panel-5', true);
  try {
    const data = await saveCalc('piso', { ancho, largo });
    const r = data.result;
    document.getElementById('piso-neta').textContent    = fmt(r.neta) + ' m²';
    document.getElementById('piso-recorte').textContent = '+' + fmt(r.recorte) + ' m²';
    document.getElementById('piso-total').textContent   = fmt(r.total);
    showResult('res-piso');
  } catch (e) {
    alert('Error al calcular: ' + e.message);
  } finally {
    setCalcLoading('panel-5', false);
  }
}

/* ══════════════════════════════════════════════════════════════
   7. PINTURA
   ══════════════════════════════════════════════════════════════ */
async function calcPintura() {
  const sup = parseFloat(document.getElementById('pintura-sup').value) || 0;
  if (sup <= 0) return alert('Ingresa un valor válido mayor a 0.');

  setCalcLoading('panel-6', true);
  try {
    const data = await saveCalc('pintura', { sup });
    const r = data.result;
    document.getElementById('pintura-litros').textContent  = fmt(r.litros);
    document.getElementById('pintura-formula').textContent =
      fmt(sup) + ' m² ÷ ' + r.rendimiento + ' m²/litro';
    showResult('res-pintura');
  } catch (e) {
    alert('Error al calcular: ' + e.message);
  } finally {
    setCalcLoading('panel-6', false);
  }
}

