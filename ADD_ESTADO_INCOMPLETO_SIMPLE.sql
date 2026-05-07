-- =====================================================
-- SCRIPT: Agregar Estado "Incompleto"
-- FECHA: 2026-05-07
-- DESCRIPCIÓN: Agrega el estado cdEstado=5 "Incompleto"
--              para gestionar talleres dados de baja
-- =====================================================

-- Paso 1: Verificar estados existentes
SELECT * FROM TD_ESTADOS ORDER BY cdEstado;

-- Paso 2: Insertar estado "Incompleto" si no existe
INSERT INTO TD_ESTADOS (cdEstado, dsEstado, dsDescripcion) 
SELECT 5, 'Incompleto', 'Alumno dado de baja antes de finalizar el taller'
WHERE NOT EXISTS (SELECT 1 FROM TD_ESTADOS WHERE cdEstado = 5);

-- Paso 3: Actualizar registros existentes con feBaja a estado Incompleto
UPDATE TR_ALUMNO_TALLER 
SET cdEstado = 5 
WHERE cdEstado = 2 
  AND feBaja IS NOT NULL 
  AND feFinalizacion IS NULL;

-- Paso 4: Verificar que se creó correctamente
SELECT 
  cdEstado,
  dsEstado,
  dsDescripcion
FROM TD_ESTADOS 
WHERE cdEstado = 5;

-- Paso 5: Verificar registros actualizados
SELECT COUNT(*) as total_incompletos
FROM TR_ALUMNO_TALLER
WHERE cdEstado = 5;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
