import crypto from 'crypto';
import pool from '@/lib/db';
import { actualizarEstadoAlumno } from '@/lib/db-utils';
import { getTalleresCompletos, mensajeCupoCompleto } from '@/lib/cupos';
import { formatearHorario } from '@/lib/cuotas-pendientes';
import { esMenorDeEdad, validarCamposAdicionales } from '@/lib/alumno-campos';
import {
  cambiarEstado,
  ESTADO_INSCRIPCION,
  sincronizarInscripcionesDeAlumno,
} from '@/lib/seguimiento-inscripciones';

// Cualquier conexión o pool de mysql2
type Db = { execute: (sql: string, values?: any) => Promise<any> };

export const VIGENCIA_DIAS = 60;
export const MAX_INTENTOS_DNI = 5;

export const ESTADO_FORMULARIO = { VIGENTE: 1, COMPLETADO: 2, ANULADO: 3 } as const;

// Token de 256 bits en base64url (43 caracteres)
const TOKEN_REGEX = /^[A-Za-z0-9_-]{43}$/;

export const generarToken = () => crypto.randomBytes(32).toString('base64url');
export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

// Copia cifrada del token (AES-256-GCM) para poder volver a mostrar el link vigente. La clave sale de un
// secreto del servidor: quien solo tenga acceso a la base de datos no puede reconstruir los links.
function claveCifrado(): Buffer {
  const secreto = process.env.FORMULARIO_TOKEN_KEY || process.env.NEXTAUTH_SECRET;
  if (!secreto) throw new Error('Falta NEXTAUTH_SECRET (o FORMULARIO_TOKEN_KEY) para cifrar los links del formulario');
  return crypto.createHash('sha256').update(`formulario-token|${secreto}`).digest();
}

export function cifrarToken(token: string): string {
  const iv = crypto.randomBytes(12);
  const cifrador = crypto.createCipheriv('aes-256-gcm', claveCifrado(), iv);
  const cifrado = Buffer.concat([cifrador.update(token, 'utf8'), cifrador.final()]);
  return Buffer.concat([iv, cifrador.getAuthTag(), cifrado]).toString('base64');
}

export function descifrarToken(valor: string): string | null {
  try {
    const datos = Buffer.from(valor, 'base64');
    const descifrador = crypto.createDecipheriv('aes-256-gcm', claveCifrado(), datos.subarray(0, 12));
    descifrador.setAuthTag(datos.subarray(12, 28));
    return Buffer.concat([descifrador.update(datos.subarray(28)), descifrador.final()]).toString('utf8');
  } catch {
    // Valor alterado o clave distinta: se trata como si no hubiera link
    return null;
  }
}

// =============================================
// LINKS (uso interno)
// =============================================

/** Genera un link nuevo y anula los anteriores del mismo alumno en la inscripción. */
export async function crearLink(
  cdInscripcionAlumno: number,
  cdUsuario: number
): Promise<{ token: string; feVencimiento: string }> {
  const token = generarToken();
  const connection: any = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      'UPDATE TD_INSCRIPCIONES_FORMULARIOS SET cdEstado = ? WHERE cdInscripcionAlumno = ? AND cdEstado = ?',
      [ESTADO_FORMULARIO.ANULADO, cdInscripcionAlumno, ESTADO_FORMULARIO.VIGENTE]
    );
    await connection.execute(
      `INSERT INTO TD_INSCRIPCIONES_FORMULARIOS (cdInscripcionAlumno, dsTokenHash, dsTokenCifrado, feVencimiento, cdUsuarioAlta)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), ?)`,
      [cdInscripcionAlumno, hashToken(token), cifrarToken(token), VIGENCIA_DIAS, cdUsuario]
    );
    const [rows] = await connection.execute(
      `SELECT DATE_FORMAT(feVencimiento, '%Y-%m-%d') as feVencimiento
       FROM TD_INSCRIPCIONES_FORMULARIOS WHERE dsTokenHash = ?`,
      [hashToken(token)]
    );
    await connection.commit();
    return { token, feVencimiento: rows[0].feVencimiento };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/** Condición SQL de "link usable": vigente, no vencido, no bloqueado y con copia cifrada para poder mostrarlo. */
