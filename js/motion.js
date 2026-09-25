/* ==========================================================================
   IP7 · Catálogo SIEMENS — motor de escena cinemática
   --------------------------------------------------------------------------
   Todo se resuelve con variables CSS que se escriben una vez por frame.
   El scroll se suaviza con lerp y el puntero aporta un parallax discreto.
   Con "prefers-reduced-motion" los valores saltan y el parallax se anula.
   ========================================================================== */
(function () {
  'use strict';

  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  const seccion = $('.cinema');
  if (!seccion) return;

  const raiz        = document.documentElement;
  const menosMovim  = matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------------- utilidades */
  const acotar = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const suave  = (a, b, v) => { const x = acotar((v - a) / (b - a)); return x * x * (3 - 2 * x); };
  const mezcla = (a, b, t) => a + (b - a) * t;
  /* tramo con entrada y salida: devuelve cuánto "vive" el elemento */
  const tramo  = (s, a, b, c, d) => {
    const entra = suave(a, b, s), sale = suave(c, d, s);
    return { entra, sale, vivo: entra * (1 - sale) };
  };
  /* Recorrido normalizado: la coreografía siempre va de 0 a FIN, sin importar
     cuántos píxeles mida la sección en cada breakpoint. */
  const FIN = 1550;
  const recorrido = () => {
    const total = seccion.offsetHeight - innerHeight;
    if (total <= 0) return 0;
    return acotar(-seccion.getBoundingClientRect().top / total) * FIN;
  };

  /* ---------------------------------------------- reparto del muro de fotos */
  const DERIVA = [
    { fx: '-48vw', fy: '-24vh', fs: .58, par: 16 },
    { fx:  '46vw', fy: '-32vh', fs: .64, par: 10 },
    { fx: '-56vw', fy:  '12vh', fs: .52, par: 22 },
    { fx:  '-8vw', fy:  '42vh', fs: .72, par: 14 },
    { fx:  '52vw', fy:   '8vh', fs: .54, par: 20 },
    { fx:  '22vw', fy:  '48vh', fs: .68, par: 12 }
  ];
  $$('#vitrina figure').forEach((fig, i) => {
    const d = DERIVA[i % DERIVA.length];
    fig.style.setProperty('--fx', d.fx);
    fig.style.setProperty('--fy', d.fy);
    fig.style.setProperty('--fs', d.fs);
    fig.style.setProperty('--par', d.par);
  });

  /* ------------------------------------------------------------ estado rAF */
  let punteroX = 0, punteroY = 0, destinoX = 0, destinoY = 0;
  let scrollSuave = 0, scrollDestino = 0, arrancado = false, pendiente = false;


  function frame() {
    pendiente = false;
    scrollDestino = recorrido();

    if (!arrancado || menosMovim.matches) { scrollSuave = scrollDestino; arrancado = true; }
    else scrollSuave = mezcla(scrollSuave, scrollDestino, 0.14);
    if (Math.abs(scrollSuave - scrollDestino) < 0.08) scrollSuave = scrollDestino;

    punteroX = mezcla(punteroX, destinoX, 0.12);
    punteroY = mezcla(punteroY, destinoY, 0.12);

    const s = scrollSuave;
    const avance   = acotar(s / FIN);
    const salida   = suave(40, 430, s);                 /* la portada se va */
    const apertura = suave(150, 780, s);                /* el muro se abre  */
    const relA     = tramo(s, 330, 620, 800, 1000);
    const relB     = tramo(s, 900, 1140, 1320, 1470);
    const desenf   = acotar(relA.vivo + relB.vivo);

    const px = menosMovim.matches ? 0 : punteroX;
    const py = menosMovim.matches ? 0 : punteroY;

    const v = raiz.style;
    v.setProperty('--mx', px.toFixed(4));
    v.setProperty('--my', py.toFixed(4));

    v.setProperty('--fondo-escala', (1.08 + avance * 0.16).toFixed(4));
    v.setProperty('--fondo-blur', `${(desenf * 10).toFixed(2)}px`);
    v.setProperty('--fondo-brillo', (1 - desenf * 0.26).toFixed(4));
    v.setProperty('--velo-alpha', (desenf * 0.55).toFixed(4));

    v.setProperty('--portada-y', `${(salida * -120).toFixed(1)}px`);
    v.setProperty('--portada-op', (1 - salida).toFixed(4));
    v.setProperty('--portada-escala', (1 - salida * 0.05).toFixed(4));

    v.setProperty('--muro-abre', apertura.toFixed(4));
    v.setProperty('--muro-op', (1 - apertura * 0.74).toFixed(4));
    v.setProperty('--muro-blur', `${(apertura * 7).toFixed(2)}px`);

    v.setProperty('--relatoA-op', (relA.vivo).toFixed(4));
    v.setProperty('--relatoA-y', `${(-relA.sale * 70 + (1 - relA.entra) * 36).toFixed(1)}px`);
    v.setProperty('--relatoB-op', (relB.vivo).toFixed(4));
    v.setProperty('--relatoB-y', `${(-relB.sale * 70 + (1 - relB.entra) * 36).toFixed(1)}px`);

    if (Math.abs(scrollSuave - scrollDestino) > 0.08 ||
        Math.abs(punteroX - destinoX) > 0.001 ||
        Math.abs(punteroY - destinoY) > 0.001) pedirFrame();
  }

  function pedirFrame() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(frame);
  }

  addEventListener('scroll', pedirFrame, { passive: true });
  addEventListener('resize', pedirFrame, { passive: true });
  addEventListener('pointermove', e => {
    destinoX = e.clientX / innerWidth - 0.5;
    destinoY = e.clientY / innerHeight - 0.5;
    pedirFrame();
  }, { passive: true });
  menosMovim.addEventListener('change', pedirFrame);

  pedirFrame();

  /* ------------------------------------- aparición escalonada de las fichas */
  if (!menosMovim.matches && 'IntersectionObserver' in window) {
    const rejilla = $('#rejilla');
    document.documentElement.classList.add('revelar');
    let observadorVivo = false;
    const vigia = new IntersectionObserver(entradas => {
      observadorVivo = true;
      entradas.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('a-la-vista');
        vigia.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

    const observarFichas = () => $$('.tarjeta:not(.a-la-vista)', rejilla).forEach(t => vigia.observe(t));
    observarFichas();
    new MutationObserver(observarFichas).observe(rejilla, { childList: true });

    /* red de seguridad: si el observador nunca responde, mostramos todo igual */
    setTimeout(() => {
      if (!observadorVivo) document.documentElement.classList.remove('revelar');
    }, 3000);
  }
})();
