import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Obtener detalle de asistencias pendientes con fechas específicas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const currentYear = new Date().getFullYear();

    // Determinar el rol principal del usuario
    const roles = session.user?.roles || [];
    const cdPersonal = session.user?.cdPersonal;
    
    let rolPrincipal = 'Operador';
    if (roles.includes('Administrador')) rolPrincipal = 'Administrador';
    else if (roles.includes('Supervisor')) rolPrincipal = 'Supervisor';
    else if (roles.includes('Profesor')) rolPrincipal = 'Profesor';

    // Query para obtener talleres con información del profesor
    let queryTalleres = `
      SELECT 
        t.cdTaller,
        t.nuAnioTaller,
        t.feInicioTaller,
        t.cdPersonal,
        COALESCE(p.dsNombreCompleto, 'Sin asignar') as dsNombreCompleto,
        tt.dsNombreTaller,
        t.snDomingo, t.snLunes, t.snMartes, t.snMiercoles, 
        t.snJueves, t.snViernes, t.snSabado,
        t.dsDomingoHoraDesde, t.dsDomingoHoraHasta,
        t.dsLunesHoraDesde, t.dsLunesHoraHasta,
        t.dsMartesHoraDesde, t.dsMartesHoraHasta,
        t.dsMiercolesHoraDesde, t.dsMiercolesHoraHasta,
        t.dsJuevesHoraDesde, t.dsJuevesHoraHasta,
        t.dsViernesHoraDesde, t.dsViernesHoraHasta,
        t.dsSabadoHoraDesde, t.dsSabadoHoraHasta
      FROM TD_TALLERES t
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      LEFT JOIN TD_PERSONAL p ON t.cdPersonal = p.cdPersonal
      WHERE t.cdEstado = 1 
        AND t.nuAnioTaller = ?
    `;

    let paramsQueryTalleres: any[] = [currentYear];
    
    // Si es profesor, filtrar solo sus talleres
    if (rolPrincipal === 'Profesor' && cdPersonal) {
      queryTalleres += ' AND t.cdPersonal = ?';
      paramsQueryTalleres.push(cdPersonal);
    }
    
    const [talleres] = await pool.execute<any[]>(queryTalleres, paramsQueryTalleres);

    const detalleFechasPendientes: any[] = [];
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

      // Función helper para formatear hora TIME a HH:MM
      const formatTime = (time: string | null) => {
        if (!time) return null;
        return time.substring(0, 5);
      };

      // Formatear horario del taller
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

      const horarioTaller = diasInfo.map(d => {
        if (d.desde && d.hasta) {
          return `${d.dia}: ${d.desde}-${d.hasta}`;
        }
        return d.dia;
      }).join(' | ');

      // Recorrer todas las fechas desde el inicio del taller hasta hoy
      const fechaInicio = new Date(taller.feInicioTaller);
      let fechaActual = new Date(fechaInicio);

      while (fechaActual < fechaHoy) {
        const diaSemana = fechaActual.getDay();
        const fechaStr = fechaActual.toISOString().split('T')[0];

        // Si es un día de clase y no está registrada, agregar al detalle
        if (diasClase.includes(diaSemana) && !fechasRegistradas.has(fechaStr)) {
          detalleFechasPendientes.push({
            cdPersonal: taller.cdPersonal,
            profesor: taller.dsNombreCompleto,
            cdTaller: taller.cdTaller,
            tipoTaller: `${taller.dsNombreTaller} (${taller.nuAnioTaller})`,
            horario: horarioTaller,
            fechaPendiente: fechaStr
          });
        }

        fechaActual.setDate(fechaActual.getDate() + 1);
      }
    }

    // Ordenar por profesor, taller y fecha
    detalleFechasPendientes.sort((a, b) => {
      if (a.profesor !== b.profesor) return a.profesor.localeCompare(b.profesor);
      if (a.tipoTaller !== b.tipoTaller) return a.tipoTaller.localeCompare(b.tipoTaller);
      return a.fechaPendiente.localeCompare(b.fechaPendiente);
    });

    return NextResponse.json(detalleFechasPendientes);
  } catch (error: any) {
    console.error('Error al obtener detalle de asistencias pendientes:', error);
    return NextResponse.json(
      { error: 'Error al obtener detalle de asistencias pendientes', details: error.message },
      { status: 500 }
    );
  }
}
