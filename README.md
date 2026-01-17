# Alumni - Sistema de Gestión de Talleres de Arte

Sistema completo de administración para instituciones que dictan talleres de arte (teatro, baile, canto, pintura, etc.).

## 🚀 Tecnologías

- **Frontend & Backend**: Next.js 14 con TypeScript
- **Base de Datos**: MySQL
- **UI Components**: shadcn/ui
- **Autenticación**: NextAuth.js
- **Estilos**: Tailwind CSS con tema Indigo/Violeta

## 📋 Requisitos Previos

- Node.js 18+ 
- MySQL 8.0+
- npm o yarn

## ⚙️ Instalación

1. **Clonar el repositorio**
   ```bash
   cd c:\Repo\Alumni
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   
   El archivo `.env.local` ya está configurado con los valores por defecto:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=admin
   DB_NAME=alumni
   ```

4. **Crear la base de datos**
   
   Ejecutar el script SQL en MySQL:
   ```bash
   mysql -u root -p < database/schema.sql
   ```
   
   O manualmente:
   ```sql
   SOURCE c:/Repo/Alumni/database/schema.sql;
   ```

5. **Inicializar usuario administrador**
   ```bash
   npm run init-db
   ```
   
   Esto creará el usuario admin:
   - **Usuario**: admin
   - **Contraseña**: 123

6. **Iniciar el servidor de desarrollo**
   ```bash
   npm run dev
   ```

7. **Abrir en el navegador**
   ```
   http://localhost:3000
   ```

## 📁 Estructura del Proyecto

```
Alumni/
├── app/                    # Páginas y rutas de Next.js
│   ├── layout.tsx         # Layout principal
│   ├── page.tsx           # Página de inicio
│   └── globals.css        # Estilos globales
├── components/
│   └── ui/                # Componentes de shadcn/ui
├── lib/
│   ├── db.ts              # Conexión a MySQL
│   └── db-utils.ts        # Utilidades de base de datos
├── database/
│   ├── schema.sql         # Script de creación de BD
│   └── verify.sql         # Script de verificación
├── scripts/
│   └── init-db.ts         # Script de inicialización
└── .env.local             # Variables de entorno
```

## 🗄️ Base de Datos

### Nomenclatura de Tablas
- **TD_**: Tablas de datos
- **TR_**: Tablas de relación
- **TMP_**: Tablas temporales

### Nomenclatura de Campos
- **cd**: Códigos/IDs (ej: cdAlumno)
- **fe**: Fechas (ej: feNacimiento)
- **nu**: Números (ej: nuFalta)
- **ds**: Textos (ej: dsNombre)
- **sn**: SI/NO (ej: snActivo)

### Tablas Principales
- TD_USUARIOS
- TD_ROLES
- TD_PERSONAL
- TD_TIPO_TALLERES
- TD_TALLERES
- TD_ALUMNOS
- TD_GRUPOS_FAMILIARES
- TD_FALTAS
- TD_PAGOS
- TD_PRECIOS
- TD_TRAZA

## 🔐 Credenciales Iniciales

**Usuario Administrador**
- Usuario: `admin`
- Contraseña: `123`

⚠️ **IMPORTANTE**: Cambiar estas credenciales en producción.

## 📝 Scripts Disponibles

```bash
npm run dev          # Iniciar servidor de desarrollo
npm run build        # Compilar para producción
npm run start        # Iniciar servidor de producción
npm run lint         # Ejecutar linter
npm run init-db      # Inicializar base de datos
```

## 🎨 Paleta de Colores

El sistema utiliza una paleta de colores basada en **Indigo/Violeta**:
- Primary: `hsl(263, 70%, 50%)`
- Gradientes desde indigo hasta violet

## 📚 Módulos del Sistema

1. **Seguridad y Usuarios**
   - Gestión de usuarios
   - Roles y permisos
   - Auditoría (Traza)

2. **Personal y Profesores**
   - CRUD de personal
   - Asignación de talleres

3. **Alumnos**
   - Registro de alumnos
   - Grupos familiares
   - Consultas avanzadas

4. **Talleres**
   - Tipos de talleres
   - Gestión de talleres
   - Horarios y días

5. **Faltas**
   - Registro de asistencia
   - Notificaciones
   - Reportes

6. **Pagos**
   - Registro de precios
   - Gestión de pagos
   - Cálculo automático por grupo familiar

7. **Reportes**
   - Faltas reiteradas
   - Pagos pendientes
   - Pagos realizados

## 🔧 Próximos Pasos

- [ ] Implementar sistema de autenticación
- [ ] Crear módulo de usuarios
- [ ] Desarrollar CRUD de talleres
- [ ] Implementar gestión de alumnos
- [ ] Sistema de registro de faltas
- [ ] Módulo de pagos
- [ ] Generación de reportes

## 📄 Licencia

Proyecto privado - Todos los derechos reservados

---

**Fecha de creación**: Enero 2026
**Versión**: 1.0.0
