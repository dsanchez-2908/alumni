# Migración de Base de Datos para Railway

## Pasos para ejecutar la migración completa

### 1. Conectarse a Railway MySQL

En el dashboard de Railway, ve a tu servicio MySQL y:
1. Haz clic en la pestaña **"Connect"**
2. Copia la **MySQL Connection URL** o los datos de conexión individuales

### 2. Ejecutar el script de migración

**Opción A: Desde MySQL CLI**

```bash
mysql -h <host> -u <usuario> -p<contraseña> <nombre_base_datos> < railway-migration.sql
```

Ejemplo:
```bash
mysql -h containers-us-west-123.railway.app -u root -pTUCONTRASEÑA alumni < railway-migration.sql
```

**Opción B: Desde MySQL Workbench o DBeaver**

1. Conecta a tu base de datos de Railway
2. Abre el archivo `railway-migration.sql`
3. Ejecuta todo el script

**Opción C: Desde el Query Tool de Railway**

1. Ve a tu servicio MySQL en Railway
2. Haz clic en **"Query"** 
3. Copia y pega el contenido de `railway-migration.sql`
4. Ejecuta el script

### 3. Crear el usuario administrador

Después de ejecutar el script de migración, necesitas crear el usuario administrador desde la aplicación:

**Opción A: Desde tu máquina local**

```bash
# Asegúrate de tener las variables de entorno de Railway configuradas
npm run db:init
```

**Opción B: Ejecutar el script directamente**

```bash
node scripts/init-db.ts
```

El script creará un usuario administrador con:
- **Usuario**: `admin`
- **Contraseña**: `123` (cámbiala después del primer login)

### 4. Verificar la migración

Puedes verificar que todas las tablas se crearon correctamente ejecutando:

```sql
SHOW TABLES;
```

Deberías ver 19 tablas:
- TD_PARAMETROS
- TD_ESTADOS
- TD_ROLES
- TD_TIPO_TALLERES
- TD_PERSONAL
- TR_PERSONAL_TIPO_TALLER
- TD_USUARIOS
- TR_USUARIO_ROL
- TD_ALUMNOS
- TD_GRUPOS_FAMILIARES
- TR_ALUMNO_GRUPO_FAMILIAR
- TD_TALLERES
- TR_ALUMNO_TALLER
- TD_ASISTENCIAS
- TD_NOTIFICACIONES_FALTAS
- TD_PRECIOS
- TD_PAGOS
- TD_PAGOS_DETALLE
- TD_TRAZA

### 5. Configurar variables de entorno en Vercel

Asegúrate de que Vercel tenga las variables de entorno correctas:

```env
DATABASE_URL=mysql://usuario:contraseña@host:puerto/database
```

## Cambios aplicados en esta migración

1. ✅ **TD_FALTAS → TD_ASISTENCIAS**: Renombrada la tabla y agregado campo `snPresente`
2. ✅ **TR_ALUMNO_TALLER**: Agregado campo `cdEstado`
3. ✅ **TD_GRUPOS_FAMILIARES**: Agregados campos `cdEstado` y `feActualizacion`
4. ✅ **TD_ESTADOS**: Agregado estado "Finalizado" (cdEstado = 4)
5. ✅ **Estructura completa**: Todas las tablas con nombres en MAYÚSCULAS

## Notas importantes

- ⚠️ Este script **ELIMINA TODOS LOS DATOS** existentes
- ⚠️ Asegúrate de hacer un backup si tienes datos importantes
- ⚠️ El script desactiva temporalmente las foreign keys para poder eliminar todas las tablas
- ✅ Todas las tablas usan UTF-8 (utf8mb4_unicode_ci) para soporte completo de caracteres especiales
- ✅ Todas las tablas son InnoDB para soporte de transacciones

## Troubleshooting

**Error: "Access denied"**
- Verifica que tienes permisos de administrador en la base de datos
- Revisa que el usuario y contraseña sean correctos

**Error: "Unknown database"**
- Crea primero la base de datos: `CREATE DATABASE IF NOT EXISTS alumni;`
- Luego ejecuta el script de migración

**Error al ejecutar init-db.ts**
- Verifica que el archivo `.env.local` tenga la variable `DATABASE_URL` correcta
- Asegúrate de que la base de datos esté accesible desde tu máquina local
