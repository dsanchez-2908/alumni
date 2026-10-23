-- =============================================
-- FASE 1 - INSCRIPCIONES
-- Script idempotente (CREATE TABLE IF NOT EXISTS). Solo agrega tablas nuevas,
-- no modifica ninguna tabla existente (seguro para producción).
-- =============================================

-- =============================================
-- TABLA: TD_PRECIOS_INSCRIPCIONES
-- Descripción: Historial de precios de inscripción por vigencia.
-- Una fila por vigencia con los 4 precios (no distingue efectivo/transferencia).
-- =============================================
CREATE TABLE IF NOT EXISTS `TD_PRECIOS_INSCRIPCIONES` (
  `cdPrecioInscripcion` INT NOT NULL AUTO_INCREMENT,
  `feAlta` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `cdUsuarioAlta` INT NOT NULL,
  `feInicioVigencia` DATE NOT NULL,
  `nuPrecioAlumnoActivo` DECIMAL(10,2) NOT NULL,
  `nuPrecioFamiliarActivo` DECIMAL(10,2) NOT NULL,
  `nuPrecioAlumnoNuevo` DECIMAL(10,2) NOT NULL,
  `nuPrecioFamiliarNuevo` DECIMAL(10,2) NOT NULL,
  `cdEstado` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`cdPrecioInscripcion`),
  UNIQUE KEY `UK_PrecioInscripcion_Vigencia` (`feInicioVigencia`, `cdEstado`),
  KEY `cdUsuarioAlta` (`cdUsuarioAlta`),
  KEY `cdEstado` (`cdEstado`),
  CONSTRAINT `td_precios_inscripciones_ibfk_1` FOREIGN KEY (`cdUsuarioAlta`) REFERENCES `TD_USUARIOS` (`cdUsuario`),
  CONSTRAINT `td_precios_inscripciones_ibfk_2` FOREIGN KEY (`cdEstado`) REFERENCES `TD_ESTADOS` (`cdEstado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_PAGOS_INSCRIPCIONES
-- Descripción: Pagos de inscripción. Una fila por alumno y año de inscripción.
-- cdComprobante agrupa los alumnos pagados en una misma operación (recibo).
-- dsTipoPrecio: ALUMNO_ACTIVO | FAMILIAR_ACTIVO | ALUMNO_NUEVO | FAMILIAR_NUEVO
-- =============================================
CREATE TABLE IF NOT EXISTS `TD_PAGOS_INSCRIPCIONES` (
  `cdPagoInscripcion` INT NOT NULL AUTO_INCREMENT,
  `cdComprobante` INT DEFAULT NULL,
  `cdAlumno` INT NOT NULL,
  `cdGrupoFamiliar` INT DEFAULT NULL,
  `nuAnioInscripcion` INT NOT NULL,
  `fePago` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `dsTipoPago` ENUM('Efectivo', 'Transferencia', 'Excepcion') NOT NULL DEFAULT 'Efectivo',
  `dsTipoPrecio` VARCHAR(30) NOT NULL,
  `cdPrecioInscripcion` INT DEFAULT NULL,
  `nuMonto` DECIMAL(10,2) NOT NULL,
  `snEsExcepcion` TINYINT(1) NOT NULL DEFAULT 0,
  `dsObservacion` TEXT,
  `cdUsuarioRegistro` INT NOT NULL,
  `feRegistro` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `cdEstado` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`cdPagoInscripcion`),
  UNIQUE KEY `UK_PagoInscripcion_Alumno_Anio` (`cdAlumno`, `nuAnioInscripcion`, `cdEstado`),
  KEY `cdGrupoFamiliar` (`cdGrupoFamiliar`),
  KEY `cdPrecioInscripcion` (`cdPrecioInscripcion`),
  KEY `cdUsuarioRegistro` (`cdUsuarioRegistro`),
  KEY `IDX_PagoInscripcion_Anio` (`nuAnioInscripcion`),
  KEY `IDX_PagoInscripcion_Comprobante` (`cdComprobante`),
  KEY `IDX_PagoInscripcion_Fecha` (`fePago`),
  CONSTRAINT `td_pagos_inscripciones_ibfk_1` FOREIGN KEY (`cdAlumno`) REFERENCES `TD_ALUMNOS` (`cdAlumno`),
  CONSTRAINT `td_pagos_inscripciones_ibfk_2` FOREIGN KEY (`cdGrupoFamiliar`) REFERENCES `TD_GRUPOS_FAMILIARES` (`cdGrupoFamiliar`) ON DELETE SET NULL,
  CONSTRAINT `td_pagos_inscripciones_ibfk_3` FOREIGN KEY (`cdPrecioInscripcion`) REFERENCES `TD_PRECIOS_INSCRIPCIONES` (`cdPrecioInscripcion`),
  CONSTRAINT `td_pagos_inscripciones_ibfk_4` FOREIGN KEY (`cdUsuarioRegistro`) REFERENCES `TD_USUARIOS` (`cdUsuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Parámetro: año de inscripción habilitado para pagar anticipadamente (vacío = deshabilitado)
INSERT INTO `TD_PARAMETROS` (`dsParametro`, `dsValor`)
SELECT 'INSCRIPCION_ANIO_PROXIMO_HABILITADO', ''
WHERE NOT EXISTS (SELECT 1 FROM `TD_PARAMETROS` WHERE `dsParametro` = 'INSCRIPCION_ANIO_PROXIMO_HABILITADO');
