/**
 * tabla.js
 * Tabla de resultados con ordenamiento, búsqueda, exportación y paginado.
 */

const Table = (() => {

  const COLORES = [
    '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
    '#06b6d4','#f97316','#ec4899','#14b8a6','#84cc16',
    '#6366f1','#f43f5e','#22d3ee','#a3e635','#fb923c',
  ];

  const FILAS_POR_PAGINA = 100;

  let todosDatos      = [];
  let datosFiltrados  = [];
  let claveOrden      = null;
  let ordenAscendente = true;
  let paginaActual    = 0;
  let terminoBusqueda = '';

  function iniciar(datos) {
    todosDatos      = datos;
    datosFiltrados  = [...datos];
    claveOrden      = null;
    ordenAscendente = true;
    paginaActual    = 0;
    terminoBusqueda = '';
    document.getElementById('cajaBusqueda').value = '';
    _renderizar();
  }

  function filtrar(termino) {
    terminoBusqueda = termino.toLowerCase().trim();
    paginaActual    = 0;
    datosFiltrados  = todosDatos.filter(proc =>
      proc.proceso.toLowerCase().includes(terminoBusqueda)
    );
    _renderizar();
  }

  function ordenar(clave) {
    if (claveOrden === clave) {
      ordenAscendente = !ordenAscendente;
    } else {
      claveOrden      = clave;
      ordenAscendente = true;
    }
    datosFiltrados.sort((a, b) => {
      const valorA = a[clave];
      const valorB = b[clave];
      if (typeof valorA === 'string')
        return ordenAscendente ? valorA.localeCompare(valorB) : valorB.localeCompare(valorA);
      return ordenAscendente ? valorA - valorB : valorB - valorA;
    });
    paginaActual = 0;
    _renderizar();
  }

  function exportarCSV() {
    const columnas   = ['proceso', 'llegada', 'duracion', 'inicio', 'fin', 'espera', 'retorno'];
    const encabezado = 'proceso,llegada,duracion,inicio,fin,espera,retorno\n';
    const filas      = todosDatos.map(proc => columnas.map(col => proc[col]).join(',')).join('\n');
    const blob   = new Blob([encabezado + filas], { type: 'text/csv;charset=utf-8;' });
    const url    = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href     = url;
    enlace.download = 'resultados.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  }

  function _renderizar() {
    const cuerpo = document.getElementById('cuerpoDatos');
    const inicio = paginaActual * FILAS_POR_PAGINA;
    const fin    = Math.min(inicio + FILAS_POR_PAGINA, datosFiltrados.length);
    const pagina = datosFiltrados.slice(inicio, fin);

    // Construir HTML como cadena (más rápido que appendChild en bucle)
    let html = '';
    for (let i = 0; i < pagina.length; i++) {
      const proc   = pagina[i];
      const indice = todosDatos.indexOf(proc);
      const color  = COLORES[indice % COLORES.length];
      html += `<tr>
        <td><span class="insignia" style="background:${color}30;color:${color};border:1px solid ${color}55">${_escaparHTML(proc.proceso)}</span></td>
        <td>${proc.llegada}</td>
        <td><strong>${proc.espera}</strong></td>
        <td><strong>${proc.retorno}</strong></td>
      </tr>`;
    }
    cuerpo.innerHTML = html;

    // Pie de tabla
    const cantidad        = todosDatos.length;
    const promedioEspera  = (todosDatos.reduce((a, p) => a + p.espera,  0) / cantidad).toFixed(2);
    const promedioRetorno = (todosDatos.reduce((a, p) => a + p.retorno, 0) / cantidad).toFixed(2);
    document.getElementById('pieTabla').innerHTML =
      `<span>Mostrando ${inicio + 1}–${fin} de ${datosFiltrados.length}${terminoBusqueda ? ' (filtrados)' : ''} | Total: ${cantidad}</span>
       <span>Espera prom: <strong>${promedioEspera}</strong> &nbsp;|&nbsp; Retorno prom: <strong>${promedioRetorno}</strong></span>`;

    _renderizarPaginacion();
  }

  function _renderizarPaginacion() {
    const totalPaginas = Math.ceil(datosFiltrados.length / FILAS_POR_PAGINA);
    if (totalPaginas <= 1) {
      const anterior = document.getElementById('paginacion');
      if (anterior) anterior.remove();
      return;
    }

    let contenedor = document.getElementById('paginacion');
    if (!contenedor) {
      contenedor = document.createElement('div');
      contenedor.id = 'paginacion';
      contenedor.style.cssText = 'display:flex;gap:6px;align-items:center;padding:.5rem;border-top:1px solid var(--borde);justify-content:center;flex-wrap:wrap';
      document.getElementById('panelTabla').querySelector('.contenedor-tabla').after(contenedor);
    }

    let html = `<button class="boton-control" onclick="Table._irPagina(${paginaActual - 1})" ${paginaActual === 0 ? 'disabled' : ''}>←</button>`;
    const rango = 3;
    for (let pag = 0; pag < totalPaginas; pag++) {
      if (pag === 0 || pag === totalPaginas - 1 || Math.abs(pag - paginaActual) <= rango) {
        html += `<button class="boton-control" onclick="Table._irPagina(${pag})"
          style="${pag === paginaActual ? 'background:var(--acento);color:#000;border-color:transparent' : ''}">${pag + 1}</button>`;
      } else if (Math.abs(pag - paginaActual) === rango + 1) {
        html += `<span style="color:var(--texto-oscuro);padding:0 4px">…</span>`;
      }
    }
    html += `<button class="boton-control" onclick="Table._irPagina(${paginaActual + 1})" ${paginaActual === totalPaginas - 1 ? 'disabled' : ''}>→</button>`;
    contenedor.innerHTML = html;
  }

  function _irPagina(numeroPagina) {
    const totalPaginas = Math.ceil(datosFiltrados.length / FILAS_POR_PAGINA);
    paginaActual = Math.max(0, Math.min(numeroPagina, totalPaginas - 1));
    _renderizar();
  }

  function _escaparHTML(cadena) {
    return cadena.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  return { iniciar, filtrar, ordenar, exportarCSV, _irPagina };
})();
