-- =============================================
-- Script de corrección de precios duplicados
-- Fecha: 2026-02-10
-- Descripción: Elimina registros duplicados de TD_PRECIOS_TALLERES
--              y agrega constraint UNIQUE para prevenir futuros duplicados
-- =============================================

USE alumni;

-- =============================================
-- PASO 1: Identificar y reportar duplicados
-- =============================================
SELECT 
    COUNT(*) as total_duplicados
FROM (
    SELECT 
        cdTipoTaller,
        DATE(feInicioVigencia) as fecha,
        COUNT(*) as cantidad
    FROM TD_PRECIOS_TALLERES
    WHERE cdEstado = 1
    GROUP BY cdTipoTaller, DATE(feInicioVigencia)
    HAVING COUNT(*) > 1
) as duplicados;

-- Ver detalle de duplicados
SELECT 
    p.cdPrecio,
    p.cdTipoTaller,
    tt.dsNombreTaller,
    DATE_FORMAT(p.feInicioVigencia, '%Y-%m-%d') as feInicioVigencia,
    DATE_FORMAT(p.feAlta, '%Y-%m-%d %H:%i:%s') as feAlta,
    p.nuPrecioCompletoEfectivo,
    u.dsNombreCompleto as usuarioAlta
FROM TD_PRECIOS_TALLERES p
INNER JOIN TD_TIPO_TALLERES tt ON p.cdTipoTaller = tt.cdTipoTaller
LEFT JOIN TD_USUARIOS u ON p.cdUsuarioAlta = u.cdUsuario
WHERE p.cdEstado = 1
    AND (p.cdTipoTaller, DATE(p.feInicioVigencia)) IN (
        SELECT cdTipoTaller, DATE(feInicioVigencia)
        FROM TD_PRECIOS_TALLERES
        WHERE cdEstado = 1
        GROUP BY cdTipoTaller, DATE(feInicioVigencia)
        HAVING COUNT(*) > 1
    )
ORDER BY p.cdTipoTaller, p.feInicioVigencia, p.feAlta;

-- =============================================
-- PASO 2: Eliminar duplicados (mantener el más reciente)
-- =============================================
-- Primero, crear tabla temporal con los IDs a conservar (los más recientes)
CREATE TEMPORARY TABLE temp_precios_conservar AS
SELECT 
    cdTipoTaller,
    DATE(feInicioVigencia) as fecha,
    MAX(cdPrecio) as cdPrecioConservar  -- Mantener el más reciente (mayor ID)
FROM TD_PRECIOS_TALLERES
WHERE cdEstado = 1
GROUP BY cdTipoTaller, DATE(feInicioVigencia);

-- Mostrar cuántos registros se van a eliminar
SELECT 
    COUNT(*) as registros_a_eliminar
FROM TD_PRECIOS_TALLERES p
WHERE p.cdEstado = 1
    AND NOT EXISTS (
        SELECT 1 
        FROM temp_precios_conservar t
        WHERE t.cdTipoTaller = p.cdTipoTaller
            AND t.fecha = DATE(p.feInicioVigencia)
            AND t.cdPrecioConservar = p.cdPrecio
    );

-- IMPORTANTE: Descomentar la siguiente línea SOLO después de verificar los datos anteriores
-- DELETE FROM TD_PRECIOS_TALLERES
-- WHERE cdEstado = 1
--     AND NOT EXISTS (
--         SELECT 1 
--         FROM temp_precios_conservar t
--         WHERE t.cdTipoTaller = cdTipoTaller
--             AND t.fecha = DATE(feInicioVigencia)
--             AND t.cdPrecioConservar = cdPrecio
--     );

-- Limpiar tabla temporal
DROP TEMPORARY TABLE IF EXISTS temp_precios_conservar;

-- =============================================
-- PASO 3: Agregar constraint UNIQUE
-- =============================================
-- IMPORTANTE: Ejecutar solo después de eliminar duplicados
-- ALTER TABLE TD_PRECIOS_TALLERES
-- ADD CONSTRAINT UK_Precio_Taller_Vigencia 
-- UNIQUE KEY (cdTipoTaller, feInicioVigencia, cdEstado);

-- =============================================
-- PASO 4: Verificación final
-- =============================================
-- Verificar que no quedan duplicados
SELECT 
    cdTipoTaller,
    DATE(feInicioVigencia) as fecha,
    COUNT(*) as cantidad
FROM TD_PRECIOS_TALLERES
WHERE cdEstado = 1
GROUP BY cdTipoTaller, DATE(feInicioVigencia)
HAVING COUNT(*) > 1;

-- Debería devolver 0 registros si la limpieza fue exitosa

-- =============================================
-- FIN DEL SCRIPT
-- =============================================
