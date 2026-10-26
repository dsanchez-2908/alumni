// Constantes de los estados del seguimiento de inscripciones (sin dependencias de servidor: se usan también en el front)

export const ESTADO_INSCRIPCION = {
  PENDIENTE_PAGO: 1,
  PENDIENTE_ENVIAR_FORMULARIO: 2,
  PENDIENTE_COMPLETAR_FORMULARIO: 3,
  PENDIENTE_INSCRIPCION: 4,
  INSCRIPTO: 5,
} as const;

export const ETIQUETA_ESTADO_INSCRIPCION: Record<number, string> = {
  1: 'Pendiente pagar Inscripción',
  2: 'Pendiente de Enviar Formulario',
  3: 'Pendiente de Completar Formulario',
  4: 'Pendiente de Inscripción',
  5: 'Inscripto',
};

// El pago y la inscripción a un taller son automáticos; el usuario solo mueve los pasos del formulario
export const ESTADOS_MANUALES = [2, 3, 4];
