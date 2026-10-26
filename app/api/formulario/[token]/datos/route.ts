import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import {
  cargarFormularioVigente,
  getDatosAlumno,
  getTalleresFormulario,
  verificarDni,
} from '@/lib/formulario-inscripcion';
import { leerCuerpo, respuestaFormulario, respuestaLinkInvalido } from '@/lib/formulario-http';

// POST - Con el DNI correcto devuelve los datos del alumno y los talleres disponibles
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const cuerpo = await leerCuerpo(request);
    if (!cuerpo) return respuestaFormulario({ error: 'Solicitud inválida' }, 400);

    const formulario = await cargarFormularioVigente(pool, params.token);
    if (!formulario) return respuestaLinkInvalido();

    const dni = await verificarDni(pool, formulario, cuerpo.dni);
    if (!dni.ok) {
      if (dni.invalido) return respuestaLinkInvalido();
      return respuestaFormulario(
        {
          error: dni.bloqueado
            ? 'Superaste el número de intentos permitidos. Pedí un nuevo link a Índigo.'
            : 'El DNI ingresado no coincide.',
          bloqueado: dni.bloqueado,
          restantes: dni.restantes,
        },
        403
      );
    }

    const [alumno, talleres] = await Promise.all([
      getDatosAlumno(pool, formulario.cdAlumno),
      getTalleresFormulario(pool, formulario.cdAlumno, formulario.nuAnio),
    ]);
    if (!alumno) return respuestaLinkInvalido();

    return respuestaFormulario({
      nuAnio: formulario.nuAnio,
      mensaje: formulario.mensaje,
      alumno,
      talleres,
    });
  } catch (error) {
    console.error('Error al obtener los datos del formulario:', error);
    return respuestaFormulario({ error: 'No se pudo procesar la solicitud. Intente nuevamente.' }, 500);
  }
}
