# Gestión de Talleres Incompletos y Deudas de Alumnos Inactivos

## 📋 Resumen de Cambios Implementados

### 1. Nuevo Estado "Incompleto" para Talleres

**Estado agregado:** `cdEstado = 5` (Incompleto)
- Se utiliza cuando un alumno se da de baja de un taller antes de que finalice
- Preserva el historial del alumno en el taller
- Permite consultar datos de asistencia y pagos pendientes

**Estados en TR_ALUMNO_TALLER:**
- `1` = Activo (alumno actualmente inscrito)
- `2` = Inactivo (no se usa más para bajas)
- `4` = Finalizado (taller completado)
- `5` = Incompleto (alumno dado de baja antes de finalizar)

---

### 2. Verificación de Deudas al Dar de Baja

**API Modificada:** `app/api/talleres/[id]/alumnos/[alumnoId]/route.ts`

#### Función PUT (Dar de Baja)
- Verifica si el alumno tiene deudas pendientes
- Si tiene deudas y no se forzó la baja, devuelve advertencia con detalle
- Marca el taller como "Incompleto" (`cdEstado = 5`)
- Actualiza el estado del alumno automáticamente

**Respuesta cuando hay deudas:**
```json
{
  "advertencia": true,
  "tieneDeudas": true,
  "mensaje": "El alumno tiene 2 mes(es) pendiente(s) de pago por un total de $15000.00. ¿Desea dar de baja igualmente?",
  "detalles": [
    { "mes": 4, "anio": 2026, "monto": 7500 },
    { "mes": 5, "anio": 2026, "monto": 7500 }
  ]
}
```

**Parámetros aceptados:**
- `activo`: boolean - true para reactivar, false para dar de baja
- `forzarBaja`: boolean - true para forzar la baja aun con deudas

#### Función DELETE (Quitar Alumno)
- Similar a PUT, pero marca como eliminado
- También verifica deudas y requiere confirmación
- Parámetro `forzarEliminacion` para confirmar

---

### 3. Nueva Grilla "Talleres Incompletos"

**Frontend:** `app/dashboard/alumnos/[id]/page.tsx`
**Backend:** `app/api/alumnos/[id]/detalle/route.ts`

**Columnas mostradas:**
- Tipo de Taller
- Año
- Profesor
- Días y Horarios
- Fecha de Inscripción
- Fecha de Baja
- Cantidad Presentes (badge verde)
- Cantidad Ausentes (badge rojo)

**Query incluye:**
```sql
SELECT COUNT(*) FROM TD_ASISTENCIAS 
WHERE cdAlumno = ? AND cdTaller = ? AND snPresente = 1
```

---

### 4. Separación de Deudas Activos vs Inactivos

#### Dashboard (`app/api/dashboard/stats/route.ts`)

**Contadores agregados:**
- `alumnosMesActualActivos`: Solo alumnos con `cdEstado = 1`
- `alumnosMesesAnterioresActivos`: Solo alumnos con `cdEstado = 1`
- `alumnosInactivosConDeuda`: Alumnos con `cdEstado = 2` y pagos pendientes

**Lógica:**
```sql
-- Alumnos activos con deuda mes actual
WHERE a.cdEstado = 1
  AND at.cdEstado = 1  -- Inscripción activa
  AND at.feBaja IS NULL
  AND t.cdEstado = 1    -- Taller activo

-- Alumnos inactivos con deuda
WHERE a.cdEstado = 2
  AND at.cdEstado = 5  -- Taller incompleto
  AND (deuda pendiente)
```

---

### 5. Consulta de Pagos con Filtro de Estado Alumno

**API:** `app/api/pagos/route.ts`

**Nuevos parámetros:**
- `estadoAlumno`: "todos" | "activos" | "inactivos"
- Filtro adicional en el query:
  ```sql
  AND a.cdEstado = ? -- 1 para activos, 2 para inactivos
  ```

**Frontend:** `app/dashboard/pagos/page.tsx`
- Nuevo dropdown "Estado Alumno"
- Opciones: Todos, Solo Activos, Solo Inactivos
- Se aplica en combinación con otros filtros

---

### 6. Reporte Pagos por Talleres - Solo Activos

**API:** `app/api/reportes/pagos-talleres/route.ts`

