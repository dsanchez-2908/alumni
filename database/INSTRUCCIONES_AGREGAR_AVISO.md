# Instrucciones para Agregar Campo snAviso a TD_ASISTENCIAS en Producción

**Fecha:** 21 de Marzo de 2026  
**Módulo:** Registro de Asistencias  
**Objetivo:** Agregar campo "Aviso?" para indicar si el alumno avisó antes de faltar

---

## ⚠️ IMPORTANTE - Leer antes de ejecutar

Este cambio **modifica la tabla TD_ASISTENCIAS en producción**.  
Se recomienda realizar en un horario de bajo uso del sistema.

---

## 📋 Resumen del Cambio

Se agrega el campo `snAviso` a la tabla `TD_ASISTENCIAS` para registrar si un alumno avisó antes de faltar a clase.

**Valores posibles:**
- `0` = NO avisó (valor por defecto)
- `1` = SI avisó

---

## 🔧 Pasos para Aplicar el Cambio

### 1. Realizar Backup de la Base de Datos

```sql
-- Conectarse a la base de datos
mysqldump -u [usuario] -p [nombre_base_datos] > backup_antes_snAviso_20260321.sql
```

**IMPORTANTE:** Guardar este backup en un lugar seguro antes de continuar.

---

### 2. Ejecutar Script SQL

Ejecutar el archivo: `database/add-aviso-asistencias.sql`

**Opción A - Desde MySQL Workbench o herramienta GUI:**
1. Abrir MySQL Workbench
2. Conectarse a la base de datos de producción
3. Abrir el archivo `add-aviso-asistencias.sql`
4. Ejecutar el script completo
5. Verificar los mensajes de salida

**Opción B - Desde línea de comandos:**

```bash
mysql -u [usuario] -p [nombre_base_datos] < database/add-aviso-asistencias.sql
```

---

### 3. Verificar que el Cambio se Aplicó Correctamente

Ejecutar las siguientes consultas para verificar:

```sql
-- 1. Verificar que la columna existe
DESCRIBE TD_ASISTENCIAS;

-- Debe mostrar el campo snAviso:
-- snAviso | tinyint(1) | NO | | 0 | 0=No avisó, 1=Avisó antes de faltar

-- 2. Verificar que los registros existentes tienen valor 0 (NO avisó)
SELECT 
    COUNT(*) as total_registros,
    SUM(CASE WHEN snAviso = 0 THEN 1 ELSE 0 END) as sin_aviso,
    SUM(CASE WHEN snAviso = 1 THEN 1 ELSE 0 END) as con_aviso
FROM TD_ASISTENCIAS;

-- 3. Verificar algunos registros
SELECT 
    cdFalta,
    cdAlumno,
    feFalta,
    snPresente,
    dsObservacion,
    snAviso
FROM TD_ASISTENCIAS
LIMIT 10;
```

---

## 📱 Cambios en la Aplicación

Los siguientes archivos fueron modificados y ya están listos para funcionar con el nuevo campo:

### Archivos Modificados:

1. **API Route:** `app/api/talleres/[id]/faltas/route.ts`
   - GET: Devuelve el campo `snAviso`
   - POST: Recibe y guarda el campo `snAviso`

2. **Pantalla de Asistencias:** `app/dashboard/talleres/[id]/asistencia/page.tsx`
   - Agregada columna "Aviso?" con opciones SI/NO
   - Por defecto muestra NO (0)
   - Se muestra solo cuando el alumno está marcado como ausente

---

## 🎯 Funcionamiento de la Nueva Característica

### En la Pantalla de Registro de Asistencias:

1. El usuario marca un alumno como **Ausente** (checkbox)
2. Se habilitan dos campos adicionales:
   - **Aviso?** - Select con opciones NO (default) / SI
   - **Observación** - Campo de texto (opcional)
3. El usuario selecciona si el alumno avisó o no
4. Al guardar, se registra el valor de `snAviso` en la base de datos

### Valores por Defecto:

- **Nuevos registros:** `snAviso = 0` (NO avisó)
- **Registros existentes:** Se mantienen con `snAviso = 0`
- **Alumnos presentes:** No se guarda información de aviso

---

## ✅ Verificación Post-Despliegue

Después de aplicar los cambios, verificar:

1. ✅ La columna `snAviso` existe en `TD_ASISTENCIAS`
2. ✅ Los registros existentes tienen `snAviso = 0`
3. ✅ La pantalla de registro de asistencias muestra la columna "Aviso?"
4. ✅ Al marcar un alumno ausente, aparece el select SI/NO
5. ✅ Al guardar, el valor se registra correctamente en la BD
6. ✅ La pantalla de consulta de asistencias muestra el campo correctamente

---

## 🔄 Rollback (en caso de problemas)

Si es necesario revertir los cambios:

```sql
-- Eliminar la columna agregada
ALTER TABLE TD_ASISTENCIAS DROP COLUMN snAviso;
```

**Luego:**
1. Restaurar el backup previo si es necesario
2. Revertir los cambios en el código de la aplicación usando git

---

## 📊 Impacto en Otras Tablas

**✅ NO se requieren cambios en otras tablas.**

Este cambio solo afecta a:
- `TD_ASISTENCIAS` (tabla principal modificada)
- Archivos de código relacionados con registro de asistencias

---

## 📞 Soporte

En caso de problemas durante la implementación:
1. Detener el proceso inmediatamente
2. NO continuar con los siguientes pasos
3. Verificar los logs de error
4. Consultar con el equipo técnico

---

## ✅ Checklist de Implementación

- [ ] Backup de base de datos realizado
- [ ] Script SQL ejecutado sin errores
- [ ] Columna snAviso verificada en TD_ASISTENCIAS
- [ ] Registros existentes con valor 0 (NO avisó)
- [ ] Pantalla de registro carga correctamente
- [ ] Campo "Aviso?" se muestra al marcar ausente
- [ ] Valores SI/NO funcionan correctamente
- [ ] Guardado de asistencia funciona con nuevo campo
- [ ] Pantalla de consulta muestra información correcta

---

**Implementado por:** Sistema Alumni - Gestión de Talleres  
**Versión:** 1.0  
**Fecha:** 21/03/2026
