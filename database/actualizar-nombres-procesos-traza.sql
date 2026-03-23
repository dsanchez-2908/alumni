-- =============================================
-- Script para actualizar nombres de procesos en TD_TRAZA
-- Fecha: 2026-03-23
-- Descripción: Actualiza nombres de procesos antiguos a nuevos nombres legibles
-- =============================================

-- Verificar registros antes de la actualización
SELECT 'Antes de la actualización:' as status;
SELECT dsProceso, COUNT(*) as cantidad
FROM TD_TRAZA
GROUP BY dsProceso
ORDER BY dsProceso;

-- Actualizar TD_ALUMNOS -> Alumnos
UPDATE TD_TRAZA 
SET dsProceso = 'Alumnos'
WHERE dsProceso = 'TD_ALUMNOS';

SELECT CONCAT('✓ Actualizados ', ROW_COUNT(), ' registros de TD_ALUMNOS a Alumnos') as status;

-- Actualizar TD_GRUPOS_FAMILIARES -> Grupos Familiares
UPDATE TD_TRAZA 
SET dsProceso = 'Grupos Familiares'
WHERE dsProceso = 'TD_GRUPOS_FAMILIARES';

SELECT CONCAT('✓ Actualizados ', ROW_COUNT(), ' registros de TD_GRUPOS_FAMILIARES a Grupos Familiares') as status;

-- Verificar registros después de la actualización
SELECT 'Después de la actualización:' as status;
SELECT dsProceso, COUNT(*) as cantidad
FROM TD_TRAZA
GROUP BY dsProceso
ORDER BY dsProceso;

SELECT '✓ Script ejecutado correctamente' as status;

-- Notas:
-- 1. Este script actualiza TODOS los registros históricos con los nombres antiguos
-- 2. Los nuevos registros ya se guardan con los nombres correctos
-- 3. No afecta otros procesos que ya tienen nombres correctos