**Cambios:**
```sql
WHERE at.cdEstado = 1    -- Solo inscripciones activas
  AND a.cdEstado = 1     -- Solo alumnos activos
  AND t.cdEstado = 1     -- Solo talleres activos
```

**Comportamiento:**
- Los alumnos inactivos NO aparecen en el reporte
- Los alumnos con talleres incompletos NO aparecen

---

### 7. Edición de Alumno - Manejo de Baja de Taller

**API:** `app/api/alumnos/[id]/route.ts`

**Cambios al quitar talleres:**
- Marca como "Incompleto" (`cdEstado = 5`) en lugar de eliminar
- Establece `feBaja = NOW()`
- Verifica otros talleres activos y actualiza estado del alumno

**Lógica:**
```typescript
// Dar de baja talleres que ya no están en la lista
await connection.query(
  `UPDATE TR_ALUMNO_TALLER 
   SET cdEstado = 5, feBaja = NOW()
   WHERE cdAlumno = ? 
     AND feBaja IS NULL 
     AND cdTaller NOT IN (?)`,
  [cdAlumno, talleres]
);
```

---

## 📁 Archivos Modificados

### Backend APIs
1. `lib/db-utils.ts` - Función `verificarDeudasPendientes()`
2. `app/api/talleres/[id]/alumnos/[alumnoId]/route.ts` - Verificación deudas
3. `app/api/alumnos/[id]/detalle/route.ts` - Query talleres incompletos
4. `app/api/alumnos/[id]/route.ts` - Manejo baja desde edición
5. `app/api/dashboard/stats/route.ts` - Separación deudas
6. `app/api/pagos/route.ts` - Filtro estado alumno
7. `app/api/reportes/pagos-talleres/route.ts` - Solo activos

### Frontend Components
1. `app/dashboard/alumnos/[id]/page.tsx` - Grilla talleres incompletos
2. `app/dashboard/pagos/page.tsx` - Filtro estado alumno
3. `app/dashboard/page.tsx` - Widget deudas inactivos

---

## 🗃️ Scripts de Migración

### Script SQL: `database/agregar-estado-incompleto.sql`

**Ejecución:**
```bash
mysql -u usuario -p database_name < database/agregar-estado-incompleto.sql
```

**Acciones:**
1. Inserta estado "Incompleto" (`cdEstado = 5`)
2. Actualiza registros existentes con `feBaja` a estado 5
3. Verifica consistencia de datos
4. Muestra resumen de cambios

### Script JavaScript: `scripts/actualizar-talleres-incompletos.js`

**Ejecución:**
```bash
node scripts/actualizar-talleres-incompletos.js
```

**Funcionalidad:**
- Identifica alumnos dados de baja con `cdEstado = 2` y `feBaja != NULL`
- Los marca como "Incompleto" (`cdEstado = 5`)
- Muestra progreso y estadísticas
- Maneja errores por registro

---

## 🔄 Flujo de Baja de Alumno

```
1. Usuario presiona "Dar de Baja" en taller
   ↓
2. Sistema verifica deudas pendientes
   ↓
3a. Si NO tiene deudas:
    - Marca taller como Incompleto (cdEstado = 5)
    - Establece feBaja = NOW()
    - Actualiza estado alumno automáticamente
   ↓
3b. Si tiene deudas:
    - Muestra advertencia con detalle
    - Pide confirmación del usuario
    - Usuario puede confirmar o cancelar
    ↓
4. Si confirma (forzarBaja = true):
    - Marca taller como Incompleto
    - Deudas quedan registradas
    - Aparecen en reportes de "Alumnos Inactivos con Deuda"
```

---

## 📊 Impacto en Reportes y Consultas

### Dashboard
**Antes:**
- "Deben Pagar - Mes Actual" (todos)
- "Deben Pagar - Meses Anteriores" (todos)

**Después:**
- "Deben Pagar - Mes Actual" (solo activos)
- "Deben Pagar - Meses Anteriores" (solo activos)
- **NUEVO:** "Deben Pagar - Alumnos Inactivos"

### Consulta de Pagos
**Antes:**
- Filtro: Pendiente / Pagado

**Después:**
- Filtro: Pendiente / Pagado
- **NUEVO:** Filtro Estado Alumno: Todos / Activos / Inactivos
- "Pendiente" por defecto muestra solo activos
- "Pendiente + Inactivos" muestra deudas de bajas

