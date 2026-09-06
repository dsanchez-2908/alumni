// Utilidades para trabajar con fechas 'YYYY-MM-DD' sin corrimientos por zona horaria.
//
// `new Date('YYYY-MM-DD')` se interpreta como medianoche UTC (spec de ECMAScript).
// Si el servidor corre en una zona horaria detrás de UTC (ej. Argentina, UTC-3),
// los getters locales (getDay, getDate, getMonth, etc.) devuelven el día ANTERIOR,
// lo que corrompe cálculos de día de la semana y, en el caso de fechas "1 de mes",
// también el mes/año. Esto hace que el comportamiento cambie según el huso horario
// del entorno (dev vs. producción).
//
// Parsear al mediodía UTC evita el problema: el desfase de cualquier huso horario
// real (-12 a +14) nunca cruza al día anterior o siguiente respecto del mediodía.

export function parseFechaLocal(fecha: string): Date {
  const soloFecha = fecha.split('T')[0];
  const date = new Date(`${soloFecha}T12:00:00Z`);
  date.setHours(0, 0, 0, 0);
  return date;
}
