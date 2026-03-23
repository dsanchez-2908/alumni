-- =============================================
-- Script para actualizar proceso TD_NOVEDADES_ALUMNO en TD_TRAZA
-- Fecha: 2026-03-23
-- Descripción: Actualiza nombre de proceso a nombre legible
-- =============================================

-- Verificar registros antes de la actualización
SELECT 'Antes de la actualización:' as status;
SELECT dsProceso, COUNT(*) as cantidad
FROM TD_TRAZA
WHERE dsProceso = 'TD_NOVEDADES_ALUMNO'
GROUP BY dsProceso;

-- Actualizar TD_NOVEDADES_ALUMNO -> Novedades de Alumnos
UPDATE TD_TRAZA 
SET dsProceso = 'Novedades de Alumnos'
WHERE dsProceso = 'TD_NOVEDADES_ALUMNO';

SELECT CONCAT('✓ Actualizados ', ROW_COUNT(), ' registros de TD_NOVEDADES_ALUMNO a Novedades de Alumnos') as status;

-- Verificar registros después de la actualización
SELECT 'Después de la actualización:' as status;
SELECT dsProceso, COUNT(*) as cantidad
FROM TD_TRAZA
WHERE dsProceso = 'Novedades de Alumnos'
GROUP BY dsProceso;

SELECT '✓ Script ejecutado correctamente' as status;
