import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Obtener filtros dinámicos basados en selecciones actuales
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
    const cdTipoTaller = searchParams.get('cdTipoTaller');
    const cdPersonal = searchParams.get('cdPersonal');
    const horario = searchParams.get('horario');

    // Obtener tipos de talleres (filtrado por profesor si está seleccionado)
    let tiposTalleresQuery = `
      SELECT DISTINCT 
        tt.cdTipoTaller,
        tt.dsNombreTaller
      FROM TD_TIPO_TALLERES tt
      INNER JOIN TD_TALLERES t ON tt.cdTipoTaller = t.cdTipoTaller
      WHERE t.cdEstado = 1
    `;
    const tiposTalleresParams: any[] = [];

    if (cdPersonal) {
      tiposTalleresQuery += ' AND t.cdPersonal = ?';
      tiposTalleresParams.push(parseInt(cdPersonal));
    }

    if (horario) {
      tiposTalleresQuery += ` AND CONCAT_WS(' | ',
        IF(t.snLunes = 1, CONCAT('Lun: ', t.dsLunesHoraDesde, '-', t.dsLunesHoraHasta), NULL),
        IF(t.snMartes = 1, CONCAT('Mar: ', t.dsMartesHoraDesde, '-', t.dsMartesHoraHasta), NULL),
        IF(t.snMiercoles = 1, CONCAT('Mié: ', t.dsMiercolesHoraDesde, '-', t.dsMiercolesHoraHasta), NULL),
        IF(t.snJueves = 1, CONCAT('Jue: ', t.dsJuevesHoraDesde, '-', t.dsJuevesHoraHasta), NULL),
        IF(t.snViernes = 1, CONCAT('Vie: ', t.dsViernesHoraDesde, '-', t.dsViernesHoraHasta), NULL),
        IF(t.snSabado = 1, CONCAT('Sáb: ', t.dsSabadoHoraDesde, '-', t.dsSabadoHoraHasta), NULL),
        IF(t.snDomingo = 1, CONCAT('Dom: ', t.dsDomingoHoraDesde, '-', t.dsDomingoHoraHasta), NULL)
      ) = ?`;
      tiposTalleresParams.push(horario);
    }

    tiposTalleresQuery += ' ORDER BY tt.dsNombreTaller';

    // Obtener profesores (filtrado por tipo de taller y horario si están seleccionados)
    let profesoresQuery = `
      SELECT DISTINCT 
        p.cdPersonal,
        p.dsNombreCompleto
      FROM TD_PERSONAL p
      INNER JOIN TD_TALLERES t ON p.cdPersonal = t.cdPersonal
      WHERE t.cdEstado = 1
    `;
    const profesoresParams: any[] = [];

    if (cdTipoTaller) {
      profesoresQuery += ' AND t.cdTipoTaller = ?';
      profesoresParams.push(parseInt(cdTipoTaller));
    }

    if (horario) {
      profesoresQuery += ` AND CONCAT_WS(' | ',
        IF(t.snLunes = 1, CONCAT('Lun: ', t.dsLunesHoraDesde, '-', t.dsLunesHoraHasta), NULL),
        IF(t.snMartes = 1, CONCAT('Mar: ', t.dsMartesHoraDesde, '-', t.dsMartesHoraHasta), NULL),
        IF(t.snMiercoles = 1, CONCAT('Mié: ', t.dsMiercolesHoraDesde, '-', t.dsMiercolesHoraHasta), NULL),
        IF(t.snJueves = 1, CONCAT('Jue: ', t.dsJuevesHoraDesde, '-', t.dsJuevesHoraHasta), NULL),
        IF(t.snViernes = 1, CONCAT('Vie: ', t.dsViernesHoraDesde, '-', t.dsViernesHoraHasta), NULL),
        IF(t.snSabado = 1, CONCAT('Sáb: ', t.dsSabadoHoraDesde, '-', t.dsSabadoHoraHasta), NULL),
        IF(t.snDomingo = 1, CONCAT('Dom: ', t.dsDomingoHoraDesde, '-', t.dsDomingoHoraHasta), NULL)
      ) = ?`;
      profesoresParams.push(horario);
    }

    profesoresQuery += ' ORDER BY p.dsNombreCompleto';

    // Obtener horarios (filtrado por tipo de taller y profesor si están seleccionados)
    let horariosQuery = `
      SELECT DISTINCT
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
    `;
    const horariosParams: any[] = [];

    if (cdTipoTaller) {
      horariosQuery += ' AND t.cdTipoTaller = ?';
      horariosParams.push(parseInt(cdTipoTaller));
    }

    if (cdPersonal) {
      horariosQuery += ' AND t.cdPersonal = ?';
      horariosParams.push(parseInt(cdPersonal));
    }

    horariosQuery += ' HAVING horario IS NOT NULL AND horario != \'\' ORDER BY horario';

    // Ejecutar queries en paralelo
    const [tiposTalleres, profesores, horarios] = await Promise.all([
      pool.execute<any[]>(tiposTalleresQuery, tiposTalleresParams),
      pool.execute<any[]>(profesoresQuery, profesoresParams),
      pool.execute<any[]>(horariosQuery, horariosParams),
    ]);

    return NextResponse.json({
      tiposTalleres: tiposTalleres[0],
      profesores: profesores[0],
      horarios: horarios[0].map((h: any) => h.horario).filter((h: string) => h),
    });
  } catch (error: any) {
    console.error('Error al obtener filtros dinámicos:', error);
    return NextResponse.json(
      { error: 'Error al obtener filtros dinámicos', details: error.message },
      { status: 500 }
    );
  }
}
