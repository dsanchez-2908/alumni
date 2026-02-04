# Agregar columna feFinalizacion a TR_ALUMNO_TALLER

## Problema
La API en Vercel devuelve el error:
```
Unknown column 'at.feFinalizacion' in 'field list'
```

## Solución
La tabla `TR_ALUMNO_TALLER` necesita la columna `feFinalizacion` que faltaba en el schema.

## Pasos para aplicar en Railway

### Opción 1: Desde Railway Dashboard (Recomendado)
1. Ir a https://railway.app
2. Seleccionar tu proyecto Alumni
3. Ir a la base de datos MySQL
4. Click en "Query"
5. Copiar y pegar el siguiente comando:

```sql
ALTER TABLE TR_ALUMNO_TALLER 
ADD COLUMN feFinalizacion TIMESTAMP NULL AFTER feBaja;
```

6. Ejecutar el comando
7. Verificar con:
```sql
SHOW COLUMNS FROM TR_ALUMNO_TALLER;
```

### Opción 2: Desde MySQL Workbench o CLI
1. Conectarse a la base de datos de Railway
2. Ejecutar el script `database/add-fefinalizacion.sql`

### Opción 3: Script completo
Si ejecutaste el script `railway-migration.sql` completo, esta columna ya está incluida.

## Verificación
Una vez aplicado, la tabla TR_ALUMNO_TALLER debe tener estas columnas:
- id (PK)
- cdAlumno
- cdTaller
- cdEstado
- feInscripcion
- feBaja
- **feFinalizacion** ← NUEVA COLUMNA

## Archivos actualizados en el repositorio
- ✅ `database/schema.sql` - Agregada columna feFinalizacion
- ✅ `database/railway-migration.sql` - Agregada columna feFinalizacion
- ✅ `database/add-fefinalizacion.sql` - Script para agregar solo esta columna

## Después de aplicar
Vercel redesplegará automáticamente y el error debería desaparecer.
