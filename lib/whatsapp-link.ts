/**
 * Genera un enlace para abrir WhatsApp Web con un mensaje prellenado
 * @param numeroTelefono - Número de teléfono en formato internacional o local
 * @param mensaje - Mensaje a enviar
 * @returns URL para abrir WhatsApp Web
 */
export function generarEnlaceWhatsApp(
  numeroTelefono: string,
  mensaje: string
): string {
  // Limpiar el número: remover espacios, guiones, paréntesis
  let numeroLimpio = numeroTelefono.replace(/\D/g, '');
  
  // Si el número no empieza con código de país, agregar 54 (Argentina)
  if (!numeroLimpio.startsWith('54')) {
    // Si empieza con 0, quitarlo
    if (numeroLimpio.startsWith('0')) {
      numeroLimpio = numeroLimpio.substring(1);
    }
    // Agregar código de país
    numeroLimpio = '54' + numeroLimpio;
  }
  
  // Si el número tiene 10 dígitos después del 54, agregar 9 (celular)
  // Formato: 54 + 9 + código área + número
  if (numeroLimpio.length === 12 && numeroLimpio.startsWith('54')) {
    const sinCodigoPais = numeroLimpio.substring(2);
    if (!sinCodigoPais.startsWith('9')) {
      numeroLimpio = '549' + sinCodigoPais;
    }
  }
  
  // Codificar el mensaje para URL
  const mensajeCodificado = encodeURIComponent(mensaje);
  
  // Retornar URL de WhatsApp Web
  return `https://wa.me/${numeroLimpio}?text=${mensajeCodificado}`;
}
