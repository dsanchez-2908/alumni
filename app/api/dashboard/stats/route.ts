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

    // Determinar el rol principal del usuario
    const roles = session.user?.roles || [];
    const cdPersonal = session.user?.cdPersonal;
    
    let rolPrincipal = 'Operador'; // Por defecto
    if (roles.includes('Administrador')) rolPrincipal = 'Administrador';
    else if (roles.includes('Supervisor')) rolPrincipal = 'Supervisor';
    else if (roles.includes('Profesor')) rolPrincipal = 'Profesor';
    else if (roles.includes('Operador')) rolPrincipal = 'Operador';

    // Variables para las estadísticas
    let totalAlumnos = 0;
    let totalTalleres = 0;
    let totalProfesores = 0;
    let alumnosMesActual = 0;
    let alumnosMesesAnteriores = 0;
    let alumnosConSeguimiento = 0;

    // ADMINISTRADOR y SUPERVISOR: Dashboard completo
    if (rolPrincipal === 'Administrador' || rolPrincipal === 'Supervisor') {
      // Contar alumnos activos (inscritos en al menos un taller activo)
      const alumnosResult = await executeQuery<any>(
        `SELECT COUNT(DISTINCT a.cdAlumno) as total 
         FROM TD_ALUMNOS a
         INNER JOIN TR_ALUMNO_TALLER at ON a.cdAlumno = at.cdAlumno
         INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
         WHERE at.cdEstado = 1 AND t.cdEstado = 1`
      );
      totalAlumnos = alumnosResult[0]?.total || 0;

      // Contar talleres activos del año actual
      const talleresResult = await executeQuery<any>(
        'SELECT COUNT(*) as total FROM TD_TALLERES WHERE cdEstado = 1 AND nuAnioTaller = ?',
        [currentYear]
      );
      totalTalleres = talleresResult[0]?.total || 0;

      // Contar profesores activos
      const profesoresResult = await executeQuery<any>(
        "SELECT COUNT(*) as total FROM TD_PERSONAL WHERE cdEstado = 1 AND dsTipoPersonal = 'Profesor'"
      );
      totalProfesores = profesoresResult[0]?.total || 0;

      // Contar alumnos que deben pagar el mes actual
      const [alumnosMesActualRows] = await pool.execute<any[]>(
        `SELECT COUNT(DISTINCT a.cdAlumno) as total
         FROM TD_ALUMNOS a
         INNER JOIN TR_ALUMNO_TALLER at ON a.cdAlumno = at.cdAlumno
         INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
         WHERE a.cdEstado = 1
           AND at.cdEstado = 1
           AND at.feBaja IS NULL
           AND t.cdEstado IN (1, 2)
           AND t.nuAnioTaller = ?
           -- El alumno debe estar inscrito antes o durante el mes actual
           AND (
             YEAR(at.feInscripcion) < ? 
             OR (YEAR(at.feInscripcion) = ? AND MONTH(at.feInscripcion) <= ?)
           )
           AND NOT EXISTS (
             SELECT 1 FROM TD_PAGOS p
             INNER JOIN TD_PAGOS_DETALLE pd ON p.cdPago = pd.cdPago
             WHERE pd.cdAlumno = a.cdAlumno
               AND pd.cdTaller = at.cdTaller
               AND p.nuMes = ?
               AND p.nuAnio = ?
           )`,
        [currentYear, currentYear, currentYear, currentMonth, currentMonth, currentYear]
      );
      alumnosMesActual = alumnosMesActualRows[0]?.total || 0;

      // Contar alumnos con deudas de meses anteriores
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
             AND at.cdEstado = 1
             AND at.feBaja IS NULL
             AND t.cdEstado IN (1, 2)
             AND t.nuAnioTaller = ?
             AND mes.mes < ?
             -- El mes debe ser >= al mes de inscripción del alumno
             AND mes.mes >= MONTH(at.feInscripcion)
             -- Y la inscripción debe ser de este año o antes
             AND YEAR(at.feInscripcion) <= ?
             AND NOT EXISTS (
               SELECT 1 FROM TD_PAGOS p
               INNER JOIN TD_PAGOS_DETALLE pd ON p.cdPago = pd.cdPago
               WHERE pd.cdAlumno = a.cdAlumno
                 AND pd.cdTaller = at.cdTaller
                 AND p.nuMes = mes.mes
                 AND p.nuAnio = ?
             )
         ) sub`,
        [currentYear, currentMonth, currentYear, currentYear]
      );
      alumnosMesesAnteriores = alumnosMesesAnterioresRows[0]?.total || 0;

      // Contar alumnos con seguimiento de faltas (2 o más faltas consecutivas sin contactar)
      const [ausenciasRows] = await pool.execute<any[]>(
        `SELECT 
          a.cdAlumno,
          t.cdTaller,
          ast.feFalta
        FROM TD_ALUMNOS a
        INNER JOIN TR_ALUMNO_TALLER at ON a.cdAlumno = at.cdAlumno
        INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
        INNER JOIN TD_ASISTENCIAS ast ON a.cdAlumno = ast.cdAlumno AND t.cdTaller = ast.cdTaller
        WHERE a.cdEstado = 1
          AND at.cdEstado = 1
          AND t.cdEstado = 1
          AND t.nuAnioTaller = ?
          AND YEAR(ast.feFalta) = ?
          AND ast.snPresente = 0
          AND (ast.snContactado IS NULL OR ast.snContactado = 0)
        ORDER BY a.cdAlumno, t.cdTaller, ast.feFalta`,
        [currentYear, currentYear]
      );

      // Procesar ausencias para encontrar faltas consecutivas
      const ausenciasPorAlumnoTaller = new Map<string, any[]>();
      ausenciasRows.forEach((ausencia: any) => {
        const key = `${ausencia.cdAlumno}-${ausencia.cdTaller}`;
        if (!ausenciasPorAlumnoTaller.has(key)) {
          ausenciasPorAlumnoTaller.set(key, []);
        }
        ausenciasPorAlumnoTaller.get(key)!.push(ausencia);
      });

      const alumnosConFaltasConsecutivas = new Set<number>();
      
      ausenciasPorAlumnoTaller.forEach((ausenciasLista, key) => {
        const [cdAlumno] = key.split('-').map(Number);
        
        // Ordenar por fecha
        ausenciasLista.sort((a, b) => 
          new Date(a.feFalta).getTime() - new Date(b.feFalta).getTime()
        );

        // Buscar secuencias de faltas consecutivas
        let faltasConsecutivas = 1;
        let maxConsecutivas = 1;
        
        for (let i = 1; i < ausenciasLista.length; i++) {
          const fechaAnterior = new Date(ausenciasLista[i - 1].feFalta);
          const fechaActual = new Date(ausenciasLista[i].feFalta);
          
          // Calcular diferencia en días
          const diffTime = fechaActual.getTime() - fechaAnterior.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // Considerar consecutivas si la diferencia es <= 7 días (una semana)
          if (diffDays <= 7) {
            faltasConsecutivas++;
            maxConsecutivas = Math.max(maxConsecutivas, faltasConsecutivas);
          } else {
            faltasConsecutivas = 1;
          }
        }

        // Si tiene 2 o más faltas consecutivas
        if (maxConsecutivas >= 2) {
          alumnosConFaltasConsecutivas.add(cdAlumno);
        }
      });

      alumnosConSeguimiento = alumnosConFaltasConsecutivas.size;
    }
    // PROFESOR: Stats específicos del profesor
    else if (rolPrincipal === 'Profesor' && cdPersonal) {
      // Contar talleres del profesor
      const talleresResult = await executeQuery<any>(
        'SELECT COUNT(*) as total FROM TD_TALLERES WHERE cdEstado IN (1, 2) AND nuAnioTaller = ? AND cdPersonal = ?',
        [currentYear, cdPersonal]
      );
      totalTalleres = talleresResult[0]?.total || 0;

      // Contar alumnos en los talleres del profesor
      const alumnosResult = await executeQuery<any>(
        `SELECT COUNT(DISTINCT at.cdAlumno) as total
         FROM TR_ALUMNO_TALLER at
         INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
         INNER JOIN TD_ALUMNOS a ON at.cdAlumno = a.cdAlumno
         WHERE t.cdPersonal = ?
           AND t.nuAnioTaller = ?
           AND t.cdEstado IN (1, 2)
           AND a.cdEstado = 1
           AND at.cdEstado = 1`,
        [cdPersonal, currentYear]
      );
      totalAlumnos = alumnosResult[0]?.total || 0;
    }
    // OPERADOR: No necesita stats completos, solo cumpleaños y asistencias

    // Obtener próximos 5 y últimos 5 cumpleaños según el rol
    let cumpleanosProximosRaw: any[];
    let cumpleanosPasadosRaw: any[];
    
    if (rolPrincipal === 'Profesor' && cdPersonal) {
      // PROFESOR: Solo cumpleaños de sus alumnos - PRÓXIMOS
      [cumpleanosProximosRaw] = await pool.execute<any[]>(
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
            CONCAT(a.dsNombre, ' ', a.dsApellido) as nombre,
            a.feNacimiento,
            DATE_FORMAT(a.feNacimiento, '%d/%m') as fechaCumple,
            CASE 
              WHEN DATE_FORMAT(CURDATE(), '%m-%d') = DATE_FORMAT(a.feNacimiento, '%m-%d') THEN 0
              WHEN DATE_FORMAT(a.feNacimiento, '%m-%d') > DATE_FORMAT(CURDATE(), '%m-%d') THEN 
                DATEDIFF(
                  DATE(CONCAT(YEAR(CURDATE()), '-', DATE_FORMAT(a.feNacimiento, '%m-%d'))),
                  CURDATE()
                )
              ELSE 
                DATEDIFF(
                  DATE(CONCAT(YEAR(CURDATE()) + 1, '-', DATE_FORMAT(a.feNacimiento, '%m-%d'))),
                  CURDATE()
                )
            END as diasFaltantes,
            IF(DATE_FORMAT(CURDATE(), '%m-%d') = DATE_FORMAT(a.feNacimiento, '%m-%d'), 1, 0) as esHoy
          FROM TD_ALUMNOS a
          INNER JOIN TR_ALUMNO_TALLER at ON a.cdAlumno = at.cdAlumno
          INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
          WHERE a.cdEstado = 1 
            AND a.feNacimiento IS NOT NULL
            AND t.cdPersonal = ?
            AND t.nuAnioTaller = ?
            AND at.cdEstado = 1
        ) AS cumpleanos_alumnos
        ORDER BY diasFaltantes ASC, nombre ASC
        LIMIT 5`,
        [cdPersonal, currentYear]
      );
      
      // PROFESOR: Solo cumpleaños de sus alumnos - PASADOS
      [cumpleanosPasadosRaw] = await pool.execute<any[]>(
        `SELECT 
          tipo,
          nombre,
          feNacimiento,
          fechaCumple,
          ABS(diasPasados) as diasPasados
        FROM (
          SELECT 
            'Alumno' as tipo,
            CONCAT(a.dsNombre, ' ', a.dsApellido) as nombre,
            a.feNacimiento,
            DATE_FORMAT(a.feNacimiento, '%d/%m') as fechaCumple,
            CASE 
              WHEN DATE_FORMAT(CURDATE(), '%m-%d') = DATE_FORMAT(a.feNacimiento, '%m-%d') THEN 0
              WHEN DATE_FORMAT(a.feNacimiento, '%m-%d') < DATE_FORMAT(CURDATE(), '%m-%d') THEN 
                DATEDIFF(
                  CURDATE(),
                  DATE(CONCAT(YEAR(CURDATE()), '-', DATE_FORMAT(a.feNacimiento, '%m-%d')))
                )
              ELSE 
                DATEDIFF(
                  CURDATE(),
                  DATE(CONCAT(YEAR(CURDATE()) - 1, '-', DATE_FORMAT(a.feNacimiento, '%m-%d')))
                )
            END as diasPasados
          FROM TD_ALUMNOS a
          INNER JOIN TR_ALUMNO_TALLER at ON a.cdAlumno = at.cdAlumno
          INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
          WHERE a.cdEstado = 1 
            AND a.feNacimiento IS NOT NULL
            AND t.cdPersonal = ?
            AND t.nuAnioTaller = ?
            AND at.cdEstado = 1
            AND DATE_FORMAT(CURDATE(), '%m-%d') != DATE_FORMAT(a.feNacimiento, '%m-%d')
        ) AS cumpleanos_pasados
        WHERE diasPasados > 0 AND diasPasados <= 30
        ORDER BY diasPasados ASC, nombre ASC
        LIMIT 5`,
        [cdPersonal, currentYear]
      );
    } else {
      // ADMINISTRADOR, SUPERVISOR, OPERADOR: Todos los cumpleaños - PRÓXIMOS
      [cumpleanosProximosRaw] = await pool.execute<any[]>(
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
      
      // ADMINISTRADOR, SUPERVISOR, OPERADOR: Todos los cumpleaños - PASADOS
      [cumpleanosPasadosRaw] = await pool.execute<any[]>(
        `SELECT 
          tipo,
          nombre,
          feNacimiento,
          fechaCumple,
          ABS(diasPasados) as diasPasados
        FROM (
          SELECT 
            'Alumno' as tipo,
            CONCAT(dsNombre, ' ', dsApellido) as nombre,
            feNacimiento,
            DATE_FORMAT(feNacimiento, '%d/%m') as fechaCumple,
            CASE 
              WHEN DATE_FORMAT(CURDATE(), '%m-%d') = DATE_FORMAT(feNacimiento, '%m-%d') THEN 0
              WHEN DATE_FORMAT(feNacimiento, '%m-%d') < DATE_FORMAT(CURDATE(), '%m-%d') THEN 
                DATEDIFF(
                  CURDATE(),
                  DATE(CONCAT(YEAR(CURDATE()), '-', DATE_FORMAT(feNacimiento, '%m-%d')))
                )
              ELSE 
                DATEDIFF(
                  CURDATE(),
                  DATE(CONCAT(YEAR(CURDATE()) - 1, '-', DATE_FORMAT(feNacimiento, '%m-%d')))
                )
            END as diasPasados
          FROM TD_ALUMNOS 
          WHERE cdEstado = 1 AND feNacimiento IS NOT NULL
            AND DATE_FORMAT(CURDATE(), '%m-%d') != DATE_FORMAT(feNacimiento, '%m-%d')
          
          UNION ALL
          
          SELECT 
            'Profesor' as tipo,
            dsNombreCompleto as nombre,
            feNacimiento,
            DATE_FORMAT(feNacimiento, '%d/%m') as fechaCumple,
            CASE 
              WHEN DATE_FORMAT(CURDATE(), '%m-%d') = DATE_FORMAT(feNacimiento, '%m-%d') THEN 0
              WHEN DATE_FORMAT(feNacimiento, '%m-%d') < DATE_FORMAT(CURDATE(), '%m-%d') THEN 
                DATEDIFF(
                  CURDATE(),
                  DATE(CONCAT(YEAR(CURDATE()), '-', DATE_FORMAT(feNacimiento, '%m-%d')))
                )
              ELSE 
                DATEDIFF(
                  CURDATE(),
                  DATE(CONCAT(YEAR(CURDATE()) - 1, '-', DATE_FORMAT(feNacimiento, '%m-%d')))
                )
            END as diasPasados
          FROM TD_PERSONAL 
          WHERE cdEstado = 1 AND dsTipoPersonal = 'Profesor' AND feNacimiento IS NOT NULL
            AND DATE_FORMAT(CURDATE(), '%m-%d') != DATE_FORMAT(feNacimiento, '%m-%d')
        ) AS cumpleanos_pasados_combined
        WHERE diasPasados > 0 AND diasPasados <= 30
        ORDER BY diasPasados ASC, nombre ASC
        LIMIT 5`
      );
    }
    
    // Asegurar que esHoy sea booleano en JavaScript
    const cumpleanosProximos = cumpleanosProximosRaw.map((c: any) => ({
      ...c,
      esHoy: c.esHoy === 1 || c.esHoy === true
    }));
    
    const cumpleanosPasados = cumpleanosPasadosRaw.map((c: any) => ({
      ...c
    }));

    // Obtener profesores con fechas pendientes de asistencia
    let queryTalleres = `
      SELECT 
        t.cdTaller,
        t.cdPersonal,
        p.dsNombreCompleto,
        tt.dsNombreTaller,
        t.nuAnioTaller,
        t.feInicioTaller,
        t.snDomingo, t.snLunes, t.snMartes, t.snMiercoles, 
        t.snJueves, t.snViernes, t.snSabado,
        t.dsDescripcionHorarios,
        t.dsDomingoHoraDesde, t.dsDomingoHoraHasta,
        t.dsLunesHoraDesde, t.dsLunesHoraHasta,
        t.dsMartesHoraDesde, t.dsMartesHoraHasta,
        t.dsMiercolesHoraDesde, t.dsMiercolesHoraHasta,
        t.dsJuevesHoraDesde, t.dsJuevesHoraHasta,
        t.dsViernesHoraDesde, t.dsViernesHoraHasta,
        t.dsSabadoHoraDesde, t.dsSabadoHoraHasta
      FROM TD_TALLERES t
      INNER JOIN TD_PERSONAL p ON t.cdPersonal = p.cdPersonal
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      WHERE t.cdEstado IN (1, 2)
        AND p.cdEstado = 1
        AND p.dsTipoPersonal = 'Profesor'
        AND t.nuAnioTaller = ?`;
    
    let paramsQueryTalleres: any[] = [currentYear];
    
    // Si es profesor, filtrar solo sus talleres
    if (rolPrincipal === 'Profesor' && cdPersonal) {
      queryTalleres += ' AND t.cdPersonal = ?';
      paramsQueryTalleres.push(cdPersonal);
    }
    
    const [talleres] = await pool.execute<any[]>(queryTalleres, paramsQueryTalleres);

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

      while (fechaActual < fechaHoy) {
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
        
        // Función helper para formatear hora TIME a HH:MM
        const formatTime = (time: string | null) => {
          if (!time) return null;
          return time.substring(0, 5);
        };
        
        // Formatear días de la semana con horarios
        const diasInfo = [];
        if (taller.snDomingo) {
          const desde = formatTime(taller.dsDomingoHoraDesde);
          const hasta = formatTime(taller.dsDomingoHoraHasta);
          diasInfo.push({ dia: 'Dom', desde, hasta });
        }
        if (taller.snLunes) {
          const desde = formatTime(taller.dsLunesHoraDesde);
          const hasta = formatTime(taller.dsLunesHoraHasta);
          diasInfo.push({ dia: 'Lun', desde, hasta });
        }
        if (taller.snMartes) {
          const desde = formatTime(taller.dsMartesHoraDesde);
          const hasta = formatTime(taller.dsMartesHoraHasta);
          diasInfo.push({ dia: 'Mar', desde, hasta });
        }
        if (taller.snMiercoles) {
          const desde = formatTime(taller.dsMiercolesHoraDesde);
          const hasta = formatTime(taller.dsMiercolesHoraHasta);
          diasInfo.push({ dia: 'Mié', desde, hasta });
        }
        if (taller.snJueves) {
          const desde = formatTime(taller.dsJuevesHoraDesde);
          const hasta = formatTime(taller.dsJuevesHoraHasta);
          diasInfo.push({ dia: 'Jue', desde, hasta });
        }
        if (taller.snViernes) {
          const desde = formatTime(taller.dsViernesHoraDesde);
          const hasta = formatTime(taller.dsViernesHoraHasta);
          diasInfo.push({ dia: 'Vie', desde, hasta });
        }
        if (taller.snSabado) {
          const desde = formatTime(taller.dsSabadoHoraDesde);
          const hasta = formatTime(taller.dsSabadoHoraHasta);
          diasInfo.push({ dia: 'Sáb', desde, hasta });
        }
        
        const diasTexto = diasInfo.map(d => {
          if (d.desde && d.hasta) {
            return `${d.dia} ${d.desde}-${d.hasta}`;
          }
          return d.dia;
        }).join(', ');
        
        profesor.talleres.push({
          cdTaller: taller.cdTaller,
          dsNombreTaller: taller.dsNombreTaller,
          nuAnioTaller: taller.nuAnioTaller,
          fechasPendientes,
          diasClase: diasTexto,
          horarioClase: taller.dsDescripcionHorarios || ''
        });
        profesor.totalFechasPendientes += fechasPendientes;
      }
    }

    const profesoresPendientes = Array.from(profesoresPendientesMap.values());

    // Obtener "Mis Talleres" para profesores
    let misTalleres: any[] = [];
    if (rolPrincipal === 'Profesor' && cdPersonal) {
      const [talleresProfesor] = await pool.execute<any[]>(
        `SELECT 
          t.cdTaller,
          tt.dsNombreTaller,
          t.nuAnioTaller,
          t.snDomingo, t.snLunes, t.snMartes, t.snMiercoles, 
          t.snJueves, t.snViernes, t.snSabado,
          t.dsDomingoHoraDesde, t.dsDomingoHoraHasta,
          t.dsLunesHoraDesde, t.dsLunesHoraHasta,
          t.dsMartesHoraDesde, t.dsMartesHoraHasta,
          t.dsMiercolesHoraDesde, t.dsMiercolesHoraHasta,
          t.dsJuevesHoraDesde, t.dsJuevesHoraHasta,
          t.dsViernesHoraDesde, t.dsViernesHoraHasta,
          t.dsSabadoHoraDesde, t.dsSabadoHoraHasta,
          (SELECT COUNT(DISTINCT at2.cdAlumno)
           FROM TR_ALUMNO_TALLER at2
           INNER JOIN TD_ALUMNOS a2 ON at2.cdAlumno = a2.cdAlumno
           WHERE at2.cdTaller = t.cdTaller 
             AND at2.feBaja IS NULL
             AND a2.cdEstado = 1) as cantidadAlumnos
        FROM TD_TALLERES t
        INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
        WHERE t.cdPersonal = ?
          AND t.nuAnioTaller = ?
          AND t.cdEstado IN (1, 2)`,
        [cdPersonal, currentYear]
      );

      // Función helper para formatear hora TIME a HH:MM
      const formatTime = (time: string | null) => {
        if (!time) return null;
        return time.substring(0, 5);
      };

      misTalleres = talleresProfesor.map((taller: any) => {
        const diasInfo = [];
        if (taller.snDomingo) {
          const desde = formatTime(taller.dsDomingoHoraDesde);
          const hasta = formatTime(taller.dsDomingoHoraHasta);
          diasInfo.push({ dia: 'Dom', desde, hasta });
        }
        if (taller.snLunes) {
          const desde = formatTime(taller.dsLunesHoraDesde);
          const hasta = formatTime(taller.dsLunesHoraHasta);
          diasInfo.push({ dia: 'Lun', desde, hasta });
        }
        if (taller.snMartes) {
          const desde = formatTime(taller.dsMartesHoraDesde);
          const hasta = formatTime(taller.dsMartesHoraHasta);
          diasInfo.push({ dia: 'Mar', desde, hasta });
        }
        if (taller.snMiercoles) {
          const desde = formatTime(taller.dsMiercolesHoraDesde);
          const hasta = formatTime(taller.dsMiercolesHoraHasta);
          diasInfo.push({ dia: 'Mié', desde, hasta });
        }
        if (taller.snJueves) {
          const desde = formatTime(taller.dsJuevesHoraDesde);
          const hasta = formatTime(taller.dsJuevesHoraHasta);
          diasInfo.push({ dia: 'Jue', desde, hasta });
        }
        if (taller.snViernes) {
          const desde = formatTime(taller.dsViernesHoraDesde);
          const hasta = formatTime(taller.dsViernesHoraHasta);
          diasInfo.push({ dia: 'Vie', desde, hasta });
        }
        if (taller.snSabado) {
          const desde = formatTime(taller.dsSabadoHoraDesde);
          const hasta = formatTime(taller.dsSabadoHoraHasta);
          diasInfo.push({ dia: 'Sáb', desde, hasta });
        }

        const diasTexto = diasInfo.map(d => {
          if (d.desde && d.hasta) {
            return `${d.dia} ${d.desde}-${d.hasta}`;
          }
          return d.dia;
        }).join(', ');

        return {
          cdTaller: taller.cdTaller,
          dsNombreTaller: taller.dsNombreTaller,
          nuAnioTaller: taller.nuAnioTaller,
          diasClase: diasTexto,
          cantidadAlumnos: taller.cantidadAlumnos || 0
        };
      });
    }

    // Obtener alumnos con discapacidad para profesores
    let alumnosConDiscapacidad: any[] = [];
    if (rolPrincipal === 'Profesor' && cdPersonal) {
      const [alumnosDiscapacidad] = await pool.execute<any[]>(
        `SELECT
          CONCAT(a.dsNombre, ' ', a.dsApellido) as nombreAlumno,
          a.dsApellido,
          a.dsNombre,
          tt.dsNombreTaller,
          t.nuAnioTaller,
          t.snDomingo, t.snLunes, t.snMartes, t.snMiercoles, 
          t.snJueves, t.snViernes, t.snSabado,
          t.dsDomingoHoraDesde, t.dsDomingoHoraHasta,
          t.dsLunesHoraDesde, t.dsLunesHoraHasta,
          t.dsMartesHoraDesde, t.dsMartesHoraHasta,
          t.dsMiercolesHoraDesde, t.dsMiercolesHoraHasta,
          t.dsJuevesHoraDesde, t.dsJuevesHoraHasta,
          t.dsViernesHoraDesde, t.dsViernesHoraHasta,
          t.dsSabadoHoraDesde, t.dsSabadoHoraHasta,
          a.dsObservacionesDiscapacidad,
          a.dsObservaciones
        FROM TD_ALUMNOS a
        INNER JOIN TR_ALUMNO_TALLER at ON a.cdAlumno = at.cdAlumno
        INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
        INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
        WHERE (a.snDiscapacidad = 'SI' OR (a.dsObservaciones IS NOT NULL AND a.dsObservaciones != ''))
          AND a.cdEstado = 1
          AND at.cdEstado = 1
          AND t.cdEstado IN (1, 2)
          AND t.cdPersonal = ?
          AND t.nuAnioTaller = ?
        ORDER BY a.dsApellido, a.dsNombre, tt.dsNombreTaller`,
        [cdPersonal, currentYear]
      );

      // Función helper para formatear hora TIME a HH:MM
      const formatTime = (time: string | null) => {
        if (!time) return null;
        return time.substring(0, 5);
      };

      alumnosConDiscapacidad = alumnosDiscapacidad.map((alumno: any) => {
        const diasInfo = [];
        if (alumno.snDomingo) {
          const desde = formatTime(alumno.dsDomingoHoraDesde);
          const hasta = formatTime(alumno.dsDomingoHoraHasta);
          diasInfo.push({ dia: 'Dom', desde, hasta });
        }
        if (alumno.snLunes) {
          const desde = formatTime(alumno.dsLunesHoraDesde);
          const hasta = formatTime(alumno.dsLunesHoraHasta);
          diasInfo.push({ dia: 'Lun', desde, hasta });
        }
        if (alumno.snMartes) {
          const desde = formatTime(alumno.dsMartesHoraDesde);
          const hasta = formatTime(alumno.dsMartesHoraHasta);
          diasInfo.push({ dia: 'Mar', desde, hasta });
        }
        if (alumno.snMiercoles) {
          const desde = formatTime(alumno.dsMiercolesHoraDesde);
          const hasta = formatTime(alumno.dsMiercolesHoraHasta);
          diasInfo.push({ dia: 'Mié', desde, hasta });
        }
        if (alumno.snJueves) {
          const desde = formatTime(alumno.dsJuevesHoraDesde);
          const hasta = formatTime(alumno.dsJuevesHoraHasta);
          diasInfo.push({ dia: 'Jue', desde, hasta });
        }
        if (alumno.snViernes) {
          const desde = formatTime(alumno.dsViernesHoraDesde);
          const hasta = formatTime(alumno.dsViernesHoraHasta);
          diasInfo.push({ dia: 'Vie', desde, hasta });
        }
        if (alumno.snSabado) {
          const desde = formatTime(alumno.dsSabadoHoraDesde);
          const hasta = formatTime(alumno.dsSabadoHoraHasta);
          diasInfo.push({ dia: 'Sáb', desde, hasta });
        }

        const horarioTexto = diasInfo.map(d => {
          if (d.desde && d.hasta) {
            return `${d.dia} ${d.desde}-${d.hasta}`;
          }
          return d.dia;
        }).join(', ');

        return {
          nombreAlumno: alumno.nombreAlumno,
          dsNombreTaller: alumno.dsNombreTaller,
          nuAnioTaller: alumno.nuAnioTaller,
          horario: horarioTexto,
          dsObservacionesDiscapacidad: alumno.dsObservacionesDiscapacidad,
          dsObservaciones: alumno.dsObservaciones
        };
      });
    }

    return NextResponse.json({
      rol: rolPrincipal,
      totales: {
        alumnos: totalAlumnos,
        talleres: totalTalleres,
        profesores: totalProfesores,
        alumnosPagoMesActual: alumnosMesActual,
        alumnosPagoMesesAnteriores: alumnosMesesAnteriores,
        alumnosConSeguimiento: alumnosConSeguimiento,
      },
      cumpleanosProximos,
      cumpleanosPasados,
      profesoresPendientes,
      misTalleres,
      alumnosConDiscapacidad,
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas del dashboard' },
      { status: 500 }
    );
  }
}
