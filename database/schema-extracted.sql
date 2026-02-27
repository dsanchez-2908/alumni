-- =============================================
-- ALUMSYS - Sistema de Gestión de Talleres de Arte
-- Base de Datos: alumni
-- Fecha: 2026-02-19
-- Generado automáticamente desde base de datos de desarrollo
-- =============================================

-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS alumni;
USE alumni;

-- =============================================
-- TABLA: TD_PARAMETROS
-- Registros actuales: 5
-- =============================================
CREATE TABLE `TD_PARAMETROS` (
  `id` int NOT NULL AUTO_INCREMENT,
  `dsParametro` varchar(250) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dsValor` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `feCreacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `feModificacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dsParametro` (`dsParametro`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_ESTADOS
-- Registros actuales: 4
-- =============================================
CREATE TABLE `TD_ESTADOS` (
  `cdEstado` int NOT NULL AUTO_INCREMENT,
  `dsEstado` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dsDescripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `feCreacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdEstado`),
  UNIQUE KEY `dsEstado` (`dsEstado`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_ROLES
-- Registros actuales: 5
-- =============================================
CREATE TABLE `TD_ROLES` (
  `cdRol` int NOT NULL AUTO_INCREMENT,
  `dsRol` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dsDescripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `feCreacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdRol`),
  UNIQUE KEY `dsRol` (`dsRol`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_TIPO_TALLERES
-- Registros actuales: 7
-- =============================================
CREATE TABLE `TD_TIPO_TALLERES` (
  `cdTipoTaller` int NOT NULL AUTO_INCREMENT,
  `dsNombreTaller` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dsDescripcionTaller` text COLLATE utf8mb4_unicode_ci,
  `nuEdadDesde` int DEFAULT NULL,
  `nuEdadHasta` int DEFAULT NULL,
  `cdEstado` int NOT NULL DEFAULT '1',
  `feCreacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `feModificacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdTipoTaller`),
  KEY `cdEstado` (`cdEstado`),
  CONSTRAINT `td_tipo_talleres_ibfk_1` FOREIGN KEY (`cdEstado`) REFERENCES `TD_ESTADOS` (`cdEstado`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_PERSONAL
-- Registros actuales: 7
-- =============================================
CREATE TABLE `TD_PERSONAL` (
  `cdPersonal` int NOT NULL AUTO_INCREMENT,
  `dsNombreCompleto` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `feNacimiento` date DEFAULT NULL,
  `dsTipoPersonal` enum('Profesor','Auxiliar') COLLATE utf8mb4_unicode_ci NOT NULL,
  `dsDescripcionPuesto` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsDomicilio` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsTelefono` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsMail` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cdEstado` int NOT NULL DEFAULT '1',
  `feCreacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `feModificacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `dsDni` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsCuil` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsEntidad` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsCbuCvu` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsObservaciones` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`cdPersonal`),
  KEY `cdEstado` (`cdEstado`),
  CONSTRAINT `td_personal_ibfk_1` FOREIGN KEY (`cdEstado`) REFERENCES `TD_ESTADOS` (`cdEstado`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TR_PERSONAL_TIPO_TALLER
-- Registros actuales: 8
-- =============================================
CREATE TABLE `TR_PERSONAL_TIPO_TALLER` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cdPersonal` int NOT NULL,
  `cdTipoTaller` int NOT NULL,
  `feAsociacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_Personal_TipoTaller` (`cdPersonal`,`cdTipoTaller`),
  KEY `cdTipoTaller` (`cdTipoTaller`),
  CONSTRAINT `tr_personal_tipo_taller_ibfk_1` FOREIGN KEY (`cdPersonal`) REFERENCES `TD_PERSONAL` (`cdPersonal`) ON DELETE CASCADE,
  CONSTRAINT `tr_personal_tipo_taller_ibfk_2` FOREIGN KEY (`cdTipoTaller`) REFERENCES `TD_TIPO_TALLERES` (`cdTipoTaller`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_USUARIOS
-- Registros actuales: 3
-- =============================================
CREATE TABLE `TD_USUARIOS` (
  `cdUsuario` int NOT NULL AUTO_INCREMENT,
  `dsNombreCompleto` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dsUsuario` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dsClave` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cdPersonal` int DEFAULT NULL,
  `cdEstado` int NOT NULL DEFAULT '1',
  `feAlta` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `feModificacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdUsuario`),
  UNIQUE KEY `dsUsuario` (`dsUsuario`),
  KEY `cdPersonal` (`cdPersonal`),
  KEY `cdEstado` (`cdEstado`),
  CONSTRAINT `td_usuarios_ibfk_1` FOREIGN KEY (`cdPersonal`) REFERENCES `TD_PERSONAL` (`cdPersonal`) ON DELETE SET NULL,
  CONSTRAINT `td_usuarios_ibfk_2` FOREIGN KEY (`cdEstado`) REFERENCES `TD_ESTADOS` (`cdEstado`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TR_USUARIO_ROL
-- Registros actuales: 4
-- =============================================
CREATE TABLE `TR_USUARIO_ROL` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cdUsuario` int NOT NULL,
  `cdRol` int NOT NULL,
  `feAsignacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_Usuario_Rol` (`cdUsuario`,`cdRol`),
  KEY `cdRol` (`cdRol`),
  CONSTRAINT `tr_usuario_rol_ibfk_1` FOREIGN KEY (`cdUsuario`) REFERENCES `TD_USUARIOS` (`cdUsuario`) ON DELETE CASCADE,
  CONSTRAINT `tr_usuario_rol_ibfk_2` FOREIGN KEY (`cdRol`) REFERENCES `TD_ROLES` (`cdRol`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_ALUMNOS
-- Registros actuales: 19
-- =============================================
CREATE TABLE `TD_ALUMNOS` (
  `cdAlumno` int NOT NULL AUTO_INCREMENT,
  `dsNombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dsApellido` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dsDNI` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dsSexo` enum('Masculino','Femenino') COLLATE utf8mb4_unicode_ci NOT NULL,
  `dsNombreLlamar` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `snDiscapacidad` enum('SI','NO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NO',
  `dsObservacionesDiscapacidad` text COLLATE utf8mb4_unicode_ci,
  `dsObservaciones` text COLLATE utf8mb4_unicode_ci,
  `dsMail` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsInstagram` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsFacebook` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsMailNotificacion` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsWhatsappNotificacion` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `feNacimiento` date NOT NULL,
  `dsDomicilio` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsTelefonoCelular` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsTelefonoFijo` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsNombreCompletoContacto1` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsParentescoContacto1` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsDNIContacto1` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsTelefonoContacto1` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsMailContacto1` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsNombreCompletoContacto2` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsParentescoContacto2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsDNIContacto2` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsTelefonoContacto2` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsMailContacto2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cdEstado` int NOT NULL DEFAULT '1',
  `feAlta` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `feModificacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdAlumno`),
  UNIQUE KEY `dsDNI` (`dsDNI`),
  KEY `cdEstado` (`cdEstado`),
  CONSTRAINT `td_alumnos_ibfk_1` FOREIGN KEY (`cdEstado`) REFERENCES `TD_ESTADOS` (`cdEstado`)
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_GRUPOS_FAMILIARES
-- Registros actuales: 7
-- =============================================
CREATE TABLE `TD_GRUPOS_FAMILIARES` (
  `cdGrupoFamiliar` int NOT NULL AUTO_INCREMENT,
  `dsNombreGrupo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsTelefonoContacto` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsParentesco1` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsMailContacto` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsTelefonoContacto2` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsParentesco2` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsMailContacto2` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dsDomicilioFamiliar` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cdEstado` int DEFAULT '1',
  `feCreacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `feActualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdGrupoFamiliar`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TR_ALUMNO_GRUPO_FAMILIAR
-- Registros actuales: 15
-- =============================================
CREATE TABLE `TR_ALUMNO_GRUPO_FAMILIAR` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cdAlumno` int NOT NULL,
  `cdGrupoFamiliar` int NOT NULL,
  `feAsociacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_Alumno_GrupoFamiliar` (`cdAlumno`,`cdGrupoFamiliar`),
  KEY `cdGrupoFamiliar` (`cdGrupoFamiliar`),
  CONSTRAINT `tr_alumno_grupo_familiar_ibfk_1` FOREIGN KEY (`cdAlumno`) REFERENCES `TD_ALUMNOS` (`cdAlumno`) ON DELETE CASCADE,
  CONSTRAINT `tr_alumno_grupo_familiar_ibfk_2` FOREIGN KEY (`cdGrupoFamiliar`) REFERENCES `TD_GRUPOS_FAMILIARES` (`cdGrupoFamiliar`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_TALLERES
-- Registros actuales: 6
-- =============================================
CREATE TABLE `TD_TALLERES` (
  `cdTaller` int NOT NULL AUTO_INCREMENT,
  `nuAnioTaller` year NOT NULL,
  `cdTipoTaller` int NOT NULL,
  `cdPersonal` int NOT NULL,
  `feInicioTaller` date NOT NULL,
  `dsDescripcionHorarios` text COLLATE utf8mb4_unicode_ci,
  `snLunes` tinyint(1) DEFAULT '0',
  `dsLunesHoraDesde` time DEFAULT NULL,
  `dsLunesHoraHasta` time DEFAULT NULL,
  `snMartes` tinyint(1) DEFAULT '0',
  `dsMartesHoraDesde` time DEFAULT NULL,
  `dsMartesHoraHasta` time DEFAULT NULL,
  `snMiercoles` tinyint(1) DEFAULT '0',
  `dsMiercolesHoraDesde` time DEFAULT NULL,
  `dsMiercolesHoraHasta` time DEFAULT NULL,
  `snJueves` tinyint(1) DEFAULT '0',
  `dsJuevesHoraDesde` time DEFAULT NULL,
  `dsJuevesHoraHasta` time DEFAULT NULL,
  `snViernes` tinyint(1) DEFAULT '0',
  `dsViernesHoraDesde` time DEFAULT NULL,
  `dsViernesHoraHasta` time DEFAULT NULL,
  `snSabado` tinyint(1) DEFAULT '0',
  `dsSabadoHoraDesde` time DEFAULT NULL,
  `dsSabadoHoraHasta` time DEFAULT NULL,
  `snDomingo` tinyint(1) DEFAULT '0',
  `dsDomingoHoraDesde` time DEFAULT NULL,
  `dsDomingoHoraHasta` time DEFAULT NULL,
  `cdEstado` int NOT NULL DEFAULT '1',
  `feCreacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `feModificacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdTaller`),
  KEY `cdTipoTaller` (`cdTipoTaller`),
  KEY `cdPersonal` (`cdPersonal`),
  KEY `cdEstado` (`cdEstado`),
  CONSTRAINT `td_talleres_ibfk_1` FOREIGN KEY (`cdTipoTaller`) REFERENCES `TD_TIPO_TALLERES` (`cdTipoTaller`),
  CONSTRAINT `td_talleres_ibfk_2` FOREIGN KEY (`cdPersonal`) REFERENCES `TD_PERSONAL` (`cdPersonal`),
  CONSTRAINT `td_talleres_ibfk_3` FOREIGN KEY (`cdEstado`) REFERENCES `TD_ESTADOS` (`cdEstado`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TR_ALUMNO_TALLER
-- Registros actuales: 24
-- =============================================
CREATE TABLE `TR_ALUMNO_TALLER` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cdAlumno` int NOT NULL,
  `cdEstado` int NOT NULL DEFAULT '1',
  `cdTaller` int NOT NULL,
  `feInscripcion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `feBaja` timestamp NULL DEFAULT NULL,
  `feFinalizacion` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_Alumno_Taller_Activo` (`cdAlumno`,`cdTaller`),
  KEY `cdTaller` (`cdTaller`),
  KEY `fk_alumno_taller_estado` (`cdEstado`),
  CONSTRAINT `fk_alumno_taller_estado` FOREIGN KEY (`cdEstado`) REFERENCES `TD_ESTADOS` (`cdEstado`),
  CONSTRAINT `tr_alumno_taller_ibfk_1` FOREIGN KEY (`cdAlumno`) REFERENCES `TD_ALUMNOS` (`cdAlumno`) ON DELETE CASCADE,
  CONSTRAINT `tr_alumno_taller_ibfk_2` FOREIGN KEY (`cdTaller`) REFERENCES `TD_TALLERES` (`cdTaller`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_ASISTENCIAS
-- Registros actuales: 34
-- =============================================
CREATE TABLE `TD_ASISTENCIAS` (
  `cdFalta` int NOT NULL AUTO_INCREMENT,
  `cdTaller` int NOT NULL,
  `cdAlumno` int NOT NULL,
  `feFalta` date NOT NULL,
  `snPresente` tinyint(1) NOT NULL DEFAULT '0',
  `dsObservacion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `snContactado` tinyint(1) DEFAULT '0',
  `cdUsuarioRegistro` int NOT NULL,
  `feRegistro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdFalta`),
  UNIQUE KEY `UK_Falta_Alumno_Fecha` (`cdTaller`,`cdAlumno`,`feFalta`),
  KEY `cdAlumno` (`cdAlumno`),
  KEY `cdUsuarioRegistro` (`cdUsuarioRegistro`),
  CONSTRAINT `td_asistencias_ibfk_1` FOREIGN KEY (`cdTaller`) REFERENCES `TD_TALLERES` (`cdTaller`) ON DELETE CASCADE,
  CONSTRAINT `td_asistencias_ibfk_2` FOREIGN KEY (`cdAlumno`) REFERENCES `TD_ALUMNOS` (`cdAlumno`) ON DELETE CASCADE,
  CONSTRAINT `td_asistencias_ibfk_3` FOREIGN KEY (`cdUsuarioRegistro`) REFERENCES `TD_USUARIOS` (`cdUsuario`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_NOTIFICACIONES_FALTAS
-- Registros actuales: 0
-- =============================================
CREATE TABLE `TD_NOTIFICACIONES_FALTAS` (
  `cdNotificacion` int NOT NULL AUTO_INCREMENT,
  `cdAlumno` int NOT NULL,
  `feNotificacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `dsRespuesta` text COLLATE utf8mb4_unicode_ci,
  `cdUsuarioNotifica` int NOT NULL,
  PRIMARY KEY (`cdNotificacion`),
  KEY `cdAlumno` (`cdAlumno`),
  KEY `cdUsuarioNotifica` (`cdUsuarioNotifica`),
  CONSTRAINT `td_notificaciones_faltas_ibfk_1` FOREIGN KEY (`cdAlumno`) REFERENCES `TD_ALUMNOS` (`cdAlumno`) ON DELETE CASCADE,
  CONSTRAINT `td_notificaciones_faltas_ibfk_2` FOREIGN KEY (`cdUsuarioNotifica`) REFERENCES `TD_USUARIOS` (`cdUsuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_PRECIOS_TALLERES
-- Registros actuales: 25
-- =============================================
CREATE TABLE `TD_PRECIOS_TALLERES` (
  `cdPrecio` int NOT NULL AUTO_INCREMENT,
  `feAlta` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `cdUsuarioAlta` int NOT NULL,
  `feInicioVigencia` date NOT NULL,
  `cdTipoTaller` int NOT NULL,
  `nuPrecioCompletoEfectivo` decimal(10,2) NOT NULL,
  `nuPrecioCompletoTransferencia` decimal(10,2) NOT NULL,
  `nuPrecioDescuentoEfectivo` decimal(10,2) NOT NULL,
  `nuPrecioDescuentoTransferencia` decimal(10,2) NOT NULL,
  `cdEstado` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`cdPrecio`),
  UNIQUE KEY `UK_Precio_Taller_Vigencia` (`cdTipoTaller`,`feInicioVigencia`,`cdEstado`),
  KEY `cdUsuarioAlta` (`cdUsuarioAlta`),
  KEY `cdEstado` (`cdEstado`),
  KEY `idx_tipo_vigencia` (`cdTipoTaller`,`feInicioVigencia`),
  CONSTRAINT `td_precios_talleres_ibfk_1` FOREIGN KEY (`cdUsuarioAlta`) REFERENCES `TD_USUARIOS` (`cdUsuario`),
  CONSTRAINT `td_precios_talleres_ibfk_2` FOREIGN KEY (`cdTipoTaller`) REFERENCES `TD_TIPO_TALLERES` (`cdTipoTaller`),
  CONSTRAINT `td_precios_talleres_ibfk_3` FOREIGN KEY (`cdEstado`) REFERENCES `TD_ESTADOS` (`cdEstado`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_PAGOS
-- Registros actuales: 22
-- =============================================
CREATE TABLE `TD_PAGOS` (
  `cdPago` int NOT NULL AUTO_INCREMENT,
  `cdAlumno` int NOT NULL,
  `cdGrupoFamiliar` int DEFAULT NULL,
  `fePago` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `nuMes` int NOT NULL,
  `nuAnio` year NOT NULL,
  `dsTipoPago` enum('Efectivo','Transferencia','Excepcion') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Efectivo',
  `nuMontoTotal` decimal(10,2) NOT NULL,
  `dsObservacion` text COLLATE utf8mb4_unicode_ci,
  `cdUsuarioRegistro` int NOT NULL,
  `feRegistro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdPago`),
  KEY `cdAlumno` (`cdAlumno`),
  KEY `cdGrupoFamiliar` (`cdGrupoFamiliar`),
  KEY `cdUsuarioRegistro` (`cdUsuarioRegistro`),
  KEY `IDX_Pago_Fecha` (`fePago`),
  KEY `IDX_Pago_Periodo` (`nuMes`,`nuAnio`),
  CONSTRAINT `td_pagos_ibfk_1` FOREIGN KEY (`cdAlumno`) REFERENCES `TD_ALUMNOS` (`cdAlumno`) ON DELETE CASCADE,
  CONSTRAINT `td_pagos_ibfk_2` FOREIGN KEY (`cdGrupoFamiliar`) REFERENCES `TD_GRUPOS_FAMILIARES` (`cdGrupoFamiliar`) ON DELETE SET NULL,
  CONSTRAINT `td_pagos_ibfk_3` FOREIGN KEY (`cdUsuarioRegistro`) REFERENCES `TD_USUARIOS` (`cdUsuario`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_PAGOS_DETALLE
-- Registros actuales: 33
-- =============================================
CREATE TABLE `TD_PAGOS_DETALLE` (
  `cdPagoDetalle` int NOT NULL AUTO_INCREMENT,
  `cdPago` int NOT NULL,
  `cdTaller` int NOT NULL,
  `cdAlumno` int NOT NULL,
  `nuMonto` decimal(10,2) NOT NULL,
  `dsTipoPago` enum('Efectivo','Transferencia','Excepcion') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Efectivo',
  `snEsExcepcion` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`cdPagoDetalle`),
  KEY `cdPago` (`cdPago`),
  KEY `cdTaller` (`cdTaller`),
  KEY `cdAlumno` (`cdAlumno`),
  CONSTRAINT `td_pagos_detalle_ibfk_1` FOREIGN KEY (`cdPago`) REFERENCES `TD_PAGOS` (`cdPago`) ON DELETE CASCADE,
  CONSTRAINT `td_pagos_detalle_ibfk_2` FOREIGN KEY (`cdTaller`) REFERENCES `TD_TALLERES` (`cdTaller`),
  CONSTRAINT `td_pagos_detalle_ibfk_3` FOREIGN KEY (`cdAlumno`) REFERENCES `TD_ALUMNOS` (`cdAlumno`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_TRAZA
-- Registros actuales: 250
-- =============================================
CREATE TABLE `TD_TRAZA` (
  `cdTrazaDetalle` int NOT NULL AUTO_INCREMENT,
  `dsProceso` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `dsAccion` enum('Agregar','Modificar','Eliminar','Consultar','Login','Logout') COLLATE utf8mb4_unicode_ci NOT NULL,
  `cdUsuario` int NOT NULL,
  `cdElemento` int DEFAULT NULL,
  `dsDetalle` text COLLATE utf8mb4_unicode_ci,
  `feHora` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdTrazaDetalle`),
  KEY `IDX_Traza_Fecha` (`feHora`),
  KEY `IDX_Traza_Usuario` (`cdUsuario`),
  KEY `IDX_Traza_Proceso` (`dsProceso`),
  CONSTRAINT `td_traza_ibfk_1` FOREIGN KEY (`cdUsuario`) REFERENCES `TD_USUARIOS` (`cdUsuario`)
) ENGINE=InnoDB AUTO_INCREMENT=251 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA: TD_NOVEDADES_ALUMNO
-- Registros actuales: 8
-- =============================================
CREATE TABLE `TD_NOVEDADES_ALUMNO` (
  `cdNovedad` int NOT NULL AUTO_INCREMENT,
  `cdAlumno` int NOT NULL,
  `dsNovedad` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `cdUsuario` int NOT NULL,
  `feAlta` datetime DEFAULT CURRENT_TIMESTAMP,
  `cdEstado` int DEFAULT '1',
  PRIMARY KEY (`cdNovedad`),
  KEY `cdUsuario` (`cdUsuario`),
  KEY `cdEstado` (`cdEstado`),
  KEY `idx_alumno` (`cdAlumno`),
  KEY `idx_fecha` (`feAlta`),
  CONSTRAINT `td_novedades_alumno_ibfk_1` FOREIGN KEY (`cdAlumno`) REFERENCES `TD_ALUMNOS` (`cdAlumno`),
  CONSTRAINT `td_novedades_alumno_ibfk_2` FOREIGN KEY (`cdUsuario`) REFERENCES `TD_USUARIOS` (`cdUsuario`),
  CONSTRAINT `td_novedades_alumno_ibfk_3` FOREIGN KEY (`cdEstado`) REFERENCES `TD_ESTADOS` (`cdEstado`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA ADICIONAL: TD_PRECIOS
-- Registros actuales: 0
-- =============================================
CREATE TABLE `TD_PRECIOS` (
  `cdPrecio` int NOT NULL AUTO_INCREMENT,
  `fePrecio` date NOT NULL,
  `cdTipoTaller` int NOT NULL,
  `nuPrecioEfectivo1Taller` decimal(10,2) NOT NULL,
  `nuPrecioTransferencia1Taller` decimal(10,2) NOT NULL,
  `nuPrecioEfectivo2Taller` decimal(10,2) NOT NULL,
  `nuPrecioTransferencia2Taller` decimal(10,2) NOT NULL,
  `nuPrecioEfectivo3Taller` decimal(10,2) NOT NULL,
  `nuPrecioTransferencia3Taller` decimal(10,2) NOT NULL,
  `nuPrecioEfectivo4Taller` decimal(10,2) NOT NULL,
  `nuPrecioTransferencia4Taller` decimal(10,2) NOT NULL,
  `nuPrecioEfectivo5Taller` decimal(10,2) NOT NULL,
  `nuPrecioTransferencia5Taller` decimal(10,2) NOT NULL,
  `feCreacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdPrecio`),
  KEY `cdTipoTaller` (`cdTipoTaller`),
  KEY `IDX_Precio_Fecha` (`fePrecio`,`cdTipoTaller`),
  CONSTRAINT `td_precios_ibfk_1` FOREIGN KEY (`cdTipoTaller`) REFERENCES `TD_TIPO_TALLERES` (`cdTipoTaller`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- TABLA ADICIONAL: TR_INSCRIPCION_ALUMNO
-- Registros actuales: 2
-- =============================================
CREATE TABLE `TR_INSCRIPCION_ALUMNO` (
  `cdInscripcion` int NOT NULL AUTO_INCREMENT,
  `cdAlumno` int NOT NULL,
  `cdTaller` int NOT NULL,
  `feInscripcion` date NOT NULL,
  `cdEstado` int DEFAULT '1',
  `feCreacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `feActualizacion` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`cdInscripcion`),
  UNIQUE KEY `UK_Alumno_Taller` (`cdAlumno`,`cdTaller`,`cdEstado`),
  KEY `cdTaller` (`cdTaller`),
  CONSTRAINT `tr_inscripcion_alumno_ibfk_1` FOREIGN KEY (`cdAlumno`) REFERENCES `TD_ALUMNOS` (`cdAlumno`) ON DELETE CASCADE,
  CONSTRAINT `tr_inscripcion_alumno_ibfk_2` FOREIGN KEY (`cdTaller`) REFERENCES `TD_TALLERES` (`cdTaller`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