export const SQL_LINK_VIGENTE = (alias: string) =>
  `${alias}.cdEstado = ${ESTADO_FORMULARIO.VIGENTE}
   AND ${alias}.feVencimiento > NOW()
   AND ${alias}.nuIntentosFallidos < ${MAX_INTENTOS_DNI}
   AND ${alias}.dsTokenCifrado IS NOT NULL`;

/** Último link vigente del alumno en la inscripción (null si no hay o es de antes del cifrado). */
export async function obtenerLinkVigente(
  db: Db,
  cdInscripcionAlumno: number
): Promise<{ token: string; feVencimiento: string } | null> {
  const [rows] = await db.execute(
    `SELECT f.dsTokenCifrado, DATE_FORMAT(f.feVencimiento, '%Y-%m-%d') as feVencimiento
     FROM TD_INSCRIPCIONES_FORMULARIOS f
     WHERE f.cdInscripcionAlumno = ? AND ${SQL_LINK_VIGENTE('f')}
     ORDER BY f.cdFormulario DESC
     LIMIT 1`,
    [cdInscripcionAlumno]
  );
  if (rows.length === 0) return null;
  const token = descifrarToken(rows[0].dsTokenCifrado);
  return token ? { token, feVencimiento: rows[0].feVencimiento } : null;
}

export interface EstadoLink {
  estado: 'Vigente' | 'Vencido' | 'Bloqueado' | 'Completado' | 'Anulado';
  feVencimiento: string;
  feCompletado: string | null;
}

/** Estado del último link generado para el alumno en la inscripción (null si nunca se generó). */
export async function getEstadoUltimoLink(
  db: Db,
  cdInscripcionAlumno: number
): Promise<EstadoLink | null> {
  const [rows] = await db.execute(
    `SELECT cdEstado, nuIntentosFallidos, feVencimiento < NOW() as vencido,
            DATE_FORMAT(feVencimiento, '%Y-%m-%d') as feVencimiento,
            DATE_FORMAT(feCompletado, '%Y-%m-%d %H:%i:%s') as feCompletado
     FROM TD_INSCRIPCIONES_FORMULARIOS
     WHERE cdInscripcionAlumno = ?
     ORDER BY cdFormulario DESC
     LIMIT 1`,
    [cdInscripcionAlumno]
  );
  if (rows.length === 0) return null;
  const f = rows[0];

  let estado: EstadoLink['estado'];
  if (f.cdEstado === ESTADO_FORMULARIO.COMPLETADO) estado = 'Completado';
  else if (f.cdEstado === ESTADO_FORMULARIO.ANULADO) estado = 'Anulado';
  else if (Number(f.vencido) === 1) estado = 'Vencido';
  else if (f.nuIntentosFallidos >= MAX_INTENTOS_DNI) estado = 'Bloqueado';
  else estado = 'Vigente';

  return { estado, feVencimiento: f.feVencimiento, feCompletado: f.feCompletado };
}

// =============================================
// ACCESO PÚBLICO AL FORMULARIO
// =============================================

export interface FormularioActivo {
  cdFormulario: number;
  cdInscripcionAlumno: number;
  cdAlumno: number;
  cdInscripcion: number;
  nuAnio: number;
  cdEstadoInscripcion: number;
  mensaje: string | null;
}

/**
 * Devuelve el formulario solo si el link está vigente, no venció, no está bloqueado, la inscripción sigue abierta
 * y el alumno todavía está pendiente de completarlo. Cualquier otro caso es null (el cliente ve el mismo error).
 */
