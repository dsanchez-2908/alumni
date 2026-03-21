-- =============================================
-- Script para agregar campo cdFalta a TD_NOVEDADES_ALUMNO
-- Fecha: 2026-03-21
-- Descripción: Agrega campo para relacionar novedades con faltas específicas
-- =============================================

-- Verificar que la tabla existe
SELECT 'Verificando tabla TD_NOVEDADES_ALUMNO...' as status;

-- Agregar la columna cdFalta (NULL permitido para compatibilidad con novedades generales)
ALTER TABLE TD_NOVEDADES_ALUMNO 
ADD COLUMN cdFalta INT NULL 
COMMENT 'Relación opcional con una falta específica'
AFTER cdAlumno;

-- Agregar índice para mejorar rendimiento
ALTER TABLE TD_NOVEDADES_ALUMNO 
ADD KEY idx_falta (cdFalta);

-- Agregar foreign key constraint
-- ON DELETE SET NULL mantiene la novedad aunque se elimine la falta
ALTER TABLE TD_NOVEDADES_ALUMNO 
ADD CONSTRAINT td_novedades_alumno_ibfk_4 
FOREIGN KEY (cdFalta) REFERENCES TD_ASISTENCIAS(cdFalta) 
ON DELETE SET NULL;

-- Verificar que la columna se agregó correctamente
SELECT 'Verificando que la columna cdFalta se agregó correctamente...' as status;
DESCRIBE TD_NOVEDADES_ALUMNO;

-- Mostrar estadísticas
SELECT 
    COUNT(*) as total_novedades,
    SUM(CASE WHEN cdFalta IS NULL THEN 1 ELSE 0 END) as novedades_generales,
    SUM(CASE WHEN cdFalta IS NOT NULL THEN 1 ELSE 0 END) as novedades_asociadas_faltas
FROM TD_NOVEDADES_ALUMNO;

SELECT '✓ Script ejecutado correctamente' as status;

-- Notas importantes:
-- 1. cdFalta es NULL para novedades generales del alumno (no asociadas a una falta)
-- 2. cdFalta tiene valor cuando la novedad está relacionada con una falta específica
-- 3. Las novedades existentes se mantienen con cdFalta = NULL (compatibilidad hacia atrás)
-- 4. Si se elimina una falta (TD_ASISTENCIAS), el cdFalta se establece en NULL automáticamente
