/**
 * planificador.js
 * Algoritmos de planificación de CPU: FCFS y SPN (no expulsivos).
 * Soporta miles de procesos sin degradación de rendimiento.
 */

const Scheduler = (() => {

  /**
   * Analiza el texto CSV y devuelve un arreglo de objetos proceso.
   * Columnas requeridas: proceso, llegada, duracion
   */
  function parsearCSV(texto) {
    const lineas = texto.trim().split('\n').map(l => l.trim()).filter(Boolean);
    if (!lineas.length) throw new Error('El archivo está vacío.');

    const encabezado     = lineas[0].toLowerCase().split(',').map(h => h.trim());
    const indiceProceso  = encabezado.indexOf('proceso');
    const indiceLlegada  = encabezado.indexOf('llegada');
    const indiceDuracion = encabezado.indexOf('duracion');

    if (indiceProceso < 0 || indiceLlegada < 0 || indiceDuracion < 0)
      throw new Error('El CSV debe tener columnas: proceso, llegada, duracion');

    const listaProcesos = [];
    for (let fila = 1; fila < lineas.length; fila++) {
      const columnas = lineas[fila].split(',').map(c => c.trim());
      if (columnas.length < 3) continue;

      const llegada  = parseInt(columnas[indiceLlegada]);
      const duracion = parseInt(columnas[indiceDuracion]);

      if (isNaN(llegada) || isNaN(duracion))
        throw new Error(`Fila ${fila + 1}: valores no numéricos.`);
      if (duracion <= 0)
        throw new Error(`Fila ${fila + 1}: la duración debe ser mayor a 0.`);
      if (llegada < 0)
        throw new Error(`Fila ${fila + 1}: el tiempo de llegada no puede ser negativo.`);

      listaProcesos.push({
        proceso: columnas[indiceProceso] || `P${fila}`,
        llegada,
        duracion,
      });
    }

    if (!listaProcesos.length) throw new Error('No se encontraron procesos válidos.');
    return listaProcesos;
  }

  /**
   * Algoritmo FCFS — Primero en llegar, primero en ser atendido.
   * Ordena los procesos por tiempo de llegada y los ejecuta en ese orden.
   */
  function fcfs(listaProcesos) {
    // Ordenar por llegada; empate se resuelve alfabéticamente por nombre
    const ordenados = [...listaProcesos].sort((a, b) =>
      a.llegada - b.llegada || a.proceso.localeCompare(b.proceso)
    );

    let tiempoActual = 0;

    return ordenados.map(proc => {
      // Si la CPU estaba libre, avanzar el reloj hasta que llegue el proceso
      const inicio = Math.max(tiempoActual, proc.llegada);
      const fin    = inicio + proc.duracion;
      tiempoActual = fin;

      return {
        ...proc,
        inicio,
        fin,
        espera:  inicio - proc.llegada,  // tiempo que esperó en cola
        retorno: fin    - proc.llegada,  // tiempo total desde llegada hasta fin
      };
    });
  }

  /**
   * Algoritmo SPN — Proceso más corto primero (no expulsivo).
   * En cada decisión elige el proceso disponible con menor duración.
   */
  function spn(listaProcesos) {
    let tiempoActual = 0;
    // Pendientes ordenados por llegada para recorrer eficientemente
    let pendientes = [...listaProcesos].sort((a, b) => a.llegada - b.llegada);
    const resultado = [];

    while (pendientes.length) {
      // Filtrar los procesos que ya llegaron al sistema
      const disponibles = pendientes.filter(proc => proc.llegada <= tiempoActual);

      if (!disponibles.length) {
        // Ningún proceso disponible: avanzar el reloj al próximo arribo
        tiempoActual = pendientes[0].llegada;
        continue;
      }

      // Buscar el proceso con menor duración (criterio SPN)
      let indiceMenor = 0;
      for (let i = 1; i < disponibles.length; i++) {
        if (disponibles[i].duracion < disponibles[indiceMenor].duracion) {
          indiceMenor = i;
        }
      }

      const elegido = disponibles[indiceMenor];
      // Eliminar el proceso elegido de la lista de pendientes
      pendientes = pendientes.filter(proc => proc !== elegido);

      const inicio = Math.max(tiempoActual, elegido.llegada);
      const fin    = inicio + elegido.duracion;

      resultado.push({
        ...elegido,
        inicio,
        fin,
        espera:  inicio - elegido.llegada,
        retorno: fin    - elegido.llegada,
      });

      tiempoActual = fin;
    }

    return resultado;
  }

  /**
   * Calcula las métricas globales de una simulación terminada.
   */
  function calcularMetricas(resultado) {
    const cantidad    = resultado.length;
    const sumaEspera  = resultado.reduce((acum, proc) => acum + proc.espera,  0);
    const sumaRetorno = resultado.reduce((acum, proc) => acum + proc.retorno, 0);
    const tiempoTotal = resultado[cantidad - 1].fin - resultado[0].inicio;

    return {
      cantidad,
      promedioEspera:  sumaEspera  / cantidad,
      promedioRetorno: sumaRetorno / cantidad,
      maxEspera:       Math.max(...resultado.map(proc => proc.espera)),
      maxRetorno:      Math.max(...resultado.map(proc => proc.retorno)),
      tiempoTotal,
    };
  }

  /**
   * Genera un conjunto aleatorio de procesos para pruebas.
   * Devuelve texto CSV listo para parsear.
   */
  function generarAleatorios(cantidad) {
    let texto = 'proceso,llegada,duracion\n';
    for (let i = 0; i < cantidad; i++) {
      const llegada  = Math.floor(Math.random() * cantidad * 2);
      const duracion = Math.floor(Math.random() * 20) + 1;
      texto += `P${i + 1},${llegada},${duracion}\n`;
    }
    return texto.trim();
  }

  // Exportar solo las funciones públicas del módulo
  return { parsearCSV, fcfs, spn, calcularMetricas, generarAleatorios };
})();
