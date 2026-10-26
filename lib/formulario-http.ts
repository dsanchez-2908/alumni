import { NextResponse } from 'next/server';

// Cabeceras de las respuestas del formulario público: nunca se cachean ni se indexan
export const CABECERAS_FORMULARIO = {
  'Cache-Control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
};

const MAX_BYTES = 100 * 1024;

export const respuestaFormulario = (cuerpo: unknown, status = 200) =>
  NextResponse.json(cuerpo, { status, headers: CABECERAS_FORMULARIO });

/** Mismo mensaje para un link inexistente, vencido, usado, anulado o bloqueado: no se revela cuál es el caso. */
export const respuestaLinkInvalido = () =>
  respuestaFormulario({ error: 'El link no es válido o ya fue utilizado.' }, 404);

/** Lee el cuerpo JSON rechazando pedidos desmedidos. Devuelve null si es inválido. */
export async function leerCuerpo(request: Request): Promise<Record<string, any> | null> {
  const largo = Number(request.headers.get('content-length') || 0);
  if (largo > MAX_BYTES) return null;
  try {
    const texto = await request.text();
    if (texto.length > MAX_BYTES) return null;
    const cuerpo = JSON.parse(texto);
    return cuerpo && typeof cuerpo === 'object' && !Array.isArray(cuerpo) ? cuerpo : null;
  } catch {
    return null;
  }
}