export async function cargarFormularioVigente(db: Db, token: string): Promise<FormularioActivo | null> {
  if (typeof token !== 'string' || !TOKEN_REGEX.test(token)) return null;

  const [rows] = await db.execute(
    `SELECT f.cdFormulario, f.cdInscripcionAlumno, ia.cdAlumno, ia.cdInscripcion,
            ia.cdEstadoInscripcion, i.nuAnio, i.dsMensajeFormulario
     FROM TD_INSCRIPCIONES_FORMULARIOS f
     INNER JOIN TD_INSCRIPCIONES_ALUMNOS ia ON f.cdInscripcionAlumno = ia.cdInscripcionAlumno
     INNER JOIN TD_INSCRIPCIONES i ON ia.cdInscripcion = i.cdInscripcion
     WHERE f.dsTokenHash = ?
       AND f.cdEstado = ?
       AND f.feVencimiento > NOW()
       AND f.nuIntentosFallidos < ?
       AND i.cdEstado = 1
       AND ia.cdEstadoInscripcion IN (?, ?)`,
    [
      hashToken(token),
      ESTADO_FORMULARIO.VIGENTE,
      MAX_INTENTOS_DNI,
      ESTADO_INSCRIPCION.PENDIENTE_ENVIAR_FORMULARIO,
      ESTADO_INSCRIPCION.PENDIENTE_COMPLETAR_FORMULARIO,
    ]
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    cdFormulario: r.cdFormulario,
    cdInscripcionAlumno: r.cdInscripcionAlumno,
    cdAlumno: r.cdAlumno,
    cdInscripcion: r.cdInscripcion,
    nuAnio: r.nuAnio,
    cdEstadoInscripcion: r.cdEstadoInscripcion,
    mensaje: r.dsMensajeFormulario,
  };
}

const normalizarDocumento = (valor: string) => valor.replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
const huella = (valor: string) => crypto.createHash('sha256').update(valor).digest();

export type ResultadoDni =
  | { ok: true }
  | { ok: false; invalido: true }
  | { ok: false; invalido?: false; bloqueado: boolean; restantes: number };

/**
 * Verifica el DNI del alumno. El intento se reserva ANTES de comparar (de forma atómica), así los intentos
 * en paralelo tampoco pueden superar el máximo. Un acierto reinicia el contador.
 */
export async function verificarDni(
  db: Db,
  form: FormularioActivo,
  dniIngresado: unknown
): Promise<ResultadoDni> {
  const [reserva] = await db.execute(
    `UPDATE TD_INSCRIPCIONES_FORMULARIOS
     SET nuIntentosFallidos = nuIntentosFallidos + 1
     WHERE cdFormulario = ? AND cdEstado = ? AND nuIntentosFallidos < ?`,
    [form.cdFormulario, ESTADO_FORMULARIO.VIGENTE, MAX_INTENTOS_DNI]
  );
  if (reserva.affectedRows === 0) {
    // Sin intentos disponibles, o el link se completó / anuló mientras tanto (ej: doble envío)
    const [estado] = await db.execute(
      'SELECT cdEstado FROM TD_INSCRIPCIONES_FORMULARIOS WHERE cdFormulario = ?',
      [form.cdFormulario]
    );
    if (estado.length === 0 || estado[0].cdEstado !== ESTADO_FORMULARIO.VIGENTE) {
      return { ok: false, invalido: true };
    }
    return { ok: false, bloqueado: true, restantes: 0 };
  }

  const [alumnos] = await db.execute('SELECT dsDNI FROM TD_ALUMNOS WHERE cdAlumno = ?', [form.cdAlumno]);
  const real = normalizarDocumento(String(alumnos[0]?.dsDNI ?? ''));
  const ingresado = normalizarDocumento(typeof dniIngresado === 'string' ? dniIngresado.slice(0, 30) : '');

  if (real.length > 0 && crypto.timingSafeEqual(huella(real), huella(ingresado))) {
    await db.execute(
      'UPDATE TD_INSCRIPCIONES_FORMULARIOS SET nuIntentosFallidos = 0 WHERE cdFormulario = ? AND cdEstado = ?',
      [form.cdFormulario, ESTADO_FORMULARIO.VIGENTE]
    );
    return { ok: true };
  }

  const [conteo] = await db.execute(
    'SELECT nuIntentosFallidos FROM TD_INSCRIPCIONES_FORMULARIOS WHERE cdFormulario = ?',
    [form.cdFormulario]
  );
  const restantes = Math.max(0, MAX_INTENTOS_DNI - Number(conteo[0]?.nuIntentosFallidos ?? MAX_INTENTOS_DNI));
  return { ok: false, bloqueado: restantes === 0, restantes };
}

