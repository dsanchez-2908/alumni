-- =============================================
-- MIGRACIÓN COMPLETA PARA RAILWAY
-- Sistema de Gestión de Talleres de Arte
-- Fecha: 2026-02-03
-- =============================================
-- IMPORTANTE: Este script elimina TODAS las tablas y las recrea
-- =============================================

-- Desactivar verificación de claves foráneas temporalmente
SET FOREIGN_KEY_CHECKS = 0;

-- Eliminar todas las tablas en orden inverso
DROP TABLE IF EXISTS TD_TRAZA;
DROP TABLE IF EXISTS TD_NOVEDADES_ALUMNO;
DROP TABLE IF EXISTS TD_PAGOS_DETALLE;
DROP TABLE IF EXISTS TD_PAGOS;
DROP TABLE IF EXISTS TD_PRECIOS_TALLERES;
DROP TABLE IF EXISTS TD_NOTIFICACIONES_FALTAS;
DROP TABLE IF EXISTS TD_ASISTENCIAS;
DROP TABLE IF EXISTS TD_FALTAS;
DROP TABLE IF EXISTS TR_ALUMNO_TALLER;
DROP TABLE IF EXISTS TD_TALLERES;
DROP TABLE IF EXISTS TR_ALUMNO_GRUPO_FAMILIAR;
DROP TABLE IF EXISTS TD_GRUPOS_FAMILIARES;
DROP TABLE IF EXISTS TD_ALUMNOS;
DROP TABLE IF EXISTS TR_USUARIO_ROL;
DROP TABLE IF EXISTS TD_USUARIOS;
DROP TABLE IF EXISTS TR_PERSONAL_TIPO_TALLER;
DROP TABLE IF EXISTS TD_PERSONAL;
DROP TABLE IF EXISTS TD_TIPO_TALLERES;
DROP TABLE IF EXISTS TD_ROLES;
DROP TABLE IF EXISTS TD_ESTADOS;
DROP TABLE IF EXISTS TD_PARAMETROS;

-- Reactivar verificación de claves foráneas
SET FOREIGN_KEY_CHECKS = 1;

-- =============================================
-- CREAR TABLAS
-- =============================================

-- TABLA: TD_PARAMETROS
CREATE TABLE TD_PARAMETROS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dsParametro VARCHAR(250) NOT NULL UNIQUE,
    dsValor TEXT NOT NULL,
    feCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    feModificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: TD_ESTADOS
