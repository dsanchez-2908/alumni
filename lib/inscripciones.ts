import pool from '@/lib/db';

export type TipoPrecioInscripcion =
  | 'ALUMNO_ACTIVO'
  | 'FAMILIAR_ACTIVO'
  | 'ALUMNO_NUEVO'
  | 'FAMILIAR_NUEVO';

export const ETIQUETA_TIPO_PRECIO: Record<TipoPrecioInscripcion, string> = {
  ALUMNO_ACTIVO: 'Alumno Activo',
  FAMILIAR_ACTIVO: 'Familiar de Alumno Activo',
  ALUMNO_NUEVO: 'Alumno Nuevo',
  FAMILIAR_NUEVO: 'Familiar de Alumno Nuevo',
};

// Cualquier conexión o pool de mysql2
type Db = { execute: (sql: string, values?: any) => Promise<any> };

export interface PrecioInscripcion {
  cdPrecioInscripcion: number;
  feInicioVigencia: string;
  nuPrecioAlumnoActivo: number;
  nuPrecioFamiliarActivo: number;
  nuPrecioAlumnoNuevo: number;
  nuPrecioFamiliarNuevo: number;
}

export interface MiembroInscripcion {
  cdAlumno: number;
  dsNombre: string;
  dsApellido: string;
  dsDNI: string;
  dsMailNotificacion: string | null;
  dsWhatsappNotificacion: string | null;
  inscripto: boolean;
  tipoPrecio: TipoPrecioInscripcion;
  monto: number;
  yaPagado: boolean;
  pago: {
    cdComprobante: number | null;
    fePago: string;
    nuMonto: number;
    dsTipoPago: string;
    dsTipoPrecio: string;
  } | null;
}

export interface CalculoInscripcion {
  anio: number;
  grupoActivo: boolean;
  precio: PrecioInscripcion | null;
  miembros: MiembroInscripcion[];
}

/** Año actual según la hora de Argentina (el servidor puede estar en UTC). */
export function getAnioActual(): number {
  const anio = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
  }).format(new Date());
  return parseInt(anio, 10);
}

/**
 * Años cuya inscripción se puede pagar hoy: el año actual y los años con una inscripción iniciada
 * (Alumnos > Seguimiento Inscripciones).
 */
export async function getAniosPermitidos(): Promise<number[]> {
  const anios = new Set<number>([getAnioActual()]);
  try {
    const [rows] = await pool.execute<any[]>(
      'SELECT nuAnio FROM TD_INSCRIPCIONES WHERE cdEstado = 1'
    );
    rows.forEach((r) => anios.add(r.nuAnio));
  } catch (error) {
    // Sin la tabla de seguimiento (migración pendiente) se mantiene el pago del año actual
    console.error('No se pudieron leer las inscripciones iniciadas:', error);
  }
  return [...anios].sort((a, b) => a - b);
}

