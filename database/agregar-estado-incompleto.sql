-- =====================================================
-- Script para agregar estado "Incompleto" para talleres
-- =====================================================
-- Fecha: 2026-05-07
-- Descripción: Agrega un nuevo estado "Incompleto" para TR_ALUMNO_TALLER
--              que se usa cuando un alumno se da de baja de un taller
--              antes de finalizarlo.
-- =====================================================

-- Paso 1: Verificar si el estado "Incompleto" ya existe
SELECT * FROM TD_ESTADOS WHERE dsEstado = 'Incompleto';

-- Paso 2: Insertar el nuevo estado "Incompleto" (cdEstado = 5)
-- Solo se inserta si no existe
INSERT INTO TD_ESTADOS (cdEstado, dsEstado, dsDescripcion)
SELECT 5, 'Incompleto', 'Alumno dado de baja antes de finalizar el taller'
WHERE NOT EXISTS (SELECT 1 FROM TD_ESTADOS WHERE dsEstado = 'Incompleto');

-- Paso 3: Verificar la inserción
SELECT cdEstado, dsEstado, dsDescripcion 
FROM TD_ESTADOS 
WHERE dsEstado = 'Incompleto';

-- Paso 4: Actualizar registros existentes
-- Los alumnos que fueron dados de baja (cdEstado = 2 y tienen feBaja)
-- deben pasar al estado "Incompleto" (cdEstado = 5)
UPDATE TR_ALUMNO_TALLER
SET cdEstado = 5
WHERE cdEstado = 2 
  AND feBaja IS NOT NULL
  AND feFinalizacion IS NULL;

-- Paso 5: Verificar cuántos registros fueron actualizados
SELECT 
    'Talleres Incompletos creados' as tipo,
    COUNT(*) as cantidad
FROM TR_ALUMNO_TALLER
WHERE cdEstado = 5;

-- Paso 6: Mostrar resumen de estados en TR_ALUMNO_TALLER
SELECT 
    e.dsEstado,
    COUNT(*) as cantidad
FROM TR_ALUMNO_TALLER at
INNER JOIN TD_ESTADOS e ON at.cdEstado = e.cdEstado
GROUP BY e.dsEstado
ORDER BY at.cdEstado;

-- Paso 7: Verificar alumnos con talleres incompletos y sus datos
SELECT 
    a.cdAlumno,
    CONCAT(a.dsNombre, ' ', a.dsApellido) as alumno,
    tt.dsNombreTaller,
    t.nuAnioTaller,
    at.feInscripcion,
    at.feBaja,
    e.dsEstado as estadoTaller
FROM TR_ALUMNO_TALLER at
INNER JOIN TD_ALUMNOS a ON at.cdAlumno = a.cdAlumno
INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
INNER JOIN TD_ESTADOS e ON at.cdEstado = e.cdEstado
WHERE at.cdEstado = 5
ORDER BY a.dsApellido, a.dsNombre, at.feBaja DESC
LIMIT 50;

-- =====================================================
-- VERIFICACIONES ADICIONALES
-- =====================================================

-- Verificar que no haya inconsistencias:
-- (Registros con feBaja pero sin estado Incompleto o Finalizado)
SELECT 
    at.id,
    a.cdAlumno,
    CONCAT(a.dsNombre, ' ', a.dsApellido) as alumno,
    tt.dsNombreTaller,
    at.feBaja,
    e.dsEstado
FROM TR_ALUMNO_TALLER at
INNER JOIN TD_ALUMNOS a ON at.cdAlumno = a.cdAlumno
INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
INNER JOIN TD_ESTADOS e ON at.cdEstado = e.cdEstado
WHERE at.feBaja IS NOT NULL 
  AND at.cdEstado NOT IN (4, 5);  -- Debería ser Finalizado o Incompleto

-- Si el query anterior devuelve filas, hay inconsistencias que corregir

-- =====================================================
-- NOTAS IMPORTANTES
-- =====================================================
-- Estados en TR_ALUMNO_TALLER:
-- 1 = Activo (alumno actualmente inscrito en el taller)
-- 2 = Inactivo (ya no se usa para este propósito)
-- 4 = Finalizado (el taller finalizó con el alumno inscrito)
-- 5 = Incompleto (alumno se dio de baja antes de finalizar)
-- =====================================================
