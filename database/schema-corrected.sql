-- =============================================
-- ALUMSYS - Sistema de Gestión de Talleres de Arte
-- Base de Datos: alumni
-- Fecha: 2026-02-19
-- Actualizado desde base de datos de desarrollo
-- =============================================

-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS alumni;
USE alumni;

-- =============================================
-- TABLA: TD_PARAMETROS
-- Descripción: Configuración y parámetros del sistema
-- =============================================
CREATE TABLE `TD_PARAMETROS` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `dsParametro` VARCHAR(250) NOT NULL,
  `dsValor` TEXT NOT NULL,
  `feCreacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `feModificacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dsParametro` (`dsParametro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_ESTADOS
-- Descripción: Estados generales del sistema
-- =============================================
CREATE TABLE `TD_ESTADOS` (
  `cdEstado` INT NOT NULL AUTO_INCREMENT,
  `dsEstado` VARCHAR(50) NOT NULL,
  `dsDescripcion` VARCHAR(255) DEFAULT NULL,
  `feCreacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdEstado`),
  UNIQUE KEY `dsEstado` (`dsEstado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_ROLES
-- Descripción: Roles de usuarios del sistema
-- =============================================
CREATE TABLE `TD_ROLES` (
  `cdRol` INT NOT NULL AUTO_INCREMENT,
  `dsRol` VARCHAR(50) NOT NULL,
  `dsDescripcion` VARCHAR(255) DEFAULT NULL,
  `feCreacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdRol`),
  UNIQUE KEY `dsRol` (`dsRol`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_TIPO_TALLERES
-- Descripción: Tipos de talleres disponibles
-- =============================================
CREATE TABLE `TD_TIPO_TALLERES` (
  `cdTipoTaller` INT NOT NULL AUTO_INCREMENT,
  `dsNombreTaller` VARCHAR(100) NOT NULL,
  `dsDescripcionTaller` TEXT,
  `nuEdadDesde` INT DEFAULT NULL,
  `nuEdadHasta` INT DEFAULT NULL,
  `cdEstado` INT NOT NULL DEFAULT 1,
  `feCreacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `feModificacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdTipoTaller`),
  KEY `cdEstado` (`cdEstado`),
  CONSTRAINT `td_tipo_talleres_ibfk_1` FOREIGN KEY (`cdEstado`) REFERENCES `TD_ESTADOS` (`cdEstado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_PERSONAL
-- Descripción: Personal (profesores y auxiliares)
-- =============================================
CREATE TABLE `TD_PERSONAL` (
  `cdPersonal` INT NOT NULL AUTO_INCREMENT,
  `dsNombreCompleto` VARCHAR(255) NOT NULL,
  `feNacimiento` DATE DEFAULT NULL,
  `dsTipoPersonal` ENUM('Profesor', 'Auxiliar') NOT NULL,
  `dsDescripcionPuesto` VARCHAR(255) DEFAULT NULL,
  `dsDomicilio` VARCHAR(255) DEFAULT NULL,
  `dsTelefono` VARCHAR(50) DEFAULT NULL,
  `dsMail` VARCHAR(100) DEFAULT NULL,
  `dsDni` VARCHAR(20) DEFAULT NULL,
  `dsCuil` VARCHAR(20) DEFAULT NULL,
  `dsEntidad` VARCHAR(255) DEFAULT NULL,
  `dsCbuCvu` VARCHAR(50) DEFAULT NULL,
  `dsObservaciones` TEXT,
  `cdEstado` INT NOT NULL DEFAULT 1,
  `feCreacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `feModificacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdPersonal`),
  KEY `cdEstado` (`cdEstado`),
  CONSTRAINT `td_personal_ibfk_1` FOREIGN KEY (`cdEstado`) REFERENCES `TD_ESTADOS` (`cdEstado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TR_PERSONAL_TIPO_TALLER
-- Descripción: Relación entre personal (profesores) y tipos de talleres
-- =============================================
CREATE TABLE `TR_PERSONAL_TIPO_TALLER` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `cdPersonal` INT NOT NULL,
  `cdTipoTaller` INT NOT NULL,
  `feAsociacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_Personal_TipoTaller` (`cdPersonal`, `cdTipoTaller`),
  KEY `cdTipoTaller` (`cdTipoTaller`),
  CONSTRAINT `tr_personal_tipo_taller_ibfk_1` FOREIGN KEY (`cdPersonal`) REFERENCES `TD_PERSONAL` (`cdPersonal`) ON DELETE CASCADE,
  CONSTRAINT `tr_personal_tipo_taller_ibfk_2` FOREIGN KEY (`cdTipoTaller`) REFERENCES `TD_TIPO_TALLERES` (`cdTipoTaller`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_USUARIOS
-- Descripción: Usuarios del sistema
-- =============================================
CREATE TABLE `TD_USUARIOS` (
  `cdUsuario` INT NOT NULL AUTO_INCREMENT,
  `dsNombreCompleto` VARCHAR(255) NOT NULL,
  `dsUsuario` VARCHAR(100) NOT NULL,
  `dsClave` VARCHAR(255) NOT NULL,
  `cdPersonal` INT DEFAULT NULL,
  `cdEstado` INT NOT NULL DEFAULT 1,
  `feAlta` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `feModificacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdUsuario`),
  UNIQUE KEY `dsUsuario` (`dsUsuario`),
  KEY `cdPersonal` (`cdPersonal`),
  KEY `cdEstado` (`cdEstado`),
  CONSTRAINT `td_usuarios_ibfk_1` FOREIGN KEY (`cdPersonal`) REFERENCES `TD_PERSONAL` (`cdPersonal`) ON DELETE SET NULL,
  CONSTRAINT `td_usuarios_ibfk_2` FOREIGN KEY (`cdEstado`) REFERENCES `TD_ESTADOS` (`cdEstado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TR_USUARIO_ROL
-- Descripción: Relación entre usuarios y roles
-- =============================================
CREATE TABLE `TR_USUARIO_ROL` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `cdUsuario` INT NOT NULL,
  `cdRol` INT NOT NULL,
  `feAsignacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_Usuario_Rol` (`cdUsuario`, `cdRol`),
  KEY `cdRol` (`cdRol`),
  CONSTRAINT `tr_usuario_rol_ibfk_1` FOREIGN KEY (`cdUsuario`) REFERENCES `TD_USUARIOS` (`cdUsuario`) ON DELETE CASCADE,
  CONSTRAINT `tr_usuario_rol_ibfk_2` FOREIGN KEY (`cdRol`) REFERENCES `TD_ROLES` (`cdRol`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_ALUMNOS
-- Descripción: Alumnos de los talleres
-- =============================================
CREATE TABLE `TD_ALUMNOS` (
  `cdAlumno` INT NOT NULL AUTO_INCREMENT,
  `dsNombre` VARCHAR(100) NOT NULL,
  `dsApellido` VARCHAR(100) NOT NULL,
  `dsDNI` VARCHAR(20) NOT NULL,
  `dsSexo` ENUM('Masculino', 'Femenino') NOT NULL,
  `dsNombreLlamar` VARCHAR(100) DEFAULT NULL,
  `snDiscapacidad` ENUM('SI', 'NO') NOT NULL DEFAULT 'NO',
  `dsObservacionesDiscapacidad` TEXT,
  `dsObservaciones` TEXT,
  `dsMail` VARCHAR(100) DEFAULT NULL,
  `dsInstagram` VARCHAR(100) DEFAULT NULL,
  `dsFacebook` VARCHAR(100) DEFAULT NULL,
  `dsMailNotificacion` VARCHAR(100) DEFAULT NULL,
  `dsWhatsappNotificacion` VARCHAR(50) DEFAULT NULL,
  `feNacimiento` DATE NOT NULL,
  `dsDomicilio` VARCHAR(255) DEFAULT NULL,
  `dsTelefonoCelular` VARCHAR(50) DEFAULT NULL,
  `dsTelefonoFijo` VARCHAR(50) DEFAULT NULL,
  `dsNombreCompletoContacto1` VARCHAR(255) DEFAULT NULL,
  `dsParentescoContacto1` VARCHAR(100) DEFAULT NULL,
  `dsDNIContacto1` VARCHAR(20) DEFAULT NULL,
  `dsTelefonoContacto1` VARCHAR(50) DEFAULT NULL,
  `dsMailContacto1` VARCHAR(100) DEFAULT NULL,
  `dsNombreCompletoContacto2` VARCHAR(255) DEFAULT NULL,
  `dsParentescoContacto2` VARCHAR(100) DEFAULT NULL,
  `dsDNIContacto2` VARCHAR(20) DEFAULT NULL,
  `dsTelefonoContacto2` VARCHAR(50) DEFAULT NULL,
  `dsMailContacto2` VARCHAR(100) DEFAULT NULL,
  `cdEstado` INT NOT NULL DEFAULT 1,
  `feAlta` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `feModificacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdAlumno`),
  UNIQUE KEY `dsDNI` (`dsDNI`),
  KEY `cdEstado` (`cdEstado`),
  CONSTRAINT `td_alumnos_ibfk_1` FOREIGN KEY (`cdEstado`) REFERENCES `TD_ESTADOS` (`cdEstado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_GRUPOS_FAMILIARES
-- Descripción: Grupos familiares con información de contacto extendida
-- =============================================
CREATE TABLE `TD_GRUPOS_FAMILIARES` (
  `cdGrupoFamiliar` INT NOT NULL AUTO_INCREMENT,
  `dsNombreGrupo` VARCHAR(255) DEFAULT NULL,
  `dsTelefonoContacto` VARCHAR(50) DEFAULT NULL,
  `dsParentesco1` VARCHAR(50) DEFAULT NULL,
  `dsMailContacto` VARCHAR(255) DEFAULT NULL,
  `dsTelefonoContacto2` VARCHAR(50) DEFAULT NULL,
  `dsParentesco2` VARCHAR(50) DEFAULT NULL,
  `dsMailContacto2` VARCHAR(100) DEFAULT NULL,
  `dsDomicilioFamiliar` VARCHAR(500) DEFAULT NULL,
  `cdEstado` INT DEFAULT 1,
  `feCreacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `feActualizacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdGrupoFamiliar`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TR_ALUMNO_GRUPO_FAMILIAR
-- Descripción: Relación entre alumnos y grupos familiares
-- =============================================
CREATE TABLE `TR_ALUMNO_GRUPO_FAMILIAR` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `cdAlumno` INT NOT NULL,
  `cdGrupoFamiliar` INT NOT NULL,
  `feAsociacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_Alumno_GrupoFamiliar` (`cdAlumno`, `cdGrupoFamiliar`),
  KEY `cdGrupoFamiliar` (`cdGrupoFamiliar`),
  CONSTRAINT `tr_alumno_grupo_familiar_ibfk_1` FOREIGN KEY (`cdAlumno`) REFERENCES `TD_ALUMNOS` (`cdAlumno`) ON DELETE CASCADE,
  CONSTRAINT `tr_alumno_grupo_familiar_ibfk_2` FOREIGN KEY (`cdGrupoFamiliar`) REFERENCES `TD_GRUPOS_FAMILIARES` (`cdGrupoFamiliar`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_TALLERES
-- Descripción: Talleres específicos por año
-- =============================================
CREATE TABLE `TD_TALLERES` (
  `cdTaller` INT NOT NULL AUTO_INCREMENT,
  `nuAnioTaller` YEAR NOT NULL,
  `cdTipoTaller` INT NOT NULL,
  `cdPersonal` INT NOT NULL,
  `feInicioTaller` DATE NOT NULL,
  `dsDescripcionHorarios` TEXT,
  `snLunes` TINYINT(1) DEFAULT 0,
  `dsLunesHoraDesde` TIME DEFAULT NULL,
  `dsLunesHoraHasta` TIME DEFAULT NULL,
  `snMartes` TINYINT(1) DEFAULT 0,
  `dsMartesHoraDesde` TIME DEFAULT NULL,
  `dsMartesHoraHasta` TIME DEFAULT NULL,
  `snMiercoles` TINYINT(1) DEFAULT 0,
  `dsMiercolesHoraDesde` TIME DEFAULT NULL,
  `dsMiercolesHoraHasta` TIME DEFAULT NULL,
  `snJueves` TINYINT(1) DEFAULT 0,
  `dsJuevesHoraDesde` TIME DEFAULT NULL,
  `dsJuevesHoraHasta` TIME DEFAULT NULL,
  `snViernes` TINYINT(1) DEFAULT 0,
  `dsViernesHoraDesde` TIME DEFAULT NULL,
  `dsViernesHoraHasta` TIME DEFAULT NULL,
  `snSabado` TINYINT(1) DEFAULT 0,
  `dsSabadoHoraDesde` TIME DEFAULT NULL,
  `dsSabadoHoraHasta` TIME DEFAULT NULL,
  `snDomingo` TINYINT(1) DEFAULT 0,
  `dsDomingoHoraDesde` TIME DEFAULT NULL,
  `dsDomingoHoraHasta` TIME DEFAULT NULL,
  `cdEstado` INT NOT NULL DEFAULT 1,
  `feCreacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `feModificacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdTaller`),
  KEY `cdTipoTaller` (`cdTipoTaller`),
  KEY `cdPersonal` (`cdPersonal`),
  KEY `cdEstado` (`cdEstado`),
  CONSTRAINT `td_talleres_ibfk_1` FOREIGN KEY (`cdTipoTaller`) REFERENCES `TD_TIPO_TALLERES` (`cdTipoTaller`),
  CONSTRAINT `td_talleres_ibfk_2` FOREIGN KEY (`cdPersonal`) REFERENCES `TD_PERSONAL` (`cdPersonal`),
  CONSTRAINT `td_talleres_ibfk_3` FOREIGN KEY (`cdEstado`) REFERENCES `TD_ESTADOS` (`cdEstado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TR_ALUMNO_TALLER
-- Descripción: Relación entre alumnos y talleres
-- =============================================
CREATE TABLE `TR_ALUMNO_TALLER` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `cdAlumno` INT NOT NULL,
  `cdEstado` INT NOT NULL DEFAULT 1 COMMENT '1=Activo, 2=Inactivo, 4=Finalizado',
  `cdTaller` INT NOT NULL,
  `feInscripcion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `feBaja` TIMESTAMP NULL DEFAULT NULL,
  `feFinalizacion` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_Alumno_Taller_Activo` (`cdAlumno`, `cdTaller`),
  KEY `cdTaller` (`cdTaller`),
  KEY `fk_alumno_taller_estado` (`cdEstado`),
  CONSTRAINT `fk_alumno_taller_estado` FOREIGN KEY (`cdEstado`) REFERENCES `TD_ESTADOS` (`cdEstado`),
  CONSTRAINT `tr_alumno_taller_ibfk_1` FOREIGN KEY (`cdAlumno`) REFERENCES `TD_ALUMNOS` (`cdAlumno`) ON DELETE CASCADE,
  CONSTRAINT `tr_alumno_taller_ibfk_2` FOREIGN KEY (`cdTaller`) REFERENCES `TD_TALLERES` (`cdTaller`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TR_INSCRIPCION_ALUMNO
-- Descripción: Tabla para gestión de inscripciones de alumnos
-- =============================================
CREATE TABLE `TR_INSCRIPCION_ALUMNO` (
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
-- TABLA: TD_ASISTENCIAS
-- Descripción: Registro de asistencias/faltas de alumnos
-- =============================================
CREATE TABLE `TD_ASISTENCIAS` (
  `cdFalta` INT NOT NULL AUTO_INCREMENT,
  `cdTaller` INT NOT NULL,
  `cdAlumno` INT NOT NULL,
  `feFalta` DATE NOT NULL,
  `snPresente` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0=Ausente, 1=Presente, 3=Feriado',
  `dsObservacion` VARCHAR(255) DEFAULT NULL,
  `snContactado` TINYINT(1) DEFAULT 0,
  `cdUsuarioRegistro` INT NOT NULL,
  `feRegistro` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdFalta`),
  UNIQUE KEY `UK_Falta_Alumno_Fecha` (`cdTaller`, `cdAlumno`, `feFalta`),
  KEY `cdAlumno` (`cdAlumno`),
  KEY `cdUsuarioRegistro` (`cdUsuarioRegistro`),
  CONSTRAINT `td_asistencias_ibfk_1` FOREIGN KEY (`cdTaller`) REFERENCES `TD_TALLERES` (`cdTaller`) ON DELETE CASCADE,
  CONSTRAINT `td_asistencias_ibfk_2` FOREIGN KEY (`cdAlumno`) REFERENCES `TD_ALUMNOS` (`cdAlumno`) ON DELETE CASCADE,
  CONSTRAINT `td_asistencias_ibfk_3` FOREIGN KEY (`cdUsuarioRegistro`) REFERENCES `TD_USUARIOS` (`cdUsuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_NOTIFICACIONES_FALTAS
-- Descripción: Registro de notificaciones por faltas
-- =============================================
CREATE TABLE `TD_NOTIFICACIONES_FALTAS` (
  `cdNotificacion` INT NOT NULL AUTO_INCREMENT,
  `cdAlumno` INT NOT NULL,
  `feNotificacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `dsRespuesta` TEXT,
  `cdUsuarioNotifica` INT NOT NULL,
  PRIMARY KEY (`cdNotificacion`),
  KEY `cdAlumno` (`cdAlumno`),
  KEY `cdUsuarioNotifica` (`cdUsuarioNotifica`),
  CONSTRAINT `td_notificaciones_faltas_ibfk_1` FOREIGN KEY (`cdAlumno`) REFERENCES `TD_ALUMNOS` (`cdAlumno`) ON DELETE CASCADE,
  CONSTRAINT `td_notificaciones_faltas_ibfk_2` FOREIGN KEY (`cdUsuarioNotifica`) REFERENCES `TD_USUARIOS` (`cdUsuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_PRECIOS_TALLERES
-- Descripción: Historial de precios de talleres por vigencia
-- =============================================
CREATE TABLE `TD_PRECIOS_TALLERES` (
  `cdPrecio` INT NOT NULL AUTO_INCREMENT,
  `feAlta` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `cdUsuarioAlta` INT NOT NULL,
  `feInicioVigencia` DATE NOT NULL,
  `cdTipoTaller` INT NOT NULL,
  `nuPrecioCompletoEfectivo` DECIMAL(10,2) NOT NULL,
  `nuPrecioCompletoTransferencia` DECIMAL(10,2) NOT NULL,
  `nuPrecioDescuentoEfectivo` DECIMAL(10,2) NOT NULL,
  `nuPrecioDescuentoTransferencia` DECIMAL(10,2) NOT NULL,
  `cdEstado` INT NOT NULL DEFAULT 1,
  PRIMARY KEY (`cdPrecio`),
  UNIQUE KEY `UK_Precio_Taller_Vigencia` (`cdTipoTaller`, `feInicioVigencia`, `cdEstado`),
  KEY `cdUsuarioAlta` (`cdUsuarioAlta`),
  KEY `cdEstado` (`cdEstado`),
  KEY `idx_tipo_vigencia` (`cdTipoTaller`, `feInicioVigencia`),
  CONSTRAINT `td_precios_talleres_ibfk_1` FOREIGN KEY (`cdUsuarioAlta`) REFERENCES `TD_USUARIOS` (`cdUsuario`),
  CONSTRAINT `td_precios_talleres_ibfk_2` FOREIGN KEY (`cdTipoTaller`) REFERENCES `TD_TIPO_TALLERES` (`cdTipoTaller`),
  CONSTRAINT `td_precios_talleres_ibfk_3` FOREIGN KEY (`cdEstado`) REFERENCES `TD_ESTADOS` (`cdEstado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_PRECIOS (LEGACY)
-- Descripción: Tabla antigua de precios - mantenida para compatibilidad
-- Nota: Esta tabla no se usa activamente, se recomienda usar TD_PRECIOS_TALLERES
-- =============================================
CREATE TABLE `TD_PRECIOS` (
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
-- TABLA: TD_PAGOS
-- Descripción: Registro de pagos realizados
-- =============================================
CREATE TABLE `TD_PAGOS` (
  `cdPago` INT NOT NULL AUTO_INCREMENT,
  `cdAlumno` INT NOT NULL,
  `cdGrupoFamiliar` INT DEFAULT NULL,
  `fePago` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `nuMes` INT NOT NULL,
  `nuAnio` YEAR NOT NULL,
  `dsTipoPago` ENUM('Efectivo', 'Transferencia', 'Excepcion') NOT NULL DEFAULT 'Efectivo',
  `nuMontoTotal` DECIMAL(10,2) NOT NULL,
  `dsObservacion` TEXT,
  `cdUsuarioRegistro` INT NOT NULL,
  `feRegistro` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdPago`),
  KEY `cdAlumno` (`cdAlumno`),
  KEY `cdGrupoFamiliar` (`cdGrupoFamiliar`),
  KEY `cdUsuarioRegistro` (`cdUsuarioRegistro`),
  KEY `IDX_Pago_Fecha` (`fePago`),
  KEY `IDX_Pago_Periodo` (`nuMes`, `nuAnio`),
  CONSTRAINT `td_pagos_ibfk_1` FOREIGN KEY (`cdAlumno`) REFERENCES `TD_ALUMNOS` (`cdAlumno`) ON DELETE CASCADE,
  CONSTRAINT `td_pagos_ibfk_2` FOREIGN KEY (`cdGrupoFamiliar`) REFERENCES `TD_GRUPOS_FAMILIARES` (`cdGrupoFamiliar`) ON DELETE SET NULL,
  CONSTRAINT `td_pagos_ibfk_3` FOREIGN KEY (`cdUsuarioRegistro`) REFERENCES `TD_USUARIOS` (`cdUsuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_PAGOS_DETALLE
-- Descripción: Detalle de pagos por taller
-- =============================================
CREATE TABLE `TD_PAGOS_DETALLE` (
  `cdPagoDetalle` INT NOT NULL AUTO_INCREMENT,
  `cdPago` INT NOT NULL,
  `cdTaller` INT NOT NULL,
  `cdAlumno` INT NOT NULL,
  `nuMonto` DECIMAL(10,2) NOT NULL,
  `dsTipoPago` ENUM('Efectivo', 'Transferencia', 'Excepcion') NOT NULL DEFAULT 'Efectivo',
  `snEsExcepcion` TINYINT(1) DEFAULT 0,
  PRIMARY KEY (`cdPagoDetalle`),
  KEY `cdPago` (`cdPago`),
  KEY `cdTaller` (`cdTaller`),
  KEY `cdAlumno` (`cdAlumno`),
  CONSTRAINT `td_pagos_detalle_ibfk_1` FOREIGN KEY (`cdPago`) REFERENCES `TD_PAGOS` (`cdPago`) ON DELETE CASCADE,
  CONSTRAINT `td_pagos_detalle_ibfk_2` FOREIGN KEY (`cdTaller`) REFERENCES `TD_TALLERES` (`cdTaller`),
  CONSTRAINT `td_pagos_detalle_ibfk_3` FOREIGN KEY (`cdAlumno`) REFERENCES `TD_ALUMNOS` (`cdAlumno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_TRAZA
-- Descripción: Auditoría de todas las operaciones
-- =============================================
CREATE TABLE `TD_TRAZA` (
  `cdTrazaDetalle` INT NOT NULL AUTO_INCREMENT,
  `dsProceso` VARCHAR(100) NOT NULL,
  `dsAccion` ENUM('Agregar', 'Modificar', 'Eliminar', 'Consultar', 'Login', 'Logout') NOT NULL,
  `cdUsuario` INT NOT NULL,
  `cdElemento` INT DEFAULT NULL,
  `dsDetalle` TEXT,
  `feHora` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdTrazaDetalle`),
  KEY `IDX_Traza_Fecha` (`feHora`),
  KEY `IDX_Traza_Usuario` (`cdUsuario`),
  KEY `IDX_Traza_Proceso` (`dsProceso`),
  CONSTRAINT `td_traza_ibfk_1` FOREIGN KEY (`cdUsuario`) REFERENCES `TD_USUARIOS` (`cdUsuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_NOVEDADES_ALUMNO
-- Descripción: Novedades y observaciones de alumnos
-- =============================================
CREATE TABLE `TD_NOVEDADES_ALUMNO` (
  `cdNovedad` INT NOT NULL AUTO_INCREMENT,
  `cdAlumno` INT NOT NULL,
  `dsNovedad` TEXT NOT NULL,
  `cdUsuario` INT NOT NULL,
  `feAlta` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `cdEstado` INT DEFAULT 1,
  PRIMARY KEY (`cdNovedad`),
  KEY `cdUsuario` (`cdUsuario`),
  KEY `cdEstado` (`cdEstado`),
  KEY `idx_alumno` (`cdAlumno`),
  KEY `idx_fecha` (`feAlta`),
  CONSTRAINT `td_novedades_alumno_ibfk_1` FOREIGN KEY (`cdAlumno`) REFERENCES `TD_ALUMNOS` (`cdAlumno`),
  CONSTRAINT `td_novedades_alumno_ibfk_2` FOREIGN KEY (`cdUsuario`) REFERENCES `TD_USUARIOS` (`cdUsuario`),
  CONSTRAINT `td_novedades_alumno_ibfk_3` FOREIGN KEY (`cdEstado`) REFERENCES `TD_ESTADOS` (`cdEstado`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- INSERTAR DATOS INICIALES
-- =============================================

-- Estados
INSERT INTO `TD_ESTADOS` (`dsEstado`, `dsDescripcion`) VALUES
('Activo', 'Estado activo en el sistema'),
('Inactivo', 'Estado inactivo en el sistema'),
('Baja', 'Estado de baja definitiva'),
('Finalizado', 'Taller finalizado');

-- Roles
INSERT INTO `TD_ROLES` (`dsRol`, `dsDescripcion`) VALUES
('Administrador', 'Acceso total al sistema'),
('Supervisor', 'Supervisión y reportes'),
('Profesor', 'Registro de faltas y consultas'),
('Operador', 'Operaciones generales'),
('Externo', 'Acceso limitado externo');

-- Parámetros del sistema
INSERT INTO `TD_PARAMETROS` (`dsParametro`, `dsValor`) VALUES
('SISTEMA_NOMBRE', 'Alumni - Sistema de Gestión de Talleres'),
('SISTEMA_VERSION', '1.0.0'),
('FALTAS_CONSECUTIVAS_NOTIFICAR', '2'),
('MONEDA', 'ARS'),
('TIMEZONE', 'America/Argentina/Buenos_Aires');

-- =============================================
-- FIN DEL SCRIPT
-- =============================================
