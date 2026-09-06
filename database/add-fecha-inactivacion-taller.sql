-- =============================================
-- Script: agregar columna feInactivacion a TD_TALLERES
-- Fecha: 2026-09-06
-- Objetivo: registrar cuándo un taller pasó a estado Inactivo,
--           para poder mostrarlo en el detalle de taller y acotar
--           correctamente el cálculo de asistencias/cuotas pendientes.
-- =============================================

USE alumni;

-- Agregar la columna solo si todavía no existe (idempotente, se puede ejecutar más de una vez)
SET @columna_existe = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'alumni'
    AND TABLE_NAME = 'TD_TALLERES'
    AND COLUMN_NAME = 'feInactivacion'
);

SET @sql = IF(
  @columna_existe = 0,
  'ALTER TABLE TD_TALLERES ADD COLUMN feInactivacion TIMESTAMP NULL DEFAULT NULL AFTER cdEstado',
  'SELECT ''La columna feInactivacion ya existe, no se modifica la tabla'' as info'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Completar el dato para talleres que YA están Inactivos hoy, usando feModificacion
-- como mejor estimación disponible (no hay forma de saber la fecha exacta retroactivamente)
UPDATE TD_TALLERES
SET feInactivacion = feModificacion
WHERE cdEstado = 2
  AND feInactivacion IS NULL;

-- Verificación final
SHOW COLUMNS FROM TD_TALLERES LIKE 'feInactivacion';
SELECT cdTaller, cdEstado, feInactivacion, feModificacion
FROM TD_TALLERES
WHERE cdEstado = 2;

-- =============================================
-- FIN DEL SCRIPT
-- =============================================
