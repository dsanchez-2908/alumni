import pool from '@/lib/db';
import { formatearHorario } from '@/lib/cuotas-pendientes';
import { getAnioActual } from '@/lib/inscripciones';
import {
  ESTADO_INSCRIPCION,
  ESTADOS_MANUALES,
  ETIQUETA_ESTADO_INSCRIPCION,
} from '@/lib/estados-inscripcion';

export { ESTADO_INSCRIPCION, ESTADOS_MANUALES, ETIQUETA_ESTADO_INSCRIPCION };

// Cualquier conexión o pool de mysql2
type Db = { execute: (sql: string, values?: any) => Promise<any> };

// Inscripción vigente a un taller del año: sin baja, activa o ya finalizada, y taller no eliminado
const INSCRIPTO_EN_ANIO_SQL = `EXISTS (
  SELECT 1
  FROM TR_ALUMNO_TALLER at
  INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
  WHERE at.cdAlumno = %ALUMNO%
    AND t.nuAnioTaller = %ANIO%
    AND at.cdEstado IN (1, 4)
    AND at.feBaja IS NULL
    AND t.cdEstado IN (1, 2, 4)
)`;

const PAGO_EN_ANIO_SQL = `EXISTS (
  SELECT 1 FROM TD_PAGOS_INSCRIPCIONES pg
  WHERE pg.cdAlumno = %ALUMNO% AND pg.nuAnioInscripcion = %ANIO% AND pg.cdEstado = 1
)`;

const reemplazar = (sql: string, alumno: string, anio: string) =>
  sql.replace(/%ALUMNO%/g, alumno).replace(/%ANIO%/g, anio);

/** Estado que le corresponde a un alumno según su pago y sus talleres del año. */
export function derivarEstado(estadoActual: number, pagado: boolean, inscripto: boolean): number {
  if (estadoActual === ESTADO_INSCRIPCION.PENDIENTE_PAGO) {
    if (!pagado) return estadoActual;
    return inscripto ? ESTADO_INSCRIPCION.INSCRIPTO : ESTADO_INSCRIPCION.PENDIENTE_ENVIAR_FORMULARIO;
  }
  if (estadoActual === ESTADO_INSCRIPCION.INSCRIPTO) {
    return inscripto ? estadoActual : ESTADO_INSCRIPCION.PENDIENTE_INSCRIPCION;
  }
  return pagado && inscripto ? ESTADO_INSCRIPCION.INSCRIPTO : estadoActual;
}

function motivoAutomatico(anterior: number, nuevo: number): string {
  if (nuevo === ESTADO_INSCRIPCION.INSCRIPTO) return 'Inscripto en un taller del año';
  if (anterior === ESTADO_INSCRIPCION.INSCRIPTO) return 'Ya no tiene talleres activos del año';
  return 'Pago de inscripción registrado';
}

async function existe(db: Db, sql: string, params: any[]): Promise<boolean> {
  const [rows] = await db.execute(`SELECT ${sql} as resultado`, params);
  return Number(rows[0]?.resultado) === 1;
}

async function estadoActualDelAlumno(db: Db, cdAlumno: number, anio: number) {
  const [pagado, inscripto] = await Promise.all([
    existe(db, reemplazar(PAGO_EN_ANIO_SQL, '?', '?'), [cdAlumno, anio]),
    existe(db, reemplazar(INSCRIPTO_EN_ANIO_SQL, '?', '?'), [cdAlumno, anio]),
  ]);
  return { pagado, inscripto };
}

export async function cambiarEstado(
  db: Db,
  params: {
    cdInscripcionAlumno: number;
    estadoAnterior: number | null;
    estadoNuevo: number;
    cdUsuario: number | null;
    comentario?: string | null;
  }
): Promise<void> {
  await db.execute(
    `UPDATE TD_INSCRIPCIONES_ALUMNOS
     SET cdEstadoInscripcion = ?, feCambioEstado = NOW()
     WHERE cdInscripcionAlumno = ?`,
    [params.estadoNuevo, params.cdInscripcionAlumno]
  );
  await db.execute(
    `INSERT INTO TD_INSCRIPCIONES_HISTORIAL
       (cdInscripcionAlumno, dsTipo, cdEstadoAnterior, cdEstadoNuevo, dsComentario, cdUsuario)
     VALUES (?, 'Estado', ?, ?, ?, ?)`,
    [
      params.cdInscripcionAlumno,
      params.estadoAnterior,
      params.estadoNuevo,
      params.comentario || null,
      params.cdUsuario,
    ]
  );
}

