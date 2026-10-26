// Reglas compartidas (cliente y servidor) de los campos adicionales del alumno.

export const TURNOS_ESCUELA = ['Mañana', 'Tarde', 'Jornada completa'] as const;
export const EDAD_MAYORIA = 18;

/** Edad en años cumplidos a hoy para una fecha 'YYYY-MM-DD' (null si la fecha no es válida). */
export function calcularEdad(feNacimiento: string | null | undefined, hoy: Date = new Date()): number | null {
  const coincide = /^(\d{4})-(\d{2})-(\d{2})/.exec(feNacimiento || '');
  if (!coincide) return null;
  const [anio, mes, dia] = [Number(coincide[1]), Number(coincide[2]), Number(coincide[3])];

  let edad = hoy.getFullYear() - anio;
  const yaCumplio =
    hoy.getMonth() + 1 > mes || (hoy.getMonth() + 1 === mes && hoy.getDate() >= dia);
  if (!yaCumplio) edad -= 1;
  return edad;
}

/** Sin fecha de nacimiento válida se asume adulto (el formulario exige la fecha por separado). */
export function esMenorDeEdad(feNacimiento: string | null | undefined, hoy: Date = new Date()): boolean {
  const edad = calcularEdad(feNacimiento, hoy);
  return edad !== null && edad < EDAD_MAYORIA;
}

export interface CamposAdicionales {
  dsCiudad: string | null;
  dsComoNosConocio: string | null;
  dsEscuela: string | null;
  dsTurnoEscuela: string | null;
  snPermisoUsoImagen: 'SI' | 'NO' | null;
  snPermisoRetiroSolo: 'SI' | 'NO' | null;
}

const texto = (valor: unknown, max: number): string | null => {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  return limpio ? limpio.slice(0, max) : null;
};

const siNo = (valor: unknown): 'SI' | 'NO' | null => (valor === 'SI' || valor === 'NO' ? valor : null);

/**
 * Normaliza y valida los campos adicionales.
 * - Permiso de Uso de Imagen: obligatorio siempre.
 * - Permiso de Retiro Solo, Escuela y Turno: aplican solo a menores (el retiro es obligatorio); en adultos se descartan.
 */
export function validarCamposAdicionales(
  datos: Record<string, any>,
  feNacimiento: string | null | undefined
): { valores: CamposAdicionales; error?: string } {
  const menor = esMenorDeEdad(feNacimiento);

  const valores: CamposAdicionales = {
    dsCiudad: texto(datos.dsCiudad, 100),
    dsComoNosConocio: texto(datos.dsComoNosConocio, 255),
    dsEscuela: menor ? texto(datos.dsEscuela, 150) : null,
    dsTurnoEscuela: null,
    snPermisoUsoImagen: siNo(datos.snPermisoUsoImagen),
    snPermisoRetiroSolo: menor ? siNo(datos.snPermisoRetiroSolo) : null,
  };

  if (menor && datos.dsTurnoEscuela) {
    if (!(TURNOS_ESCUELA as readonly string[]).includes(datos.dsTurnoEscuela)) {
      return { valores, error: 'El turno de la escuela no es válido' };
    }
    valores.dsTurnoEscuela = datos.dsTurnoEscuela;
  }

  if (!valores.snPermisoUsoImagen) {
    return { valores, error: 'El Permiso de Uso de Imagen es obligatorio (SI/NO)' };
  }
  if (menor && !valores.snPermisoRetiroSolo) {
    return { valores, error: 'El Permiso de Retiro Solo es obligatorio para menores de edad (SI/NO)' };
  }

  return { valores };
}
