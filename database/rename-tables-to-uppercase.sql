-- =============================================
-- Script para renombrar tablas de minúsculas a MAYÚSCULAS
-- Fecha: 2026-02-19
-- Descripción: Convierte nombres de tabla para compatibilidad case-sensitive
-- =============================================

-- IMPORTANTE: Ejecutar este script SOLO si tus tablas están en minúsculas
-- y necesitas convertirlas a MAYÚSCULAS para Railway (Linux)

-- =============================================
-- RENOMBRAR TODAS LAS TABLAS
-- =============================================

-- Tablas de definición (TD_)
RENAME TABLE `td_parametros` TO `TD_PARAMETROS`;
RENAME TABLE `td_estados` TO `TD_ESTADOS`;
RENAME TABLE `td_roles` TO `TD_ROLES`;
RENAME TABLE `td_tipo_talleres` TO `TD_TIPO_TALLERES`;
RENAME TABLE `td_personal` TO `TD_PERSONAL`;
RENAME TABLE `td_usuarios` TO `TD_USUARIOS`;
RENAME TABLE `td_alumnos` TO `TD_ALUMNOS`;
RENAME TABLE `td_grupos_familiares` TO `TD_GRUPOS_FAMILIARES`;
RENAME TABLE `td_talleres` TO `TD_TALLERES`;
RENAME TABLE `td_asistencias` TO `TD_ASISTENCIAS`;
RENAME TABLE `td_notificaciones_faltas` TO `TD_NOTIFICACIONES_FALTAS`;
RENAME TABLE `td_precios_talleres` TO `TD_PRECIOS_TALLERES`;
RENAME TABLE `td_pagos` TO `TD_PAGOS`;
RENAME TABLE `td_pagos_detalle` TO `TD_PAGOS_DETALLE`;
RENAME TABLE `td_traza` TO `TD_TRAZA`;
RENAME TABLE `td_novedades_alumno` TO `TD_NOVEDADES_ALUMNO`;

-- Tablas de relación (TR_)
RENAME TABLE `tr_personal_tipo_taller` TO `TR_PERSONAL_TIPO_TALLER`;
RENAME TABLE `tr_usuario_rol` TO `TR_USUARIO_ROL`;
RENAME TABLE `tr_alumno_grupo_familiar` TO `TR_ALUMNO_GRUPO_FAMILIAR`;
RENAME TABLE `tr_alumno_taller` TO `TR_ALUMNO_TALLER`;

-- Tablas adicionales (solo si existen)
-- Descomentar estas líneas SOLO si estas tablas existen en tu BD
-- RENAME TABLE `td_precios` TO `TD_PRECIOS`;
-- RENAME TABLE `tr_inscripcion_alumno` TO `TR_INSCRIPCION_ALUMNO`;

-- =============================================
-- VERIFICACIÓN
-- =============================================
SELECT 'Renombre completado! Verificando tablas...' AS '';

-- Mostrar todas las tablas (deberían estar en MAYÚSCULAS)
SHOW TABLES;

SELECT 'Si todas las tablas aparecen en MAYÚSCULAS, el proceso fue exitoso.' AS '';

-- =============================================
-- FIN DEL SCRIPT
-- =============================================