/** Recalcula (y registra en el historial como cambio automático) el estado de un alumno dentro de una inscripción. */
async function sincronizarMiembro(
  db: Db,
  miembro: { cdInscripcionAlumno: number; cdAlumno: number; cdEstadoInscripcion: number; nuAnio: number }
): Promise<number> {
  const { pagado, inscripto } = await estadoActualDelAlumno(db, miembro.cdAlumno, miembro.nuAnio);
  const nuevo = derivarEstado(miembro.cdEstadoInscripcion, pagado, inscripto);
  if (nuevo !== miembro.cdEstadoInscripcion) {
    await cambiarEstado(db, {
      cdInscripcionAlumno: miembro.cdInscripcionAlumno,
      estadoAnterior: miembro.cdEstadoInscripcion,
      estadoNuevo: nuevo,
      cdUsuario: null,
      comentario: motivoAutomatico(miembro.cdEstadoInscripcion, nuevo),
    });
  }
  return nuevo;
}

/**
 * Se llama después de pagar la inscripción o de inscribir / dar de baja a un alumno en un taller.
 * Nunca lanza error: un fallo en el seguimiento no debe afectar la operación principal.
 */
export async function sincronizarInscripcionesDeAlumno(
  cdAlumno: number,
  db: Db = pool
): Promise<void> {
  try {
    const [miembros] = await db.execute(
      `SELECT ia.cdInscripcionAlumno, ia.cdAlumno, ia.cdEstadoInscripcion, i.nuAnio
       FROM TD_INSCRIPCIONES_ALUMNOS ia
       INNER JOIN TD_INSCRIPCIONES i ON ia.cdInscripcion = i.cdInscripcion
       WHERE ia.cdAlumno = ? AND i.cdEstado = 1`,
      [cdAlumno]
    );
    for (const miembro of miembros) {
      await sincronizarMiembro(db, miembro);
    }
  } catch (error) {
    console.error('Error al sincronizar el seguimiento de inscripciones:', error);
  }
}

/** Suma un alumno a una inscripción con el estado inicial que le corresponde. Devuelve null si ya estaba. */
export async function agregarAlumnoAInscripcion(
  db: Db,
  params: {
    cdInscripcion: number;
    nuAnio: number;
    cdAlumno: number;
    cdUsuario: number | null;
    comentario: string;
  }
): Promise<{ cdInscripcionAlumno: number; cdEstadoInscripcion: number } | null> {
  const [existente] = await db.execute(
    'SELECT cdInscripcionAlumno FROM TD_INSCRIPCIONES_ALUMNOS WHERE cdInscripcion = ? AND cdAlumno = ?',
    [params.cdInscripcion, params.cdAlumno]
  );
  if (existente.length > 0) return null;

  const { pagado, inscripto } = await estadoActualDelAlumno(db, params.cdAlumno, params.nuAnio);
  const estado = derivarEstado(ESTADO_INSCRIPCION.PENDIENTE_PAGO, pagado, inscripto);

  const [result] = await db.execute(
    `INSERT INTO TD_INSCRIPCIONES_ALUMNOS (cdInscripcion, cdAlumno, cdEstadoInscripcion, snAgregadoManual)
     VALUES (?, ?, ?, 1)`,
    [params.cdInscripcion, params.cdAlumno, estado]
  );
  await db.execute(
    `INSERT INTO TD_INSCRIPCIONES_HISTORIAL
       (cdInscripcionAlumno, dsTipo, cdEstadoAnterior, cdEstadoNuevo, dsComentario, cdUsuario)
     VALUES (?, 'Estado', NULL, ?, ?, ?)`,
    [result.insertId, estado, params.comentario, params.cdUsuario]
  );
  return { cdInscripcionAlumno: result.insertId, cdEstadoInscripcion: estado };
}

/**
 * Se llama al registrar un pago de inscripción: avanza al alumno en la inscripción abierta de ese año
 * (o lo suma si todavía no estaba). Si no hay inscripción abierta para el año, no hace nada.
 */
export async function registrarPagoEnSeguimiento(
  params: { anio: number; cdAlumnos: number[] },
  db: Db = pool
): Promise<void> {
  try {
    const [inscripciones] = await db.execute(
      'SELECT cdInscripcion FROM TD_INSCRIPCIONES WHERE nuAnio = ? AND cdEstado = 1',
      [params.anio]
    );
    if (inscripciones.length === 0) return;
    const cdInscripcion = inscripciones[0].cdInscripcion;

    for (const cdAlumno of params.cdAlumnos) {
      const agregado = await agregarAlumnoAInscripcion(db, {
        cdInscripcion,
        nuAnio: params.anio,
        cdAlumno,
        cdUsuario: null,
        comentario: 'Agregado al registrar el pago de la inscripción',
      });
      if (!agregado) {
        await sincronizarInscripcionesDeAlumno(cdAlumno, db);
      }
    }
  } catch (error) {
    console.error('Error al registrar el pago en el seguimiento de inscripciones:', error);
  }
}

/**
 * Crea la inscripción de un año con todos los alumnos activos y con los alumnos inactivos que ya pagaron
 * la inscripción de ese año (ej: pago anticipado), respetando pagos y talleres existentes.
 */