// =============================================
// DATOS DEL ALUMNO Y TALLERES
// =============================================

export async function getDatosAlumno(db: Db, cdAlumno: number) {
  const [rows] = await db.execute(
    `SELECT
       cdAlumno, dsNombre, dsApellido, dsDNI, dsSexo, dsNombreLlamar,
       DATE_FORMAT(feNacimiento, '%Y-%m-%d') as feNacimiento,
       TIMESTAMPDIFF(YEAR, feNacimiento, CURDATE()) as edad,
       dsDomicilio, dsCiudad, dsComoNosConocio, dsEscuela, dsTurnoEscuela,
       snPermisoUsoImagen, snPermisoRetiroSolo,
       snDiscapacidad, dsObservacionesDiscapacidad, dsObservaciones,
       dsTelefonoCelular, dsTelefonoFijo, dsMail,
       dsNombreCompletoContacto1, dsParentescoContacto1, dsDNIContacto1, dsTelefonoContacto1, dsMailContacto1,
       dsNombreCompletoContacto2, dsParentescoContacto2, dsDNIContacto2, dsTelefonoContacto2, dsMailContacto2,
       dsInstagram, dsFacebook, dsMailNotificacion, dsWhatsappNotificacion
     FROM TD_ALUMNOS
     WHERE cdAlumno = ?`,
    [cdAlumno]
  );
  if (rows.length === 0) return null;
  return { ...rows[0], esMenor: esMenorDeEdad(rows[0].feNacimiento) };
}

export type DisponibilidadTaller = 'disponible' | 'completo' | 'fuera_de_edad' | 'ya_inscripto';

export interface TallerFormulario {
  cdTaller: number;
  nombre: string;
  horario: string;
  descripcionHorarios: string | null;
  rangoEdad: string | null;
  disponibilidad: DisponibilidadTaller;
}

function rangoEdadTexto(desde: number | null, hasta: number | null): string | null {
  if (desde && hasta) return `${desde} a ${hasta} años`;
  if (desde) return `Desde ${desde} años`;
  if (hasta) return `Hasta ${hasta} años`;
  return null;
}

const edadPermitida = (edad: number, desde: number | null, hasta: number | null) =>
  (!desde || edad >= desde) && (!hasta || edad <= hasta);

/** Talleres activos del año de la inscripción, con su disponibilidad para este alumno. */
export async function getTalleresFormulario(
  db: Db,
  cdAlumno: number,
  nuAnio: number
): Promise<TallerFormulario[]> {
  const [rows] = await db.execute(
    `SELECT
       t.cdTaller, t.nuCupoMaximo, t.dsDescripcionHorarios,
       tt.dsNombreTaller, tt.nuEdadDesde, tt.nuEdadHasta,
       TIMESTAMPDIFF(YEAR, a.feNacimiento, t.feInicioTaller) as edadAlInicio,
       (SELECT COUNT(DISTINCT x.cdAlumno) FROM TR_ALUMNO_TALLER x
          WHERE x.cdTaller = t.cdTaller AND x.cdEstado = 1 AND x.feBaja IS NULL) as ocupados,
       (SELECT COUNT(*) FROM TR_ALUMNO_TALLER y
          WHERE y.cdTaller = t.cdTaller AND y.cdAlumno = a.cdAlumno AND y.cdEstado = 1 AND y.feBaja IS NULL) as yaInscripto,
       t.snDomingo, t.snLunes, t.snMartes, t.snMiercoles, t.snJueves, t.snViernes, t.snSabado,
       t.dsDomingoHoraDesde, t.dsDomingoHoraHasta,
       t.dsLunesHoraDesde, t.dsLunesHoraHasta,
       t.dsMartesHoraDesde, t.dsMartesHoraHasta,
       t.dsMiercolesHoraDesde, t.dsMiercolesHoraHasta,
       t.dsJuevesHoraDesde, t.dsJuevesHoraHasta,
       t.dsViernesHoraDesde, t.dsViernesHoraHasta,
       t.dsSabadoHoraDesde, t.dsSabadoHoraHasta
     FROM TD_TALLERES t
     INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
     INNER JOIN TD_ALUMNOS a ON a.cdAlumno = ?
     WHERE t.nuAnioTaller = ? AND t.cdEstado = 1
     ORDER BY tt.dsNombreTaller, t.cdTaller`,
    [cdAlumno, nuAnio]
  );

  return rows.map((r: any) => {
    let disponibilidad: DisponibilidadTaller = 'disponible';
    if (Number(r.yaInscripto) > 0) disponibilidad = 'ya_inscripto';
    else if (!edadPermitida(Number(r.edadAlInicio), r.nuEdadDesde, r.nuEdadHasta)) disponibilidad = 'fuera_de_edad';
    else if (r.nuCupoMaximo !== null && Number(r.ocupados) >= Number(r.nuCupoMaximo)) disponibilidad = 'completo';

    return {
      cdTaller: r.cdTaller,
      nombre: r.dsNombreTaller,
      horario: formatearHorario(r),
      descripcionHorarios: r.dsDescripcionHorarios,
      rangoEdad: rangoEdadTexto(r.nuEdadDesde, r.nuEdadHasta),
      disponibilidad,
    };
  });
}

