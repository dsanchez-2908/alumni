import { NextRequest } from 'next/server';
import { enviarFormulario } from '@/lib/formulario-inscripcion';
import { leerCuerpo, respuestaFormulario } from '@/lib/formulario-http';

// POST - Completa el formulario (datos + talleres). El link queda inutilizable una vez completado.
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const cuerpo = await leerCuerpo(request);
    if (!cuerpo) return respuestaFormulario({ error: 'Solicitud inválida' }, 400);

    const resultado = await enviarFormulario({
      token: params.token,
      dni: cuerpo.dni,
      datos: cuerpo.datos,
      talleres: cuerpo.talleres,
    });

    if (!resultado.ok) {
      return respuestaFormulario(
        { error: resultado.error, bloqueado: resultado.bloqueado, restantes: resultado.restantes },
        resultado.status
      );
    }

    return respuestaFormulario({ message: 'Formulario completado', talleres: resultado.talleres });
  } catch (error) {
    console.error('Error al enviar el formulario:', error);
    return respuestaFormulario({ error: 'No se pudo procesar la solicitud. Intente nuevamente.' }, 500);
  }
}
