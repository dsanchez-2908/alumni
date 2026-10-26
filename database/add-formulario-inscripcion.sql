-- =============================================
-- FASE 3 - FORMULARIO DIGITAL DE INSCRIPCION
-- Cambio aditivo (una tabla nueva y una columna opcional); no modifica datos existentes.
-- Se recomienda ejecutar scripts/add-formulario-inscripcion.js, que verifica si la columna ya existe.
-- =============================================

-- Mensaje que se muestra al alumno en el formulario digital de ese año (opcional).
-- Ejecutar UNA sola vez si se corre este SQL a mano:
ALTER TABLE `TD_INSCRIPCIONES`
  ADD COLUMN `dsMensajeFormulario` TEXT NULL DEFAULT NULL AFTER `cdEstado`;

-- =============================================
-- TABLA: TD_INSCRIPCIONES_FORMULARIOS
-- Descripción: Links de un solo uso para que el alumno complete el formulario digital.
-- El token NUNCA se guarda en claro: solo su hash SHA-256 (dsTokenHash, para validar) y una copia cifrada
-- (dsTokenCifrado, para poder volver a mostrar el link vigente a los usuarios del sistema).
-- cdEstado: 1 = Vigente, 2 = Completado, 3 = Anulado (reemplazado por un link nuevo)
-- Un link vigente con nuIntentosFallidos >= 5 queda bloqueado.
-- =============================================
CREATE TABLE IF NOT EXISTS `TD_INSCRIPCIONES_FORMULARIOS` (
  `cdFormulario` INT NOT NULL AUTO_INCREMENT,
  `cdInscripcionAlumno` INT NOT NULL,
  `dsTokenHash` CHAR(64) NOT NULL,
  `dsTokenCifrado` VARCHAR(255) NULL COMMENT 'Token cifrado (AES-256-GCM) para poder mostrar el link vigente; se descifra solo en el servidor',
  `cdEstado` TINYINT NOT NULL DEFAULT 1,
  `nuIntentosFallidos` TINYINT NOT NULL DEFAULT 0,
  `feAlta` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `feVencimiento` DATETIME NOT NULL,
  `feCompletado` DATETIME NULL DEFAULT NULL,
  `cdUsuarioAlta` INT NOT NULL,
  `dsCambios` MEDIUMTEXT NULL COMMENT 'JSON con los datos que modifico el alumno (antes/despues)',
  PRIMARY KEY (`cdFormulario`),
  UNIQUE KEY `UK_Formulario_Token` (`dsTokenHash`),
  KEY `IDX_Formulario_InscripcionAlumno` (`cdInscripcionAlumno`, `cdEstado`),
  KEY `cdUsuarioAlta` (`cdUsuarioAlta`),
  CONSTRAINT `td_inscripciones_formularios_ibfk_1` FOREIGN KEY (`cdInscripcionAlumno`) REFERENCES `TD_INSCRIPCIONES_ALUMNOS` (`cdInscripcionAlumno`) ON DELETE CASCADE,
  CONSTRAINT `td_inscripciones_formularios_ibfk_2` FOREIGN KEY (`cdUsuarioAlta`) REFERENCES `TD_USUARIOS` (`cdUsuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
