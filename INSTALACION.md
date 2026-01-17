# 🚀 Guía de Instalación y Configuración - Alumni

## Paso 1: Instalar Dependencias

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
npm install
```

Esto instalará todas las dependencias necesarias del proyecto.

## Paso 2: Verificar MySQL

Asegúrate de que MySQL esté ejecutándose:

1. **Verificar el servicio MySQL95:**
   - Abre "Servicios" de Windows (services.msc)
   - Busca "MySQL95"
   - Asegúrate de que esté "Iniciado"

2. **O verifica desde la terminal:**
   ```bash
   mysql -u root -p
   # Ingresa la contraseña: admin
   ```

## Paso 3: Crear la Base de Datos

Tienes dos opciones:

### Opción A: Desde MySQL Workbench o línea de comandos

1. Conecta a MySQL:
   ```bash
   mysql -u root -padmin
   ```

2. Ejecuta el script:
   ```sql
   SOURCE c:/Repo/Alumni/database/schema.sql;
   ```

3. Verifica que se creó correctamente:
   ```sql
   USE alumni;
   SHOW TABLES;
   ```

### Opción B: Desde Windows

1. Abre el símbolo del sistema en la carpeta del proyecto
2. Ejecuta:
   ```bash
   mysql -u root -padmin < database\schema.sql
   ```

## Paso 4: Inicializar el Usuario Administrador

Desde la terminal del proyecto, ejecuta:

```bash
npm run init-db
```

Esto creará el usuario **admin** con contraseña **123**.

Deberías ver:
```
✅ Usuario admin creado
✅ Rol de Administrador asignado
🎉 Base de datos inicializada correctamente
```

## Paso 5: Iniciar el Proyecto

```bash
npm run dev
```

Abre tu navegador en: **http://localhost:3000**

## Verificación de la Instalación

### Verificar Estructura de Base de Datos

Ejecuta el script de verificación:

```bash
mysql -u root -padmin < database\verify.sql
```

Deberías ver las tablas creadas y el usuario admin.

### Verificar Conexión desde la Aplicación

La aplicación intentará conectarse automáticamente al iniciar.

## ❗ Solución de Problemas

### Error: Cannot connect to MySQL

**Solución:**
1. Verifica que MySQL esté ejecutándose
2. Verifica las credenciales en `.env.local`
3. Verifica el puerto (3306 por defecto)

### Error: Database 'alumni' doesn't exist

**Solución:**
```bash
mysql -u root -padmin -e "CREATE DATABASE alumni;"
mysql -u root -padmin alumni < database\schema.sql
```

### Error: Access denied for user 'root'

**Solución:**
1. Verifica la contraseña de MySQL
2. Actualiza `.env.local` con las credenciales correctas

### Error: npm run init-db falla

**Solución:**
```bash
# Asegúrate de que la base de datos existe
mysql -u root -padmin -e "USE alumni;"

# Si existe, intenta de nuevo
npm run init-db
```

## 🎯 Próximos Pasos

Una vez instalado correctamente:

1. ✅ Verifica que puedes acceder a http://localhost:3000
2. ✅ Confirma que no hay errores en la consola
3. 📝 Prepárate para la **Fase 2**: Implementación del sistema de login

## 📞 Resumen de Credenciales

**Base de Datos:**
- Host: localhost
- Puerto: 3306
- Usuario: root
- Contraseña: admin
- Base de datos: alumni

**Usuario Aplicación:**
- Usuario: admin
- Contraseña: 123

---

**¿Todo listo?** Continúa con la Fase 2: Autenticación y Login 🚀
