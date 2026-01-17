import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { executeQuery } from '@/lib/db-utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Contar alumnos activos
    const alumnosResult = await executeQuery<{ total: number }>(
      'SELECT COUNT(*) as total FROM TD_ALUMNOS WHERE cdEstado = 1'
    );
    const totalAlumnos = alumnosResult[0]?.total || 0;

    // Contar talleres activos
    const talleresResult = await executeQuery<{ total: number }>(
      'SELECT COUNT(*) as total FROM TD_TALLERES WHERE cdEstado = 1'
    );
    const totalTalleres = talleresResult[0]?.total || 0;

    // Contar profesores activos
    const profesoresResult = await executeQuery<{ total: number }>(
      "SELECT COUNT(*) as total FROM TD_PERSONAL WHERE cdEstado = 1 AND dsTipoPersonal = 'Profesor'"
    );
    const totalProfesores = profesoresResult[0]?.total || 0;

    // Calcular ingresos del mes actual
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    const ingresosResult = await executeQuery<{ total: number | null }>(
      `SELECT SUM(nuMontoTotal) as total 
       FROM TD_PAGOS 
       WHERE YEAR(fePago) = ? 
       AND MONTH(fePago) = ?`,
      [currentYear, currentMonth]
    );
    const totalIngresos = ingresosResult[0]?.total || 0;

    // Obtener talleres más populares (top 5)
    const talleresPopulares = await executeQuery<{
      cdTaller: number;
      dsTaller: string;
      totalAlumnos: number;
    }>(
      `SELECT 
        t.cdTaller,
        CONCAT(tt.dsNombreTaller, ' - ', t.nuAnioTaller) as dsTaller,
        COUNT(DISTINCT ia.cdAlumno) as totalAlumnos
       FROM TD_TALLERES t
       INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
       LEFT JOIN tr_inscripcion_alumno ia ON t.cdTaller = ia.cdTaller AND ia.cdEstado = 1
       WHERE t.cdEstado = 1
       GROUP BY t.cdTaller, tt.dsNombreTaller, t.nuAnioTaller
       ORDER BY totalAlumnos DESC
       LIMIT 5`
    );

    // Obtener pagos recientes
    const pagosRecientes = await executeQuery<{
      cdPago: number;
      dsAlumno: string;
      nuMonto: number;
      fePago: string;
      dsFormaPago: string;
    }>(
      `SELECT 
        p.cdPago,
        CONCAT(a.dsNombre, ' ', a.dsApellido) as dsAlumno,
        p.nuMontoTotal as nuMonto,
        p.fePago,
        p.dsTipoPago as dsFormaPago
       FROM TD_PAGOS p
       INNER JOIN TD_ALUMNOS a ON p.cdAlumno = a.cdAlumno
       ORDER BY p.fePago DESC
       LIMIT 5`
    );

    return NextResponse.json({
      totales: {
        alumnos: totalAlumnos,
        talleres: totalTalleres,
        profesores: totalProfesores,
        ingresos: totalIngresos,
      },
      talleresPopulares,
      pagosRecientes,
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas del dashboard' },
      { status: 500 }
    );
  }
}