export async function crearInscripcion(
  db: Db,
  params: { nuAnio: number; cdUsuario: number }
): Promise<{ cdInscripcion: number; cantidadAlumnos: number }> {
  const [result] = await db.execute(
    'INSERT INTO TD_INSCRIPCIONES (nuAnio, cdEstado, cdUsuarioAlta) VALUES (?, 1, ?)',
    [params.nuAnio, params.cdUsuario]
  );
  const cdInscripcion = result.insertId;

  const estadoSql = `CASE
    WHEN ${reemplazar(PAGO_EN_ANIO_SQL, 'a.cdAlumno', '?')} THEN
      CASE WHEN ${reemplazar(INSCRIPTO_EN_ANIO_SQL, 'a.cdAlumno', '?')} THEN 5 ELSE 2 END
    ELSE 1
  END`;

  const [insertados] = await db.execute(
    `INSERT INTO TD_INSCRIPCIONES_ALUMNOS (cdInscripcion, cdAlumno, cdEstadoInscripcion, snAgregadoManual)
     SELECT ?, a.cdAlumno, ${estadoSql}, 0
     FROM TD_ALUMNOS a
     WHERE a.cdEstado = 1
        OR (a.cdEstado = 2 AND ${reemplazar(PAGO_EN_ANIO_SQL, 'a.cdAlumno', '?')})`,
    [cdInscripcion, params.nuAnio, params.nuAnio, params.nuAnio]
  );

  // Los que ya venían con pago (o inscriptos) quedan explicados en su historial
  await db.execute(
    `INSERT INTO TD_INSCRIPCIONES_HISTORIAL
       (cdInscripcionAlumno, dsTipo, cdEstadoAnterior, cdEstadoNuevo, dsComentario, cdUsuario)
     SELECT cdInscripcionAlumno, 'Estado', NULL, cdEstadoInscripcion,
            'Estado inicial al iniciar la inscripción (ya tenía el pago registrado)', ?
     FROM TD_INSCRIPCIONES_ALUMNOS
     WHERE cdInscripcion = ? AND cdEstadoInscripcion > 1`,
    [params.cdUsuario, cdInscripcion]
  );

  return { cdInscripcion, cantidadAlumnos: insertados.affectedRows };
}

export interface TallerResumen {
  cdTaller: number;
  nombre: string;
  anio: number;
  horario: string;
}

/** Talleres actuales (año en curso) y talleres del año de la inscripción, por alumno. */
export async function getTalleresDeLaInscripcion(
  db: Db,
  cdInscripcion: number,
  nuAnio: number
): Promise<{ actuales: Map<number, TallerResumen[]>; inscriptos: Map<number, TallerResumen[]> }> {
  const anioActual = getAnioActual();
  const [rows] = await db.execute(
    `SELECT
       at.cdAlumno,
       at.cdEstado as cdEstadoAlumnoTaller,
       t.cdTaller,
       t.nuAnioTaller,
       t.cdEstado as cdEstadoTaller,
       tt.dsNombreTaller,
       t.snDomingo, t.snLunes, t.snMartes, t.snMiercoles, t.snJueves, t.snViernes, t.snSabado,
       t.dsDomingoHoraDesde, t.dsDomingoHoraHasta,
       t.dsLunesHoraDesde, t.dsLunesHoraHasta,
       t.dsMartesHoraDesde, t.dsMartesHoraHasta,
       t.dsMiercolesHoraDesde, t.dsMiercolesHoraHasta,
       t.dsJuevesHoraDesde, t.dsJuevesHoraHasta,
       t.dsViernesHoraDesde, t.dsViernesHoraHasta,
       t.dsSabadoHoraDesde, t.dsSabadoHoraHasta
     FROM TD_INSCRIPCIONES_ALUMNOS ia
     INNER JOIN TR_ALUMNO_TALLER at ON at.cdAlumno = ia.cdAlumno
     INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
     INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
     WHERE ia.cdInscripcion = ?
       AND at.feBaja IS NULL
       AND at.cdEstado IN (1, 4)
       AND t.cdEstado IN (1, 2, 4)
       AND t.nuAnioTaller IN (?, ?)
     ORDER BY tt.dsNombreTaller`,
    [cdInscripcion, anioActual, nuAnio]
  );

  const actuales = new Map<number, TallerResumen[]>();
  const inscriptos = new Map<number, TallerResumen[]>();
  const agregar = (mapa: Map<number, TallerResumen[]>, cdAlumno: number, r: any) => {
    if (!mapa.has(cdAlumno)) mapa.set(cdAlumno, []);
    mapa.get(cdAlumno)!.push({
      cdTaller: r.cdTaller,
      nombre: `${r.dsNombreTaller} ${r.nuAnioTaller}`,
      anio: r.nuAnioTaller,
      horario: formatearHorario(r),
    });
  };

  for (const r of rows) {
    if (r.nuAnioTaller === anioActual && r.cdEstadoAlumnoTaller === 1 && r.cdEstadoTaller === 1) {
      agregar(actuales, r.cdAlumno, r);
    }
    if (r.nuAnioTaller === nuAnio) {
      agregar(inscriptos, r.cdAlumno, r);
    }
  }
  return { actuales, inscriptos };
}
