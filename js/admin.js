/* ==========================================================================
   IP7 · Editor de fotos del catálogo (herramienta interna)
   ========================================================================== */
(function () {
  'use strict';
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const CLAVE_TEMA = 'ip7-siemens-tema';

  /* ---- tema (mismo comportamiento que el catálogo) ---- */
  const iconos = { noche: '☀︎', dia: '☾' };
  function aplicarTema(t, destello) {
    document.documentElement.dataset.tema = t;
    $('#icono-tema').textContent = iconos[t];
    $('#logo-img').src = t === 'dia' ? 'img/logo-ip7-dia.png' : 'img/logo-ip7-noche.png';
    try { localStorage.setItem(CLAVE_TEMA, t); } catch (e) {}
    if (destello) { const d = $('#destello'); d.classList.remove('encender'); void d.offsetWidth; d.classList.add('encender'); }
  }
  let tg = null; try { tg = localStorage.getItem(CLAVE_TEMA); } catch (e) {}
  aplicarTema(tg || 'noche', false);
  $('#btn-tema').addEventListener('click', () =>
    aplicarTema(document.documentElement.dataset.tema === 'dia' ? 'noche' : 'dia', true));

  function brindis(t) {
    const el = $('#brindis'); el.textContent = t; el.classList.add('ver');
    clearTimeout(brindis._t); brindis._t = setTimeout(() => el.classList.remove('ver'), 2400);
  }

  /* ---- listado de slots (producto + índice de foto) ---- */
  const SLOTS = [];
  PRODUCTOS.forEach(p => p.fotos.forEach((f, i) => SLOTS.push({ producto: p, indice: i, archivo: f })));

  let slotActivo = null;

  function pintarLista(filtro) {
    const f = (filtro || '').toLowerCase();
    $('#lista-fotos').innerHTML = SLOTS
      .filter(s => !f || (s.producto.nombre + ' ' + s.producto.ref + ' ' + s.archivo).toLowerCase().includes(f))
      .map(s => `
        <button class="slot ${slotActivo && slotActivo.archivo === s.archivo ? 'activo' : ''}" data-archivo="${s.archivo}">
          <img src="img/${s.archivo}?v=${Date.now()}" alt="">
          <span>
            <span class="n">${s.producto.nombre}${s.producto.fotos.length > 1 ? ' · foto ' + (s.indice + 1) : ''}</span><br>
            <span class="f">${s.archivo}</span>
          </span>
        </button>`).join('');
  }
  pintarLista('');
  $('#buscar-slot').addEventListener('input', e => pintarLista(e.target.value));

  $('#lista-fotos').addEventListener('click', e => {
    const b = e.target.closest('.slot'); if (!b) return;
    slotActivo = SLOTS.find(s => s.archivo === b.dataset.archivo);
    $$('.slot').forEach(x => x.classList.toggle('activo', x === b));
    $('#destino').innerHTML = `Reemplazando <b>${slotActivo.producto.nombre}</b> → <code>img/${slotActivo.archivo}</code>`;
  });

  /* ---- lienzo ---- */
  const lienzo = $('#lienzo');
  const ctx = lienzo.getContext('2d');
  let imagen = null, escala = 1, dx = 0, dy = 0;

  function dimensiones() {
    const [w, h] = $('#formato').value.split('x').map(Number);
    return { w, h };
  }

  function dibujar() {
    const { w, h } = dimensiones();
    if (lienzo.width !== w || lienzo.height !== h) { lienzo.width = w; lienzo.height = h; }
    ctx.clearRect(0, 0, w, h);
    const fondo = $('#fondo').value;
    if (fondo !== 'transparente') { ctx.fillStyle = fondo; ctx.fillRect(0, 0, w, h); }
    if (!imagen) {
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.font = '500 26px "IBM Plex Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Sube una imagen', w / 2, h / 2);
      return;
    }
    const iw = imagen.width * escala, ih = imagen.height * escala;
    ctx.drawImage(imagen, w / 2 - iw / 2 + dx, h / 2 - ih / 2 + dy, iw, ih);
  }

  function ajustar(modo) {
    if (!imagen) return;
    const { w, h } = dimensiones();
    const k = modo === 'llenar'
      ? Math.max(w / imagen.width, h / imagen.height)
      : Math.min(w / imagen.width, h / imagen.height) * 0.96;
    escala = k; dx = 0; dy = 0;
    $('#zoom').value = Math.min(4, Math.max(0.2, escala));
    $('#zoom-val').textContent = Math.round(escala * 100) + '%';
    dibujar();
  }

  function cargarArchivo(file) {
    if (!file || !file.type.startsWith('image/')) { brindis('Ese archivo no es una imagen'); return; }
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => { imagen = im; ajustar('encajar'); URL.revokeObjectURL(url); };
    im.onerror = () => brindis('No pudimos leer la imagen');
    im.src = url;
  }

  $('#zona').addEventListener('click', () => $('#archivo').click());
  $('#archivo').addEventListener('change', e => cargarArchivo(e.target.files[0]));
  ['dragenter', 'dragover'].forEach(ev => $('#zona').addEventListener(ev, e => {
    e.preventDefault(); $('#zona').classList.add('sobre');
  }));
  ['dragleave', 'drop'].forEach(ev => $('#zona').addEventListener(ev, e => {
    e.preventDefault(); $('#zona').classList.remove('sobre');
  }));
  $('#zona').addEventListener('drop', e => cargarArchivo(e.dataTransfer.files[0]));

  $('#zoom').addEventListener('input', e => {
    escala = +e.target.value; $('#zoom-val').textContent = Math.round(escala * 100) + '%'; dibujar();
  });
  $('#fondo').addEventListener('change', dibujar);
  $('#formato').addEventListener('change', () => { ajustar('encajar'); });
  $('#btn-encajar').addEventListener('click', () => ajustar('encajar'));
  $('#btn-llenar').addEventListener('click', () => ajustar('llenar'));
  $('#btn-reset').addEventListener('click', () => { dx = 0; dy = 0; dibujar(); });

  /* arrastrar para encuadrar */
  let arrastrando = false, px = 0, py = 0;
  lienzo.addEventListener('pointerdown', e => {
    if (!imagen) return;
    arrastrando = true; px = e.clientX; py = e.clientY; lienzo.setPointerCapture(e.pointerId);
  });
  lienzo.addEventListener('pointermove', e => {
    if (!arrastrando) return;
    const k = lienzo.width / lienzo.getBoundingClientRect().width;
    dx += (e.clientX - px) * k; dy += (e.clientY - py) * k;
    px = e.clientX; py = e.clientY; dibujar();
  });
  ['pointerup', 'pointercancel'].forEach(ev => lienzo.addEventListener(ev, () => arrastrando = false));
  lienzo.addEventListener('wheel', e => {
    if (!imagen) return;
    e.preventDefault();
    escala = Math.min(4, Math.max(0.2, escala * (e.deltaY < 0 ? 1.06 : 0.94)));
    $('#zoom').value = escala; $('#zoom-val').textContent = Math.round(escala * 100) + '%';
    dibujar();
  }, { passive: false });

  /* ---- exportar ---- */
  function nombreSalida() {
    if (!slotActivo) return null;
    const png = $('#fondo').value === 'transparente';
    return png ? slotActivo.archivo.replace(/\.\w+$/, '.png') : slotActivo.archivo;
  }
  function blobSalida() {
    const png = $('#fondo').value === 'transparente';
    return new Promise(res => lienzo.toBlob(res, png ? 'image/png' : 'image/jpeg', 0.9));
  }

  $('#btn-descargar').addEventListener('click', async () => {
    if (!imagen) { brindis('Sube una imagen primero'); return; }
    if (!slotActivo) { brindis('Elige qué foto vas a reemplazar'); return; }
    const blob = await blobSalida();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombreSalida();
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    brindis('Descargada como ' + nombreSalida());
  });

  let carpeta = null;
  $('#btn-guardar').addEventListener('click', async () => {
    if (!imagen) { brindis('Sube una imagen primero'); return; }
    if (!slotActivo) { brindis('Elige qué foto vas a reemplazar'); return; }
    if (!window.showDirectoryPicker) {
      brindis('Tu navegador no permite guardar directo; usa Descargar');
      return;
    }
    try {
      if (!carpeta) {
        carpeta = await window.showDirectoryPicker({ mode: 'readwrite' });
      }
      const nombre = nombreSalida();
      const fh = await carpeta.getFileHandle(nombre, { create: true });
      const ws = await fh.createWritable();
      await ws.write(await blobSalida());
      await ws.close();
      brindis('Guardada: ' + nombre);
      const png = $('#fondo').value === 'transparente';
      if (png && nombre !== slotActivo.archivo) {
        $('#estado').innerHTML =
          `Guardaste <code>${nombre}</code>. Como cambió la extensión, actualiza
           <code>js/datos.js</code> y reemplaza <code>${slotActivo.archivo}</code> por <code>${nombre}</code>.`;
      }
      pintarLista($('#buscar-slot').value);
    } catch (e) {
      if (e && e.name === 'AbortError') return;
      carpeta = null;
      brindis('No se pudo guardar: ' + (e && e.message ? e.message : 'error'));
    }
  });

  dibujar();
})();
