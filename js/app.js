/* ==========================================================================
   IP7 · Catálogo SIEMENS — lógica del sitio
   ========================================================================== */
(function () {
  'use strict';

  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const CLAVE_TEMA = 'ip7-siemens-tema';
  const CLAVE_CARRITO = 'ip7-siemens-carrito';

  /* ---------------------------------------------------------------- utils */
  const cop = n => '$ ' + Math.round(n).toLocaleString('es-CO');

  function minimoDe(p) {
    if (CONFIG.minimoGlobal) return CONFIG.minimoGlobal;
    if (p.minimo) return p.minimo;
    if (p.escalas && p.escalas.length) return p.escalas[0][0];
    return CONFIG.minimoPorDefecto;
  }
  function precioPara(p, cantidad) {
    if (!p.escalas || !p.escalas.length) return null;
    let precio = p.escalas[0][2];
    for (const [desde, hasta, valor] of p.escalas) {
      if (cantidad >= desde && (hasta === null || cantidad <= hasta)) return valor;
      if (cantidad > desde) precio = valor;
    }
    return precio;
  }
  const etiquetaEscala = ([d, h]) => h === null ? d + '+' : d + '–' + h;

  function brindis(texto) {
    const el = $('#brindis');
    el.textContent = texto;
    el.classList.add('ver');
    clearTimeout(brindis._t);
    brindis._t = setTimeout(() => el.classList.remove('ver'), 2200);
  }

  /* ----------------------------------------------------------------- tema */
  const iconos = { noche: '☀︎', dia: '☾' };
  function aplicarTema(tema, conDestello) {
    document.documentElement.dataset.tema = tema;
    $('#icono-tema').textContent = iconos[tema];
    const logo = tema === 'dia' ? 'img/logo-ip7-dia.png' : 'img/logo-ip7-noche.png';
    $('#logo-img').src = logo;
    $('#logo-pie').src = logo;
    $('meta[name="theme-color"]').setAttribute('content', tema === 'dia' ? '#eef3f3' : '#061a1d');
    try { localStorage.setItem(CLAVE_TEMA, tema); } catch (e) {}
    if (conDestello) {
      const d = $('#destello');
      d.classList.remove('encender');
      void d.offsetWidth;
      d.classList.add('encender');
    }
  }
  let temaGuardado = null;
  try { temaGuardado = localStorage.getItem(CLAVE_TEMA); } catch (e) {}
  aplicarTema(temaGuardado || 'noche', false);
  $('#btn-tema').addEventListener('click', () => {
    aplicarTema(document.documentElement.dataset.tema === 'dia' ? 'noche' : 'dia', true);
  });

  /* ------------------------------------------------------------- cabecera */
  if (CONFIG.logoCliente) {
    const im = $('#logo-cliente');
    im.src = CONFIG.logoCliente;
    im.hidden = false;
    im.onload = () => $('.cliente-texto').style.display = 'none';
    im.onerror = () => { im.hidden = true; };
  }
  $$('.vigencia').forEach(el => el.textContent = CONFIG.vigencia);
  $('#vigencia-hero').textContent = CONFIG.vigencia;
  $('#dato-productos').textContent = PRODUCTOS.length;
  $('#dato-categorias').textContent = CONFIG.categorias.length;
  $('#copia-correo').textContent = CONFIG.copiaCotizacion;

  /* --------------------------------------------------------------- hero */
  const destacadosHero = ['morral-portatil-14', 'paraguas-trendy-27', 'mug-ceramica-11oz',
                          'libreta-brooch', 'speaker-bluetooth-plant', 'botilito-metalico-600'];
  $('#vitrina').innerHTML = destacadosHero.map(id => {
    const p = PRODUCTOS.find(x => x.id === id);
    return p ? `<figure><img src="img/${p.fotos[0]}" alt="${p.nombre}" loading="lazy"></figure>` : '';
  }).join('');

  /* ------------------------------------------------------------- envíos */
  $('#tabla-envios').innerHTML = ENVIOS
    .map(e => `<div><span>${e.zona}</span><b>${cop(e.valor)}</b></div>`).join('');

  /* ----------------------------------------------------------- filtros */
  let categoriaActiva = 'todas';
  let termino = '';

  $('#categorias').innerHTML =
    `<button class="activa" data-cat="todas">Todas (${PRODUCTOS.length})</button>` +
    CONFIG.categorias.map(c => {
      const n = PRODUCTOS.filter(p => p.cat === c.id).length;
      return `<button data-cat="${c.id}">${c.nombre} (${n})</button>`;
    }).join('');

  $('#categorias').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    categoriaActiva = b.dataset.cat;
    $$('#categorias button').forEach(x => x.classList.toggle('activa', x === b));
    b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    pintar();
  });

  /* ------------------------------------------------------------- navegación */
  const portadaCat = {
    morrales:'morral-adula', bolsas:'sporty-bag-eco-yute', libretas:'libreta-brooch',
    boligrafos:'boligrafo-colby-gyro', paraguas:'paraguas-trendy-27', bebidas:'mug-ceramica-11oz',
    tecnologia:'speaker-bluetooth-plant', reconocimientos:'trofeo-con-estrella',
    textil:'camiseta-polo', publicidad:'calendario', varios:'gafas-kilpan-eco'
  };
  const fotoCat = id => {
    const p = PRODUCTOS.find(x => x.id === portadaCat[id]) || PRODUCTOS.find(x => x.cat === id);
    return p ? 'img/' + p.fotos[0] : '';
  };

  $('#mega-rejilla').innerHTML = CONFIG.categorias.map(c => `
    <button class="mega-cat" data-cat="${c.id}">
      <img src="${fotoCat(c.id)}" alt="" loading="lazy">
      <span><span class="mn">${c.nombre}</span><br>
      <span class="mc">${PRODUCTOS.filter(p => p.cat === c.id).length} productos</span></span>
    </button>`).join('');

  $('#cajon-cats').innerHTML = CONFIG.categorias.map(c => `
    <button data-cat="${c.id}">${c.nombre}<span>${PRODUCTOS.filter(p => p.cat === c.id).length} productos</span></button>`).join('');

  function irACategoria(cat) {
    const b = $(`#categorias button[data-cat="${cat}"]`);
    if (b) b.click();
    cerrarMega(); cerrarCajon();
    setTimeout(() => $('#catalogo').scrollIntoView({ behavior: 'smooth' }), 40);
  }
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-cat]');
    if (!t || t.closest('#categorias')) return;
    e.preventDefault();
    irACategoria(t.dataset.cat);
  });

  /* mega menú */
  const mega = $('#mega'), btnMega = $('#btn-mega');
  function abrirMega() { mega.hidden = false; btnMega.setAttribute('aria-expanded', 'true'); }
  function cerrarMega() { mega.hidden = true; btnMega.setAttribute('aria-expanded', 'false'); }
  btnMega.addEventListener('click', () => mega.hidden ? abrirMega() : cerrarMega());
  const zonaMega = btnMega.closest('.menu-item');
  let salida;
  zonaMega.addEventListener('mouseenter', () => { clearTimeout(salida); abrirMega(); });
  zonaMega.addEventListener('mouseleave', () => { salida = setTimeout(cerrarMega, 180); });
  document.addEventListener('click', e => { if (!zonaMega.contains(e.target)) cerrarMega(); });

  /* cajón móvil */
  const cajon = $('#cajon'), btnMenu = $('#btn-menu');
  function cerrarCajon() { cajon.hidden = true; btnMenu.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; }
  btnMenu.addEventListener('click', () => {
    const abrir = cajon.hidden;
    cajon.hidden = !abrir;
    btnMenu.setAttribute('aria-expanded', String(abrir));
    document.body.style.overflow = abrir ? 'hidden' : '';
  });
  $$('#cajon nav > a:not([data-cat])').forEach(a => a.addEventListener('click', cerrarCajon));

  /* cabecera pegada + barra de progreso */
  const barra = $('#progreso'), cab = $('#cabecera');
  function alDesplazar() {
    const max = document.documentElement.scrollHeight - innerHeight;
    barra.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
    cab.classList.toggle('pegada', scrollY > 12);
  }
  addEventListener('scroll', alDesplazar, { passive: true });
  alDesplazar();

  let temporizador;
  $('#buscar').addEventListener('input', e => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => { termino = e.target.value.trim().toLowerCase(); pintar(); }, 130);
  });

  function filtrados() {
    return PRODUCTOS.filter(p => {
      if (categoriaActiva !== 'todas' && p.cat !== categoriaActiva) return false;
      if (!termino) return true;
      return (p.nombre + ' ' + p.ref + ' ' + p.desc).toLowerCase().includes(termino);
    });
  }

  /* --------------------------------------------------------- tarjetas */
  function tarjetaHTML(p) {
    const min = minimoDe(p);
    const galeria = p.fotos.map(f => `<img src="img/${f}" alt="${p.nombre}" loading="lazy">`).join('');
    const flechas = p.fotos.length > 1
      ? `<button class="flecha izq" data-dir="-1" aria-label="Foto anterior">‹</button>
         <button class="flecha der" data-dir="1" aria-label="Foto siguiente">›</button>
         <div class="puntos">${p.fotos.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</div>`
      : '';
    const precios = (p.escalas && p.escalas.length)
      ? `<div class="escalas">${p.escalas.map(e =>
          `<span><i>${etiquetaEscala(e)}</i><b>${cop(e[2])}</b></span>`).join('')}</div>`
      : `<div class="consultar">Cotización especial — la define tu ejecutivo de cuenta según cantidad y personalización.</div>`;

    return `
    <article class="tarjeta" data-id="${p.id}">
      <div class="galeria${p.vertical ? ' vertical' : ''}${p.sinMarco ? ' sin-marco' : ''}" data-indice="0">
        ${p.destacado ? '<span class="insignia">Destacado</span>' : ''}
        <div class="pista">${galeria}</div>
        ${flechas}
      </div>
      <div class="cuerpo">
        <div class="ref">${p.ref}</div>
        <h3>${p.nombre}</h3>
        <p class="desc">${p.desc}</p>
        ${precios}
      </div>
      <div class="pie">
        <span class="min">Mín. ${min} und.</span>
        <button class="btn btn-marca agregar">Agregar</button>
      </div>
    </article>`;
  }

  function pintar() {
    const lista = filtrados();
    $('#rejilla').innerHTML = lista.map(tarjetaHTML).join('');
    $('#vacio').classList.toggle('oculto', lista.length > 0);
  }

  /* galería: flechas, puntos y swipe */
  function moverGaleria(gal, delta, absoluto) {
    const pista = $('.pista', gal);
    const total = pista.children.length;
    let i = absoluto !== undefined ? absoluto : (+gal.dataset.indice + delta);
    i = (i + total) % total;
    gal.dataset.indice = i;
    pista.style.transform = `translateX(${-i * 100}%)`;
    $$('.puntos i', gal).forEach((d, k) => d.classList.toggle('on', k === i));
  }

  $('#rejilla').addEventListener('click', e => {
    const flecha = e.target.closest('.flecha');
    if (flecha) { moverGaleria(flecha.closest('.galeria'), +flecha.dataset.dir); return; }
    const btn = e.target.closest('.agregar');
    if (btn) {
      const id = btn.closest('.tarjeta').dataset.id;
      agregar(id);
    }
  });

  let x0 = null, galSwipe = null;
  $('#rejilla').addEventListener('touchstart', e => {
    galSwipe = e.target.closest('.galeria');
    if (galSwipe && $$('img', galSwipe).length > 1) x0 = e.touches[0].clientX; else galSwipe = null;
  }, { passive: true });
  $('#rejilla').addEventListener('touchend', e => {
    if (!galSwipe || x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) moverGaleria(galSwipe, dx < 0 ? 1 : -1);
    x0 = null; galSwipe = null;
  }, { passive: true });

  /* ---------------------------------------------------------- carrito */
  let carrito = [];
  try { carrito = JSON.parse(localStorage.getItem(CLAVE_CARRITO) || '[]'); } catch (e) {}
  carrito = carrito.filter(l => PRODUCTOS.some(p => p.id === l.id));

  function guardar() {
    try { localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito)); } catch (e) {}
  }

  function agregar(id) {
    const p = PRODUCTOS.find(x => x.id === id);
    if (!p) return;
    const existente = carrito.find(l => l.id === id);
    if (existente) existente.cant += minimoDe(p);
    else carrito.push({ id, cant: minimoDe(p) });
    guardar(); refrescarCarrito();
    brindis(p.nombre + ' agregado');
  }

  function refrescarCarrito() {
    const n = carrito.length;
    $('#cuenta-carrito').textContent = n;
    $('#cuenta-movil').textContent = n;

    if (!n) {
      $('#lista-carrito').innerHTML =
        '<p class="sin-datos">Aún no has seleccionado productos. Agrega los que quieras cotizar y los enviamos juntos a tu ejecutivo.</p>';
      $('#total-carrito').innerHTML = '$ 0<small>Sin IVA · referencia según escala</small>';
      return;
    }

    let total = 0, hayConsulta = false;
    $('#lista-carrito').innerHTML = carrito.map(l => {
      const p = PRODUCTOS.find(x => x.id === l.id);
      const precio = precioPara(p, l.cant);
      if (precio === null) hayConsulta = true; else total += precio * l.cant;
      return `
      <div class="linea" data-id="${p.id}">
        <img src="img/${p.fotos[0]}" alt="${p.nombre}">
        <div>
          <div class="t">${p.nombre}</div>
          <div class="r">${p.ref} · mín. ${minimoDe(p)}</div>
          <div class="p">${precio === null ? 'Cotización especial' : cop(precio) + ' c/u'}</div>
          <div class="cant">
            <button data-paso="-1" aria-label="Restar">−</button>
            <input type="number" value="${l.cant}" min="${minimoDe(p)}" step="1" aria-label="Cantidad">
            <button data-paso="1" aria-label="Sumar">+</button>
          </div>
        </div>
        <button class="quitar" aria-label="Quitar">✕</button>
      </div>`;
    }).join('');

    $('#total-carrito').innerHTML = cop(total) +
      `<small>Sin IVA${hayConsulta ? ' · excluye ítems de cotización especial' : ''}</small>`;
  }

  $('#lista-carrito').addEventListener('click', e => {
    const linea = e.target.closest('.linea'); if (!linea) return;
    const l = carrito.find(x => x.id === linea.dataset.id);
    const p = PRODUCTOS.find(x => x.id === linea.dataset.id);
    if (e.target.closest('.quitar')) {
      carrito = carrito.filter(x => x.id !== l.id);
    } else if (e.target.dataset.paso) {
      const paso = +e.target.dataset.paso;
      const min = minimoDe(p);
      l.cant = Math.max(min, l.cant + paso * (l.cant <= min ? min : 1));
    } else return;
    guardar(); refrescarCarrito();
  });

  $('#lista-carrito').addEventListener('change', e => {
    if (e.target.tagName !== 'INPUT') return;
    const linea = e.target.closest('.linea');
    const l = carrito.find(x => x.id === linea.dataset.id);
    const p = PRODUCTOS.find(x => x.id === linea.dataset.id);
    l.cant = Math.max(minimoDe(p), parseInt(e.target.value, 10) || minimoDe(p));
    guardar(); refrescarCarrito();
  });

  /* panel */
  function abrirCarrito(v) {
    $('#panel-carrito').classList.toggle('abierto', v);
    $('#velo').classList.toggle('abierto', v);
  }
  $('#btn-carrito').addEventListener('click', () => abrirCarrito(true));
  $('#btn-carrito-movil').addEventListener('click', () => abrirCarrito(true));
  $('#cerrar-carrito').addEventListener('click', () => abrirCarrito(false));
  $('#velo').addEventListener('click', () => abrirCarrito(false));

  /* ----------------------------------------------------- comerciales */
  const conWhatsapp = CONFIG.comerciales.filter(c => c.whatsapp);
  const conCorreo   = CONFIG.comerciales.filter(c => c.email);

  $('#lista-comerciales').innerHTML = conWhatsapp.length
    ? conWhatsapp.map((c, i) => `
        <button class="comercial" data-i="${i}">
          <span class="av">${c.nombre.trim()[0]}</span>
          <span><span class="n">${c.nombre}</span><br><span class="c">${c.cargo}</span></span>
          <span class="wa">WhatsApp</span>
        </button>`).join('')
    : `<p class="sin-datos">Aún no hay números de WhatsApp configurados.
       Agrégalos en <code>js/datos.js</code> → <code>CONFIG.comerciales</code>.</p>`;

  $('#lista-comerciales').addEventListener('click', e => {
    const b = e.target.closest('.comercial'); if (!b) return;
    const c = conWhatsapp[+b.dataset.i];
    const msg = encodeURIComponent(
      `Hola ${c.nombre}, soy de ${CONFIG.cliente}. Estoy viendo el catálogo IP7 y quiero cotizar unos productos.`);
    window.open(`https://wa.me/${c.whatsapp}?text=${msg}`, '_blank', 'noopener');
  });

  $('#f-comercial').innerHTML = conCorreo.length
    ? '<option value="">Selecciona un ejecutivo…</option>' +
      conCorreo.map((c, i) => `<option value="${i}">${c.nombre} — ${c.cargo}</option>`).join('')
    : '<option value="">Sin ejecutivos configurados</option>';
  $('#ayuda-comercial').textContent = conCorreo.length
    ? 'Obligatorio. La cotización se envía a este ejecutivo con copia a ' + CONFIG.copiaCotizacion + '.'
    : 'Configura los correos en js/datos.js → CONFIG.comerciales.';

  function abrirModal(sel, v) { $(sel).classList.toggle('abierto', v); }
  ['#btn-asesor', '#btn-asesor-hero', '#btn-asesor-cta', '#btn-asesor-movil']
    .forEach(s => $(s).addEventListener('click', () => abrirModal('#modal-asesor', true)));
  $('#cerrar-asesor').addEventListener('click', () => abrirModal('#modal-asesor', false));
  $('#modal-asesor').addEventListener('click', e => { if (e.target.id === 'modal-asesor') abrirModal('#modal-asesor', false); });

  /* ----------------------------------------------------- cotización */
  function textoSolicitud(datos) {
    const lineas = carrito.map(l => {
      const p = PRODUCTOS.find(x => x.id === l.id);
      const precio = precioPara(p, l.cant);
      return `• ${p.nombre} (${p.ref}) — ${l.cant} und. — ` +
             (precio === null ? 'cotización especial' : `${cop(precio)} c/u = ${cop(precio * l.cant)}`);
    });
    let total = 0;
    carrito.forEach(l => {
      const p = PRODUCTOS.find(x => x.id === l.id);
      const precio = precioPara(p, l.cant);
      if (precio !== null) total += precio * l.cant;
    });

    const cab = [
      `SOLICITUD DE COTIZACIÓN — ${CONFIG.cliente}`,
      datos ? `Contacto: ${datos.nombre} · ${datos.empresa}` : '',
      datos ? `Correo: ${datos.email}${datos.tel ? ' · Tel: ' + datos.tel : ''}` : '',
      datos && datos.fecha ? `Fecha requerida: ${datos.fecha}` : '',
      ''
    ].filter(Boolean);

    const pie = [
      '',
      `Estimado (sin IVA): ${cop(total)}`,
      'Los ítems marcados como cotización especial se valoran aparte.',
      datos && datos.notas ? '' : null,
      datos && datos.notas ? 'Notas: ' + datos.notas : null,
      '',
      `Catálogo IP7 · precios vigentes hasta el ${CONFIG.vigencia}.`
    ].filter(x => x !== null);

    return cab.concat(lineas, pie).join('\n');
  }

  function exigirCarrito() {
    if (!carrito.length) { brindis('Primero agrega productos'); abrirCarrito(true); return false; }
    return true;
  }

  $('#btn-cotizar').addEventListener('click', () => {
    if (!exigirCarrito()) return;
    abrirCarrito(false);
    abrirModal('#modal-cotizacion', true);
  });
  $('#cerrar-cotizacion').addEventListener('click', () => abrirModal('#modal-cotizacion', false));
  $('#modal-cotizacion').addEventListener('click', e => { if (e.target.id === 'modal-cotizacion') abrirModal('#modal-cotizacion', false); });

  async function copiar(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      brindis('Solicitud copiada');
    } catch (e) {
      const t = document.createElement('textarea');
      t.value = texto; document.body.appendChild(t); t.select();
      document.execCommand('copy'); t.remove();
      brindis('Solicitud copiada');
    }
  }
  $('#btn-copiar').addEventListener('click', () => { if (exigirCarrito()) copiar(textoSolicitud(null)); });
  $('#btn-copiar-modal').addEventListener('click', () => copiar(textoSolicitud(leerFormulario())));

  function leerFormulario() {
    return {
      nombre: $('#f-nombre').value.trim(),
      empresa: $('#f-empresa').value.trim(),
      email: $('#f-email').value.trim(),
      tel: $('#f-tel').value.trim(),
      fecha: $('#f-fecha').value,
      notas: $('#f-notas').value.trim()
    };
  }

  $('#form-cotizacion').addEventListener('submit', e => {
    e.preventDefault();
    const idx = $('#f-comercial').value;
    if (idx === '') { brindis('Elige a qué ejecutivo dirigirla'); return; }
    const comercial = conCorreo[+idx];
    const datos = leerFormulario();
    const asunto = `Cotización ${CONFIG.cliente} — ${carrito.length} producto(s)`;
    const url = `mailto:${encodeURIComponent(comercial.email)}` +
                `?cc=${encodeURIComponent(CONFIG.copiaCotizacion)}` +
                `&subject=${encodeURIComponent(asunto)}` +
                `&body=${encodeURIComponent(textoSolicitud(datos))}`;
    window.location.href = url;
    brindis('Abriendo tu correo…');
  });

  /* --------------------------------------------------------- arranque */
  pintar();
  refrescarCarrito();

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    abrirCarrito(false);
    abrirModal('#modal-cotizacion', false);
    abrirModal('#modal-asesor', false);
    cerrarMega(); cerrarCajon();
  });
})();
