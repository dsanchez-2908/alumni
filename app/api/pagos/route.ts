import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Consultar pagos con filtros
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    
    // Obtener parámetros de filtro
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const tipoPago = searchParams.get('tipoPago');
    const searchAlumno = searchParams.get('searchAlumno'); // Nombre, apellido o DNI
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');
    const estadoPago = searchParams.get('estadoPago') || 'Pagado';

    // Si busca pendientes, usar lógica diferente
    if (estadoPago === 'Pendiente') {
      return await consultarPendientes(searchParams);
    }

    // Construir query base con todos los JOINs necesarios (PAGADOS)
    let query = `
      SELECT 
        p.cdPago,
        p.fePago,
        p.nuMes,
        p.nuAnio,
        p.dsTipoPago as tipoPagoGlobal,
        p.nuMontoTotal,
        p.dsObservacion,
        p.cdGrupoFamiliar,
        gf.dsNombreGrupo,
        a.cdAlumno as cdAlumnoPrincipal,
        CONCAT(a.dsApellido, ', ', a.dsNombre) as alumnoNombre,
        a.dsDNI,
        u.dsNombreCompleto as usuarioRegistro,
        p.feRegistro,
        -- Detalle de pagos
        GROUP_CONCAT(
          DISTINCT CONCAT(
            pd.cdPagoDetalle, '|',
            pd.cdAlumno, '|',
            CONCAT(al.dsApellido, ', ', al.dsNombre), '|',
            pd.cdTaller, '|',
            tt.dsNombreTaller, '|',
            pd.nuMonto, '|',
            pd.dsTipoPago, '|',
            pd.snEsExcepcion, '|',
            COALESCE(t.snLunes, 0), '|',
            COALESCE(t.dsLunesHoraDesde, ''), '|',
            COALESCE(t.dsLunesHoraHasta, ''), '|',
            COALESCE(t.snMartes, 0), '|',
            COALESCE(t.dsMartesHoraDesde, ''), '|',
            COALESCE(t.dsMartesHoraHasta, ''), '|',
            COALESCE(t.snMiercoles, 0), '|',
            COALESCE(t.dsMiercolesHoraDesde, ''), '|',
            COALESCE(t.dsMiercolesHoraHasta, ''), '|',
            COALESCE(t.snJueves, 0), '|',
            COALESCE(t.dsJuevesHoraDesde, ''), '|',
            COALESCE(t.dsJuevesHoraHasta, ''), '|',
            COALESCE(t.snViernes, 0), '|',
            COALESCE(t.dsViernesHoraDesde, ''), '|',
            COALESCE(t.dsViernesHoraHasta, ''), '|',
            COALESCE(t.snSabado, 0), '|',
            COALESCE(t.dsSabadoHoraDesde, ''), '|',
            COALESCE(t.dsSabadoHoraHasta, ''), '|',
            COALESCE(t.snDomingo, 0), '|',
            COALESCE(t.dsDomingoHoraDesde, ''), '|',
            COALESCE(t.dsDomingoHoraHasta, '')
          ) SEPARATOR ';;'
        ) as detalles
      FROM TD_PAGOS p
      INNER JOIN TD_ALUMNOS a ON p.cdAlumno = a.cdAlumno
      LEFT JOIN TD_GRUPOS_FAMILIARES gf ON p.cdGrupoFamiliar = gf.cdGrupoFamiliar
      INNER JOIN TD_USUARIOS u ON p.cdUsuarioRegistro = u.cdUsuario
      INNER JOIN TD_PAGOS_DETALLE pd ON p.cdPago = pd.cdPago
      INNER JOIN TD_ALUMNOS al ON pd.cdAlumno = al.cdAlumno
      INNER JOIN TD_TALLERES t ON pd.cdTaller = t.cdTaller
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      WHERE 1=1
    `;

    const params: any[] = [];

    // Aplicar filtros
    if (fechaDesde) {
      query += ` AND p.fePago >= ?`;
      params.push(fechaDesde);
    }

    if (fechaHasta) {
      query += ` AND p.fePago <= ?`;
      params.push(fechaHasta);
    }

    if (tipoPago && tipoPago !== 'Todos') {
      query += ` AND p.dsTipoPago = ?`;
      params.push(tipoPago);
    }

    if (searchAlumno) {
      query += ` AND (a.dsNombre LIKE ? OR a.dsApellido LIKE ? OR a.dsDNI LIKE ?)`;
      const searchPattern = `%${searchAlumno}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (mes) {
      query += ` AND p.nuMes = ?`;
      params.push(parseInt(mes));
    }

    if (anio) {
      query += ` AND p.nuAnio = ?`;
      params.push(parseInt(anio));
    }

    query += `
      GROUP BY p.cdPago, p.fePago, p.nuMes, p.nuAnio, p.dsTipoPago, p.nuMontoTotal,
               p.dsObservacion, p.cdGrupoFamiliar, gf.dsNombreGrupo, a.cdAlumno,
               a.dsApellido, a.dsNombre, a.dsDNI, u.dsNombreCompleto, p.feRegistro
      ORDER BY p.fePago DESC, p.cdPago DESC
    `;

    const [pagos] = await pool.execute<any[]>(query, params);

    // Parsear los detalles concatenados
    const pagosFormateados = pagos.map((pago: any) => {
      const detalles = pago.detalles
        ? pago.detalles.split(';;').map((det: string) => {
            const parts = det.split('|');
            const [
              cdPagoDetalle,
              cdAlumno,
              nombreAlumno,
              cdTaller,
              nombreTaller,
              nuMonto,
              dsTipoPago,
              snEsExcepcion,
              snLunes,
              dsLunesHoraDesde,
              dsLunesHoraHasta,
              snMartes,
              dsMartesHoraDesde,
              dsMartesHoraHasta,
              snMiercoles,
              dsMiercolesHoraDesde,
              dsMiercolesHoraHasta,
              snJueves,
              dsJuevesHoraDesde,
              dsJuevesHoraHasta,
              snViernes,
              dsViernesHoraDesde,
              dsViernesHoraHasta,
              snSabado,
              dsSabadoHoraDesde,
              dsSabadoHoraHasta,
              snDomingo,
              dsDomingoHoraDesde,
              dsDomingoHoraHasta,
            ] = parts;
            
            return {
              cdPagoDetalle: parseInt(cdPagoDetalle),
              cdAlumno: parseInt(cdAlumno),
              nombreAlumno,
              cdTaller: parseInt(cdTaller),
              nombreTaller,
              nuMonto: parseFloat(nuMonto),
              dsTipoPago,
              snEsExcepcion: snEsExcepcion === '1',
              horarios: {
                snLunes: snLunes === '1',
                dsLunesHoraDesde,
                dsLunesHoraHasta,
                snMartes: snMartes === '1',
                dsMartesHoraDesde,
                dsMartesHoraHasta,
                snMiercoles: snMiercoles === '1',
                dsMiercolesHoraDesde,
                dsMiercolesHoraHasta,
                snJueves: snJueves === '1',
                dsJuevesHoraDesde,
                dsJuevesHoraHasta,
                snViernes: snViernes === '1',
                dsViernesHoraDesde,
                dsViernesHoraHasta,
                snSabado: snSabado === '1',
                dsSabadoHoraDesde,
                dsSabadoHoraHasta,
                snDomingo: snDomingo === '1',
                dsDomingoHoraDesde,
                dsDomingoHoraHasta,
              }
            };
          })
        : [];

      return {
        cdPago: pago.cdPago,
        fePago: pago.fePago,
        mes: pago.nuMes,
        anio: pago.nuAnio,
        periodo: `${String(pago.nuMes).padStart(2, '0')}/${pago.nuAnio}`,
        tipoPagoGlobal: pago.tipoPagoGlobal,
        montoTotal: parseFloat(pago.nuMontoTotal),
        observacion: pago.dsObservacion,
        cdGrupoFamiliar: pago.cdGrupoFamiliar,
        nombreGrupoFamiliar: pago.dsNombreGrupo,
        alumno: {
          cdAlumno: pago.cdAlumnoPrincipal,
          nombre: pago.alumnoNombre,
          dni: pago.dsDNI,
        },
        usuarioRegistro: pago.usuarioRegistro,
        feRegistro: pago.feRegistro,
        detalles,
        cantidadItems: detalles.length,
      };
    });

    return NextResponse.json({
      pagos: pagosFormateados,
      total: pagosFormateados.length,
    });
  } catch (error: any) {
    console.error('Error al consultar pagos:', error);
    return NextResponse.json(
      { error: 'Error al consultar pagos', details: error.message },
      { status: 500 }
    );
  }
}

// Función auxiliar para consultar pagos pendientes
async function consultarPendientes(searchParams: URLSearchParams) {
  try {
    const searchAlumno = searchParams.get('searchAlumno');
    const mes = searchParams.get('mes');
    const anio = searchParams.get('anio');

    // Determinar el período a consultar
    const fechaActual = new Date();
    const mesActual = fechaActual.getMonth() + 1;
    const anioActual = fechaActual.getFullYear();
    
    // Si se especifica mes y año, consultar solo ese período
    const consultarPeriodoEspecifico = mes && mes !== '0' && anio;
    const mesConsulta = mes && mes !== '0' ? parseInt(mes) : mesActual;
    const anioConsulta = anio ? parseInt(anio) : anioActual;

    // Obtener todos los alumnos con talleres activos (incluyendo feInicioTaller)
    let queryAlumnos = `
      SELECT DISTINCT
        a.cdAlumno,
        a.dsApellido,
        a.dsNombre,
        CONCAT(a.dsApellido, ', ', a.dsNombre) as nombreAlumno,
        a.dsDNI,
        agf.cdGrupoFamiliar,
        gf.dsNombreGrupo,
        at.cdTaller,
        t.cdTipoTaller,
        tt.dsNombreTaller,
        t.nuAnioTaller,
        t.feInicioTaller
      FROM TD_ALUMNOS a
      INNER JOIN TR_ALUMNO_TALLER at ON a.cdAlumno = at.cdAlumno
      INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      LEFT JOIN TR_ALUMNO_GRUPO_FAMILIAR agf ON a.cdAlumno = agf.cdAlumno
      LEFT JOIN TD_GRUPOS_FAMILIARES gf ON agf.cdGrupoFamiliar = gf.cdGrupoFamiliar
      WHERE a.cdEstado = 1
        AND at.feBaja IS NULL
        AND t.cdEstado IN (1, 2)
        AND t.nuAnioTaller = ?
    `;

    const params: any[] = [anioActual];

    if (searchAlumno) {
      queryAlumnos += ` AND (a.dsNombre LIKE ? OR a.dsApellido LIKE ? OR a.dsDNI LIKE ?)`;
      const searchPattern = `%${searchAlumno}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    queryAlumnos += ` ORDER BY a.dsApellido, a.dsNombre`;

    const [alumnosTalleres] = await pool.execute<any[]>(queryAlumnos, params);

    if (alumnosTalleres.length === 0) {
      return NextResponse.json({
        pagos: [],
        total: 0,
        mensaje: 'No se encontraron alumnos con talleres activos',
      });
    }

    // Obtener precios vigentes para todos los tipos de taller
    const tiposTaller = [...new Set(alumnosTalleres.map((at: any) => at.cdTipoTaller))];
    
    const preciosPromises = tiposTaller.map(async (cdTipoTaller) => {
      const [precios] = await pool.execute<any[]>(
        `SELECT *
         FROM TD_PRECIOS_TALLERES
         WHERE cdTipoTaller = ?
           AND feInicioVigencia <= CURDATE()
           AND cdEstado = 1
         ORDER BY feInicioVigencia DESC
         LIMIT 1`,
        [cdTipoTaller]
      );
      return { cdTipoTaller, precio: precios[0] || null };
    });

    const preciosData = await Promise.all(preciosPromises);
    const preciosMap = new Map(preciosData.map((p) => [p.cdTipoTaller, p.precio]));

    // Obtener TODOS los pagos realizados del año actual (para buscar pendientes de cualquier mes)
    const [pagosRealizados] = await pool.execute<any[]>(
      `SELECT DISTINCT 
        pd.cdAlumno, 
        pd.cdTaller,
        p.nuMes,
        p.nuAnio
       FROM TD_PAGOS p
       INNER JOIN TD_PAGOS_DETALLE pd ON p.cdPago = pd.cdPago
       WHERE p.nuAnio = ?`,
      [anioActual]
    );

    const pagoSet = new Set(
      pagosRealizados.map((p: any) => `${p.cdAlumno}-${p.cdTaller}-${p.nuMes}-${p.nuAnio}`)
    );

    // Generar registros pendientes por cada mes desde el inicio del taller hasta el mes actual
    const pendientesDetallados: any[] = [];
    
    alumnosTalleres.forEach((at: any) => {
      const fechaInicio = new Date(at.feInicioTaller);
      const mesInicio = fechaInicio.getMonth() + 1;
      
      // Si consultamos un período específico, solo ese mes
      if (consultarPeriodoEspecifico) {
        // Verificar que el mes consultado esté dentro del rango válido
        if (mesConsulta >= mesInicio && mesConsulta <= mesActual) {
          const key = `${at.cdAlumno}-${at.cdTaller}-${mesConsulta}-${anioConsulta}`;
          if (!pagoSet.has(key)) {
            pendientesDetallados.push({
              ...at,
              mesPendiente: mesConsulta,
              anioPendiente: anioConsulta,
            });
          }
        }
      } else {
        // Buscar TODOS los meses pendientes desde el inicio del taller hasta el mes actual
        for (let m = mesInicio; m <= mesActual; m++) {
          const key = `${at.cdAlumno}-${at.cdTaller}-${m}-${anioActual}`;
          if (!pagoSet.has(key)) {
            pendientesDetallados.push({
              ...at,
              mesPendiente: m,
              anioPendiente: anioActual,
            });
          }
        }
      }
    });

    // Agrupar por alumno + periodo + grupo familiar para calcular descuentos
    const gruposPeridoMap = new Map<string, any[]>();
    
    pendientesDetallados.forEach((item: any) => {
      const grupoKey = item.cdGrupoFamiliar 
        ? `grupo-${item.cdGrupoFamiliar}-${item.mesPendiente}-${item.anioPendiente}` 
        : `alumno-${item.cdAlumno}-${item.mesPendiente}-${item.anioPendiente}`;
      
      if (!gruposPeridoMap.has(grupoKey)) {
        gruposPeridoMap.set(grupoKey, []);
      }
      gruposPeridoMap.get(grupoKey)!.push(item);
    });

    // Calcular montos con descuentos por grupo y periodo
    const pendientesConMontos: any[] = [];

    gruposPeridoMap.forEach((items, grupoKey) => {
      // Si es un solo taller, precio completo
      if (items.length === 1) {
        const item = items[0];
        const precio = preciosMap.get(item.cdTipoTaller);
        
        if (precio) {
          pendientesConMontos.push({
            cdAlumno: item.cdAlumno,
            nombreAlumno: item.nombreAlumno,
            dsDNI: item.dsDNI,
            cdGrupoFamiliar: item.cdGrupoFamiliar,
            dsNombreGrupo: item.dsNombreGrupo,
            cdTaller: item.cdTaller,
            nombreTaller: `${item.dsNombreTaller} (${item.nuAnioTaller})`,
            mes: item.mesPendiente,
            anio: item.anioPendiente,
            montoEsperadoEfectivo: parseFloat(precio.nuPrecioCompletoEfectivo),
            montoEsperadoTransferencia: parseFloat(precio.nuPrecioCompletoTransferencia),
          });
        }
      } else {
        // Múltiples talleres: ordenar por precio y aplicar descuento
        const itemsConPrecio = items
          .map((item: any) => {
            const precio = preciosMap.get(item.cdTipoTaller);
            return {
              ...item,
              precio,
              precioCompletoRef: precio ? parseFloat(precio.nuPrecioCompletoEfectivo) : 0,
            };
          })
          .filter((item: any) => item.precio) // Solo los que tienen precio
          .sort((a, b) => b.precioCompletoRef - a.precioCompletoRef);

        itemsConPrecio.forEach((item: any, index: number) => {
          const esCompleto = index === 0; // El primero (más caro) lleva precio completo
          
          pendientesConMontos.push({
            cdAlumno: item.cdAlumno,
            nombreAlumno: item.nombreAlumno,
            dsDNI: item.dsDNI,
            cdGrupoFamiliar: item.cdGrupoFamiliar,
            dsNombreGrupo: item.dsNombreGrupo,
            cdTaller: item.cdTaller,
            nombreTaller: `${item.dsNombreTaller} (${item.nuAnioTaller})`,
            mes: item.mesPendiente,
            anio: item.anioPendiente,
            montoEsperadoEfectivo: esCompleto
              ? parseFloat(item.precio.nuPrecioCompletoEfectivo)
              : parseFloat(item.precio.nuPrecioDescuentoEfectivo),
            montoEsperadoTransferencia: esCompleto
              ? parseFloat(item.precio.nuPrecioCompletoTransferencia)
              : parseFloat(item.precio.nuPrecioDescuentoTransferencia),
          });
        });
      }
    });

    // Agrupar por alumno + periodo para la vista consolidada
    const alumnosPeriodoMap = new Map<string, any>();
    
    pendientesConMontos.forEach((item: any) => {
      const key = `${item.cdAlumno}-${item.mes}-${item.anio}`;
      
      if (!alumnosPeriodoMap.has(key)) {
        alumnosPeriodoMap.set(key, {
          cdAlumno: item.cdAlumno,
          nombreAlumno: item.nombreAlumno,
          dsDNI: item.dsDNI,
          cdGrupoFamiliar: item.cdGrupoFamiliar,
          dsNombreGrupo: item.dsNombreGrupo,
          mes: item.mes,
          anio: item.anio,
          periodo: `${String(item.mes).padStart(2, '0')}/${item.anio}`,
          talleres: [],
          montoTotalEsperadoEfectivo: 0,
          montoTotalEsperadoTransferencia: 0,
        });
      }
      
      const registro = alumnosPeriodoMap.get(key);
      registro.talleres.push({
        cdTaller: item.cdTaller,
        nombreTaller: item.nombreTaller,
        montoEsperadoEfectivo: item.montoEsperadoEfectivo,
        montoEsperadoTransferencia: item.montoEsperadoTransferencia,
      });
      registro.montoTotalEsperadoEfectivo += item.montoEsperadoEfectivo;
      registro.montoTotalEsperadoTransferencia += item.montoEsperadoTransferencia;
    });

    const resultados = Array.from(alumnosPeriodoMap.values())
      .sort((a, b) => {
        // Ordenar por período (mes/año) descendente
        if (a.anio !== b.anio) return b.anio - a.anio;
        if (a.mes !== b.mes) return b.mes - a.mes;
        return a.nombreAlumno.localeCompare(b.nombreAlumno);
      });

    return NextResponse.json({
      pagos: resultados,
      total: resultados.length,
      totalTalleres: pendientesConMontos.length,
    });
  } catch (error: any) {
    console.error('Error al consultar pendientes:', error);
    return NextResponse.json(
      { error: 'Error al consultar pendientes', details: error.message },
      { status: 500 }
    );
  }
}
