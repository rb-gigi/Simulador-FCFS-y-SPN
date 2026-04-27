const App = (() => {

  let politicaActual = 'FCFS';  // política de planificación activa
  let editorAbierto  = false;   // estado del panel editor

  /** Cambia la política de planificación activa (FCFS o SPN). */
  function cambiarPolitica(politica) {
    politicaActual = politica;
    document.getElementById('botonFCFS').classList.toggle('activo', politica === 'FCFS');
    document.getElementById('botonSPN').classList.toggle('activo',  politica === 'SPN');
    document.getElementById('insigniaPolitica').textContent = politica;
  }

  /** Muestra u oculta el panel de edición manual de datos CSV. */
  function alternarEditor() {
    editorAbierto = !editorAbierto;
    const panel = document.getElementById('panelEditor');
    const boton = document.getElementById('botonEditor');
    panel.style.display     = editorAbierto ? 'block' : 'none';
    boton.style.borderColor = editorAbierto ? 'var(--acento)' : '';
    boton.style.color       = editorAbierto ? 'var(--acento)' : '';
  }

  /** Ejecuta la simulación con los datos y política actuales. */
  function simular() {
    const texto = document.getElementById('entradaCSV').value.trim();
    if (!texto) {
      _mostrarAlerta('Carga un archivo CSV o usa "Editar" para ingresar datos manualmente.');
      return;
    }

    let listaProcesos, resultado;

    try {
      listaProcesos = Scheduler.parsearCSV(texto);
    } catch (error) {
      _mostrarAlerta(error.message);
      return;
    }

    // Medir tiempo de ejecución del algoritmo
    const marcaTiempo = performance.now();

    if (politicaActual === 'FCFS') {
      resultado = Scheduler.fcfs(listaProcesos);
    } else {
      resultado = Scheduler.spn(listaProcesos);
    }

    const duracionMs = (performance.now() - marcaTiempo).toFixed(1);

    // Mostrar paneles de resultados
    document.getElementById('panelGantt').style.display    = 'block';
    document.getElementById('panelTabla').style.display    = 'block';
    document.getElementById('franjaMetricas').style.display = 'block';
    document.getElementById('estadoVacio').style.display   = 'none';

    // Enviar resultados a cada módulo de visualización
    Gantt.iniciar(resultado);
    Table.iniciar(resultado);
    _mostrarMetricas(resultado);
    _mostrarLeyenda(resultado);

    _mostrarAlerta(
      `✓ ${resultado.length} procesos simulados con ${politicaActual} en ${duracionMs} ms`,
      'exito'
    );
  }

  /** Limpia todos los datos y oculta los paneles de resultados. */
  function limpiar() {
    document.getElementById('entradaCSV').value            = '';
    document.getElementById('panelGantt').style.display    = 'none';
    document.getElementById('panelTabla').style.display    = 'none';
    document.getElementById('franjaMetricas').style.display = 'none';
    document.getElementById('estadoVacio').style.display   = 'flex';
    document.getElementById('cajaAlerta').style.display    = 'none';
    document.getElementById('infoArchivo').textContent     = '';
    document.getElementById('contadorFilas').textContent   = '';
    document.getElementById('leyenda').innerHTML           = '';
    document.getElementById('cuadriculaMetricas').innerHTML = '';
  }

  /**
   * Carga un conjunto de procesos de ejemplo o genera uno aleatorio.
   * Si no se pasa cantidad, la lee del campo de entrada en la interfaz.
   */
  function cargarEjemplo(cantidad) {
    if (cantidad === undefined) {
      cantidad = parseInt(document.getElementById('cantidadProcesos').value) || 6;
    }
    cantidad = Math.max(1, Math.min(5000, cantidad));

    if (cantidad === 6) {
      document.getElementById('entradaCSV').value =
        'proceso,llegada,duracion\nP1,0,5\nP2,1,3\nP3,2,8\nP4,4,2\nP5,6,4\nP6,8,6';
    } else {
      document.getElementById('entradaCSV').value = Scheduler.generarAleatorios(cantidad);
    }

    const filas = document.getElementById('entradaCSV').value.split('\n').length - 1;
    document.getElementById('infoArchivo').textContent   = '';
    document.getElementById('contadorFilas').textContent = `${filas} proceso${filas !== 1 ? 's' : ''} listos`;

    // Abrir editor para que el usuario vea los datos
    if (!editorAbierto) alternarEditor();
  }

  /** Lee un archivo CSV del equipo y carga su contenido en el editor. */
  function cargarArchivo(evento) {
    const archivo = evento.target.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = lectura => {
      document.getElementById('entradaCSV').value = lectura.target.result;
      const filas = lectura.target.result.split('\n').filter(linea => linea.trim()).length - 1;
      document.getElementById('infoArchivo').textContent   = `📄 ${archivo.name}`;
      document.getElementById('contadorFilas').textContent = `${filas} proceso${filas !== 1 ? 's' : ''} detectados`;
      if (!editorAbierto) alternarEditor();
    };
    lector.readAsText(archivo, 'utf-8');
    evento.target.value = ''; // permitir volver a cargar el mismo archivo
  }


  /** Renderiza las tarjetas de métricas globales de la simulación. */
  function _mostrarMetricas(resultado) {
    const metricas = Scheduler.calcularMetricas(resultado);
    document.getElementById('cuadriculaMetricas').innerHTML = `
      <div class="tarjeta-metrica">
        <div class="icono-metrica azul">⚙</div>
        <div class="cuerpo-metrica">
          <div class="etiqueta-metrica">Procesos · ${politicaActual}</div>
          <div class="valor-metrica">${metricas.cantidad}</div>
          <div class="sub-metrica">t total: ${metricas.tiempoTotal}</div>
        </div>
      </div>
      <div class="tarjeta-metrica">
        <div class="icono-metrica verde">⏱</div>
        <div class="cuerpo-metrica">
          <div class="etiqueta-metrica">Espera promedio</div>
          <div class="valor-metrica">${metricas.promedioEspera.toFixed(2)}</div>
          <div class="sub-metrica">máx: ${metricas.maxEspera}</div>
        </div>
      </div>
      <div class="tarjeta-metrica">
        <div class="icono-metrica ambar">↩</div>
        <div class="cuerpo-metrica">
          <div class="etiqueta-metrica">Retorno promedio</div>
          <div class="valor-metrica">${metricas.promedioRetorno.toFixed(2)}</div>
          <div class="sub-metrica">máx: ${metricas.maxRetorno}</div>
        </div>
      </div>`;
  }

  /** Renderiza la leyenda de colores de los primeros 30 procesos. */
  function _mostrarLeyenda(resultado) {
    const COLORES = [
      '#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6',
      '#06b6d4','#f97316','#ec4899','#14b8a6','#84cc16',
    ];
    const visibles = resultado.slice(0, 30);
    document.getElementById('leyenda').innerHTML =
      visibles.map((proc, indice) =>
        `<span class="elemento-leyenda">
          <span class="punto-leyenda" style="background:${COLORES[indice % COLORES.length]}"></span>
          ${proc.proceso}
        </span>`
      ).join('') +
      (resultado.length > 30
        ? `<span class="elemento-leyenda" style="color:var(--texto-oscuro)">+${resultado.length - 30} más</span>`
        : '');
  }

  /** Muestra un mensaje de alerta en la barra superior. */
  function _mostrarAlerta(mensaje, tipo = 'error') {
    const elemento        = document.getElementById('cajaAlerta');
    elemento.className     = 'barra-alerta ' + tipo;
    elemento.textContent   = mensaje;
    elemento.style.display = 'block';
    if (tipo === 'exito') setTimeout(() => elemento.style.display = 'none', 4000);
  }

  // Exportar API pública
  return { cambiarPolitica, alternarEditor, simular, limpiar, cargarEjemplo, cargarArchivo };
})();
