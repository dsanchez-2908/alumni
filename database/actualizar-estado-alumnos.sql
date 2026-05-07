-- =====================================================
-- Script para actualizar el estado de alumnos existentes
-- basándose en si están inscritos en talleres activos
-- =====================================================
-- Fecha: 2026-05-06
-- Descripción: Automatización del campo cdEstado en TD_ALUMNOS
--              - cdEstado = 1 (Activo): Si el alumno tiene al menos un taller activo
--              - cdEstado = 2 (Inactivo): Si el alumno NO tiene talleres activos
-- =====================================================

-- Paso 1: Marcar como INACTIVOS a todos los alumnos que NO tienen talleres activos
-- (Alumnos sin inscripciones activas o cuyo taller no está activo)
UPDATE TD_ALUMNOS
SET cdEstado = 2, feModificacion = NOW()
WHERE cdAlumno NOT IN (
    SELECT DISTINCT at.cdAlumno
    FROM TR_ALUMNO_TALLER at
    INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
    WHERE at.cdEstado = 1          -- Inscripción activa
      AND at.feBaja IS NULL         -- No ha sido dado de baja
      AND t.cdEstado = 1            -- Taller activo
)
AND cdEstado != 3;                  -- No modificar alumnos en estado 3 (Eliminado u otro)

-- Paso 2: Marcar como ACTIVOS a todos los alumnos que SÍ tienen al menos un taller activo
UPDATE TD_ALUMNOS
SET cdEstado = 1, feModificacion = NOW()
WHERE cdAlumno IN (
    SELECT DISTINCT at.cdAlumno
    FROM TR_ALUMNO_TALLER at
    INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
    WHERE at.cdEstado = 1          -- Inscripción activa
      AND at.feBaja IS NULL         -- No ha sido dado de baja
      AND t.cdEstado = 1            -- Taller activo
)
AND cdEstado != 1;                  -- Solo actualizar si no está ya en estado Activo

-- Verificar resultados
-- Contar alumnos activos (deberían tener talleres activos)
SELECT 
    'Alumnos ACTIVOS' as tipo,
    COUNT(*) as cantidad
FROM TD_ALUMNOS
WHERE cdEstado = 1;

-- Contar alumnos inactivos (NO deberían tener talleres activos)
SELECT 
    'Alumnos INACTIVOS' as tipo,
    COUNT(*) as cantidad
FROM TD_ALUMNOS
WHERE cdEstado = 2;

-- Verificar alumnos activos con sus talleres
SELECT 
    a.cdAlumno,
    CONCAT(a.dsNombre, ' ', a.dsApellido) as nombreCompleto,
    a.cdEstado,
    COUNT(DISTINCT at.cdTaller) as cantidadTalleresActivos
FROM TD_ALUMNOS a
LEFT JOIN TR_ALUMNO_TALLER at ON a.cdAlumno = at.cdAlumno 
    AND at.cdEstado = 1 
    AND at.feBaja IS NULL
LEFT JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller AND t.cdEstado = 1
WHERE a.cdEstado = 1
GROUP BY a.cdAlumno, a.dsNombre, a.dsApellido, a.cdEstado
HAVING cantidadTalleresActivos > 0;

-- Verificar si hay alumnos inactivos que tienen talleres activos (error)
SELECT 
    a.cdAlumno,
    CONCAT(a.dsNombre, ' ', a.dsApellido) as nombreCompleto,
    a.cdEstado,
    COUNT(DISTINCT at.cdTaller) as cantidadTalleresActivos
FROM TD_ALUMNOS a
INNER JOIN TR_ALUMNO_TALLER at ON a.cdAlumno = at.cdAlumno 
    AND at.cdEstado = 1 
    AND at.feBaja IS NULL
INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller AND t.cdEstado = 1
WHERE a.cdEstado = 2
GROUP BY a.cdAlumno, a.dsNombre, a.dsApellido, a.cdEstado;

-- Si el query anterior devuelve filas, hay inconsistencias que deben corregirse