CREATE TABLE TD_ESTADOS (
    cdEstado INT AUTO_INCREMENT PRIMARY KEY,
    dsEstado VARCHAR(50) NOT NULL UNIQUE,
    dsDescripcion VARCHAR(255),
    feCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: TD_ROLES
CREATE TABLE TD_ROLES (
    cdRol INT AUTO_INCREMENT PRIMARY KEY,
    dsRol VARCHAR(50) NOT NULL UNIQUE,
    dsDescripcion VARCHAR(255),
    feCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: TD_TIPO_TALLERES
CREATE TABLE TD_TIPO_TALLERES (
    cdTipoTaller INT AUTO_INCREMENT PRIMARY KEY,
    dsNombreTaller VARCHAR(100) NOT NULL,
    dsDescripcionTaller TEXT,
    nuEdadDesde INT,
    nuEdadHasta INT,
    cdEstado INT NOT NULL DEFAULT 1,
    feCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    feModificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cdEstado) REFERENCES TD_ESTADOS(cdEstado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: TD_PERSONAL
CREATE TABLE TD_PERSONAL (
    cdPersonal INT AUTO_INCREMENT PRIMARY KEY,
    dsNombreCompleto VARCHAR(255) NOT NULL,
    dsTipoPersonal ENUM('Profesor', 'Auxiliar') NOT NULL,
    dsDescripcionPuesto VARCHAR(255) NULL,
    dsDomicilio VARCHAR(255),
    dsTelefono VARCHAR(50),
    dsMail VARCHAR(100),
    dsDni VARCHAR(20),
    dsCuil VARCHAR(20),
    dsEntidad VARCHAR(255),
    dsCbuCvu VARCHAR(50),
    dsObservaciones TEXT,
    cdEstado INT NOT NULL DEFAULT 1,
    feCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    feModificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cdEstado) REFERENCES TD_ESTADOS(cdEstado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: TR_PERSONAL_TIPO_TALLER
CREATE TABLE TR_PERSONAL_TIPO_TALLER (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cdPersonal INT NOT NULL,
    cdTipoTaller INT NOT NULL,
    feAsociacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cdPersonal) REFERENCES TD_PERSONAL(cdPersonal) ON DELETE CASCADE,
    FOREIGN KEY (cdTipoTaller) REFERENCES TD_TIPO_TALLERES(cdTipoTaller) ON DELETE CASCADE,
    UNIQUE KEY UK_Personal_TipoTaller (cdPersonal, cdTipoTaller)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: TD_USUARIOS
CREATE TABLE TD_USUARIOS (
    cdUsuario INT AUTO_INCREMENT PRIMARY KEY,
    dsNombreCompleto VARCHAR(255) NOT NULL,
    dsUsuario VARCHAR(100) NOT NULL UNIQUE,
    dsClave VARCHAR(255) NOT NULL,
    cdPersonal INT NULL,
    cdEstado INT NOT NULL DEFAULT 1,
    feAlta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    feModificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cdPersonal) REFERENCES TD_PERSONAL(cdPersonal) ON DELETE SET NULL,
    FOREIGN KEY (cdEstado) REFERENCES TD_ESTADOS(cdEstado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: TR_USUARIO_ROL
CREATE TABLE TR_USUARIO_ROL (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cdUsuario INT NOT NULL,
    cdRol INT NOT NULL,
    feAsignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cdUsuario) REFERENCES TD_USUARIOS(cdUsuario) ON DELETE CASCADE,
    FOREIGN KEY (cdRol) REFERENCES TD_ROLES(cdRol) ON DELETE CASCADE,
    UNIQUE KEY UK_Usuario_Rol (cdUsuario, cdRol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: TD_ALUMNOS
CREATE TABLE TD_ALUMNOS (
    cdAlumno INT AUTO_INCREMENT PRIMARY KEY,
    dsNombre VARCHAR(100) NOT NULL,
    dsApellido VARCHAR(100) NOT NULL,
    dsDNI VARCHAR(20) NOT NULL UNIQUE,
    dsSexo ENUM('Masculino', 'Femenino') NOT NULL,
    dsNombreLlamar VARCHAR(100),
    snDiscapacidad ENUM('SI', 'NO') NOT NULL DEFAULT 'NO',
    dsObservacionesDiscapacidad TEXT,
    dsObservaciones TEXT,
    dsMail VARCHAR(100),
    dsInstagram VARCHAR(100),
    dsFacebook VARCHAR(100),
    dsMailNotificacion VARCHAR(100),
    dsWhatsappNotificacion VARCHAR(50),
    feNacimiento DATE NOT NULL,
    dsDomicilio VARCHAR(255),
    dsTelefonoCelular VARCHAR(50),
    dsTelefonoFijo VARCHAR(50),
    dsNombreCompletoContacto1 VARCHAR(255),
    dsParentescoContacto1 VARCHAR(100),
    dsDNIContacto1 VARCHAR(20),
    dsTelefonoContacto1 VARCHAR(50),
    dsMailContacto1 VARCHAR(100),
    dsNombreCompletoContacto2 VARCHAR(255),
    dsParentescoContacto2 VARCHAR(100),
    dsDNIContacto2 VARCHAR(20),
    dsTelefonoContacto2 VARCHAR(50),
    dsMailContacto2 VARCHAR(100),
    cdEstado INT NOT NULL DEFAULT 1,
    feAlta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    feModificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cdEstado) REFERENCES TD_ESTADOS(cdEstado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: TD_GRUPOS_FAMILIARES
CREATE TABLE TD_GRUPOS_FAMILIARES (
    cdGrupoFamiliar INT AUTO_INCREMENT PRIMARY KEY,
    dsNombreGrupo VARCHAR(255),
    cdEstado INT NOT NULL DEFAULT 1,
    feCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    feActualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cdEstado) REFERENCES TD_ESTADOS(cdEstado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: TR_ALUMNO_GRUPO_FAMILIAR
CREATE TABLE TR_ALUMNO_GRUPO_FAMILIAR (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cdAlumno INT NOT NULL,
    cdGrupoFamiliar INT NOT NULL,
    feAsociacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cdAlumno) REFERENCES TD_ALUMNOS(cdAlumno) ON DELETE CASCADE,
    FOREIGN KEY (cdGrupoFamiliar) REFERENCES TD_GRUPOS_FAMILIARES(cdGrupoFamiliar) ON DELETE CASCADE,
    UNIQUE KEY UK_Alumno_GrupoFamiliar (cdAlumno, cdGrupoFamiliar)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: TD_TALLERES
CREATE TABLE TD_TALLERES (
    cdTaller INT AUTO_INCREMENT PRIMARY KEY,
    nuAnioTaller YEAR NOT NULL,
    cdTipoTaller INT NOT NULL,
    cdPersonal INT NOT NULL,
    feInicioTaller DATE NOT NULL,
    dsDescripcionHorarios TEXT,
    
    -- Horarios por día
    snLunes BOOLEAN DEFAULT FALSE,
    dsLunesHoraDesde TIME NULL,
    dsLunesHoraHasta TIME NULL,
    
    snMartes BOOLEAN DEFAULT FALSE,
    dsMartesHoraDesde TIME NULL,
    dsMartesHoraHasta TIME NULL,
    
    snMiercoles BOOLEAN DEFAULT FALSE,
    dsMiercolesHoraDesde TIME NULL,
    dsMiercolesHoraHasta TIME NULL,
    
    snJueves BOOLEAN DEFAULT FALSE,
    dsJuevesHoraDesde TIME NULL,
    dsJuevesHoraHasta TIME NULL,
    
    snViernes BOOLEAN DEFAULT FALSE,
    dsViernesHoraDesde TIME NULL,
    dsViernesHoraHasta TIME NULL,
    
    snSabado BOOLEAN DEFAULT FALSE,
    dsSabadoHoraDesde TIME NULL,
    dsSabadoHoraHasta TIME NULL,
    
    snDomingo BOOLEAN DEFAULT FALSE,
    dsDomingoHoraDesde TIME NULL,
    dsDomingoHoraHasta TIME NULL,
    
    cdEstado INT NOT NULL DEFAULT 1,
    feCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    feModificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (cdTipoTaller) REFERENCES TD_TIPO_TALLERES(cdTipoTaller),
    FOREIGN KEY (cdPersonal) REFERENCES TD_PERSONAL(cdPersonal),
    FOREIGN KEY (cdEstado) REFERENCES TD_ESTADOS(cdEstado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: TR_ALUMNO_TALLER
CREATE TABLE TR_ALUMNO_TALLER (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cdAlumno INT NOT NULL,
    cdTaller INT NOT NULL,
    cdEstado INT NOT NULL DEFAULT 1 COMMENT '1=Activo, 2=Inactivo, 4=Finalizado',
    feInscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    feBaja TIMESTAMP NULL,
    FOREIGN KEY (cdAlumno) REFERENCES TD_ALUMNOS(cdAlumno) ON DELETE CASCADE,
    FOREIGN KEY (cdTaller) REFERENCES TD_TALLERES(cdTaller) ON DELETE CASCADE,
    FOREIGN KEY (cdEstado) REFERENCES TD_ESTADOS(cdEstado),
    UNIQUE KEY UK_Alumno_Taller_Activo (cdAlumno, cdTaller)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: TD_ASISTENCIAS
CREATE TABLE TD_ASISTENCIAS (
    cdFalta INT AUTO_INCREMENT PRIMARY KEY,
    cdTaller INT NOT NULL,
    cdAlumno INT NOT NULL,
    feFalta DATE NOT NULL,
    snPresente TINYINT NOT NULL DEFAULT 1 COMMENT '0=Ausente, 1=Presente, 3=Feriado',
    dsObservacion VARCHAR(255),
    cdUsuarioRegistro INT NOT NULL,
    feRegistro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cdTaller) REFERENCES TD_TALLERES(cdTaller) ON DELETE CASCADE,
    FOREIGN KEY (cdAlumno) REFERENCES TD_ALUMNOS(cdAlumno) ON DELETE CASCADE,
    FOREIGN KEY (cdUsuarioRegistro) REFERENCES TD_USUARIOS(cdUsuario),
    UNIQUE KEY UK_Falta_Alumno_Fecha (cdTaller, cdAlumno, feFalta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: TD_NOTIFICACIONES_FALTAS
CREATE TABLE TD_NOTIFICACIONES_FALTAS (
    cdNotificacion INT AUTO_INCREMENT PRIMARY KEY,
    cdAlumno INT NOT NULL,
    feNotificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dsRespuesta TEXT,
    cdUsuarioNotifica INT NOT NULL,
    FOREIGN KEY (cdAlumno) REFERENCES TD_ALUMNOS(cdAlumno) ON DELETE CASCADE,
    FOREIGN KEY (cdUsuarioNotifica) REFERENCES TD_USUARIOS(cdUsuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: TD_PRECIOS_TALLERES
CREATE TABLE TD_PRECIOS_TALLERES (
    cdPrecio INT AUTO_INCREMENT PRIMARY KEY,
    cdUsuarioAlta INT NOT NULL,
    feInicioVigencia DATE NOT NULL,
    cdTipoTaller INT NOT NULL,
    nuPrecioCompletoEfectivo DECIMAL(10,2) NOT NULL,
    nuPrecioCompletoTransferencia DECIMAL(10,2) NOT NULL,
    nuPrecioDescuentoEfectivo DECIMAL(10,2) NOT NULL,
    nuPrecioDescuentoTransferencia DECIMAL(10,2) NOT NULL,
    cdEstado INT NOT NULL DEFAULT 1,
    feAlta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    feModificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (cdTipoTaller) REFERENCES TD_TIPO_TALLERES(cdTipoTaller),
    FOREIGN KEY (cdUsuarioAlta) REFERENCES TD_USUARIOS(cdUsuario),
    FOREIGN KEY (cdEstado) REFERENCES TD_ESTADOS(cdEstado),
    INDEX IDX_Precio_Vigencia (feInicioVigencia, cdTipoTaller),
    INDEX IDX_Precio_Estado (cdEstado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: TD_PAGOS
CREATE TABLE TD_PAGOS (
    cdPago INT AUTO_INCREMENT PRIMARY KEY,
    cdAlumno INT NOT NULL,
    cdGrupoFamiliar INT NULL,
    fePago TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    nuMes INT NOT NULL,
    nuAnio YEAR NOT NULL,
    dsTipoPago ENUM('Efectivo', 'Transferencia') NOT NULL DEFAULT 'Efectivo',
    nuMontoTotal DECIMAL(10,2) NOT NULL,
    dsObservacion TEXT,
    cdUsuarioRegistro INT NOT NULL,
    feRegistro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (cdAlumno) REFERENCES TD_ALUMNOS(cdAlumno) ON DELETE CASCADE,
    FOREIGN KEY (cdGrupoFamiliar) REFERENCES TD_GRUPOS_FAMILIARES(cdGrupoFamiliar) ON DELETE SET NULL,
    FOREIGN KEY (cdUsuarioRegistro) REFERENCES TD_USUARIOS(cdUsuario),
    INDEX IDX_Pago_Fecha (fePago),
    INDEX IDX_Pago_Periodo (nuMes, nuAnio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: TD_PAGOS_DETALLE
CREATE TABLE TD_PAGOS_DETALLE (
    cdPagoDetalle INT AUTO_INCREMENT PRIMARY KEY,
    cdPago INT NOT NULL,
    cdTaller INT NOT NULL,
    cdAlumno INT NOT NULL,
    nuMonto DECIMAL(10,2) NOT NULL,
    
    FOREIGN KEY (cdPago) REFERENCES TD_PAGOS(cdPago) ON DELETE CASCADE,
    FOREIGN KEY (cdTaller) REFERENCES TD_TALLERES(cdTaller),
    FOREIGN KEY (cdAlumno) REFERENCES TD_ALUMNOS(cdAlumno)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: TD_TRAZA
CREATE TABLE TD_TRAZA (
    cdTrazaDetalle INT AUTO_INCREMENT PRIMARY KEY,
    dsProceso VARCHAR(100) NOT NULL,
    dsAccion ENUM('Agregar', 'Modificar', 'Eliminar', 'Consultar', 'Login', 'Logout') NOT NULL,
    cdUsuario INT NOT NULL,
    cdElemento INT NULL,
    dsDetalle TEXT,
    feHora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (cdUsuario) REFERENCES TD_USUARIOS(cdUsuario),
    INDEX IDX_Traza_Fecha (feHora),
    INDEX IDX_Traza_Usuario (cdUsuario),
    INDEX IDX_Traza_Proceso (dsProceso)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABLA: TD_NOVEDADES_ALUMNO
CREATE TABLE TD_NOVEDADES_ALUMNO (
    cdNovedad INT AUTO_INCREMENT PRIMARY KEY,
    cdAlumno INT NOT NULL,
    dsNovedad TEXT NOT NULL,
    cdUsuario INT NOT NULL,
    feAlta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cdEstado INT NOT NULL DEFAULT 1,
    feModificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (cdAlumno) REFERENCES TD_ALUMNOS(cdAlumno),
    FOREIGN KEY (cdUsuario) REFERENCES TD_USUARIOS(cdUsuario),
    FOREIGN KEY (cdEstado) REFERENCES TD_ESTADOS(cdEstado),
    INDEX IDX_Novedad_Alumno (cdAlumno),
    INDEX IDX_Novedad_Fecha (feAlta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- INSERTAR DATOS INICIALES
-- =============================================

-- Estados
INSERT INTO TD_ESTADOS (dsEstado, dsDescripcion) VALUES
('Activo', 'Estado activo en el sistema'),
('Inactivo', 'Estado inactivo en el sistema'),
('Baja', 'Estado de baja definitiva'),
('Finalizado', 'Taller finalizado');

-- Roles
INSERT INTO TD_ROLES (dsRol, dsDescripcion) VALUES
('Administrador', 'Acceso total al sistema'),
('Supervisor', 'Supervisión y reportes'),
('Profesor', 'Registro de faltas y consultas'),
('Operador', 'Operaciones generales'),
('Externo', 'Acceso limitado externo');

-- Parámetros del sistema
INSERT INTO TD_PARAMETROS (dsParametro, dsValor) VALUES
('SISTEMA_NOMBRE', 'Alumni - Sistema de Gestión de Talleres'),
('SISTEMA_VERSION', '1.0.0'),
('FALTAS_CONSECUTIVAS_NOTIFICAR', '2'),
('MONEDA', 'ARS'),
('TIMEZONE', 'America/Argentina/Buenos_Aires');

-- =============================================
-- IMPORTANTE: CREAR USUARIO ADMINISTRADOR
-- =============================================
-- Ejecutar este script desde la aplicación usando:
-- npm run db:init
-- O ejecutar manualmente el comando:
-- node scripts/init-db.ts
-- 
-- Esto creará el usuario administrador con la contraseña encriptada
-- =============================================

-- =============================================
-- FIN DEL SCRIPT
-- =============================================
