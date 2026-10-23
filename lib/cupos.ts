type Db = { execute: (sql: string, values?: any) => Promise<any> };

export interface TallerCompleto {
  cdTaller: number;
  nombre: string;
  limite: number;
  ocupados: number;
}

/** Solo Administrador y Supervisor pueden inscribir por encima del cupo máximo. */
export function puedeExcederCupo(session: any): boolean {
  const roles: string[] = session?.user?.roles || [];
  return roles.includes('Administrador') || roles.includes('Supervisor');
}

/**
 * Devuelve, entre los talleres indicados, los que ya no tienen lugar para un alumno más.
 * Ocupan lugar los alumnos con inscripción activa y sin baja. Un taller sin cupo máximo nunca está completo.
 */
export async function getTalleresCompletos(db: Db, cdTalleres: number[]): Promise<TallerCompleto[]> {
  if (cdTalleres.length === 0) return [];

  const [rows] = await db.execute(
    `SELECT
       t.cdTaller,
       CONCAT(tt.dsNombreTaller, ' ', t.nuAnioTaller) as nombre,
       t.nuCupoMaximo as limite,
       (SELECT COUNT(DISTINCT at.cdAlumno)
          FROM TR_ALUMNO_TALLER at
          WHERE at.cdTaller = t.cdTaller AND at.cdEstado = 1 AND at.feBaja IS NULL) as ocupados
     FROM TD_TALLERES t
     INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
     WHERE t.nuCupoMaximo IS NOT NULL
       AND t.cdTaller IN (${cdTalleres.map(() => '?').join(',')})`,
    cdTalleres
  );

  return rows
    .map((r: any) => ({
      cdTaller: r.cdTaller,
      nombre: r.nombre,
      limite: Number(r.limite),
      ocupados: Number(r.ocupados),
    }))
    .filter((t: TallerCompleto) => t.ocupados >= t.limite);
}

export function mensajeCupoCompleto(completos: TallerCompleto[]): string {
  const detalle = completos
    .map((t) => `${t.nombre} (${t.ocupados} de ${t.limite} lugares ocupados)`)
    .join('; ');
  return completos.length === 1
    ? `El taller ${detalle} no tiene lugares disponibles.`
    : `Los siguientes talleres no tienen lugares disponibles: ${detalle}.`;
}

export interface RespuestaCupo {
  status: number;
  body: { error: string; cupoExcedido: true; puedeForzar: boolean };
}

/**
 * Valida el cupo antes de ocupar un lugar en los talleres indicados.
 * Devuelve null si se puede continuar; si no, una respuesta 409. Con `puedeForzar` el cliente puede
 * pedir confirmación y reenviar con forzarCupo; un rol sin permiso queda bloqueado aunque lo envíe.
 */
export async function verificarCupoInscripcion(
  db: Db,
  session: any,
  cdTalleres: number[],
  forzarCupo: boolean
): Promise<RespuestaCupo | null> {
  const completos = await getTalleresCompletos(db, cdTalleres);
  if (completos.length === 0) return null;

  const puedeForzar = puedeExcederCupo(session);
  if (puedeForzar && forzarCupo) return null;

  const mensaje = mensajeCupoCompleto(completos);
  return {
    status: 409,
    body: {
      error: puedeForzar
        ? mensaje
        : `${mensaje} Solo un Administrador o Supervisor puede inscribir por encima del cupo máximo.`,
      cupoExcedido: true,
      puedeForzar,
    },
  };
}

/** Interpreta el valor enviado por el formulario: vacío = sin límite; si no, entero >= 1. */
export function parseCupoMaximo(valor: unknown): { valor: number | null; error?: string } {
  if (valor === undefined || valor === null || valor === '') return { valor: null };
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 1) {
    return { valor: null, error: 'La cantidad máxima de alumnos debe ser un número entero mayor a 0' };
  }
  return { valor: numero };
}
