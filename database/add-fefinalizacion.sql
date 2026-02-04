-- =============================================
-- Script para agregar columna feFinalizacion a TR_ALUMNO_TALLER
-- Fecha: 2026-02-04
-- =============================================

USE alumni;

-- Verificar si la columna ya existe
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'alumni' 
  AND TABLE_NAME = 'TR_ALUMNO_TALLER' 
  AND COLUMN_NAME = 'feFinalizacion';

-- Si no existe, agregarla
ALTER TABLE TR_ALUMNO_TALLER 
ADD COLUMN feFinalizacion TIMESTAMP NULL AFTER feBaja;

-- Verificar que se agregó correctamente
SHOW COLUMNS FROM TR_ALUMNO_TALLER;

-- =============================================
-- FIN DEL SCRIPT
-- =============================================
