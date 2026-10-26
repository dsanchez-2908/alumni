-- =============================================
-- Campos adicionales de alumno: ciudad, como nos conocieron, datos de escuela y permisos.
-- Todos admiten NULL: los alumnos existentes quedan sin dato y se completan al editarlos
-- o desde el formulario digital de inscripcion.
-- Ejecutar UNA sola vez (o usar scripts/add-alumno-campos-adicionales.js, que verifica si cada columna existe).
-- =============================================
ALTER TABLE `TD_ALUMNOS`
  ADD COLUMN `dsCiudad` VARCHAR(100) NULL DEFAULT NULL AFTER `dsDomicilio`,
  ADD COLUMN `dsComoNosConocio` VARCHAR(255) NULL DEFAULT NULL,
  ADD COLUMN `dsEscuela` VARCHAR(150) NULL DEFAULT NULL COMMENT 'Solo menores de edad',
  ADD COLUMN `dsTurnoEscuela` VARCHAR(20) NULL DEFAULT NULL COMMENT 'Manana, Tarde o Jornada completa (solo menores de edad)',
  ADD COLUMN `snPermisoUsoImagen` ENUM('SI', 'NO') NULL DEFAULT NULL COMMENT 'Obligatorio',
  ADD COLUMN `snPermisoRetiroSolo` ENUM('SI', 'NO') NULL DEFAULT NULL COMMENT 'Obligatorio solo para menores de edad';
