import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Obtener reporte de pagos por talleres con filtros
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario tenga permisos de Administrador o Supervisor
    const userRoles = (session.user as any).roles || [];
    if (!userRoles.includes('Administrador') && !userRoles.includes('Supervisor')) {
      return NextResponse.json(
        { error: 'No tienes permisos para acceder a este reporte' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const mes = parseInt(searchParams.get('mes') || '0');
    const anio = parseInt(searchParams.get('anio') || '0');
    const cdTipoTaller = searchParams.get('cdTipoTaller');
    const cdPersonal = searchParams.get('cdPersonal');
    const horario = searchParams.get('horario');
    const pago = searchParams.get('pago'); // 'SI', 'NO', o null (todos)

    if (!mes || !anio) {
      return NextResponse.json(
        { error: 'Mes y año son obligatorios' },
        { status: 400 }
      );
    }

    // Construir query con filtros
    let queryConditions = ['t.cdEstado = 1']; // Solo talleres activos
    let queryParams: any[] = [];

    // Construir la query principal
    let query = `
      SELECT 
        -- Periodo del reporte
        ? as mes,
        ? as anio,
        
        -- Datos del Taller
        t.cdTaller,
        tt.dsNombreTaller as tipoTaller,
        
        -- Horarios detallados
        CONCAT_WS(' | ',
          IF(t.snLunes = 1, CONCAT('Lun: ', t.dsLunesHoraDesde, '-', t.dsLunesHoraHasta), NULL),
          IF(t.snMartes = 1, CONCAT('Mar: ', t.dsMartesHoraDesde, '-', t.dsMartesHoraHasta), NULL),
          IF(t.snMiercoles = 1, CONCAT('Mié: ', t.dsMiercolesHoraDesde, '-', t.dsMiercolesHoraHasta), NULL),
          IF(t.snJueves = 1, CONCAT('Jue: ', t.dsJuevesHoraDesde, '-', t.dsJuevesHoraHasta), NULL),
          IF(t.snViernes = 1, CONCAT('Vie: ', t.dsViernesHoraDesde, '-', t.dsViernesHoraHasta), NULL),
          IF(t.snSabado = 1, CONCAT('Sáb: ', t.dsSabadoHoraDesde, '-', t.dsSabadoHoraHasta), NULL),
          IF(t.snDomingo = 1, CONCAT('Dom: ', t.dsDomingoHoraDesde, '-', t.dsDomingoHoraHasta), NULL)
        ) as horario,
        
        -- Profesor
        p.dsNombreCompleto as profesor,
        p.cdPersonal,
        
        -- Datos del Alumno
        a.cdAlumno,
        CONCAT(a.dsApellido, ', ', a.dsNombre) as alumno,
        
        -- ¿Pagó? (basado solo en el detalle del taller específico)
        IF(pd.cdPagoDetalle IS NOT NULL, 'SI', 'NO') as pago,
        
        -- Fecha de pago (solo del pago que corresponde a este taller)
        DATE_FORMAT(pag.fePago, '%d/%m/%Y') as fechaPago,
        
        -- Modo de pago (solo del pago que corresponde a este taller)
        pd.dsTipoPago as modoPago,
        
        -- Monto: si pagó muestra el monto pagado, si no pagó muestra el precio por transferencia
        COALESCE(
          pd.nuMonto, 
          prec.nuPrecioCompletoTransferencia
        ) as monto,
        
        -- Campos adicionales para filtros
        tt.cdTipoTaller
        
      FROM TD_TALLERES t
      
      -- Tipo de Taller
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      
      -- Profesor
      INNER JOIN TD_PERSONAL p ON t.cdPersonal = p.cdPersonal
      
      -- Alumnos inscritos (incluye inactivos para mostrar pagos históricos)
      INNER JOIN TR_ALUMNO_TALLER at ON t.cdTaller = at.cdTaller
      
      -- Alumno (sin restricción de estado para ver históricos)
      INNER JOIN TD_ALUMNOS a ON at.cdAlumno = a.cdAlumno
      
      -- Precio del taller (último precio vigente)
      LEFT JOIN TD_PRECIOS_TALLERES prec ON tt.cdTipoTaller = prec.cdTipoTaller
        AND prec.cdEstado = 1
        AND prec.feInicioVigencia = (
          SELECT MAX(feInicioVigencia)
          FROM TD_PRECIOS_TALLERES
          WHERE cdTipoTaller = tt.cdTipoTaller
          AND cdEstado = 1
          AND feInicioVigencia <= LAST_DAY(CONCAT(?, '-', LPAD(?, 2, '0'), '-01'))
        )
      
      -- Detalle de pago por taller (PRIMERO buscamos el detalle específico del taller)
      LEFT JOIN TD_PAGOS_DETALLE pd ON pd.cdTaller = t.cdTaller
        AND pd.cdAlumno = a.cdAlumno
        AND EXISTS (
          SELECT 1 FROM TD_PAGOS p 
          WHERE p.cdPago = pd.cdPago 
          AND p.cdAlumno = a.cdAlumno
          AND p.nuMes = ?
          AND p.nuAnio = ?
        )
      
      -- Pagos del periodo (solo vinculado al detalle encontrado)
      LEFT JOIN TD_PAGOS pag ON pag.cdPago = pd.cdPago
        AND pag.cdAlumno = a.cdAlumno
      
      WHERE 1=1
        -- Solo mostrar alumnos que estaban activos durante el mes consultado
        -- Inscrito antes o durante el mes consultado
        AND (
          YEAR(at.feInscripcion) < ? 
          OR (YEAR(at.feInscripcion) = ? AND MONTH(at.feInscripcion) <= ?)
        )
        -- Y no se dio de baja antes del mes consultado (o nunca se dio de baja)
        AND (
          at.feBaja IS NULL 
          OR YEAR(at.feBaja) > ? 
          OR (YEAR(at.feBaja) = ? AND MONTH(at.feBaja) >= ?)
        )
    `;

    // Agregar parámetros para mes y año en el SELECT, y para los subconsultas de precio y detalle
    queryParams.push(mes, anio, anio, mes, mes, anio);
    
    // Agregar parámetros para la validación de fecha de inscripción y baja
    queryParams.push(anio, anio, mes, anio, anio, mes);

    // Aplicar filtros opcionales
    if (cdTipoTaller) {
      queryConditions.push('tt.cdTipoTaller = ?');
      queryParams.push(parseInt(cdTipoTaller));
    }

    if (cdPersonal) {
      queryConditions.push('p.cdPersonal = ?');
      queryParams.push(parseInt(cdPersonal));
    }

    if (horario) {
      // Filtrar por horario específico
      queryConditions.push(`CONCAT_WS(' | ',
        IF(t.snLunes = 1, CONCAT('Lun: ', t.dsLunesHoraDesde, '-', t.dsLunesHoraHasta), NULL),
        IF(t.snMartes = 1, CONCAT('Mar: ', t.dsMartesHoraDesde, '-', t.dsMartesHoraHasta), NULL),
        IF(t.snMiercoles = 1, CONCAT('Mié: ', t.dsMiercolesHoraDesde, '-', t.dsMiercolesHoraHasta), NULL),
        IF(t.snJueves = 1, CONCAT('Jue: ', t.dsJuevesHoraDesde, '-', t.dsJuevesHoraHasta), NULL),
        IF(t.snViernes = 1, CONCAT('Vie: ', t.dsViernesHoraDesde, '-', t.dsViernesHoraHasta), NULL),
        IF(t.snSabado = 1, CONCAT('Sáb: ', t.dsSabadoHoraDesde, '-', t.dsSabadoHoraHasta), NULL),
        IF(t.snDomingo = 1, CONCAT('Dom: ', t.dsDomingoHoraDesde, '-', t.dsDomingoHoraHasta), NULL)
      ) LIKE ?`);
      queryParams.push(`%${horario}%`);
    }

    // Agregar condiciones al query
    if (queryConditions.length > 0) {
      query += ' AND ' + queryConditions.join(' AND ');
    }

    // Filtro de pago
    if (pago === 'SI') {
      query += ' AND pd.cdPagoDetalle IS NOT NULL';
    } else if (pago === 'NO') {
      query += ' AND pd.cdPagoDetalle IS NULL';
    }

    query += `
      ORDER BY 
        tt.dsNombreTaller,
        t.cdTaller,
        a.dsApellido,
        a.dsNombre
    `;

    const [resultados] = await pool.execute<any[]>(query, queryParams);

    // Calcular totales
    let totalPagado = 0;
    let totalPendiente = 0;

    resultados.forEach((row: any) => {
      const monto = parseFloat(row.monto || 0);
      if (row.pago === 'SI') {
        totalPagado += monto;
      } else {
        totalPendiente += monto;
      }
    });

    // Obtener listas para filtros
    const [tiposTalleres] = await pool.execute<any[]>(
      `SELECT DISTINCT 
        tt.cdTipoTaller,
        tt.dsNombreTaller
       FROM TD_TIPO_TALLERES tt
       INNER JOIN TD_TALLERES t ON tt.cdTipoTaller = t.cdTipoTaller
       WHERE t.cdEstado = 1
       ORDER BY tt.dsNombreTaller`
    );

    const [profesores] = await pool.execute<any[]>(
      `SELECT DISTINCT 
        p.cdPersonal,
        p.dsNombreCompleto
       FROM TD_PERSONAL p
       INNER JOIN TD_TALLERES t ON p.cdPersonal = t.cdPersonal
       WHERE t.cdEstado = 1
       ORDER BY p.dsNombreCompleto`
    );

    const [horarios] = await pool.execute<any[]>(
      `SELECT DISTINCT
        CONCAT_WS(' | ',
          IF(t.snLunes = 1, CONCAT('Lun: ', t.dsLunesHoraDesde, '-', t.dsLunesHoraHasta), NULL),
          IF(t.snMartes = 1, CONCAT('Mar: ', t.dsMartesHoraDesde, '-', t.dsMartesHoraHasta), NULL),
          IF(t.snMiercoles = 1, CONCAT('Mié: ', t.dsMiercolesHoraDesde, '-', t.dsMiercolesHoraHasta), NULL),
          IF(t.snJueves = 1, CONCAT('Jue: ', t.dsJuevesHoraDesde, '-', t.dsJuevesHoraHasta), NULL),
          IF(t.snViernes = 1, CONCAT('Vie: ', t.dsViernesHoraDesde, '-', t.dsViernesHoraHasta), NULL),
          IF(t.snSabado = 1, CONCAT('Sáb: ', t.dsSabadoHoraDesde, '-', t.dsSabadoHoraHasta), NULL),
          IF(t.snDomingo = 1, CONCAT('Dom: ', t.dsDomingoHoraDesde, '-', t.dsDomingoHoraHasta), NULL)
        ) as horario
       FROM TD_TALLERES t
       WHERE t.cdEstado = 1
       HAVING horario IS NOT NULL AND horario != ''
       ORDER BY horario`
    );

    // === NUEVA CONSULTA: PAGOS ATRASADOS PAGADOS EN EL MES CONSULTADO ===
    // Esta consulta busca pagos que fueron realizados en el mes consultado
    // pero que corresponden a periodos anteriores (cuotas atrasadas)
    let queryPagosAtrasadosConditions = ['t.cdEstado = 1']; // Solo talleres activos
    let queryPagosAtrasadosParams: any[] = [];

    let queryPagosAtrasados = `
      SELECT 
        -- Periodo al que corresponde el pago (el periodo atrasado)
        pag.nuMes as mes,
        pag.nuAnio as anio,
        
        -- Datos del Taller
        t.cdTaller,
        tt.dsNombreTaller as tipoTaller,
        
        -- Horarios detallados
        CONCAT_WS(' | ',
          IF(t.snLunes = 1, CONCAT('Lun: ', t.dsLunesHoraDesde, '-', t.dsLunesHoraHasta), NULL),
          IF(t.snMartes = 1, CONCAT('Mar: ', t.dsMartesHoraDesde, '-', t.dsMartesHoraHasta), NULL),
          IF(t.snMiercoles = 1, CONCAT('Mié: ', t.dsMiercolesHoraDesde, '-', t.dsMiercolesHoraHasta), NULL),
          IF(t.snJueves = 1, CONCAT('Jue: ', t.dsJuevesHoraDesde, '-', t.dsJuevesHoraHasta), NULL),
          IF(t.snViernes = 1, CONCAT('Vie: ', t.dsViernesHoraDesde, '-', t.dsViernesHoraHasta), NULL),
          IF(t.snSabado = 1, CONCAT('Sáb: ', t.dsSabadoHoraDesde, '-', t.dsSabadoHoraHasta), NULL),
          IF(t.snDomingo = 1, CONCAT('Dom: ', t.dsDomingoHoraDesde, '-', t.dsDomingoHoraHasta), NULL)
        ) as horario,
        
        -- Profesor
        p.dsNombreCompleto as profesor,
        p.cdPersonal,
        
        -- Datos del Alumno
        a.cdAlumno,
        CONCAT(a.dsApellido, ', ', a.dsNombre) as alumno,
        
        -- Fecha de pago (fecha real en que pagó)
        DATE_FORMAT(pag.fePago, '%d/%m/%Y') as fechaPago,
        
        -- Modo de pago
        pd.dsTipoPago as modoPago,
        
        -- Monto pagado
        pd.nuMonto as monto,
        
        -- Campos adicionales para filtros
        tt.cdTipoTaller
        
      FROM TD_PAGOS pag
      
      -- Detalle del pago
      INNER JOIN TD_PAGOS_DETALLE pd ON pag.cdPago = pd.cdPago
      
      -- Taller
      INNER JOIN TD_TALLERES t ON pd.cdTaller = t.cdTaller
      
      -- Tipo de Taller
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      
      -- Profesor
      INNER JOIN TD_PERSONAL p ON t.cdPersonal = p.cdPersonal
      
      -- Alumno
      INNER JOIN TD_ALUMNOS a ON pag.cdAlumno = a.cdAlumno
      
      WHERE 1=1
        -- El pago fue realizado en el mes/año consultado
        AND YEAR(pag.fePago) = ?
        AND MONTH(pag.fePago) = ?
        -- Pero corresponde a un periodo anterior (pago atrasado)
        AND (pag.nuAnio < ? OR (pag.nuAnio = ? AND pag.nuMes < ?))
    `;

    // Agregar parámetros: año y mes de fePago, y validación de periodo atrasado
    queryPagosAtrasadosParams.push(anio, mes, anio, anio, mes);

    // Aplicar los mismos filtros opcionales
    if (cdTipoTaller) {
      queryPagosAtrasadosConditions.push('tt.cdTipoTaller = ?');
      queryPagosAtrasadosParams.push(parseInt(cdTipoTaller));
    }

    if (cdPersonal) {
      queryPagosAtrasadosConditions.push('p.cdPersonal = ?');
      queryPagosAtrasadosParams.push(parseInt(cdPersonal));
    }

    if (horario) {
      queryPagosAtrasadosConditions.push(`CONCAT_WS(' | ',
        IF(t.snLunes = 1, CONCAT('Lun: ', t.dsLunesHoraDesde, '-', t.dsLunesHoraHasta), NULL),
        IF(t.snMartes = 1, CONCAT('Mar: ', t.dsMartesHoraDesde, '-', t.dsMartesHoraHasta), NULL),
        IF(t.snMiercoles = 1, CONCAT('Mié: ', t.dsMiercolesHoraDesde, '-', t.dsMiercolesHoraHasta), NULL),
        IF(t.snJueves = 1, CONCAT('Jue: ', t.dsJuevesHoraDesde, '-', t.dsJuevesHoraHasta), NULL),
        IF(t.snViernes = 1, CONCAT('Vie: ', t.dsViernesHoraDesde, '-', t.dsViernesHoraHasta), NULL),
        IF(t.snSabado = 1, CONCAT('Sáb: ', t.dsSabadoHoraDesde, '-', t.dsSabadoHoraHasta), NULL),
        IF(t.snDomingo = 1, CONCAT('Dom: ', t.dsDomingoHoraDesde, '-', t.dsDomingoHoraHasta), NULL)
      ) LIKE ?`);
      queryPagosAtrasadosParams.push(`%${horario}%`);
    }

    // Agregar condiciones al query
    if (queryPagosAtrasadosConditions.length > 0) {
      queryPagosAtrasados += ' AND ' + queryPagosAtrasadosConditions.join(' AND ');
    }

    queryPagosAtrasados += `
      ORDER BY 
        pag.nuAnio DESC,
        pag.nuMes DESC,
        tt.dsNombreTaller,
        a.dsApellido,
        a.dsNombre
    `;

    const [pagosAtrasados] = await pool.execute<any[]>(queryPagosAtrasados, queryPagosAtrasadosParams);

    // Calcular totales de pagos atrasados
    let totalPagosAtrasados = 0;
    pagosAtrasados.forEach((row: any) => {
      totalPagosAtrasados += parseFloat(row.monto || 0);
    });

    return NextResponse.json({
      resultados: resultados.map((row: any) => ({
        ...row,
        monto: parseFloat(row.monto || 0),
      })),
      totales: {
        pagado: totalPagado,
        pendiente: totalPendiente,
        total: totalPagado + totalPendiente,
      },
      pagosAtrasados: pagosAtrasados.map((row: any) => ({
        ...row,
        monto: parseFloat(row.monto || 0),
      })),
      totalesPagosAtrasados: {
        total: totalPagosAtrasados,
        cantidad: pagosAtrasados.length,
      },
      filtros: {
        tiposTalleres,
        profesores,
        horarios: horarios.map((h: any) => h.horario).filter((h: string) => h),
      },
    });
  } catch (error: any) {
    console.error('Error al obtener reporte de pagos por talleres:', error);
    return NextResponse.json(
      { error: 'Error al obtener reporte de pagos por talleres', details: error.message },
      { status: 500 }
    );
  }
}