// =============================================
// VALIDACIÓN DE LOS DATOS ENVIADOS
// =============================================

type TipoCampo = 'texto' | 'email' | 'telefono' | 'largo';

const CAMPOS_EDITABLES: { campo: string; label: string; max: number; tipo: TipoCampo }[] = [
  { campo: 'dsDomicilio', label: 'Dirección', max: 255, tipo: 'texto' },
  { campo: 'dsObservaciones', label: 'Observaciones Generales', max: 2000, tipo: 'largo' },
  { campo: 'dsTelefonoCelular', label: 'Teléfono Celular', max: 50, tipo: 'telefono' },
  { campo: 'dsTelefonoFijo', label: 'Teléfono Fijo', max: 50, tipo: 'telefono' },
  { campo: 'dsMail', label: 'Email', max: 100, tipo: 'email' },
  { campo: 'dsNombreCompletoContacto1', label: 'Contacto 1: Nombre', max: 255, tipo: 'texto' },
  { campo: 'dsParentescoContacto1', label: 'Contacto 1: Parentesco', max: 100, tipo: 'texto' },
  { campo: 'dsDNIContacto1', label: 'Contacto 1: DNI', max: 20, tipo: 'texto' },
  { campo: 'dsTelefonoContacto1', label: 'Contacto 1: Teléfono', max: 50, tipo: 'telefono' },
  { campo: 'dsMailContacto1', label: 'Contacto 1: Email', max: 100, tipo: 'email' },
  { campo: 'dsNombreCompletoContacto2', label: 'Contacto 2: Nombre', max: 255, tipo: 'texto' },
  { campo: 'dsParentescoContacto2', label: 'Contacto 2: Parentesco', max: 100, tipo: 'texto' },
  { campo: 'dsDNIContacto2', label: 'Contacto 2: DNI', max: 20, tipo: 'texto' },
  { campo: 'dsTelefonoContacto2', label: 'Contacto 2: Teléfono', max: 50, tipo: 'telefono' },
  { campo: 'dsMailContacto2', label: 'Contacto 2: Email', max: 100, tipo: 'email' },
  { campo: 'dsInstagram', label: 'Instagram', max: 100, tipo: 'texto' },
  { campo: 'dsFacebook', label: 'Facebook', max: 100, tipo: 'texto' },
  { campo: 'dsMailNotificacion', label: 'Email de notificación', max: 100, tipo: 'email' },
  { campo: 'dsWhatsappNotificacion', label: 'WhatsApp de notificación', max: 50, tipo: 'telefono' },
];

