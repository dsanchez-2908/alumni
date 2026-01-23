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
            pd.snEsExcepcion
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
            const [
              cdPagoDetalle,
              cdAlumno,
              nombreAlumno,
              cdTaller,
              nombreTaller,
              nuMonto,
              dsTipoPago,
              snEsExcepcion,
            ] = det.split('|');
            return {
              cdPagoDetalle: parseInt(cdPagoDetalle),
              cdAlumno: parseInt(cdAlumno),
              nombreAlumno,
              cdTaller: parseInt(cdTaller),
              nombreTaller,
              nuMonto: parseFloat(nuMonto),
              dsTipoPago,
              snEsExcepcion: snEsExcepcion === '1',
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

    // Determinar el período a consultar (mes/año actual por defecto)
    const fechaActual = new Date();
    const mesConsulta = mes && mes !== '0' ? parseInt(mes) : fechaActual.getMonth() + 1;
    const anioConsulta = anio ? parseInt(anio) : fechaActual.getFullYear();

    // Obtener todos los alumnos con talleres activos
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
        t.nuAnioTaller
      FROM TD_ALUMNOS a
      INNER JOIN tr_alumno_taller at ON a.cdAlumno = at.cdAlumno
      INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      LEFT JOIN tr_alumno_grupo_familiar agf ON a.cdAlumno = agf.cdAlumno
      LEFT JOIN TD_GRUPOS_FAMILIARES gf ON agf.cdGrupoFamiliar = gf.cdGrupoFamiliar
      WHERE a.cdEstado = 1
        AND at.feBaja IS NULL
        AND t.cdEstado IN (1, 2)
    `;

    const params: any[] = [];

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

    // Obtener pagos ya realizados para el período consultado
    const [pagosRealizados] = await pool.execute<any[]>(
      `SELECT DISTINCT 
        pd.cdAlumno, 
        pd.cdTaller,
        p.nuMes,
        p.nuAnio
       FROM TD_PAGOS p
       INNER JOIN TD_PAGOS_DETALLE pd ON p.cdPago = pd.cdPago
       WHERE p.nuMes = ? AND p.nuAnio = ?`,
      [mesConsulta, anioConsulta]
    );

    const pagoSet = new Set(
      pagosRealizados.map((p: any) => `${p.cdAlumno}-${p.cdTaller}-${p.nuMes}-${p.nuAnio}`)
    );

    // Filtrar solo los que NO tienen pago para el período
    const pendientes = alumnosTalleres.filter((at: any) => {
      const key = `${at.cdAlumno}-${at.cdTaller}-${mesConsulta}-${anioConsulta}`;
      return !pagoSet.has(key);
    });

    // Agrupar por alumno/grupo familiar para calcular descuentos
    const gruposMap = new Map<string, any[]>();
    
    pendientes.forEach((item: any) => {
      const grupoKey = item.cdGrupoFamiliar 
        ? `grupo-${item.cdGrupoFamiliar}` 
        : `alumno-${item.cdAlumno}`;
      
      if (!gruposMap.has(grupoKey)) {
        gruposMap.set(grupoKey, []);
      }
      gruposMap.get(grupoKey)!.push(item);
    });

    // Calcular montos con descuentos por grupo
    const pendientesConMontos: any[] = [];

    gruposMap.forEach((items, grupoKey) => {
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
            mes: mesConsulta,
            anio: anioConsulta,
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
            mes: mesConsulta,
            anio: anioConsulta,
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

    // Agrupar por alumno para la vista consolidada
    const alumnosMap = new Map<number, any>();
    
    pendientesConMontos.forEach((item: any) => {
      if (!alumnosMap.has(item.cdAlumno)) {
        alumnosMap.set(item.cdAlumno, {
          cdAlumno: item.cdAlumno,
          nombreAlumno: item.nombreAlumno,
          dsDNI: item.dsDNI,
          cdGrupoFamiliar: item.cdGrupoFamiliar,
          dsNombreGrupo: item.dsNombreGrupo,
          mes: mesConsulta,
          anio: anioConsulta,
          periodo: `${String(mesConsulta).padStart(2, '0')}/${anioConsulta}`,
          talleres: [],
          montoTotalEsperadoEfectivo: 0,
          montoTotalEsperadoTransferencia: 0,
        });
      }
      
      const alumno = alumnosMap.get(item.cdAlumno);
      alumno.talleres.push({
        cdTaller: item.cdTaller,
        nombreTaller: item.nombreTaller,
        montoEsperadoEfectivo: item.montoEsperadoEfectivo,
        montoEsperadoTransferencia: item.montoEsperadoTransferencia,
      });
      alumno.montoTotalEsperadoEfectivo += item.montoEsperadoEfectivo;
      alumno.montoTotalEsperadoTransferencia += item.montoEsperadoTransferencia;
    });

    const resultados = Array.from(alumnosMap.values());

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
