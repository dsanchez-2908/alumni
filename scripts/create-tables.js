/**
 * Script para crear todas las tablas de la base de datos
 * Ejecutar con: node scripts/create-tables.js
 */

const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'admin',
  multipleStatements: true
};

async function createDatabase() {
  let connection;
  
  try {
    console.log('🔌 Conectando a MySQL...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conexión establecida');

    // Crear base de datos
    console.log('📦 Creando base de datos alumni...');
    await connection.query('CREATE DATABASE IF NOT EXISTS alumni');
    console.log('✅ Base de datos creada');

    // Usar la base de datos
    await connection.query('USE alumni');

    // Crear tablas
    console.log('🏗️  Creando tablas...');

    // TD_PARAMETROS
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TD_PARAMETROS (
        id INT AUTO_INCREMENT PRIMARY KEY,
        dsParametro VARCHAR(250) NOT NULL UNIQUE,
        dsValor TEXT NOT NULL,
        feCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        feModificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ TD_PARAMETROS');

    // TD_ESTADOS
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TD_ESTADOS (
        cdEstado INT AUTO_INCREMENT PRIMARY KEY,
        dsEstado VARCHAR(50) NOT NULL UNIQUE,
        dsDescripcion VARCHAR(255),
        feCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ TD_ESTADOS');

    // TD_ROLES
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TD_ROLES (
        cdRol INT AUTO_INCREMENT PRIMARY KEY,
        dsRol VARCHAR(50) NOT NULL UNIQUE,
        dsDescripcion VARCHAR(255),
        feCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ TD_ROLES');

    // TD_TIPO_TALLERES
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TD_TIPO_TALLERES (
        cdTipoTaller INT AUTO_INCREMENT PRIMARY KEY,
        dsNombreTaller VARCHAR(100) NOT NULL,
        dsDescripcionTaller TEXT,
        nuEdadDesde INT,
        nuEdadHasta INT,
        cdEstado INT NOT NULL DEFAULT 1,
        feCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        feModificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (cdEstado) REFERENCES TD_ESTADOS(cdEstado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ TD_TIPO_TALLERES');

    // TD_PERSONAL
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TD_PERSONAL (
        cdPersonal INT AUTO_INCREMENT PRIMARY KEY,
        dsNombreCompleto VARCHAR(255) NOT NULL,
        dsTipoPersonal ENUM('Profesor', 'Auxiliar') NOT NULL,
        dsDescripcionPuesto VARCHAR(255) NULL,
        dsDomicilio VARCHAR(255),
        dsTelefono VARCHAR(50),
        dsMail VARCHAR(100),
        cdEstado INT NOT NULL DEFAULT 1,
        feCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        feModificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (cdEstado) REFERENCES TD_ESTADOS(cdEstado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ TD_PERSONAL');

    // TR_PERSONAL_TIPO_TALLER
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TR_PERSONAL_TIPO_TALLER (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cdPersonal INT NOT NULL,
        cdTipoTaller INT NOT NULL,
        feAsociacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cdPersonal) REFERENCES TD_PERSONAL(cdPersonal) ON DELETE CASCADE,
        FOREIGN KEY (cdTipoTaller) REFERENCES TD_TIPO_TALLERES(cdTipoTaller) ON DELETE CASCADE,
        UNIQUE KEY UK_Personal_TipoTaller (cdPersonal, cdTipoTaller)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ TR_PERSONAL_TIPO_TALLER');

    // TD_USUARIOS
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TD_USUARIOS (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ TD_USUARIOS');

    // TR_USUARIO_ROL
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TR_USUARIO_ROL (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cdUsuario INT NOT NULL,
        cdRol INT NOT NULL,
        feAsignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cdUsuario) REFERENCES TD_USUARIOS(cdUsuario) ON DELETE CASCADE,
        FOREIGN KEY (cdRol) REFERENCES TD_ROLES(cdRol) ON DELETE CASCADE,
        UNIQUE KEY UK_Usuario_Rol (cdUsuario, cdRol)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ TR_USUARIO_ROL');

    // TD_ALUMNOS
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TD_ALUMNOS (
        cdAlumno INT AUTO_INCREMENT PRIMARY KEY,
        dsNombre VARCHAR(100) NOT NULL,
        dsApellido VARCHAR(100) NOT NULL,
        dsDNI VARCHAR(20) NOT NULL UNIQUE,
        dsSexo ENUM('Masculino', 'Femenino') NOT NULL,
        dsMail VARCHAR(100),
        feNacimiento DATE NOT NULL,
        dsDomicilio VARCHAR(255),
        dsTelefonoCelular VARCHAR(50),
        dsTelefonoFijo VARCHAR(50),
        dsTelefonoContacto1 VARCHAR(50),
        dsParentesco1 VARCHAR(50),
        dsTelefonoContacto2 VARCHAR(50),
        dsParentesco2 VARCHAR(50),
        cdEstado INT NOT NULL DEFAULT 1,
        feAlta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        feModificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (cdEstado) REFERENCES TD_ESTADOS(cdEstado)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ TD_ALUMNOS');

    // TD_GRUPOS_FAMILIARES
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TD_GRUPOS_FAMILIARES (
        cdGrupoFamiliar INT AUTO_INCREMENT PRIMARY KEY,
        dsNombreGrupo VARCHAR(255),
        feCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ TD_GRUPOS_FAMILIARES');

    // TR_ALUMNO_GRUPO_FAMILIAR
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TR_ALUMNO_GRUPO_FAMILIAR (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cdAlumno INT NOT NULL,
        cdGrupoFamiliar INT NOT NULL,
        feAsociacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cdAlumno) REFERENCES TD_ALUMNOS(cdAlumno) ON DELETE CASCADE,
        FOREIGN KEY (cdGrupoFamiliar) REFERENCES TD_GRUPOS_FAMILIARES(cdGrupoFamiliar) ON DELETE CASCADE,
        UNIQUE KEY UK_Alumno_GrupoFamiliar (cdAlumno, cdGrupoFamiliar)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ TR_ALUMNO_GRUPO_FAMILIAR');

    // TD_TALLERES
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TD_TALLERES (
        cdTaller INT AUTO_INCREMENT PRIMARY KEY,
        nuAnioTaller YEAR NOT NULL,
        cdTipoTaller INT NOT NULL,
        cdPersonal INT NOT NULL,
        feInicioTaller DATE NOT NULL,
        dsDescripcionHorarios TEXT,
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ TD_TALLERES');

    // TR_ALUMNO_TALLER
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TR_ALUMNO_TALLER (
        id INT AUTO_INCREMENT PRIMARY KEY,
        cdAlumno INT NOT NULL,
        cdTaller INT NOT NULL,
        feInscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        feBaja TIMESTAMP NULL,
        FOREIGN KEY (cdAlumno) REFERENCES TD_ALUMNOS(cdAlumno) ON DELETE CASCADE,
        FOREIGN KEY (cdTaller) REFERENCES TD_TALLERES(cdTaller) ON DELETE CASCADE,
        UNIQUE KEY UK_Alumno_Taller_Activo (cdAlumno, cdTaller)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ TR_ALUMNO_TALLER');

    // TD_FALTAS
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TD_FALTAS (
        cdFalta INT AUTO_INCREMENT PRIMARY KEY,
        cdTaller INT NOT NULL,
        cdAlumno INT NOT NULL,
        feFalta DATE NOT NULL,
        dsObservacion VARCHAR(255),
        cdUsuarioRegistro INT NOT NULL,
        feRegistro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cdTaller) REFERENCES TD_TALLERES(cdTaller) ON DELETE CASCADE,
        FOREIGN KEY (cdAlumno) REFERENCES TD_ALUMNOS(cdAlumno) ON DELETE CASCADE,
        FOREIGN KEY (cdUsuarioRegistro) REFERENCES TD_USUARIOS(cdUsuario),
        UNIQUE KEY UK_Falta_Alumno_Fecha (cdTaller, cdAlumno, feFalta)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ TD_FALTAS');

    // TD_NOTIFICACIONES_FALTAS
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TD_NOTIFICACIONES_FALTAS (
        cdNotificacion INT AUTO_INCREMENT PRIMARY KEY,
        cdAlumno INT NOT NULL,
        feNotificacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        dsRespuesta TEXT,
        cdUsuarioNotifica INT NOT NULL,
        FOREIGN KEY (cdAlumno) REFERENCES TD_ALUMNOS(cdAlumno) ON DELETE CASCADE,
        FOREIGN KEY (cdUsuarioNotifica) REFERENCES TD_USUARIOS(cdUsuario)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ TD_NOTIFICACIONES_FALTAS');

    // TD_PRECIOS
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TD_PRECIOS (
        cdPrecio INT AUTO_INCREMENT PRIMARY KEY,
        fePrecio DATE NOT NULL,
        cdTipoTaller INT NOT NULL,
        nuPrecioEfectivo1Taller DECIMAL(10,2) NOT NULL,
        nuPrecioTransferencia1Taller DECIMAL(10,2) NOT NULL,
        nuPrecioEfectivo2Taller DECIMAL(10,2) NOT NULL,
        nuPrecioTransferencia2Taller DECIMAL(10,2) NOT NULL,
        nuPrecioEfectivo3Taller DECIMAL(10,2) NOT NULL,
        nuPrecioTransferencia3Taller DECIMAL(10,2) NOT NULL,
        nuPrecioEfectivo4Taller DECIMAL(10,2) NOT NULL,
        nuPrecioTransferencia4Taller DECIMAL(10,2) NOT NULL,
        nuPrecioEfectivo5Taller DECIMAL(10,2) NOT NULL,
        nuPrecioTransferencia5Taller DECIMAL(10,2) NOT NULL,
        feCreacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cdTipoTaller) REFERENCES TD_TIPO_TALLERES(cdTipoTaller),
        INDEX IDX_Precio_Fecha (fePrecio, cdTipoTaller)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ TD_PRECIOS');

    // TD_PAGOS
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TD_PAGOS (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ TD_PAGOS');

    // TD_PAGOS_DETALLE
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TD_PAGOS_DETALLE (
        cdPagoDetalle INT AUTO_INCREMENT PRIMARY KEY,
        cdPago INT NOT NULL,
        cdTaller INT NOT NULL,
        cdAlumno INT NOT NULL,
        nuMonto DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (cdPago) REFERENCES TD_PAGOS(cdPago) ON DELETE CASCADE,
        FOREIGN KEY (cdTaller) REFERENCES TD_TALLERES(cdTaller),
        FOREIGN KEY (cdAlumno) REFERENCES TD_ALUMNOS(cdAlumno)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ TD_PAGOS_DETALLE');

    // TD_TRAZA
    await connection.query(`
      CREATE TABLE IF NOT EXISTS TD_TRAZA (
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('  ✓ TD_TRAZA');

    // Insertar datos iniciales
    console.log('\n📝 Insertando datos iniciales...');

    // Estados
    await connection.query(`
      INSERT IGNORE INTO TD_ESTADOS (dsEstado, dsDescripcion) VALUES
      ('Activo', 'Estado activo en el sistema'),
      ('Inactivo', 'Estado inactivo en el sistema'),
      ('Baja', 'Estado de baja definitiva')
    `);
    console.log('  ✓ Estados insertados');

    // Roles
    await connection.query(`
      INSERT IGNORE INTO TD_ROLES (dsRol, dsDescripcion) VALUES
      ('Administrador', 'Acceso total al sistema'),
      ('Supervisor', 'Supervisión y reportes'),
      ('Profesor', 'Registro de faltas y consultas'),
      ('Operador', 'Operaciones generales'),
      ('Externo', 'Acceso limitado externo')
    `);
    console.log('  ✓ Roles insertados');

    // Parámetros
    await connection.query(`
      INSERT IGNORE INTO TD_PARAMETROS (dsParametro, dsValor) VALUES
      ('SISTEMA_NOMBRE', 'Alumni - Sistema de Gestión de Talleres'),
      ('SISTEMA_VERSION', '1.0.0'),
      ('FALTAS_CONSECUTIVAS_NOTIFICAR', '2'),
      ('MONEDA', 'ARS'),
      ('TIMEZONE', 'America/Argentina/Buenos_Aires')
    `);
    console.log('  ✓ Parámetros insertados');

    console.log('\n✅ ¡Base de datos creada exitosamente!');
    console.log('\n📋 Próximo paso: Ejecutar "npm run init-db" para crear el usuario admin\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createDatabase();