/** Fecha de hoy (YYYY-MM-DD) en horario de Argentina: el servidor/base pueden estar en UTC y "hoy" cambiaría a las 21:00. */
export function getFechaHoyArgentina(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Precio vigente a la fecha actual (última vigencia con inicio <= hoy, hora de Argentina). */
export async function getPrecioInscripcionVigente(db: Db): Promise<PrecioInscripcion | null> {
  const [rows] = await db.execute(
    `SELECT
       cdPrecioInscripcion,
       DATE_FORMAT(feInicioVigencia, '%Y-%m-%d') as feInicioVigencia,
       nuPrecioAlumnoActivo,
       nuPrecioFamiliarActivo,
       nuPrecioAlumnoNuevo,
       nuPrecioFamiliarNuevo
     FROM TD_PRECIOS_INSCRIPCIONES
     WHERE cdEstado = 1
       AND feInicioVigencia <= ?
     ORDER BY feInicioVigencia DESC
     LIMIT 1`,
    [getFechaHoyArgentina()]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    cdPrecioInscripcion: r.cdPrecioInscripcion,
    feInicioVigencia: r.feInicioVigencia,
    nuPrecioAlumnoActivo: parseFloat(r.nuPrecioAlumnoActivo),
    nuPrecioFamiliarActivo: parseFloat(r.nuPrecioFamiliarActivo),
    nuPrecioAlumnoNuevo: parseFloat(r.nuPrecioAlumnoNuevo),
    nuPrecioFamiliarNuevo: parseFloat(r.nuPrecioFamiliarNuevo),
  };
}

export function montoSegunTipo(precio: PrecioInscripcion, tipo: TipoPrecioInscripcion): number {
  switch (tipo) {
    case 'ALUMNO_ACTIVO':
      return precio.nuPrecioAlumnoActivo;
    case 'FAMILIAR_ACTIVO':
      return precio.nuPrecioFamiliarActivo;
    case 'ALUMNO_NUEVO':
      return precio.nuPrecioAlumnoNuevo;
    default:
      return precio.nuPrecioFamiliarNuevo;
  }
}

/**
 * Calcula el grupo familiar del alumno con el precio que le corresponde a cada miembro para un año:
 * - Si algún miembro está inscripto en un taller (grupo activo): un único miembro paga "Alumno Activo"
 *   (el buscado si está inscripto; si no, el primer inscripto) y el resto "Familiar de Alumno Activo".
 * - Si ninguno está inscripto: el buscado paga "Alumno Nuevo" y el resto "Familiar de Alumno Nuevo".
 * - Si el "titular" del grupo ya pagó ese año, los demás pagan siempre el precio de familiar.
 */
export async function calcularInscripcionGrupo(
  db: Db,
  params: { cdAlumno: number; cdGrupoFamiliar: number | null; anio: number }
): Promise<CalculoInscripcion> {
  const { cdAlumno, cdGrupoFamiliar, anio } = params;

  const filtroMiembros = cdGrupoFamiliar
    ? `a.cdAlumno IN (SELECT cdAlumno FROM TR_ALUMNO_GRUPO_FAMILIAR WHERE cdGrupoFamiliar = ?)`
    : `a.cdAlumno = ?`;

  const [miembrosRows] = await db.execute(
    `SELECT
       a.cdAlumno,
       a.dsNombre,
       a.dsApellido,
       a.dsDNI,
       a.dsMailNotificacion,
       a.dsWhatsappNotificacion,
       EXISTS (
         SELECT 1
         FROM TR_ALUMNO_TALLER at
         INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
         WHERE at.cdAlumno = a.cdAlumno
           AND at.cdEstado = 1
           AND at.feBaja IS NULL
           AND t.cdEstado = 1
       ) as inscripto
     FROM TD_ALUMNOS a
     WHERE (a.cdEstado IN (1, 2) OR a.cdAlumno = ?)
       AND ${filtroMiembros}
     ORDER BY a.dsApellido, a.dsNombre`,
    [cdAlumno, cdGrupoFamiliar || cdAlumno]
  );

  const miembros: any[] = [...miembrosRows];
  // El alumno buscado siempre debe formar parte del cálculo
  if (!miembros.some((m) => m.cdAlumno === cdAlumno)) {
    return { anio, grupoActivo: false, precio: await getPrecioInscripcionVigente(db), miembros: [] };
  }

  const ids = miembros.map((m) => m.cdAlumno);
  const [pagosRows] = await db.execute(
    `SELECT
       cdAlumno,
       cdComprobante,
       DATE_FORMAT(fePago, '%Y-%m-%d') as fePago,
       nuMonto,
       dsTipoPago,
       dsTipoPrecio
     FROM TD_PAGOS_INSCRIPCIONES
     WHERE nuAnioInscripcion = ?
       AND cdEstado = 1
       AND cdAlumno IN (${ids.map(() => '?').join(',')})`,
    [anio, ...ids]
  );
  const pagos = new Map<number, any>(pagosRows.map((p: any) => [p.cdAlumno, p]));

  const precio = await getPrecioInscripcionVigente(db);
  const grupoActivo = miembros.some((m) => Number(m.inscripto) === 1);

  const titularYaPago = [...pagos.values()].some((p) => String(p.dsTipoPrecio).startsWith('ALUMNO_'));
  let cdTitular: number | null = null;
  if (!titularYaPago) {
    if (!grupoActivo) {
      cdTitular = cdAlumno;
    } else {
      const buscado = miembros.find((m) => m.cdAlumno === cdAlumno);
      cdTitular = Number(buscado.inscripto) === 1
        ? cdAlumno
        : miembros.find((m) => Number(m.inscripto) === 1).cdAlumno;
    }
  }

  const sufijo = grupoActivo ? 'ACTIVO' : 'NUEVO';

  return {
    anio,
    grupoActivo,
    precio,
    miembros: miembros.map((m) => {
      const tipoPrecio = `${m.cdAlumno === cdTitular ? 'ALUMNO' : 'FAMILIAR'}_${sufijo}` as TipoPrecioInscripcion;
      const pago = pagos.get(m.cdAlumno);
      return {
        cdAlumno: m.cdAlumno,
        dsNombre: m.dsNombre,
        dsApellido: m.dsApellido,
        dsDNI: m.dsDNI,
        dsMailNotificacion: m.dsMailNotificacion,
        dsWhatsappNotificacion: m.dsWhatsappNotificacion,
        inscripto: Number(m.inscripto) === 1,
        tipoPrecio,
        monto: precio ? montoSegunTipo(precio, tipoPrecio) : 0,
        yaPagado: !!pago,
        pago: pago
          ? {
              cdComprobante: pago.cdComprobante,
              fePago: pago.fePago,
              nuMonto: parseFloat(pago.nuMonto),
              dsTipoPago: pago.dsTipoPago,
              dsTipoPrecio: pago.dsTipoPrecio,
            }
          : null,
      };
    }),
  };
}
