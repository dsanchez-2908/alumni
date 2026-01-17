-- =============================================
-- SCRIPT PARA VERIFICAR LA ESTRUCTURA DE LA BASE DE DATOS
-- =============================================

USE alumni;

-- Mostrar todas las tablas
SHOW TABLES;

-- Verificar Estados
SELECT 'TD_ESTADOS' as Tabla, COUNT(*) as Registros FROM TD_ESTADOS;

-- Verificar Roles
SELECT 'TD_ROLES' as Tabla, COUNT(*) as Registros FROM TD_ROLES;

-- Verificar Parámetros
SELECT 'TD_PARAMETROS' as Tabla, COUNT(*) as Registros FROM TD_PARAMETROS;

-- Mostrar datos de Estados
SELECT * FROM TD_ESTADOS;

-- Mostrar datos de Roles
SELECT * FROM TD_ROLES;

-- Mostrar datos de Parámetros
SELECT * FROM TD_PARAMETROS;

-- Verificar si existe usuario admin
SELECT 
    u.cdUsuario,
    u.dsNombreCompleto,
    u.dsUsuario,
    e.dsEstado,
    GROUP_CONCAT(r.dsRol) as Roles
FROM TD_USUARIOS u
INNER JOIN TD_ESTADOS e ON u.cdEstado = e.cdEstado
LEFT JOIN TR_USUARIO_ROL ur ON u.cdUsuario = ur.cdUsuario
LEFT JOIN TD_ROLES r ON ur.cdRol = r.cdRol
WHERE u.dsUsuario = 'admin'
GROUP BY u.cdUsuario;
