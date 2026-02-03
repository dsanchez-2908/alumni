import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { executeQuery } from '@/lib/db-utils';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Contar alumnos activos
    const alumnosResult = await executeQuery<any>(
      'SELECT COUNT(*) as total FROM TD_ALUMNOS WHERE cdEstado = 1'
    );
    const totalAlumnos = alumnosResult[0]?.total || 0;

    // Contar talleres activos del año actual
    const talleresResult = await executeQuery<any>(
      'SELECT COUNT(*) as total FROM TD_TALLERES WHERE cdEstado = 1 AND nuAnioTaller = ?',
      [currentYear]
    );
    const totalTalleres = talleresResult[0]?.total || 0;

    // Contar profesores activos
    const profesoresResult = await executeQuery<any>(
      "SELECT COUNT(*) as total FROM TD_PERSONAL WHERE cdEstado = 1 AND dsTipoPersonal = 'Profesor'"
    );
    const totalProfesores = profesoresResult[0]?.total || 0;

    // Contar alumnos que deben pagar el mes actual
    const [alumnosMesActualRows] = await pool.execute<any[]>(
      `SELECT COUNT(DISTINCT a.cdAlumno) as total
       FROM TD_ALUMNOS a
       INNER JOIN TR_ALUMNO_TALLER at ON a.cdAlumno = at.cdAlumno
       INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
       WHERE a.cdEstado = 1
         AND at.feBaja IS NULL
         AND t.cdEstado IN (1, 2)
         AND t.nuAnioTaller = ?
         AND NOT EXISTS (
           SELECT 1 FROM TD_PAGOS p
           INNER JOIN TD_PAGOS_DETALLE pd ON p.cdPago = pd.cdPago
           WHERE pd.cdAlumno = a.cdAlumno
             AND pd.cdTaller = at.cdTaller
             AND p.nuMes = ?
             AND p.nuAnio = ?
         )`,
      [currentYear, currentMonth, currentYear]
    );
    const alumnosMesActual = alumnosMesActualRows[0]?.total || 0;

    // Contar alumnos con deudas de meses anteriores (del año actual)
    const [alumnosMesesAnterioresRows] = await pool.execute<any[]>(
      `SELECT COUNT(DISTINCT sub.cdAlumno) as total
       FROM (
         SELECT DISTINCT a.cdAlumno, mes.mes
         FROM TD_ALUMNOS a
         INNER JOIN TR_ALUMNO_TALLER at ON a.cdAlumno = at.cdAlumno
         INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
         CROSS JOIN (
           SELECT 1 as mes UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 
           UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 
           UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12
         ) mes
         WHERE a.cdEstado = 1
           AND at.feBaja IS NULL
           AND t.cdEstado IN (1, 2)
           AND t.nuAnioTaller = ?
           AND mes.mes < ?
           AND mes.mes >= MONTH(t.feInicioTaller)
           AND NOT EXISTS (
             SELECT 1 FROM TD_PAGOS p
             INNER JOIN TD_PAGOS_DETALLE pd ON p.cdPago = pd.cdPago
             WHERE pd.cdAlumno = a.cdAlumno
               AND pd.cdTaller = at.cdTaller
               AND p.nuMes = mes.mes
               AND p.nuAnio = ?
           )
       ) sub`,
      [currentYear, currentMonth, currentYear]
    );
    const alumnosMesesAnteriores = alumnosMesesAnterioresRows[0]?.total || 0;

    // Obtener próximos 5 cumpleaños (alumnos y profesores) - SIN el 0 al final
    const [cumpleanosRaw] = await pool.execute<any[]>(
      `SELECT 
          tipo,
          nombre,
          feNacimiento,
          fechaCumple,
          diasFaltantes,
          CAST(esHoy AS SIGNED) as esHoy
        FROM (
          SELECT 
            'Alumno' as tipo,
            CONCAT(dsNombre, ' ', dsApellido) as nombre,
            feNacimiento,
            DATE_FORMAT(feNacimiento, '%d/%m') as fechaCumple,
            CASE 
              WHEN DATE_FORMAT(CURDATE(), '%m-%d') = DATE_FORMAT(feNacimiento, '%m-%d') THEN 0
              WHEN DATE_FORMAT(feNacimiento, '%m-%d') > DATE_FORMAT(CURDATE(), '%m-%d') THEN 
                DATEDIFF(
                  DATE(CONCAT(YEAR(CURDATE()), '-', DATE_FORMAT(feNacimiento, '%m-%d'))),
                  CURDATE()
                )
              ELSE 
                DATEDIFF(
                  DATE(CONCAT(YEAR(CURDATE()) + 1, '-', DATE_FORMAT(feNacimiento, '%m-%d'))),
                  CURDATE()
                )
            END as diasFaltantes,
            IF(DATE_FORMAT(CURDATE(), '%m-%d') = DATE_FORMAT(feNacimiento, '%m-%d'), 1, 0) as esHoy
          FROM TD_ALUMNOS 
          WHERE cdEstado = 1 AND feNacimiento IS NOT NULL
          
          UNION ALL
          
          SELECT 
            'Profesor' as tipo,
            dsNombreCompleto as nombre,
            feNacimiento,
            DATE_FORMAT(feNacimiento, '%d/%m') as fechaCumple,
            CASE 
              WHEN DATE_FORMAT(CURDATE(), '%m-%d') = DATE_FORMAT(feNacimiento, '%m-%d') THEN 0
              WHEN DATE_FORMAT(feNacimiento, '%m-%d') > DATE_FORMAT(CURDATE(), '%m-%d') THEN 
                DATEDIFF(
                  DATE(CONCAT(YEAR(CURDATE()), '-', DATE_FORMAT(feNacimiento, '%m-%d'))),
                  CURDATE()
                )
              ELSE 
                DATEDIFF(
                  DATE(CONCAT(YEAR(CURDATE()) + 1, '-', DATE_FORMAT(feNacimiento, '%m-%d'))),
                  CURDATE()
                )
            END as diasFaltantes,
            IF(DATE_FORMAT(CURDATE(), '%m-%d') = DATE_FORMAT(feNacimiento, '%m-%d'), 1, 0) as esHoy
          FROM TD_PERSONAL 
          WHERE cdEstado = 1 AND dsTipoPersonal = 'Profesor' AND feNacimiento IS NOT NULL
        ) AS cumpleanos_combined
        ORDER BY diasFaltantes ASC, nombre ASC
        LIMIT 5`
    );
    
    // Asegurar que esHoy sea booleano en JavaScript
    const cumpleanos = cumpleanosRaw.map((c: any) => ({
      ...c,
      esHoy: c.esHoy === 1 || c.esHoy === true
    }));

    // Obtener profesores con fechas pendientes de asistencia usando la misma lógica que fechas-pendientes
    const [talleres] = await pool.execute<any[]>(
      `SELECT 
        t.cdTaller,
        t.cdPersonal,
        p.dsNombreCompleto,
        tt.dsNombreTaller,
        t.nuAnioTaller,
        t.feInicioTaller,
        t.snDomingo, t.snLunes, t.snMartes, t.snMiercoles, 
        t.snJueves, t.snViernes, t.snSabado
      FROM TD_TALLERES t
      INNER JOIN TD_PERSONAL p ON t.cdPersonal = p.cdPersonal
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      WHERE t.cdEstado IN (1, 2)
        AND p.cdEstado = 1
        AND p.dsTipoPersonal = 'Profesor'
        AND t.nuAnioTaller = ?`,
      [currentYear]
    );

    const profesoresPendientesMap = new Map<number, any>();
    const fechaHoy = new Date();
    fechaHoy.setHours(0, 0, 0, 0);

    for (const taller of talleres) {
      // Obtener fechas ya registradas
      const [registradas] = await pool.execute<any[]>(
        `SELECT DISTINCT DATE(feFalta) as fecha
         FROM TD_ASISTENCIAS
         WHERE cdTaller = ?`,
        [taller.cdTaller]
      );

      const fechasRegistradas = new Set(
        registradas.map((r: any) => {
          const fecha = r.fecha instanceof Date ? r.fecha : new Date(r.fecha);
          return fecha.toISOString().split('T')[0];
        })
      );

      // Calcular fechas pendientes
      const diasClase: number[] = [];
      if (taller.snDomingo) diasClase.push(0);
      if (taller.snLunes) diasClase.push(1);
      if (taller.snMartes) diasClase.push(2);
      if (taller.snMiercoles) diasClase.push(3);
      if (taller.snJueves) diasClase.push(4);
      if (taller.snViernes) diasClase.push(5);
      if (taller.snSabado) diasClase.push(6);

      let fechasPendientes = 0;
      const fechaInicio = new Date(taller.feInicioTaller);
      let fechaActual = new Date(fechaInicio);

      while (fechaActual <= fechaHoy) {
        const diaSemana = fechaActual.getDay();
        const fechaStr = fechaActual.toISOString().split('T')[0];

        if (diasClase.includes(diaSemana) && !fechasRegistradas.has(fechaStr)) {
          fechasPendientes++;
        }

        fechaActual.setDate(fechaActual.getDate() + 1);
      }

      // Si hay fechas pendientes, agregar al mapa
      if (fechasPendientes > 0) {
        if (!profesoresPendientesMap.has(taller.cdPersonal)) {
          profesoresPendientesMap.set(taller.cdPersonal, {
            cdPersonal: taller.cdPersonal,
            dsNombreCompleto: taller.dsNombreCompleto,
            talleres: [],
            totalFechasPendientes: 0
          });
        }
        const profesor = profesoresPendientesMap.get(taller.cdPersonal)!;
        profesor.talleres.push({
          cdTaller: taller.cdTaller,
          dsNombreTaller: taller.dsNombreTaller,
          nuAnioTaller: taller.nuAnioTaller,
          fechasPendientes
        });
        profesor.totalFechasPendientes += fechasPendientes;
      }
    }

    const profesoresPendientes = Array.from(profesoresPendientesMap.values());

    return NextResponse.json({
      totales: {
        alumnos: totalAlumnos,
        talleres: totalTalleres,
        profesores: totalProfesores,
        alumnosPagoMesActual: alumnosMesActual,
        alumnosPagoMesesAnteriores: alumnosMesesAnteriores,
      },
      cumpleanos,
      profesoresPendientes,
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas del dashboard' },
      { status: 500 }
    );
  }
}
