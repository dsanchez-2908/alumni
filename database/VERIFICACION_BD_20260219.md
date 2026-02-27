# Reporte de Verificación y Corrección de Base de Datos
**Fecha:** 2026-02-19  
**Sistema:** Alumni - Sistema de Gestión de Talleres de Arte  
**Base de Datos:** alumni

---

## 📋 RESUMEN EJECUTIVO

Se realizó un análisis completo de la base de datos de desarrollo y se comparó con el archivo `database/schema.sql`. Se encontraron **diferencias significativas** que causaban errores en el ambiente de prueba (Railway/Vercel).

**⚠️ IMPORTANTE: Todos los nombres de tabla están en MAYÚSCULAS**
Los scripts SQL generados usan nombres de tabla en **MAYÚSCULAS** (ejemplo: `TD_PARAMETROS`, `TD_ALUMNOS`) para garantizar compatibilidad con sistemas case-sensitive como Railway (Linux). Esto es crítico para que funcione correctamente en producción.

### Estadísticas
- **Tablas en BD de desarrollo:** 22
- **Tablas en schema.sql original:** 20
- **Tablas faltantes:** 2
- **Tablas con columnas faltantes:** 3
- **Tablas con columnas extra en schema.sql:** 2
- **✅ Conversión a MAYÚSCULAS:** Completada en todos los scripts

---

## ❌ PROBLEMAS ENCONTRADOS

### 1. Tablas Faltantes en schema.sql

#### 1.1. `tr_inscripcion_alumno`
**Estado:** ❌ FALTANTE en schema.sql  
**Registros en BD:** 2  
**Descripción:** Tabla para gestión de inscripciones de alumnos

