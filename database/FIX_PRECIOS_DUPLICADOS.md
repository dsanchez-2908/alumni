# Corrección de Precios Duplicados

## Problema Identificado

En la pantalla de registro de precios (`/dashboard/precios/[fecha]`), se mostraban tipos de talleres duplicados para una misma fecha de vigencia. Esto ocurría porque:

1. **No había validación a nivel de aplicación**: El endpoint POST de precios permitía insertar múltiples registros para el mismo tipo de taller y fecha de vigencia.

2. **No había restricción a nivel de base de datos**: La tabla `TD_PRECIOS_TALLERES` no tenía un constraint UNIQUE para prevenir duplicados.

3. **El formulario de precios copiaba todos los talleres**: Al crear una nueva vigencia, si el usuario enviaba el formulario múltiples veces (por error o refresh), se insertaban registros duplicados.

## Soluciones Implementadas

### 1. Validación en el API (app/api/precios/route.ts)

Se agregó validación antes de insertar precios para detectar duplicados:

```typescript
// Verificar duplicados antes de insertar
const [existentes] = await pool.execute<any[]>(
  `SELECT cdTipoTaller, DATE_FORMAT(feInicioVigencia, '%Y-%m-%d') as feInicioVigencia
   FROM TD_PRECIOS_TALLERES
   WHERE cdEstado = 1
     AND DATE(feInicioVigencia) = DATE(?)`,
  [precios[0].feInicioVigencia]
);

if (duplicados.length > 0) {
  return NextResponse.json(
    { 
      error: 'Ya existen precios registrados para esta fecha de vigencia',
      detalles: `Talleres duplicados: ${nombresDup}`,
      consejo: 'Elimine los precios existentes antes de crear nuevos para esta fecha'
    },
    { status: 409 }
  );
}
```

Ahora, si intenta crear precios para una fecha que ya tiene precios registrados, recibirá un error 409 (Conflict) con detalles específicos.

### 2. Constraint UNIQUE en la Base de Datos (database/schema.sql)

Se agregó un constraint UNIQUE a la tabla `TD_PRECIOS_TALLERES`:

```sql
UNIQUE KEY UK_Precio_Taller_Vigencia (cdTipoTaller, feInicioVigencia, cdEstado)
```

Esto previene duplicados a nivel de base de datos, incluso si la validación de la aplicación falla.

### 3. Scripts de Corrección

Se crearon dos scripts para limpiar los datos existentes:

#### Opción A: Script SQL Manual (database/fix-precios-duplicados.sql)

Script SQL paso a paso que:
- Identifica y reporta duplicados
- Elimina duplicados manteniendo el registro más reciente
- Agrega el constraint UNIQUE
- Verifica que no queden duplicados

**Uso:**
```bash
mysql -u root -p alumni < database/fix-precios-duplicados.sql
```

**IMPORTANTE:** Revise los resultados de cada paso antes de descomentar los comandos DELETE y ALTER TABLE.

#### Opción B: Script Node.js Automatizado (scripts/fix-precios-duplicados.js)

Script Node.js que ejecuta automáticamente todo el proceso con reporting detallado.

**Uso:**
```bash
node scripts/fix-precios-duplicados.js
```

**Características:**
- ✅ Identifica y muestra duplicados agrupados
- ✅ Calcula cuántos registros se eliminarán
- ✅ Elimina duplicados manteniendo el más reciente (mayor cdPrecio)
- ✅ Agrega el constraint UNIQUE
- ✅ Verifica que no queden duplicados
- ✅ Reporta el resultado con emojis y formato claro

## Cómo Aplicar la Corrección

### Paso 1: Hacer Backup de la Base de Datos

```bash
mysqldump -u root -p alumni > backup_alumni_$(date +%Y%m%d_%H%M%S).sql
```

### Paso 2: Ejecutar el Script de Corrección

**Opción Recomendada (Script Node.js):**
```bash
node scripts/fix-precios-duplicados.js
```

**Opción Manual (Script SQL):**
1. Abrir `database/fix-precios-duplicados.sql`
2. Revisar los resultados de cada paso
3. Descomentar comandos DELETE y ALTER TABLE
4. Ejecutar el script completo

### Paso 3: Verificar los Resultados

1. Acceder a la pantalla de precios: `http://localhost:3000/dashboard/precios`
2. Seleccionar una vigencia que antes mostraba duplicados (ej: 29/01/2026)
3. Verificar que cada tipo de taller aparezca solo una vez

### Paso 4: Probar la Validación

Intentar crear precios nuevos para una fecha que ya tiene precios:
1. Ir a `/dashboard/precios`
2. Hacer clic en "Nuevo Precio"
3. Seleccionar una fecha que ya tiene precios (ej: 29/01/2026)
4. Completar el formulario e intentar guardar
5. **Resultado esperado:** Error 409 con mensaje: "Ya existen precios registrados para esta fecha de vigencia"

## Resumen de Cambios en Archivos

| Archivo | Cambio |
|---------|--------|
| `app/api/precios/route.ts` | Validación de duplicados antes de insertar |
| `database/schema.sql` | Constraint UNIQUE agregado |
| `database/fix-precios-duplicados.sql` | Script SQL de corrección (nuevo) |
| `scripts/fix-precios-duplicados.js` | Script Node.js de corrección (nuevo) |

## Prevención de Futuros Problemas

Con las soluciones implementadas:

1. **A nivel de aplicación**: La API rechaza intentos de crear precios duplicados con un mensaje claro
2. **A nivel de base de datos**: El constraint UNIQUE previene duplicados incluso si la validación de la app falla
3. **A nivel de usuario**: Mensaje de error claro que indica qué hacer (eliminar precios existentes primero)

## Preguntas Frecuentes

**P: ¿Qué pasa si ya tengo duplicados?**
R: Ejecute uno de los scripts de corrección incluidos. Ambos mantienen el registro más reciente.

**P: ¿Puedo tener el mismo precio para diferentes fechas?**
R: Sí, el constraint permite el mismo tipo de taller en diferentes fechas de vigencia.

**P: ¿Qué pasa si intento crear precios duplicados?**
R: La API devolverá un error 409 con mensaje detallado antes de insertar en la base de datos.

**P: ¿El constraint afecta el rendimiento?**
R: No significativamente. De hecho, mejora el rendimiento de búsquedas por taller y fecha.

---

**Fecha de implementación:** 10 de febrero de 2026
**Versión:** 1.0.0
