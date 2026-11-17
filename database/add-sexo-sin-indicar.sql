-- =============================================
-- ALUMNOS - SEXO OPCIONAL
-- Agrega el valor 'Sin Indicar' al sexo y quita la obligatoriedad (NOT NULL) de la columna.
-- Los alumnos existentes conservan su valor. Se puede ejecutar más de una vez sin problema.
-- =============================================
ALTER TABLE `TD_ALUMNOS`
  MODIFY COLUMN `dsSexo` ENUM('Masculino', 'Femenino', 'Sin Indicar') NULL DEFAULT 'Sin Indicar';
