import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { cargarFormularioVigente } from '@/lib/formulario-inscripcion';
import { respuestaFormulario, respuestaLinkInvalido } from '@/lib/formulario-http';

// GET - Valida el link (sin datos del alumno). Devuelve solo el año y el mensaje configurado.
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const formulario = await cargarFormularioVigente(pool, params.token);
    if (!formulario) return respuestaLinkInvalido();

    return respuestaFormulario({
      valido: true,
      nuAnio: formulario.nuAnio,
      mensaje: formulario.mensaje,
    });
  } catch (error) {
    console.error('Error al validar el link del formulario:', error);
    return respuestaFormulario({ error: 'No se pudo procesar la solicitud. Intente nuevamente.' }, 500);
  }
}
