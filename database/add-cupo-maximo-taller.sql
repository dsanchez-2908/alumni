-- =============================================
-- Cantidad máxima de alumnos por taller.
-- NULL = sin límite (valor que toman los talleres existentes).
-- Cambio aditivo: no modifica datos existentes.
-- Ejecutar UNA sola vez (o usar scripts/add-cupo-maximo-taller.js, que verifica si la columna existe).
-- =============================================
ALTER TABLE `TD_TALLERES`
  ADD COLUMN `nuCupoMaximo` INT NULL DEFAULT NULL COMMENT 'Cantidad máxima de alumnos (NULL = sin límite)' AFTER `feInicioTaller`;
