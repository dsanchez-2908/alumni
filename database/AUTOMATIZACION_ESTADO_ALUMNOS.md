# Automatización del Estado de Alumnos

## 📋 Resumen

Se ha implementado la automatización del campo **Estado** (`cdEstado`) de los alumnos basándose en si están inscritos en talleres activos o no.

### Reglas de Negocio

- **Alumno Activo** (`cdEstado = 1`): Cuando está inscrito en **al menos un taller activo**
- **Alumno Inactivo** (`cdEstado = 2`): Cuando **NO** está inscrito en ningún taller activo

---

## 🔧 Cambios Implementados

### 1. Funciones Auxiliares (`lib/db-utils.ts`)

Se agregaron dos funciones auxiliares:

#### `alumnoTieneTalleresActivos(cdAlumno: number): Promise<boolean>`
Verifica si un alumno tiene al menos un taller activo.

**Criterios:**
- La inscripción está activa (`TR_ALUMNO_TALLER.cdEstado = 1`)
- No ha sido dado de baja (`TR_ALUMNO_TALLER.feBaja IS NULL`)
- El taller está activo (`TD_TALLERES.cdEstado = 1`)

#### `actualizarEstadoAlumno(cdAlumno: number): Promise<void>`
Actualiza automáticamente el estado del alumno basándose en si tiene talleres activos.

---

### 2. API de Creación de Alumno (`app/api/alumnos/route.ts` - POST)

**Cambios:**
- El estado inicial se calcula automáticamente:
  - Si se le asignan talleres durante la creación → `cdEstado = 1` (Activo)
  - Si NO se le asignan talleres → `cdEstado = 2` (Inactivo)

**Antes:**
```typescript
cdEstado: 1  // Siempre Activo
```

**Después:**
```typescript
const cdEstadoInicial = talleres.length > 0 ? 1 : 2;
```

---

### 3. API de Edición de Alumno (`app/api/alumnos/[id]/route.ts` - PUT)

**Cambios:**
- Se removió el parámetro `cdEstado` del body (ya no se recibe desde el frontend)
- Se eliminó `cdEstado` del UPDATE query
- Se llama a `actualizarEstadoAlumno()` después de actualizar los talleres

**Flujo:**
1. Actualiza datos del alumno (sin tocar cdEstado)
2. Actualiza inscripciones a talleres
3. Calcula y actualiza el estado automáticamente

---

### 4. Formulario de Edición (`app/dashboard/alumnos/page.tsx`)

**Cambios:**
- Se **removió el campo "Estado"** del formulario de edición
- El usuario ya no puede modificar manualmente el estado
- El estado se muestra solo como información (badge), pero no se puede editar

**Código removido:**
```tsx
{/* Estado */}
{isEditing && (
  <div className="grid gap-2">
    <Label htmlFor="cdEstado">Estado</Label>
    <Select value={formData.cdEstado.toString()} ...>
      <SelectItem value="1">Activo</SelectItem>
      <SelectItem value="2">Inactivo</SelectItem>
    </Select>
  </div>
)}
```

---

### 5. API de Inscripción en Taller (`app/api/talleres/[id]/alumnos/route.ts` - POST)

**Cambios:**
- Después de inscribir o reactivar un alumno, se llama a `actualizarEstadoAlumno()`
- El alumno pasa automáticamente a **Activo**

**Casos:**
- **Inscripción nueva:** El alumno se inscribe y pasa a Activo
- **Reactivación:** El alumno se reactiva en el taller y pasa a Activo

---

### 6. API de Baja de Alumno en Taller (`app/api/talleres/[id]/alumnos/[alumnoId]/route.ts`)

**Cambios:**
- Al dar de baja un alumno (PUT con `activo: false`), se llama a `actualizarEstadoAlumno()`
- Si el alumno **NO tiene otros talleres activos**, pasa a **Inactivo**
- Al reactivar un alumno (PUT con `activo: true`), se llama a `actualizarEstadoAlumno()`
- El alumno pasa a **Activo**
- Al eliminar una inscripción (DELETE), se llama a `actualizarEstadoAlumno()`
- Si el alumno **NO tiene otros talleres activos**, pasa a **Inactivo**

---

### 7. API de Finalización de Taller (`app/api/talleres/[id]/finalizar/route.ts` - POST)

**Cambios:**
- Antes de finalizar el taller, se obtienen los IDs de todos los alumnos activos
- Se finalizan las inscripciones
- Para cada alumno, se llama a `actualizarEstadoAlumno()`
- Si el alumno **NO tiene otros talleres activos**, pasa a **Inactivo**

---

## 📜 Scripts de Migración

Se crearon dos scripts para actualizar los datos existentes en producción:

### 1. Script SQL: `database/actualizar-estado-alumnos.sql`

Actualiza directamente en la base de datos el estado de todos los alumnos existentes.

**Uso:**
```bash
mysql -u usuario -p database_name < database/actualizar-estado-alumnos.sql
```

**Funcionalidad:**
- Marca como **Inactivo** a los alumnos sin talleres activos
- Marca como **Activo** a los alumnos con talleres activos
- Muestra estadísticas y verifica inconsistencias

