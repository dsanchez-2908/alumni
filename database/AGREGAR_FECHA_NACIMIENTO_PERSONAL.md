# Agregar Fecha de Nacimiento a Personal

## Descripción
Este script agrega el campo `feNacimiento` a la tabla `TD_PERSONAL` para permitir registrar las fechas de nacimiento de los profesores y auxiliares.

## Ejecución en Railway

1. Conectarse a la base de datos en Railway
2. Ejecutar el siguiente comando SQL:

```sql
USE alumni;

ALTER TABLE TD_PERSONAL
ADD COLUMN feNacimiento DATE NULL AFTER dsMail;
```

## Verificación

Verificar que el campo se agregó correctamente:

```sql
DESCRIBE TD_PERSONAL;
```

Deberías ver el campo `feNacimiento` de tipo `date` y que permite valores NULL.

## Cambios realizados

### Base de Datos
- ✅ Actualizado `database/schema.sql` con el campo `feNacimiento`
- ✅ Creado script de migración `database/add-fecha-nacimiento-personal.sql`

### Backend (API)
- ✅ Actualizado GET `/api/personal` para incluir `feNacimiento` en el SELECT
- ✅ Actualizado POST `/api/personal` para insertar `feNacimiento`
- ✅ Actualizado PUT `/api/personal/[id]` para actualizar `feNacimiento`
- ✅ El GET `/api/dashboard/stats` ya estaba preparado para mostrar cumpleaños de profesores

### Frontend
- ✅ Actualizada interfaz `Personal` en `app/dashboard/personal/page.tsx`
- ✅ Agregado campo en formData (alta y edición)
- ✅ Agregada columna "Fecha Nac." en la grilla de personal
- ✅ Agregado campo de fecha en el formulario de crear/editar
- ✅ Agregada fecha de nacimiento en el diálogo de detalles
- ✅ El dashboard ya muestra cumpleaños de alumnos y profesores combinados

## Uso

Ahora los usuarios pueden:
1. Registrar la fecha de nacimiento al crear un nuevo personal
2. Editar la fecha de nacimiento de personal existente
3. Ver la fecha de nacimiento en la grilla de personal
4. Ver la fecha de nacimiento en el detalle del personal
5. Los cumpleaños de los profesores aparecen automáticamente en el dashboard junto con los de los alumnos

## Notas
- El campo es opcional (NULL), no requiere datos para registros existentes
- La fecha se muestra en formato local argentino (DD/MM/YYYY)
- Los cumpleaños se ordenan por días faltantes y se muestran los próximos 5 en el dashboard
