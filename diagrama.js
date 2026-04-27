const Gantt = (() => {

  const COLORES = [
    '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
    '#06b6d4','#f97316','#ec4899','#14b8a6','#84cc16',
    '#6366f1','#f43f5e','#22d3ee','#a3e635','#fb923c',
  ];

  // Estado interno del diagrama
  let resultado          = [];
  let pasoActual         = 0;
  let desplazamiento     = 0;
  let nivelZoom          = 1;
  let arrastrando        = false;
  let inicioArrastreX    = 0;
  let desplazamientoBase = 0;
  let dibujoPendiente    = false;

  // Medidas del lienzo en píxeles
  const MARGEN_IZQ         = 72;
  const MARGEN_DER         = 16;
  const MARGEN_SUP         = 30;
  const MARGEN_INF         = 24;
  const ALTO_FILA          = 34;
  const MAX_FILAS_VISIBLES = 20;

  let desplazamientoFilas = 0;

  const lienzo = document.getElementById('lienzoGantt');
  const ctx    = lienzo.getContext('2d');

  function iniciar(datos) {
    resultado           = datos;
    pasoActual          = datos.length;
    desplazamiento      = 0;
    nivelZoom           = 1;
    desplazamientoFilas = 0;
    _actualizarDeslizador();
    _actualizarEtiquetaZoom();
    _programarDibujo();
  }

  function establecerPaso(valor) {
    pasoActual = parseInt(valor);
    document.getElementById('etiquetaPaso').textContent = pasoActual + ' / ' + resultado.length;
    _programarDibujo();
  }

  function avanzarPaso(delta) {
    pasoActual = Math.max(0, Math.min(resultado.length, pasoActual + delta));
    document.getElementById('deslizadorPaso').value = pasoActual;
    document.getElementById('etiquetaPaso').textContent = pasoActual + ' / ' + resultado.length;
    _programarDibujo();
  }

  function desplazar(delta) {
    const tiempoMax = _tiempoMax();
    desplazamiento = Math.max(0, Math.min(desplazamiento + delta, tiempoMax - 1));
    _programarDibujo();
  }

  function irA(tiempo) {
    desplazamiento = Math.max(0, tiempo);
    _programarDibujo();
  }

  function irAlFinal() {
    desplazamiento = Math.max(0, _tiempoMax() - 5);
    _programarDibujo();
  }

  function aplicarZoom(delta) {
    nivelZoom = Math.max(0.5, Math.min(8, nivelZoom + delta * 0.5));
    _actualizarEtiquetaZoom();
    _programarDibujo();
  }

  function desplazarFilas(delta) {
    const maxDespl = Math.max(0, resultado.length - MAX_FILAS_VISIBLES);
    desplazamientoFilas = Math.max(0, Math.min(desplazamientoFilas + delta, maxDespl));
    _programarDibujo();
  }

  function _tiempoMax() {
    return resultado.length ? resultado[resultado.length - 1].fin : 20;
  }

  function _calcularEscala(anchoArea) {
    const tiempoMax     = _tiempoMax();
    const unidadesBase  = Math.max(tiempoMax - desplazamiento, 1);
    const unidadesVisib = unidadesBase / nivelZoom;
    return anchoArea / unidadesVisib;
  }

  function _programarDibujo() {
    if (dibujoPendiente) return;
    dibujoPendiente = true;
    requestAnimationFrame(() => { dibujoPendiente = false; _dibujar(); });
  }

  function _dibujar() {
    if (!resultado.length) return;

    const relacionPixeles = window.devicePixelRatio || 1;
    const anchoTotal      = lienzo.parentElement.clientWidth || 800;

    // Virtualización vertical: solo dibujar filas visibles
    const primeraFila = desplazamientoFilas;
    const ultimaFila  = Math.min(resultado.length - 1, primeraFila + MAX_FILAS_VISIBLES - 1);
    const cantFilas   = ultimaFila - primeraFila + 1;

    const altoTotal = MARGEN_SUP + cantFilas * ALTO_FILA + MARGEN_INF;
    lienzo.style.width  = anchoTotal + 'px';
    lienzo.style.height = altoTotal  + 'px';
    lienzo.width  = anchoTotal * relacionPixeles;
    lienzo.height = altoTotal  * relacionPixeles;
    ctx.scale(relacionPixeles, relacionPixeles);
    ctx.clearRect(0, 0, anchoTotal, altoTotal);

    const anchoArea    = anchoTotal - MARGEN_IZQ - MARGEN_DER;
    const escala       = _calcularEscala(anchoArea);
    const unidadesVisib = anchoArea / escala;

    document.getElementById('infoGantt').textContent =
      `t ${Math.floor(desplazamiento)} – ${Math.floor(desplazamiento + unidadesVisib)}  |  filas ${primeraFila + 1}–${ultimaFila + 1} de ${resultado.length}`;

    // Fondo alterno por fila
    for (let f = 0; f < cantFilas; f++) {
      ctx.fillStyle = f % 2 === 0 ? '#161b22' : '#12171d';
      ctx.fillRect(MARGEN_IZQ, MARGEN_SUP + f * ALTO_FILA, anchoArea, ALTO_FILA);
    }

    // Cuadrícula vertical con marcas de tiempo
    const tiempoInicio = Math.floor(desplazamiento);
    const tiempoFin    = Math.ceil(desplazamiento + unidadesVisib) + 1;

    let intervalo = 1;
    if (escala < 6)   intervalo = 5;
    if (escala < 2)   intervalo = 10;
    if (escala < 1)   intervalo = 20;
    if (escala < 0.3) intervalo = 50;

    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 5]);
    ctx.font = '10px Segoe UI, sans-serif';
    ctx.textAlign = 'center';

    for (let t = tiempoInicio; t <= tiempoFin; t += intervalo) {
      const x = MARGEN_IZQ + (t - desplazamiento) * escala;
      if (x < MARGEN_IZQ - 1 || x > anchoTotal - MARGEN_DER + 1) continue;
      ctx.strokeStyle = '#1e2533';
      ctx.beginPath();
      ctx.moveTo(x, MARGEN_SUP);
      ctx.lineTo(x, MARGEN_SUP + cantFilas * ALTO_FILA);
      ctx.stroke();
      ctx.fillStyle = '#484f58';
      ctx.fillText(t, x, MARGEN_SUP - 10);
    }
    ctx.setLineDash([]);

    // Eje izquierdo
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(MARGEN_IZQ, MARGEN_SUP - 10);
    ctx.lineTo(MARGEN_IZQ, MARGEN_SUP + cantFilas * ALTO_FILA);
    ctx.stroke();

    // Barras de procesos (solo filas visibles)
    for (let f = 0; f < cantFilas; f++) {
      const indice = f + primeraFila;
      const proc   = resultado[indice];

      // Etiqueta del nombre al margen izquierdo
      ctx.fillStyle = '#8b949e';
      ctx.font = '11px Segoe UI, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(
        proc.proceso.length > 7 ? proc.proceso.slice(0, 6) + '…' : proc.proceso,
        MARGEN_IZQ - 6,
        MARGEN_SUP + f * ALTO_FILA + ALTO_FILA / 2 + 4
      );

      if (indice >= pasoActual) continue;

      const color = COLORES[indice % COLORES.length];
      const xInicio = MARGEN_IZQ + (proc.inicio - desplazamiento) * escala;
      const xFin    = MARGEN_IZQ + (proc.fin    - desplazamiento) * escala;

      const xInicioRecortado = Math.max(xInicio, MARGEN_IZQ);
      const xFinRecortado    = Math.min(xFin, anchoTotal - MARGEN_DER);
      if (xFinRecortado <= MARGEN_IZQ || xInicioRecortado >= anchoTotal - MARGEN_DER) continue;

      const yBarra    = MARGEN_SUP + f * ALTO_FILA + 4;
      const altoBarra  = ALTO_FILA - 8;
      const anchoBarra = xFinRecortado - xInicioRecortado;

      // Fondo semitransparente
      ctx.fillStyle = color + '28';
      ctx.beginPath();
      ctx.roundRect(xInicioRecortado, yBarra, anchoBarra, altoBarra, 4);
      ctx.fill();

      // Borde
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(xInicioRecortado, yBarra, anchoBarra, altoBarra, 4);
      ctx.stroke();

      // Acento izquierdo
      if (xInicio >= MARGEN_IZQ) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(xInicioRecortado, yBarra, Math.min(4, anchoBarra), altoBarra, [4, 0, 0, 4]);
        ctx.fill();
      }

      // Nombre dentro de la barra si hay espacio
      if (anchoBarra > 28) {
        ctx.fillStyle = color;
        ctx.font = '600 10px Segoe UI, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(proc.proceso, xInicioRecortado + anchoBarra / 2, yBarra + altoBarra / 2 + 4);
      }

      // Marcas de tiempo inicio y fin
      ctx.fillStyle = '#484f58';
      ctx.font = '10px Segoe UI, sans-serif';
      ctx.textAlign = 'center';
      if (xInicio >= MARGEN_IZQ && xInicio <= anchoTotal - MARGEN_DER)
        ctx.fillText(proc.inicio, xInicio, MARGEN_SUP + cantFilas * ALTO_FILA + 16);
      if (xFin >= MARGEN_IZQ && xFin <= anchoTotal - MARGEN_DER)
        ctx.fillText(proc.fin, xFin, MARGEN_SUP + cantFilas * ALTO_FILA + 16);
    }
  }

  function _actualizarDeslizador() {
    const deslizador = document.getElementById('deslizadorPaso');
    deslizador.max   = resultado.length;
    deslizador.value = resultado.length;
    document.getElementById('etiquetaPaso').textContent = resultado.length + ' / ' + resultado.length;
  }

  function _actualizarEtiquetaZoom() {
    document.getElementById('nivelZoom').textContent = nivelZoom.toFixed(1) + '×';
  }

  lienzo.addEventListener('mousedown', evento => {
    arrastrando        = true;
    inicioArrastreX    = evento.clientX;
    desplazamientoBase = desplazamiento;
  });

  window.addEventListener('mousemove', evento => {
    if (!arrastrando || !resultado.length) return;
    const anchoArea  = lienzo.offsetWidth - MARGEN_IZQ - MARGEN_DER;
    const escala     = _calcularEscala(anchoArea);
    const diferencia = (inicioArrastreX - evento.clientX) / escala;
    const tiempoMax  = _tiempoMax();
    desplazamiento   = Math.max(0, Math.min(desplazamientoBase + diferencia, tiempoMax - 1));
    _programarDibujo();
  });

  window.addEventListener('mouseup', () => { arrastrando = false; });

  // Rueda: scroll vertical de filas; con Shift: scroll horizontal
  lienzo.addEventListener('wheel', evento => {
    evento.preventDefault();
    if (evento.shiftKey) {
      desplazar(evento.deltaY > 0 ? 3 : -3);
    } else {
      desplazarFilas(evento.deltaY > 0 ? 2 : -2);
    }
  }, { passive: false });

  window.addEventListener('resize', () => {
    if (resultado.length) _programarDibujo();
  });

  return { iniciar, establecerPaso, avanzarPaso, desplazar, irA, irAlFinal, aplicarZoom, desplazarFilas };
})();
