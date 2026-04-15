import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Obtener pagos pendientes de meses anteriores para un alumno
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const cdAlumno = parseInt(params.id);
    const { searchParams } = new URL(request.url);
    const mesActual = parseInt(searchParams.get('mes') || '0');
    const anioActual = parseInt(searchParams.get('anio') || '0');

    if (!mesActual || !anioActual) {
      return NextResponse.json(
        { error: 'Mes y año son obligatorios' },
        { status: 400 }
      );
    }

    // Primero obtener el grupo familiar del alumno (si tiene)
    const [grupoFamiliar] = await pool.execute<any[]>(
      `SELECT cdGrupoFamiliar 
       FROM TR_ALUMNO_GRUPO_FAMILIAR 
       WHERE cdAlumno = ?`,
      [cdAlumno]
    );

    const cdGrupoFamiliar = grupoFamiliar.length > 0 ? grupoFamiliar[0].cdGrupoFamiliar : null;

    // Obtener todos los alumnos del grupo (o solo el alumno si no tiene grupo)
    let alumnosDelGrupo: number[] = [];
    if (cdGrupoFamiliar) {
      const [alumnosGrupo] = await pool.execute<any[]>(
        `SELECT cdAlumno 
         FROM TR_ALUMNO_GRUPO_FAMILIAR 
         WHERE cdGrupoFamiliar = ?`,
        [cdGrupoFamiliar]
      );
      alumnosDelGrupo = alumnosGrupo.map((a: any) => a.cdAlumno);
    } else {
      alumnosDelGrupo = [cdAlumno];
    }

    // Obtener talleres activos de TODOS los alumnos del grupo con su fecha de inscripción
    const placeholders = alumnosDelGrupo.map(() => '?').join(',');
    const [inscripciones] = await pool.execute<any[]>(
      `SELECT 
        a.cdAlumno,
        CONCAT(a.dsApellido, ', ', a.dsNombre) as nombreAlumno,
        t.cdTaller,
        tt.dsNombreTaller,
        t.nuAnioTaller,
        t.feInicioTaller,
        at.feInscripcion,
        (
          SELECT tp.nuPrecioCompletoEfectivo 
          FROM TD_PRECIOS_TALLERES tp
          WHERE tp.cdTipoTaller = tt.cdTipoTaller
          AND tp.feInicioVigencia <= CURDATE()
          AND tp.cdEstado = 1
          ORDER BY tp.feInicioVigencia DESC
          LIMIT 1
        ) as precio,
        -- Horarios
        CONCAT_WS(' | ',
          IF(t.snLunes = 1, CONCAT('Lun: ', SUBSTRING(t.dsLunesHoraDesde, 1, 5), '-', SUBSTRING(t.dsLunesHoraHasta, 1, 5)), NULL),
          IF(t.snMartes = 1, CONCAT('Mar: ', SUBSTRING(t.dsMartesHoraDesde, 1, 5), '-', SUBSTRING(t.dsMartesHoraHasta, 1, 5)), NULL),
          IF(t.snMiercoles = 1, CONCAT('Mié: ', SUBSTRING(t.dsMiercolesHoraDesde, 1, 5), '-', SUBSTRING(t.dsMiercolesHoraHasta, 1, 5)), NULL),
          IF(t.snJueves = 1, CONCAT('Jue: ', SUBSTRING(t.dsJuevesHoraDesde, 1, 5), '-', SUBSTRING(t.dsJuevesHoraHasta, 1, 5)), NULL),
          IF(t.snViernes = 1, CONCAT('Vie: ', SUBSTRING(t.dsViernesHoraDesde, 1, 5), '-', SUBSTRING(t.dsViernesHoraHasta, 1, 5)), NULL),
          IF(t.snSabado = 1, CONCAT('Sáb: ', SUBSTRING(t.dsSabadoHoraDesde, 1, 5), '-', SUBSTRING(t.dsSabadoHoraHasta, 1, 5)), NULL),
          IF(t.snDomingo = 1, CONCAT('Dom: ', SUBSTRING(t.dsDomingoHoraDesde, 1, 5), '-', SUBSTRING(t.dsDomingoHoraHasta, 1, 5)), NULL)
        ) as horario
      FROM TR_ALUMNO_TALLER at
      INNER JOIN TD_ALUMNOS a ON at.cdAlumno = a.cdAlumno
      INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      WHERE a.cdAlumno IN (${placeholders})
        AND at.cdEstado = 1
        AND at.feBaja IS NULL
        AND t.cdEstado = 1
        AND a.cdEstado != 3`,
      alumnosDelGrupo
    );

    if (inscripciones.length === 0) {
      return NextResponse.json({
        deudas: [],
        totalDeudas: 0,
      });
    }

    // Obtener todos los pagos ya realizados de TODOS los alumnos del grupo
    const [pagosRealizados] = await pool.execute<any[]>(
      `SELECT 
        pd.cdAlumno,
        pd.cdTaller,
        p.nuMes,
        p.nuAnio
      FROM TD_PAGOS p
      INNER JOIN TD_PAGOS_DETALLE pd ON p.cdPago = pd.cdPago
      WHERE pd.cdAlumno IN (${placeholders})
        AND p.nuAnio = ?`,
      [...alumnosDelGrupo, anioActual]
    );

    const pagosSet = new Set(
      pagosRealizados.map((p: any) => 
        `${p.cdAlumno}-${p.cdTaller}-${p.nuMes}-${p.nuAnio}`
      )
    );

    const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const deudasAnteriores: any[] = [];

    // Buscar pagos pendientes de meses anteriores al seleccionado
    for (const inscripcion of inscripciones) {
      const fechaInscripcion = new Date(inscripcion.feInscripcion);
      const mesInscripcion = fechaInscripcion.getMonth() + 1;
      const anioInscripcion = fechaInscripcion.getFullYear();

      // Determinar desde qué mes buscar deudas
      const mesDesde = (anioInscripcion === anioActual) ? mesInscripcion : 1;

      // Buscar todos los meses desde la inscripción hasta el mes anterior al actual
      for (let mes = mesDesde; mes < mesActual; mes++) {
        const key = `${inscripcion.cdAlumno}-${inscripcion.cdTaller}-${mes}-${anioActual}`;
        
        if (!pagosSet.has(key)) {
          deudasAnteriores.push({
            cdAlumno: inscripcion.cdAlumno,
            nombreAlumno: inscripcion.nombreAlumno,
            cdTaller: inscripcion.cdTaller,
            nombreTaller: `${inscripcion.dsNombreTaller} (${inscripcion.nuAnioTaller})`,
            horario: inscripcion.horario,
            mes: mes,
            mesNombre: mesesNombres[mes - 1],
            anio: anioActual,
            periodo: `${mesesNombres[mes - 1]} ${anioActual}`,
            importe: parseFloat(inscripcion.precio || 0),
          });
        }
      }
    }

    // Ordenar por mes
    deudasAnteriores.sort((a, b) => {
      if (a.mes !== b.mes) return a.mes - b.mes;
      return a.nombreTaller.localeCompare(b.nombreTaller);
    });

    return NextResponse.json({
      deudas: deudasAnteriores,
      totalDeudas: deudasAnteriores.length,
    });
  } catch (error: any) {
    console.error('Error al obtener deudas anteriores:', error);
    return NextResponse.json(
      { error: 'Error al obtener deudas anteriores', details: error.message },
      { status: 500 }
    );
  }
}
