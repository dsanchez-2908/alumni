import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Obtener faltas con filtros para reporte
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permisos (Administrador o Supervisor)
    const userRoles = (session.user as any).roles || [];
    if (!userRoles.includes('Administrador') && !userRoles.includes('Supervisor')) {
      return NextResponse.json(
        { error: 'No tienes permisos para acceder a este reporte' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const snAviso = searchParams.get('snAviso');
    const snContactado = searchParams.get('snContactado');
    const cdTipoTaller = searchParams.get('cdTipoTaller');
    const horario = searchParams.get('horario');
    const cdPersonal = searchParams.get('cdPersonal');
    const cdAlumno = searchParams.get('cdAlumno');

    // Validar fechas obligatorias
    if (!fechaDesde || !fechaHasta) {
      return NextResponse.json(
        { error: 'Las fechas desde y hasta son obligatorias' },
        { status: 400 }
      );
    }

    let queryConditions: string[] = [
      'ast.snPresente = 0',  // Solo ausencias
      'a.cdEstado = 1',       // Solo alumnos activos
      't.cdEstado = 1'        // Solo talleres activos
    ];
    let queryParams: any[] = [];

    // Construir query principal
    let query = `
      SELECT 
        ast.cdFalta,
        ast.feFalta,
        ast.snAviso,
        ast.dsObservacion,
        ast.snContactado,
        
        -- Datos del alumno
        a.cdAlumno,
        CONCAT(a.dsApellido, ', ', a.dsNombre) as alumno,
        
        -- Datos del taller
        tt.dsNombreTaller as tipoTaller,
        tt.cdTipoTaller,
        
        -- Horarios detallados del taller
        CONCAT_WS(' | ',
          IF(t.snLunes = 1, CONCAT('Lun: ', t.dsLunesHoraDesde, '-', t.dsLunesHoraHasta), NULL),
          IF(t.snMartes = 1, CONCAT('Mar: ', t.dsMartesHoraDesde, '-', t.dsMartesHoraHasta), NULL),
          IF(t.snMiercoles = 1, CONCAT('Mié: ', t.dsMiercolesHoraDesde, '-', t.dsMiercolesHoraHasta), NULL),
          IF(t.snJueves = 1, CONCAT('Jue: ', t.dsJuevesHoraDesde, '-', t.dsJuevesHoraHasta), NULL),
          IF(t.snViernes = 1, CONCAT('Vie: ', t.dsViernesHoraDesde, '-', t.dsViernesHoraHasta), NULL),
          IF(t.snSabado = 1, CONCAT('Sáb: ', t.dsSabadoHoraDesde, '-', t.dsSabadoHoraHasta), NULL),
          IF(t.snDomingo = 1, CONCAT('Dom: ', t.dsDomingoHoraDesde, '-', t.dsDomingoHoraHasta), NULL)
        ) as horario,
        
        -- Datos del profesor
        p.dsNombreCompleto as profesor,
        p.cdPersonal,
        
        -- Novedad/Motivo asociado a la falta (si existe)
        n.dsNovedad as motivoFalta,
        n.feAlta as fechaNovedad,
        u.dsNombreCompleto as usuarioNovedad
        
      FROM TD_ASISTENCIAS ast
      INNER JOIN TD_ALUMNOS a ON ast.cdAlumno = a.cdAlumno
      INNER JOIN TD_TALLERES t ON ast.cdTaller = t.cdTaller
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      LEFT JOIN TD_PERSONAL p ON t.cdPersonal = p.cdPersonal
      LEFT JOIN TD_NOVEDADES_ALUMNO n ON ast.cdFalta = n.cdFalta
      LEFT JOIN TD_USUARIOS u ON n.cdUsuario = u.cdUsuario
      
      WHERE 1=1
    `;

    // Filtro de rango de fechas
    queryConditions.push('ast.feFalta BETWEEN ? AND ?');
    queryParams.push(fechaDesde, fechaHasta);

    // Filtro de Aviso (SI/NO)
    if (snAviso === 'SI') {
      queryConditions.push('ast.snAviso = 1');
    } else if (snAviso === 'NO') {
      queryConditions.push('ast.snAviso = 0');
    }

    // Filtro de Contactado (SI/NO)
    if (snContactado === 'SI') {
      queryConditions.push('ast.snContactado = 1');
    } else if (snContactado === 'NO') {
      queryConditions.push('(ast.snContactado = 0 OR ast.snContactado IS NULL)');
    }

    // Filtro por Tipo de Taller
    if (cdTipoTaller) {
      queryConditions.push('tt.cdTipoTaller = ?');
      queryParams.push(parseInt(cdTipoTaller));
    }

    // Filtro por Horario
    if (horario) {
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

    // Filtro por Profesor
    if (cdPersonal) {
      queryConditions.push('p.cdPersonal = ?');
      queryParams.push(parseInt(cdPersonal));
    }

    // Filtro por Alumno
    if (cdAlumno) {
      queryConditions.push('a.cdAlumno = ?');
      queryParams.push(parseInt(cdAlumno));
    }

    // Agregar condiciones a la query
    if (queryConditions.length > 0) {
      query += ' AND ' + queryConditions.join(' AND ');
    }

    query += `
      ORDER BY ast.feFalta DESC, a.dsApellido, a.dsNombre
    `;

    const [resultados] = await pool.execute<any[]>(query, queryParams);

    // Obtener datos para filtros
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

    const [alumnos] = await pool.execute<any[]>(
      `SELECT 
        a.cdAlumno,
        CONCAT(a.dsApellido, ', ', a.dsNombre) as nombreCompleto
       FROM TD_ALUMNOS a
       INNER JOIN TR_ALUMNO_TALLER at ON a.cdAlumno = at.cdAlumno
       WHERE a.cdEstado = 1 AND at.feBaja IS NULL
       GROUP BY a.cdAlumno, a.dsApellido, a.dsNombre
       ORDER BY a.dsApellido, a.dsNombre`
    );

    return NextResponse.json({
      faltas: resultados,
      filtros: {
        tiposTalleres,
        profesores,
        horarios: horarios.map((h: any) => h.horario).filter((h: string) => h),
        alumnos,
      },
    });
  } catch (error: any) {
    console.error('Error al obtener consulta de faltas:', error);
    return NextResponse.json(
      { error: 'Error al obtener consulta de faltas', details: error.message },
      { status: 500 }
    );
  }
}