---

### 2. Script JavaScript: `scripts/actualizar-estado-alumnos.js`

Procesa cada alumno individualmente y actualiza su estado.

**Uso:**
```bash
node scripts/actualizar-estado-alumnos.js
```

**Ventajas:**
- Muestra progreso en tiempo real
- Maneja errores por alumno sin detener el proceso
- Muestra estadísticas detalladas al final
- Detecta inconsistencias

**Salida:**
```
✅ Conectado a la base de datos

📊 Total de alumnos a procesar: 150

   Juan Pérez - Activo → Inactivo
   María González - Inactivo → Activo
   ...

=================================================
📈 RESUMEN DE ACTUALIZACIÓN
=================================================
   Total procesados:      150
   ✅ Actualizados:        45
   ✓  Ya correctos:        105
   ❌ Errores:             0
=================================================

📊 ESTADO ACTUAL DE ALUMNOS:
=================================================
   Activos: 85
   Inactivos: 65
=================================================

✅ No se encontraron inconsistencias

✨ Script completado exitosamente
```

---

## ✅ Casos de Uso Cubiertos

### ✅ Alta de Alumno
- **Con taller:** Alumno creado en estado **Activo**
- **Sin taller:** Alumno creado en estado **Inactivo**

### ✅ Edición de Alumno
- **Se agrega taller:** Pasa a **Activo**
- **Se quita taller y no tiene otros:** Pasa a **Inactivo**
- **Se quita taller pero tiene otros activos:** Permanece **Activo**

### ✅ Inscripción en Taller (desde detalle de taller)
- **Inscribir alumno:** Pasa a **Activo**

### ✅ Baja de Alumno en Taller (desde detalle de taller)
- **Dar de baja y no tiene otros talleres:** Pasa a **Inactivo**
- **Dar de baja pero tiene otros talleres activos:** Permanece **Activo**

### ✅ Quitar Alumno de Taller (desde detalle de taller)
- **Quitar y no tiene otros talleres:** Pasa a **Inactivo**
- **Quitar pero tiene otros talleres activos:** Permanece **Activo**

### ✅ Finalizar Taller
- Para cada alumno del taller:
  - **No tiene otros talleres activos:** Pasa a **Inactivo**
  - **Tiene otros talleres activos:** Permanece **Activo**

---

## 🚀 Despliegue en Producción

### Pasos Recomendados:

1. **Backup de la base de datos:**
   ```bash
   mysqldump -u usuario -p database_name > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Desplegar los cambios de código:**
   - Subir los archivos modificados al servidor
   - Reiniciar la aplicación

3. **Ejecutar el script de actualización:**
   
   **Opción A - Script JavaScript (Recomendado):**
   ```bash
   node scripts/actualizar-estado-alumnos.js
   ```
   
   **Opción B - Script SQL:**
   ```bash
   mysql -u usuario -p database_name < database/actualizar-estado-alumnos.sql
   ```

4. **Verificar resultados:**
   - Revisar las estadísticas mostradas por el script
   - Comprobar que no hay inconsistencias
   - Probar la funcionalidad en la aplicación

---

## 📊 Pruebas

### Pruebas Manuales Sugeridas:

1. **Crear alumno sin taller** → Verificar que queda Inactivo
2. **Crear alumno con taller** → Verificar que queda Activo
3. **Editar alumno y agregar taller** → Verificar que pasa a Activo
4. **Editar alumno y quitar único taller** → Verificar que pasa a Inactivo
5. **Inscribir alumno en taller** → Verificar que pasa a Activo
6. **Dar de baja alumno de único taller** → Verificar que pasa a Inactivo
7. **Dar de baja alumno de taller teniendo otros** → Verificar que permanece Activo
8. **Finalizar taller con alumnos sin otros talleres** → Verificar que pasan a Inactivo
9. **Verificar que el campo Estado no aparece en formulario de edición**

---

## 🔍 Troubleshooting

### Problema: Alumnos Inactivos con talleres activos

**Causa:** Inconsistencia en los datos
**Solución:** Ejecutar el script de actualización

```bash
node scripts/actualizar-estado-alumnos.js
```

### Problema: El estado no se actualiza automáticamente

**Verificar:**
1. Que las funciones auxiliares en `db-utils.ts` están correctamente importadas
2. Que se está llamando a `actualizarEstadoAlumno()` después de las operaciones
3. Revisar los logs del servidor para detectar errores

---

## 📝 Notas Importantes

- ⚠️ El campo **Estado** ya **NO es editable manualmente** por el usuario
- ✅ El estado se calcula **automáticamente** en todas las operaciones de talleres
- 🔄 El cambio es **retroactivo** mediante los scripts de migración
- 📌 Los alumnos en estado `cdEstado = 3` (Eliminado u otro) **NO son afectados**

---

## 📅 Historial de Cambios

- **2026-05-06:** Implementación inicial de automatización de estado de alumnos

---

## 👥 Autor

- Implementado por: GitHub Copilot
- Fecha: Mayo 6, 2026