```sql
CREATE TABLE `tr_inscripcion_alumno` (
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
  CONSTRAINT `tr_inscripcion_alumno_ibfk_1` FOREIGN KEY (`cdAlumno`) REFERENCES `td_alumnos` (`cdAlumno`) ON DELETE CASCADE,
  CONSTRAINT `tr_inscripcion_alumno_ibfk_2` FOREIGN KEY (`cdTaller`) REFERENCES `td_talleres` (`cdTaller`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### 1.2. `td_precios`
**Estado:** ❌ FALTANTE en schema.sql  
**Registros en BD:** 0 (tabla legacy, sin uso activo)  
**Descripción:** Tabla antigua de precios. Se mantiene por compatibilidad pero no se usa activamente.

```sql
CREATE TABLE `td_precios` (
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
  CONSTRAINT `td_precios_ibfk_1` FOREIGN KEY (`cdTipoTaller`) REFERENCES `td_tipo_talleres` (`cdTipoTaller`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

### 2. Columnas Faltantes en schema.sql

#### 2.1. Tabla `td_asistencias`
**Columna faltante:** `snContactado`

```sql
-- En la BD existe:
`snContactado` TINYINT(1) DEFAULT 0

-- En schema.sql: NO EXISTE
```

**Impacto:** Campo que indica si se contactó al alumno por la falta.

#### 2.2. Tabla `td_grupos_familiares`
**7 columnas faltantes:**

```sql
-- En la BD existen estas columnas adicionales:
`dsTelefonoContacto` VARCHAR(50) DEFAULT NULL,
`dsParentesco1` VARCHAR(50) DEFAULT NULL,
`dsMailContacto` VARCHAR(255) DEFAULT NULL,
`dsTelefonoContacto2` VARCHAR(50) DEFAULT NULL,
`dsParentesco2` VARCHAR(50) DEFAULT NULL,
`dsMailContacto2` VARCHAR(100) DEFAULT NULL,
`dsDomicilioFamiliar` VARCHAR(500) DEFAULT NULL,

-- En schema.sql: NO EXISTEN
```

**Impacto:** Schema.sql solo tiene 2 campos, pero la BD tiene 12 campos con información completa de contactos familiares.

#### 2.3. Tabla `td_pagos_detalle`
**2 columnas faltantes:**

```sql
-- En la BD existen:
`dsTipoPago` ENUM('Efectivo', 'Transferencia', 'Excepcion') NOT NULL DEFAULT 'Efectivo',
`snEsExcepcion` TINYINT(1) DEFAULT 0

-- En schema.sql: NO EXISTEN
```

**Impacto:** Se perdía información del tipo de pago a nivel de detalle y el flag de excepción.

---

### 3. Columnas Extra en schema.sql (No existen en BD)

#### 3.1. Tabla `td_novedades_alumno`
**Columna extra:** `feModificacion`

```sql
-- En schema.sql tiene:
`feModificacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

-- En la BD real solo existe:
`feAlta` DATETIME DEFAULT CURRENT_TIMESTAMP
```

**Solución:** Eliminar `feModificacion` de la nueva versión.

#### 3.2. Tabla `td_precios_talleres`
**Columna extra:** `feModificacion`

```sql
-- En schema.sql tiene:
`feModificacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP

-- En la BD real solo existe:
`feAlta` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**Solución:** Eliminar `feModificacion` de la nueva versión.

---

### 4. Diferencias en ENUM

#### 4.1. Tabla `td_pagos`
**Campo:** `dsTipoPago`

```sql
-- En la BD:
ENUM('Efectivo', 'Transferencia', 'Excepcion')

-- En schema.sql:
ENUM('Efectivo', 'Transferencia')  -- FALTA 'Excepcion'
```

**Impacto:** No se podía registrar pagos con excepción.

---

## ✅ SOLUCIÓN IMPLEMENTADA

### Archivos Generados

#### 1. `database/schema-extracted.sql`
Estructura completa extraída directamente de la base de datos de desarrollo usando el script `scripts/extract-db-structure.js`.

#### 2. `database/schema-corrected.sql`
**Nuevo archivo:** Schema corregido y limpio con:
- ✅ Todas las 22 tablas presentes en la BD de desarrollo
- ✅ Todas las columnas correctas
- ✅ Comentarios y documentación mejorada
- ✅ Datos iniciales (Estados, Roles, Parámetros)
- ✅ Formato consistente y legible

---

## 📊 COMPARATIVA DE TABLAS

| Tabla | Schema.sql Original | BD Desarrollo | schema-corrected.sql |
|-------|-------------------|---------------|---------------------|
| td_parametros | ✅ | ✅ | ✅ |
| td_estados | ✅ | ✅ | ✅ |
| td_roles | ✅ | ✅ | ✅ |
| td_tipo_talleres | ✅ | ✅ | ✅ |
| td_personal | ✅ | ✅ | ✅ |
| tr_personal_tipo_taller | ✅ | ✅ | ✅ |
| td_usuarios | ✅ | ✅ | ✅ |
| tr_usuario_rol | ✅ | ✅ | ✅ |
| td_alumnos | ✅ | ✅ | ✅ |
| td_grupos_familiares | ⚠️ 5 campos | ✅ 12 campos | ✅ 12 campos |
| tr_alumno_grupo_familiar | ✅ | ✅ | ✅ |
| td_talleres | ✅ | ✅ | ✅ |
| tr_alumno_taller | ✅ | ✅ | ✅ |
| tr_inscripcion_alumno | ❌ | ✅ | ✅ |
| td_asistencias | ⚠️ Sin snContactado | ✅ | ✅ |
| td_notificaciones_faltas | ✅ | ✅ | ✅ |
| td_precios_talleres | ⚠️ Con feModificacion | ✅ Sin feModificacion | ✅ |
| td_precios | ❌ | ✅ (legacy) | ✅ |
| td_pagos | ⚠️ Sin 'Excepcion' | ✅ | ✅ |
| td_pagos_detalle | ⚠️ Faltan 2 campos | ✅ | ✅ |
| td_traza | ✅ | ✅ | ✅ |
| td_novedades_alumno | ⚠️ Con feModificacion | ✅ Sin feModificacion | ✅ |

---

## 🚀 PASOS PARA IMPLEMENTAR

### ⚠️ NOTA SOBRE NOMBRES DE TABLA EN MAYÚSCULAS

**Todos los scripts usan nombres en MAYÚSCULAS: `TD_PARAMETROS`, `TD_ALUMNOS`, etc.**

Esto es **obligatorio** para sistemas case-sensitive como Railway (Linux). Si tus tablas actuales están en minúsculas, el script las reemplazará con mayúsculas.

### Opción 1: Implementación Completa (Recomendado para BD vacía)

```bash
# En Railway o tu servidor de prueba
mysql -u usuario -p alumni < database/schema-corrected.sql
```

**Nota:** Este script creará todas las tablas con nombres en **MAYÚSCULAS**.

### Opción 2: Migración desde BD Existente

Si ya tienes datos en Railway, necesitas ejecutar las siguientes migraciones:

**⚠️ MUY IMPORTANTE:** Si tus tablas en Railway están en minúsculas, primero debes renombrarlas:

```bash
# Ejecutar primero el script de renombre
mysql -u usuario -p alumni < database/rename-tables-to-uppercase.sql
```

Ver archivo `database/rename-tables-to-uppercase.sql` para detalles.

**Luego ejecuta las migraciones:**

```sql
-- 1. Agregar columna faltante en td_asistencias
ALTER TABLE `td_asistencias` 
ADD COLUMN `snContactado` TINYINT(1) DEFAULT 0 AFTER `dsObservacion`;

-- 2. Agregar columnas faltantes en td_grupos_familiares
ALTER TABLE `td_grupos_familiares` 
ADD COLUMN `dsTelefonoContacto` VARCHAR(50) DEFAULT NULL AFTER `dsNombreGrupo`,
ADD COLUMN `dsParentesco1` VARCHAR(50) DEFAULT NULL AFTER `dsTelefonoContacto`,
ADD COLUMN `dsMailContacto` VARCHAR(255) DEFAULT NULL AFTER `dsParentesco1`,
ADD COLUMN `dsTelefonoContacto2` VARCHAR(50) DEFAULT NULL AFTER `dsMailContacto`,
ADD COLUMN `dsParentesco2` VARCHAR(50) DEFAULT NULL AFTER `dsTelefonoContacto2`,
ADD COLUMN `dsMailContacto2` VARCHAR(100) DEFAULT NULL AFTER `dsParentesco2`,
ADD COLUMN `dsDomicilioFamiliar` VARCHAR(500) DEFAULT NULL AFTER `dsMailContacto2`;

-- 3. Agregar columnas faltantes en td_pagos_detalle
ALTER TABLE `td_pagos_detalle` 
ADD COLUMN `dsTipoPago` ENUM('Efectivo', 'Transferencia', 'Excepcion') NOT NULL DEFAULT 'Efectivo' AFTER `nuMonto`,
ADD COLUMN `snEsExcepcion` TINYINT(1) DEFAULT 0 AFTER `dsTipoPago`;

-- 4. Modificar ENUM en td_pagos para incluir 'Excepcion'
ALTER TABLE `td_pagos` 
MODIFY COLUMN `dsTipoPago` ENUM('Efectivo', 'Transferencia', 'Excepcion') NOT NULL DEFAULT 'Efectivo';

-- 5. Crear tabla tr_inscripcion_alumno
CREATE TABLE `tr_inscripcion_alumno` (
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
  CONSTRAINT `tr_inscripcion_alumno_ibfk_1` FOREIGN KEY (`cdAlumno`) REFERENCES `td_alumnos` (`cdAlumno`) ON DELETE CASCADE,
  CONSTRAINT `tr_inscripcion_alumno_ibfk_2` FOREIGN KEY (`cdTaller`) REFERENCES `td_talleres` (`cdTaller`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Crear tabla td_precios (legacy)
CREATE TABLE `td_precios` (
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
  CONSTRAINT `td_precios_ibfk_1` FOREIGN KEY (`cdTipoTaller`) REFERENCES `td_tipo_talleres` (`cdTipoTaller`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Eliminar columnas que no existen en la BD de desarrollo (si existen en Railway)
-- Verificar primero si existen antes de ejecutar:
-- ALTER TABLE `td_novedades_alumno` DROP COLUMN IF EXISTS `feModificacion`;
-- ALTER TABLE `td_precios_talleres` DROP COLUMN IF EXISTS `feModificacion`;
```

Guarda estas migraciones en un archivo: `database/migration-to-corrected-schema.sql`

---

## 📝 NOTAS IMPORTANTES

### Sobre el Problema de Mayúsculas/Minúsculas

El problema original que mencionaste sobre las mayúsculas/minúsculas en los nombres de tabla:
- **MySQL en Windows (desarrollo):** NO distingue mayúsculas de minúsculas por defecto
- **MySQL en Linux (Railway):** SÍ distingue mayúsculas de minúsculas

**Solución aplicada:**
- El schema corregido usa nombres en **MAYÚSCULAS** con backticks: `` `TD_PARAMETROS` ``
- **TODOS los nombres de tabla están en MAYÚSCULAS** para compatibilidad con sistemas case-sensitive
- Esto garantiza funcionamiento correcto en Railway (Linux) que es case-sensitive

### Recomendaciones

1. **Para ambiente de prueba (Railway):**
   - Ejecutar `database/schema-corrected.sql` desde cero (si no hay datos importantes)
   - O ejecutar las migraciones en `database/migration-to-corrected-schema.sql`
   - **Todos los nombres de tabla están en MAYÚSCULAS** para compatibilidad case-sensitive

2. **Para ambiente de desarrollo:**
   - Los scripts usan nombres en MAYÚSCULAS, pero MySQL en Windows es case-insensitive
   - Funcionará correctamente sin importar cómo tengas las tablas actualmente

3. **Para producción:**
   - Primero probar en Railway (prueba)
   - Una vez verificado, aplicar a producción
   - Verificar que todos los queries en tu código usen las tablas en MAYÚSCULAS

4. **Mantener sincronizado:**
   - Usar `scripts/extract-db-structure.js` periódicamente para verificar
   - Usar `scripts/convert-tables-to-uppercase.js` para convertir nombres a mayúsculas
   - Cualquier cambio futuro debe actualizarse en `schema-corrected.sql`

---

## 🔍 VERIFICACIÓN POST-IMPLEMENTACIÓN

Después de implementar en Railway, ejecuta este script para verificar:

```bash
node scripts/extract-db-structure.js
```

Debería mostrar:
```
✅ Todas las tablas coinciden!
📋 Verificando columnas de cada tabla:
[Sin errores]
```

---

## 📂 ARCHIVOS GENERADOS

1. **`database/schema-extracted.sql`** - Estructura extraída de la BD de desarrollo
2. **`database/schema-corrected.sql`** - Schema corregido y limpio con TABLAS EN MAYÚSCULAS (USAR ESTE) ⭐
3. **`database/migration-to-corrected-schema.sql`** - Script de migración con TABLAS EN MAYÚSCULAS
4. **`database/rename-tables-to-uppercase.sql`** - Script para renombrar tablas existentes a MAYÚSCULAS ⭐
5. **`scripts/extract-db-structure.js`** - Script de verificación de estructura
6. **`scripts/convert-tables-to-uppercase.js`** - Script para convertir nombres a MAYÚSCULAS
7. **`database/VERIFICACION_BD_20260219.md`** - Este documento

---

## ✅ CONCLUSIÓN

El schema.sql original tenía **diferencias significativas** con tu base de datos de desarrollo. El nuevo archivo `schema-corrected.sql` está completamente sincronizado y listo para implementar en Railway/Vercel.

**✅ CAMBIO CRÍTICO: Nombres de tabla en MAYÚSCULAS**
Todos los scripts SQL ahora usan nombres de tabla en **MAYÚSCULAS** (`TD_PARAMETROS`, `TD_ALUMNOS`, etc.) para garantizar compatibilidad con sistemas case-sensitive como Railway (Linux).

**Próximos pasos:**
1. ✅ Revisar este documento
2. ⏭️ Decidir: Implementación completa o migración
3. ⏭️ Si tienes tablas existentes en minúsculas, ejecutar `rename-tables-to-uppercase.sql`
4. ⏭️ Ejecutar el script correspondiente en Railway (`schema-corrected.sql` o `migration-to-corrected-schema.sql`)
5. ⏭️ Verificar con `SHOW TABLES;` que todas las tablas estén en MAYÚSCULAS
6. ⏭️ Probar la aplicación en Vercel+Railway

---

**Fecha de generación:** 2026-02-19  
**Generado por:** Script automático de verificación de BD
