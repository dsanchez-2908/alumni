-- =============================================
-- Script para agregar campo snAviso a TD_ASISTENCIAS
-- Fecha: 2026-03-21
-- Descripción: Agrega campo para indicar si el alumno avisó antes de faltar
-- =============================================

-- Verificar que la tabla existe
SELECT 'Verificando tabla TD_ASISTENCIAS...' as status;

-- Agregar la columna snAviso (0 = NO avisó, 1 = SI avisó)
-- Default 0 (NO) para registros nuevos
-- Los registros existentes también quedarán con valor 0 (NO avisó)
ALTER TABLE TD_ASISTENCIAS 
ADD COLUMN snAviso TINYINT(1) NOT NULL DEFAULT 0 
COMMENT '0=No avisó, 1=Avisó antes de faltar'
AFTER dsObservacion;

-- Verificar que la columna se agregó correctamente
SELECT 'Verificando que la columna snAviso se agregó correctamente...' as status;
DESCRIBE TD_ASISTENCIAS;

-- Mostrar cantidad de registros actualizados
SELECT 
    COUNT(*) as total_registros,
    SUM(CASE WHEN snAviso = 0 THEN 1 ELSE 0 END) as sin_aviso,
    SUM(CASE WHEN snAviso = 1 THEN 1 ELSE 0 END) as con_aviso
FROM TD_ASISTENCIAS;

SELECT '✓ Script ejecutado correctamente' as status;
