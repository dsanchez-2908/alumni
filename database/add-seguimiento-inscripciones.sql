-- =============================================
-- FASE 2 - SEGUIMIENTO DE INSCRIPCIONES
-- Script idempotente (CREATE TABLE IF NOT EXISTS). Solo agrega tablas nuevas,
-- no modifica ninguna tabla existente (seguro para producción).
-- =============================================

-- =============================================
-- TABLA: TD_INSCRIPCIONES
-- Descripción: Un registro por año de inscripción iniciado.
-- cdEstado: 1 = Abierta (habilita el pago de la inscripción de ese año), 2 = Cerrada
-- =============================================
CREATE TABLE IF NOT EXISTS `TD_INSCRIPCIONES` (
  `cdInscripcion` INT NOT NULL AUTO_INCREMENT,
  `nuAnio` INT NOT NULL,
  `cdEstado` INT NOT NULL DEFAULT 1,
  `cdUsuarioAlta` INT NOT NULL,
  `feAlta` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdInscripcion`),
  UNIQUE KEY `UK_Inscripcion_Anio` (`nuAnio`),
  KEY `cdUsuarioAlta` (`cdUsuarioAlta`),
  CONSTRAINT `td_inscripciones_ibfk_1` FOREIGN KEY (`cdUsuarioAlta`) REFERENCES `TD_USUARIOS` (`cdUsuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_INSCRIPCIONES_ALUMNOS
-- Descripción: Alumnos de cada inscripción y su estado de seguimiento.
-- cdEstadoInscripcion:
--   1 = Pendiente pagar Inscripción
--   2 = Pendiente de Enviar Formulario
--   3 = Pendiente de Completar Formulario
--   4 = Pendiente de Inscripción
--   5 = Inscripto
-- snAgregadoManual = 1 si se sumó después del inicio (botón "Agregar Alumno" o pago posterior)
-- =============================================
CREATE TABLE IF NOT EXISTS `TD_INSCRIPCIONES_ALUMNOS` (
  `cdInscripcionAlumno` INT NOT NULL AUTO_INCREMENT,
  `cdInscripcion` INT NOT NULL,
  `cdAlumno` INT NOT NULL,
  `cdEstadoInscripcion` TINYINT NOT NULL DEFAULT 1,
  `snAgregadoManual` TINYINT(1) NOT NULL DEFAULT 0,
  `feAlta` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `feCambioEstado` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdInscripcionAlumno`),
  UNIQUE KEY `UK_Inscripcion_Alumno` (`cdInscripcion`, `cdAlumno`),
  KEY `cdAlumno` (`cdAlumno`),
  KEY `IDX_InscripcionAlumno_Estado` (`cdInscripcion`, `cdEstadoInscripcion`),
  CONSTRAINT `td_inscripciones_alumnos_ibfk_1` FOREIGN KEY (`cdInscripcion`) REFERENCES `TD_INSCRIPCIONES` (`cdInscripcion`) ON DELETE CASCADE,
  CONSTRAINT `td_inscripciones_alumnos_ibfk_2` FOREIGN KEY (`cdAlumno`) REFERENCES `TD_ALUMNOS` (`cdAlumno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_INSCRIPCIONES_HISTORIAL
-- Descripción: Cambios de estado y comentarios de cada alumno en la inscripción.
-- cdUsuario NULL = cambio automático del sistema.
-- =============================================
CREATE TABLE IF NOT EXISTS `TD_INSCRIPCIONES_HISTORIAL` (
  `cdHistorial` INT NOT NULL AUTO_INCREMENT,
  `cdInscripcionAlumno` INT NOT NULL,
  `dsTipo` ENUM('Estado', 'Comentario') NOT NULL,
  `cdEstadoAnterior` TINYINT DEFAULT NULL,
  `cdEstadoNuevo` TINYINT DEFAULT NULL,
  `dsComentario` TEXT,
  `cdUsuario` INT DEFAULT NULL,
  `feAlta` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdHistorial`),
  KEY `IDX_Historial_InscripcionAlumno` (`cdInscripcionAlumno`, `feAlta`),
  KEY `cdUsuario` (`cdUsuario`),
  CONSTRAINT `td_inscripciones_historial_ibfk_1` FOREIGN KEY (`cdInscripcionAlumno`) REFERENCES `TD_INSCRIPCIONES_ALUMNOS` (`cdInscripcionAlumno`) ON DELETE CASCADE,
  CONSTRAINT `td_inscripciones_historial_ibfk_2` FOREIGN KEY (`cdUsuario`) REFERENCES `TD_USUARIOS` (`cdUsuario`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
