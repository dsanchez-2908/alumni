-- =============================================
-- MIGRACIÓN: Actualizar BD Railway al schema correcto
-- Fecha: 2026-02-19
-- Descripción: Agrega tablas y columnas faltantes
-- =============================================

-- IMPORTANTE: Ejecutar este script SOLO si ya tienes datos en Railway
-- Si la BD está vacía, mejor usar schema-corrected.sql completo

-- =============================================
-- 1. Agregar columna faltante en td_asistencias
-- =============================================
ALTER TABLE `TD_ASISTENCIAS` 
ADD COLUMN `snContactado` TINYINT(1) DEFAULT 0 AFTER `dsObservacion`;

-- =============================================
-- 2. Agregar columnas faltantes en td_grupos_familiares
-- =============================================
ALTER TABLE `TD_GRUPOS_FAMILIARES` 
ADD COLUMN `dsTelefonoContacto` VARCHAR(50) DEFAULT NULL AFTER `dsNombreGrupo`,
ADD COLUMN `dsParentesco1` VARCHAR(50) DEFAULT NULL AFTER `dsTelefonoContacto`,
ADD COLUMN `dsMailContacto` VARCHAR(255) DEFAULT NULL AFTER `dsParentesco1`,
ADD COLUMN `dsTelefonoContacto2` VARCHAR(50) DEFAULT NULL AFTER `dsMailContacto`,
ADD COLUMN `dsParentesco2` VARCHAR(50) DEFAULT NULL AFTER `dsTelefonoContacto2`,
ADD COLUMN `dsMailContacto2` VARCHAR(100) DEFAULT NULL AFTER `dsParentesco2`,
ADD COLUMN `dsDomicilioFamiliar` VARCHAR(500) DEFAULT NULL AFTER `dsMailContacto2`;

-- =============================================
-- 3. Agregar columnas faltantes en td_pagos_detalle
-- =============================================
ALTER TABLE `TD_PAGOS_DETALLE` 
ADD COLUMN `dsTipoPago` ENUM('Efectivo', 'Transferencia', 'Excepcion') NOT NULL DEFAULT 'Efectivo' AFTER `nuMonto`,
ADD COLUMN `snEsExcepcion` TINYINT(1) DEFAULT 0 AFTER `dsTipoPago`;

-- =============================================
-- 4. Modificar ENUM en td_pagos para incluir 'Excepcion'
-- =============================================
ALTER TABLE `TD_PAGOS` 
MODIFY COLUMN `dsTipoPago` ENUM('Efectivo', 'Transferencia', 'Excepcion') NOT NULL DEFAULT 'Efectivo';

-- =============================================
-- 5. Crear tabla tr_inscripcion_alumno (si no existe)
-- =============================================
CREATE TABLE IF NOT EXISTS `TR_INSCRIPCION_ALUMNO` (
  `cdInscripcion` INT NOT NULL AUTO_INCREMENT,
  `cdAlumno` INT NOT NULL,
  `cdTaller` INT NOT NULL,
  `feInscripcion` DATE NOT NULL,
  `cdEstado` INT DEFAULT 1,
  `feCreacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `feActualizacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdInscripcion`),
  UNIQUE KEY `UK_Alumno_Taller` (`cdAlumno`, `cdTaller`, `cdEstado`),
  KEY `cdTaller` (`cdTaller`),
  CONSTRAINT `tr_inscripcion_alumno_ibfk_1` FOREIGN KEY (`cdAlumno`) REFERENCES `TD_ALUMNOS` (`cdAlumno`) ON DELETE CASCADE,
  CONSTRAINT `tr_inscripcion_alumno_ibfk_2` FOREIGN KEY (`cdTaller`) REFERENCES `TD_TALLERES` (`cdTaller`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 6. Crear tabla td_precios (legacy) (si no existe)
-- =============================================
CREATE TABLE IF NOT EXISTS `TD_PRECIOS` (
  `cdPrecio` INT NOT NULL AUTO_INCREMENT,
  `fePrecio` DATE NOT NULL,
  `cdTipoTaller` INT NOT NULL,
  `nuPrecioEfectivo1Taller` DECIMAL(10,2) NOT NULL,
  `nuPrecioTransferencia1Taller` DECIMAL(10,2) NOT NULL,
  `nuPrecioEfectivo2Taller` DECIMAL(10,2) NOT NULL,
  `nuPrecioTransferencia2Taller` DECIMAL(10,2) NOT NULL,
  `nuPrecioEfectivo3Taller` DECIMAL(10,2) NOT NULL,
  `nuPrecioTransferencia3Taller` DECIMAL(10,2) NOT NULL,
  `nuPrecioEfectivo4Taller` DECIMAL(10,2) NOT NULL,
  `nuPrecioTransferencia4Taller` DECIMAL(10,2) NOT NULL,
  `nuPrecioEfectivo5Taller` DECIMAL(10,2) NOT NULL,
  `nuPrecioTransferencia5Taller` DECIMAL(10,2) NOT NULL,
  `feCreacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdPrecio`),
  KEY `cdTipoTaller` (`cdTipoTaller`),
  KEY `IDX_Precio_Fecha` (`fePrecio`, `cdTipoTaller`),
  CONSTRAINT `td_precios_ibfk_1` FOREIGN KEY (`cdTipoTaller`) REFERENCES `TD_TIPO_TALLERES` (`cdTipoTaller`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- OPCIONAL: Eliminar columnas que NO EXISTEN en la BD de desarrollo
-- Descomentar SOLO si estas columnas existen en Railway y causan problemas
-- =============================================

-- Verificar primero si estas columnas existen antes de descomentar:
-- SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'td_novedades_alumno' AND COLUMN_NAME = 'feModificacion';

-- ALTER TABLE `TD_NOVEDADES_ALUMNO` DROP COLUMN IF EXISTS `feModificacion`;

-- Verificar primero si esta columna existe:
-- SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'td_precios_talleres' AND COLUMN_NAME = 'feModificacion';

-- ALTER TABLE `TD_PRECIOS_TALLERES` DROP COLUMN IF EXISTS `feModificacion`;

-- =============================================
-- FIN DE MIGRACIÓN
-- =============================================

-- Verificar que todo se creó correctamente:
SELECT 'VERIFICACIÓN DE TABLAS' AS '';
SELECT COUNT(*) AS total_tablas FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'alumni';

SELECT 'Debería mostrar 22 tablas' AS '';
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'alumni' ORDER BY TABLE_NAME;