### Reporte Pagos por Talleres
**Antes:**
- Mostraba todos los alumnos inscritos

**Después:**
- Solo muestra alumnos con `cdEstado = 1` (Activos)
- Alumnos inactivos no aparecen
- Talleres incompletos no aparecen

---

## ✅ Casos de Uso Validados

### ✅ Dar de Baja sin Deudas
- Alumno pasa a estado "Inactivo" si no tiene otros talleres
- Taller marcado como "Incompleto"
- No muestra advertencia

### ✅ Dar de Baja con Deudas
- Sistema muestra advertencia con monto total
- Usuario puede confirmar o cancelar
- Si confirma: baja se registra con deudas

### ✅ Quitar Alumno de Taller
- Mismo comportamiento que dar de baja
- Requiere parámetro `forzarEliminacion` si hay deudas

### ✅ Ver Historial Completo
- Talleres Activos: Inscripciones actuales
- Talleres Finalizados: Completados con el alumno
- **NUEVO:** Talleres Incompletos: Dados de baja antes de finalizar

### ✅ Consultar Deudas por Tipo de Alumno
- Dashboard separa activos/inactivos
- Pagos pueden filtrarse por estado alumno
- Reporte de talleres solo muestra activos

---

## 🚀 Despliegue en Producción

### Paso 1: Backup
```bash
mysqldump -u usuario -p database_name > backup_$(date +%Y%m%d).sql
```

### Paso 2: Ejecutar Script SQL
```bash
mysql -u usuario -p database_name < database/agregar-estado-incompleto.sql
```

### Paso 3: Desplegar Código
- Subir archivos modificados al servidor
- Reiniciar aplicación

### Paso 4: Verificar
- Probar dar de baja con y sin deudas
- Verificar que aparece grilla "Talleres Incompletos"
- Validar separación de deudas en dashboard
- Confirmar filtros en consulta de pagos

---

## 📝 Notas Técnicas

### Estados TR_ALUMNO_TALLER
- **1 = Activo:** Alumno actualmente inscrito
- **2 = Inactivo:** No usar (deprecated)
- **4 = Finalizado:** Taller completado normalmente
- **5 = Incompleto:** Dado de baja antes de finalizar

### Verificación de Deudas
La función `verificarDeudasPendientes()`:
- Calcula meses desde inscripción hasta baja
- Obtiene precio vigente del taller
- Verifica pagos realizados
- Retorna deuda total y detalle por mes

### Actualización Automática de Estado
Al dar de baja un alumno:
1. Se marca taller como Incompleto
2. Se llama a `actualizarEstadoAlumno()`
3. Si no tiene otros talleres activos → Inactivo
4. Si tiene otros talleres activos → permanece Activo

---

## 🔍 Queries Útiles para Verificación

### Ver alumnos con talleres incompletos
```sql
SELECT 
  a.cdAlumno,
  CONCAT(a.dsNombre, ' ', a.dsApellido) as alumno,
  tt.dsNombreTaller,
  at.feInscripcion,
  at.feBaja
FROM TR_ALUMNO_TALLER at
INNER JOIN TD_ALUMNOS a ON at.cdAlumno = a.cdAlumno
INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
WHERE at.cdEstado = 5
ORDER BY at.feBaja DESC;
```

### Ver alumnos inactivos con deudas
```sql
SELECT 
  a.cdAlumno,
  CONCAT(a.dsNombre, ' ', a.dsApellido) as alumno,
  COUNT(DISTINCT CONCAT(p.nuMes, '-', p.nuAnio)) as mesesPendientes
FROM TD_ALUMNOS a
INNER JOIN TR_ALUMNO_TALLER at ON a.cdAlumno = at.cdAlumno
WHERE a.cdEstado = 2
  AND at.cdEstado = 5
  AND NOT EXISTS (
    SELECT 1 FROM TD_PAGOS p
    INNER JOIN TD_PAGOS_DETALLE pd ON p.cdPago = pd.cdPago
    WHERE pd.cdAlumno = a.cdAlumno
      AND pd.cdTaller = at.cdTaller
  )
GROUP BY a.cdAlumno, a.dsNombre, a.dsApellido;
```

---

## 👥 Autor
- Implementado por: GitHub Copilot
- Fecha: Mayo 7, 2026