const ETIQUETAS_ADICIONALES: Record<string, string> = {
  dsCiudad: 'Ciudad / Localidad',
  dsComoNosConocio: '¿Cómo nos conocieron?',
  dsEscuela: 'Escuela',
  dsTurnoEscuela: 'Turno',
  snPermisoUsoImagen: 'Permiso de Uso de Imagen',
  snPermisoRetiroSolo: 'Permiso de Retiro Solo',
  snDiscapacidad: 'Discapacidad',
  dsObservacionesDiscapacidad: 'Observaciones de Discapacidad',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFONO_REGEX = /^[0-9+()\-.\s]{6,30}$/;
// Sin caracteres de control (se conservan saltos de línea)
const limpiar = (valor: string) => valor.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();

export function validarDatosFormulario(
  datos: Record<string, any>,
  feNacimiento: string
): { valores?: Record<string, string | null>; error?: string } {
  if (!datos || typeof datos !== 'object') return { error: 'Datos inválidos' };

  const valores: Record<string, string | null> = {};

  for (const { campo, label, max, tipo } of CAMPOS_EDITABLES) {
    const bruto = datos[campo];
    if (bruto !== undefined && bruto !== null && typeof bruto !== 'string') {
      return { error: `${label}: valor inválido` };
    }
    const limpio = limpiar(typeof bruto === 'string' ? bruto : '');
    if (limpio.length > max) return { error: `${label}: máximo ${max} caracteres` };
    if (limpio && tipo === 'email' && !EMAIL_REGEX.test(limpio)) {
      return { error: `${label}: ingrese un email válido` };
    }
    if (limpio && tipo === 'telefono' && !TELEFONO_REGEX.test(limpio)) {
      return { error: `${label}: ingrese un teléfono válido` };
    }
    valores[campo] = limpio || null;
  }

  if (datos.snDiscapacidad !== 'SI' && datos.snDiscapacidad !== 'NO') {
    return { error: 'Indique si tiene alguna discapacidad (SI/NO)' };
  }
  valores.snDiscapacidad = datos.snDiscapacidad;
  const obsDiscapacidad = limpiar(typeof datos.dsObservacionesDiscapacidad === 'string' ? datos.dsObservacionesDiscapacidad : '');
  if (obsDiscapacidad.length > 2000) return { error: 'Observaciones de Discapacidad: máximo 2000 caracteres' };
  valores.dsObservacionesDiscapacidad = datos.snDiscapacidad === 'SI' ? obsDiscapacidad || null : null;

  const adicionales = validarCamposAdicionales(
    {
      ...datos,
      dsCiudad: typeof datos.dsCiudad === 'string' ? limpiar(datos.dsCiudad) : '',
      dsComoNosConocio: typeof datos.dsComoNosConocio === 'string' ? limpiar(datos.dsComoNosConocio) : '',
      dsEscuela: typeof datos.dsEscuela === 'string' ? limpiar(datos.dsEscuela) : '',
    },
    feNacimiento
  );
  if (adicionales.error) return { error: adicionales.error };
  Object.assign(valores, adicionales.valores);

  return { valores };
}

// =============================================
// ENVÍO DEL FORMULARIO
// =============================================

export type ResultadoEnvio =
  | { ok: true; talleres: string[] }
  | { ok: false; status: number; error: string; bloqueado?: boolean; restantes?: number };

const ERROR_LINK = { ok: false, status: 404, error: 'El link no es válido o ya fue utilizado.' } as const;

/**
 * Completa el formulario: valida el link y el DNI, actualiza los datos del alumno, lo inscribe a los talleres
 * elegidos (respetando cupo y edad) y pasa su seguimiento a "Inscripto". Todo en una sola transacción.
 */
export async function enviarFormulario(params: {
  token: string;
  dni: unknown;
  datos: Record<string, any>;
  talleres: unknown;
}): Promise<ResultadoEnvio> {
  const formulario = await cargarFormularioVigente(pool, params.token);
  if (!formulario) return ERROR_LINK;

  // La verificación del DNI queda confirmada (y los intentos contados) aunque el resto falle
  const dni = await verificarDni(pool, formulario, params.dni);
  if (!dni.ok) {
    if (dni.invalido) return ERROR_LINK;
    return {
      ok: false,
      status: 403,
      error: dni.bloqueado
        ? 'Superaste el número de intentos permitidos. Pedí un nuevo link a Índigo.'
        : 'El DNI ingresado no coincide.',
      bloqueado: dni.bloqueado,
      restantes: dni.restantes,
    };
  }

  const connection: any = await pool.getConnection();
  try {
    // READ COMMITTED: tras esperar el bloqueo de un taller, el conteo de cupo ve las inscripciones que
    // otro envío acaba de confirmar (con REPEATABLE READ vería una foto vieja y podría superar el cupo)
    await connection.query('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');
    await connection.beginTransaction();

    // Serializa los envíos del mismo link y revalida que siga vigente
    const [bloqueo] = await connection.execute(
      `SELECT cdFormulario FROM TD_INSCRIPCIONES_FORMULARIOS
       WHERE cdFormulario = ? AND cdEstado = ? AND feVencimiento > NOW() FOR UPDATE`,
      [formulario.cdFormulario, ESTADO_FORMULARIO.VIGENTE]
    );
    const vigente = bloqueo.length > 0 ? await cargarFormularioVigente(connection, params.token) : null;
    if (!vigente) {
      await connection.rollback();
      return ERROR_LINK;
    }

    const [antesRows] = await connection.execute(
      `SELECT *, DATE_FORMAT(feNacimiento, '%Y-%m-%d') as feNacimientoTexto FROM TD_ALUMNOS WHERE cdAlumno = ?`,
      [vigente.cdAlumno]
    );
    if (antesRows.length === 0) {
      await connection.rollback();
      return ERROR_LINK;
    }
    const antes = antesRows[0];
    const feNacimiento: string = antes.feNacimientoTexto;

    const validacion = validarDatosFormulario(params.datos, feNacimiento);
    if (!validacion.valores) {
      await connection.rollback();
      return { ok: false, status: 400, error: validacion.error || 'Datos inválidos' };
    }
    const nuevos = validacion.valores;

    // Talleres elegidos
    const elegidos = Array.isArray(params.talleres)
      ? [...new Set(params.talleres.map((t) => Number(t)).filter((t) => Number.isInteger(t) && t > 0))]
      : [];
    if (elegidos.length > 30) {
      await connection.rollback();
      return { ok: false, status: 400, error: 'Selección de talleres inválida' };
    }

    // Los talleres se bloquean para que dos envíos simultáneos no superen el cupo
    const [tallerRows] = elegidos.length
      ? await connection.execute(
          `SELECT t.cdTaller, t.nuAnioTaller, t.cdEstado, tt.dsNombreTaller, tt.nuEdadDesde, tt.nuEdadHasta,
                  TIMESTAMPDIFF(YEAR, ?, t.feInicioTaller) as edadAlInicio
           FROM TD_TALLERES t
           INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
           WHERE t.cdTaller IN (${elegidos.map(() => '?').join(',')})
           ORDER BY t.cdTaller
           FOR UPDATE`,
          [feNacimiento, ...elegidos]
        )
      : [[]];

    if (tallerRows.length !== elegidos.length) {
      await connection.rollback();
      return { ok: false, status: 400, error: 'Alguno de los talleres elegidos no existe.' };
    }

    const [yaActivos] = await connection.execute(
      `SELECT cdTaller FROM TR_ALUMNO_TALLER WHERE cdAlumno = ? AND cdEstado = 1 AND feBaja IS NULL`,
      [vigente.cdAlumno]
    );
    const idsYaActivos = new Set<number>(yaActivos.map((r: any) => r.cdTaller));

    const nuevosTalleres: any[] = [];
    for (const t of tallerRows) {
      if (t.nuAnioTaller !== vigente.nuAnio || t.cdEstado !== 1) {
        await connection.rollback();
        return { ok: false, status: 400, error: `El taller ${t.dsNombreTaller} ya no está disponible para esta inscripción.` };
      }
      if (idsYaActivos.has(t.cdTaller)) continue;
      if (!edadPermitida(Number(t.edadAlInicio), t.nuEdadDesde, t.nuEdadHasta)) {
        await connection.rollback();
        return { ok: false, status: 400, error: `El taller ${t.dsNombreTaller} no corresponde a la edad del alumno.` };
      }
      nuevosTalleres.push(t);
    }

    // Debe quedar inscripto al menos a un taller (los ya inscriptos del año cuentan)
    const [inscriptosDelAnio] = await connection.execute(
      `SELECT COUNT(*) as cantidad
       FROM TR_ALUMNO_TALLER at
       INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
       WHERE at.cdAlumno = ? AND at.cdEstado = 1 AND at.feBaja IS NULL AND t.nuAnioTaller = ? AND t.cdEstado = 1`,
      [vigente.cdAlumno, vigente.nuAnio]
    );
    if (nuevosTalleres.length === 0 && Number(inscriptosDelAnio[0].cantidad) === 0) {
      await connection.rollback();
      return { ok: false, status: 400, error: 'Seleccione al menos un taller para completar la inscripción.' };
    }

    const completos = await getTalleresCompletos(connection, nuevosTalleres.map((t) => t.cdTaller));
    if (completos.length > 0) {
      await connection.rollback();
      return { ok: false, status: 409, error: `${mensajeCupoCompleto(completos)} Elija otro taller.` };
    }

    // Datos del alumno
    const columnas = Object.keys(nuevos);
    await connection.execute(
      `UPDATE TD_ALUMNOS SET ${columnas.map((c) => `${c} = ?`).join(', ')}, feModificacion = NOW() WHERE cdAlumno = ?`,
      [...columnas.map((c) => nuevos[c]), vigente.cdAlumno]
    );

    const cambios: Record<string, { antes: string | null; despues: string | null }> = {};
    const etiquetas = new Map(CAMPOS_EDITABLES.map((c) => [c.campo, c.label]));
    for (const columna of columnas) {
      const antesValor = antes[columna] === undefined || antes[columna] === null ? null : String(antes[columna]);
      if ((antesValor ?? '') !== (nuevos[columna] ?? '')) {
        cambios[etiquetas.get(columna) || ETIQUETAS_ADICIONALES[columna] || columna] = {
          antes: antesValor,
          despues: nuevos[columna],
        };
      }
    }

    for (const t of nuevosTalleres) {
      await connection.execute(
        `INSERT INTO TR_ALUMNO_TALLER (cdAlumno, cdTaller, cdEstado, feInscripcion)
         VALUES (?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE cdEstado = 1, feBaja = NULL, feInscripcion = NOW()`,
        [vigente.cdAlumno, t.cdTaller]
      );
    }

    await connection.execute(
      `UPDATE TD_INSCRIPCIONES_FORMULARIOS
       SET cdEstado = ?, feCompletado = NOW(), dsCambios = ?
       WHERE cdFormulario = ?`,
      [ESTADO_FORMULARIO.COMPLETADO, JSON.stringify(cambios), vigente.cdFormulario]
    );

    const nombresTalleres = nuevosTalleres.map((t) => t.dsNombreTaller);
    const modificados = Object.keys(cambios);
    await cambiarEstado(connection, {
      cdInscripcionAlumno: vigente.cdInscripcionAlumno,
      estadoAnterior: vigente.cdEstadoInscripcion,
      estadoNuevo: ESTADO_INSCRIPCION.INSCRIPTO,
      cdUsuario: null,
      comentario:
        'Formulario digital completado por el alumno.' +
        (nombresTalleres.length ? ` Talleres: ${nombresTalleres.join(', ')}.` : '') +
        (modificados.length ? ` Datos modificados: ${modificados.join(', ')}.` : ' Sin cambios en los datos.'),
    });

    await connection.commit();

    await actualizarEstadoAlumno(vigente.cdAlumno);
    await sincronizarInscripcionesDeAlumno(vigente.cdAlumno);

    return { ok: true, talleres: nombresTalleres };
  } catch (error) {
    try {
      await connection.rollback();
    } catch {
      // Sin transacción abierta
    }
    throw error;
  } finally {
    connection.release();
  }
}
