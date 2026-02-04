-- =============================================
-- Agregar fecha de nacimiento a TD_PERSONAL
-- Fecha: 2026-02-04
-- =============================================

USE alumni;

-- Agregar campo feNacimiento a TD_PERSONAL
ALTER TABLE TD_PERSONAL
ADD COLUMN feNacimiento DATE NULL AFTER dsMail;

-- Verificar el cambio
DESCRIBE TD_PERSONAL;
