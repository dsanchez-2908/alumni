# Fix: Problema de Registro de Asistencia - Zona Horaria

## Fecha
2026-08-10

## Problema Identificado

Los alumnos que se daban de alta en un taller **un día antes** de la clase no aparecían en el registro de asistencia en el ambiente de producción (Vercel + Railway).

### Escenario de ejemplo:
- Taller inicia: 01/08/2026
- Primera clase (martes): 04/08/2026
- Alumnos inscritos el 03/08/2026: **NO aparecían** ❌
- Alumnos inscritos el 02/08/2026: **SÍ aparecían** ✅

## Causa Raíz

El campo `feInscripcion` en la tabla `TR_ALUMNO_TALLER` es de tipo **TIMESTAMP** (incluye fecha y hora), no DATE.

Cuando se compara directamente un TIMESTAMP con una fecha string en SQL:
```sql
WHERE at.feInscripcion <= '2026-08-04'
```

MySQL convierte el string a `'2026-08-04 00:00:00'`.

### El problema de zona horaria:

1. **Servidor de aplicación (Vercel)**: Zona horaria Argentina (UTC-3)
2. **Servidor de BD (Railway)**: Probablemente UTC (UTC+0)

Cuando un alumno se inscribe el **03/08/2026 a las 21:00 hora Argentina**:
- En UTC se guarda como: `2026-08-04 00:00:00` (o después)
- La comparación `2026-08-04 00:00:01 <= 2026-08-04 00:00:00` → **FALSE** ❌

## Solución Implementada

Usar la función `DATE()` de MySQL para comparar **solo las fechas**, ignorando la hora:

```sql
WHERE DATE(at.feInscripcion) <= ?
```

## Archivos Modificados

### 1. `app/api/talleres/[id]/faltas/route.ts`
- **GET**: Obtener alumnos del taller por fecha (línea ~48)
- **POST**: Registrar asistencias (línea ~93)

**Cambio:**
```sql
-- ANTES
WHERE at.feInscripcion <= ?

-- DESPUÉS
WHERE DATE(at.feInscripcion) <= ?
```

### 2. `app/api/alumnos/route.ts`
Filtros de búsqueda de alumnos (líneas ~170-200):

**Cambios:**
```sql
-- ANTES
AND at.feInscripcion >= ?
AND at.feInscripcion <= ?
AND a.feAlta >= ?
AND a.feAlta <= ?
AND at.feBaja >= ?
AND at.feBaja <= ?

-- DESPUÉS
AND DATE(at.feInscripcion) >= ?
AND DATE(at.feInscripcion) <= ?
AND DATE(a.feAlta) >= ?
AND DATE(a.feAlta) <= ?
AND DATE(at.feBaja) >= ?
AND DATE(at.feBaja) <= ?
```

## Impacto

✅ Los alumnos ahora aparecerán correctamente en el registro de asistencia independientemente de:
- La hora en que se inscribieron
- La zona horaria del servidor de aplicación
- La zona horaria del servidor de base de datos

## Testing Recomendado

1. Verificar que los alumnos inscritos el mismo día de una clase aparezcan
2. Verificar que los alumnos inscritos un día antes de una clase aparezcan
3. Verificar que los alumnos inscritos después de una clase NO aparezcan
4. Probar con diferentes horarios de inscripción (mañana, tarde, noche)

## Notas Adicionales

- Este fix también aplica a los filtros de búsqueda de alumnos por fechas
- Se recomienda revisar otras consultas que comparen TIMESTAMP con fechas
- Considerar cambiar el tipo de dato de `feInscripcion` a DATE si solo se necesita la fecha (requiere migración de BD)
