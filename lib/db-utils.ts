import pool from './db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// =============================================
// FUNCIONES GENÉRICAS DE BASE DE DATOS
// =============================================

/**
 * Ejecuta una consulta SELECT
 */
export async function executeQuery<T extends RowDataPacket>(
  query: string,
  params: any[] = []
): Promise<T[]> {
  try {
    const [rows] = await pool.execute<T[]>(query, params);
    return rows;
  } catch (error) {
    console.error('Error en executeQuery:', error);
    throw error;
  }
}

/**
 * Ejecuta una consulta INSERT/UPDATE/DELETE
 */
export async function executeUpdate(
  query: string,
  params: any[] = []
): Promise<ResultSetHeader> {
  try {
    const [result] = await pool.execute<ResultSetHeader>(query, params);
    return result;
  } catch (error) {
    console.error('Error en executeUpdate:', error);
    throw error;
  }
}

/**
 * Ejecuta una transacción
 */
export async function executeTransaction(
  operation: (connection: any) => Promise<any>
): Promise<any> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const result = await operation(connection);
    
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    console.error('Error en transacción:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Obtiene un registro por ID
 */
export async function getById<T extends RowDataPacket>(
  table: string,
  idField: string,
  id: number
): Promise<T | null> {
  const query = `SELECT * FROM ${table} WHERE ${idField} = ? LIMIT 1`;
  const rows = await executeQuery<T>(query, [id]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Inserta un registro y retorna el ID generado
 */
export async function insert(
  table: string,
  data: Record<string, any>
): Promise<number> {
  const fields = Object.keys(data);
  const values = Object.values(data);
  const placeholders = fields.map(() => '?').join(', ');
  
  const query = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
  const result = await executeUpdate(query, values);
  
  return result.insertId;
}

/**
 * Actualiza un registro
 */
export async function update(
  table: string,
  data: Record<string, any>,
  idField: string,
  id: number
): Promise<boolean> {
  const fields = Object.keys(data);
  const values = Object.values(data);
  const setClause = fields.map(field => `${field} = ?`).join(', ');
  
  const query = `UPDATE ${table} SET ${setClause} WHERE ${idField} = ?`;
  const result = await executeUpdate(query, [...values, id]);
  
  return result.affectedRows > 0;
}

/**
 * Elimina un registro (soft delete cambiando estado)
 */
export async function softDelete(
  table: string,
  idField: string,
  id: number,
  inactiveStateId: number = 2
): Promise<boolean> {
  const query = `UPDATE ${table} SET cdEstado = ? WHERE ${idField} = ?`;
  const result = await executeUpdate(query, [inactiveStateId, id]);
  
  return result.affectedRows > 0;
}

/**
 * Elimina un registro físicamente
 */
export async function hardDelete(
  table: string,
  idField: string,
  id: number
): Promise<boolean> {
  const query = `DELETE FROM ${table} WHERE ${idField} = ?`;
  const result = await executeUpdate(query, [id]);
  
  return result.affectedRows > 0;
}

// =============================================
// FUNCIONES ESPECÍFICAS PARA TRAZA/AUDITORÍA
// =============================================

export interface TrazaData {
  dsProceso: string;
  dsAccion: 'Agregar' | 'Modificar' | 'Eliminar' | 'Consultar' | 'Login' | 'Logout';
  cdUsuario: number;
  cdElemento?: number;
  dsDetalle?: string;
}

/**
 * Registra una acción en la tabla de traza
 */
export async function registrarTraza(data: TrazaData): Promise<void> {
  try {
    const query = `
      INSERT INTO TD_TRAZA (dsProceso, dsAccion, cdUsuario, cdElemento, dsDetalle)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    await executeUpdate(query, [
      data.dsProceso,
      data.dsAccion,
      data.cdUsuario,
      data.cdElemento || null,
      data.dsDetalle || null,
    ]);
  } catch (error) {
    console.error('Error al registrar traza:', error);
    // No lanzamos el error para no afectar la operación principal
  }
}

// =============================================
// FUNCIONES PARA PARÁMETROS DEL SISTEMA
// =============================================

/**
 * Obtiene un parámetro del sistema
 */
export async function getParametro(parametro: string): Promise<string | null> {
  const query = 'SELECT dsValor FROM TD_PARAMETROS WHERE dsParametro = ? LIMIT 1';
  const rows = await executeQuery<RowDataPacket>(query, [parametro]);
  
  return rows.length > 0 ? rows[0].dsValor : null;
}

/**
 * Establece un parámetro del sistema
 */
export async function setParametro(parametro: string, valor: string): Promise<void> {
  const query = `
    INSERT INTO TD_PARAMETROS (dsParametro, dsValor)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE dsValor = ?, feModificacion = CURRENT_TIMESTAMP
  `;
  
  await executeUpdate(query, [parametro, valor, valor]);
}

// =============================================
// FUNCIONES PARA MANEJO DE ESTADO DE ALUMNOS
// =============================================

/**
 * Verifica si un alumno tiene al menos un taller activo
 */
export async function alumnoTieneTalleresActivos(cdAlumno: number): Promise<boolean> {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM TR_ALUMNO_TALLER at
      INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
      WHERE at.cdAlumno = ?
        AND at.cdEstado = 1
        AND at.feBaja IS NULL
        AND t.cdEstado = 1
    `;
    
    const rows = await executeQuery<RowDataPacket>(query, [cdAlumno]);
    return rows.length > 0 && rows[0].count > 0;
  } catch (error) {
    console.error('Error al verificar talleres activos del alumno:', error);
    return false;
  }
}

/**
 * Actualiza el estado del alumno basándose en sus talleres activos
 * - Si tiene talleres activos: cdEstado = 1 (Activo)
 * - Si no tiene talleres activos: cdEstado = 2 (Inactivo)
 */
export async function actualizarEstadoAlumno(cdAlumno: number): Promise<void> {
  try {
    const tieneTalleresActivos = await alumnoTieneTalleresActivos(cdAlumno);
    const nuevoEstado = tieneTalleresActivos ? 1 : 2;
    
    const query = `
      UPDATE TD_ALUMNOS
      SET cdEstado = ?, feModificacion = NOW()
      WHERE cdAlumno = ?
    `;
    
    await executeUpdate(query, [nuevoEstado, cdAlumno]);
  } catch (error) {
    console.error('Error al actualizar estado del alumno:', error);
    // No lanzamos el error para no afectar la operación principal
  }
}

/**
 * Verifica si un alumno tiene pagos pendientes en un taller específico
 * @returns Objeto con información sobre las deudas pendientes
 */
export async function verificarDeudasPendientes(
  cdAlumno: number,
  cdTaller: number
): Promise<{
  tieneDeudas: boolean;
  cantidadMeses: number;
  montoTotal: number;
  detalles: Array<{ mes: number; anio: number; monto: number }>;
}> {
  try {
    // Obtener fecha de inscripción en el taller
    const inscripcionQuery = `
      SELECT feInscripcion, feBaja
      FROM TR_ALUMNO_TALLER
      WHERE cdAlumno = ? AND cdTaller = ?
    `;
    
    const inscripciones = await executeQuery<RowDataPacket>(inscripcionQuery, [cdAlumno, cdTaller]);
    
    if (inscripciones.length === 0) {
      return { tieneDeudas: false, cantidadMeses: 0, montoTotal: 0, detalles: [] };
    }
    
    const feInscripcion = new Date(inscripciones[0].feInscripcion);
    const feBaja = inscripciones[0].feBaja ? new Date(inscripciones[0].feBaja) : new Date();
    
    // Obtener precio del taller
    const precioQuery = `
      SELECT tp.nuPrecioCompletoEfectivo
      FROM TD_TALLERES t
      INNER JOIN TD_TIPO_TALLERES tt ON t.cdTipoTaller = tt.cdTipoTaller
      INNER JOIN TD_PRECIOS_TALLERES tp ON tt.cdTipoTaller = tp.cdTipoTaller
      WHERE t.cdTaller = ?
        AND tp.feInicioVigencia <= CURDATE()
        AND tp.cdEstado = 1
      ORDER BY tp.feInicioVigencia DESC
      LIMIT 1
    `;
    
    const precios = await executeQuery<RowDataPacket>(precioQuery, [cdTaller]);
    const precioMensual = precios.length > 0 ? parseFloat(precios[0].nuPrecioCompletoEfectivo) : 0;
    
    // Generar lista de meses esperados desde inscripción hasta baja
    const mesesEsperados: Array<{ mes: number; anio: number }> = [];
    const mesInicio = feInscripcion.getMonth() + 1;
    const anioInicio = feInscripcion.getFullYear();
    const mesFin = feBaja.getMonth() + 1;
    const anioFin = feBaja.getFullYear();
    
    let mesActual = mesInicio;
    let anioActual = anioInicio;
    
    while (anioActual < anioFin || (anioActual === anioFin && mesActual <= mesFin)) {
      mesesEsperados.push({ mes: mesActual, anio: anioActual });
      mesActual++;
      if (mesActual > 12) {
        mesActual = 1;
        anioActual++;
      }
    }
    
    // Verificar qué meses están pagos
    const detallesDeuda: Array<{ mes: number; anio: number; monto: number }> = [];
    
    for (const periodo of mesesEsperados) {
      const pagoQuery = `
        SELECT COUNT(*) as count
        FROM TD_PAGOS p
        INNER JOIN TD_PAGOS_DETALLE pd ON p.cdPago = pd.cdPago
        WHERE pd.cdAlumno = ?
          AND pd.cdTaller = ?
          AND p.nuMes = ?
          AND p.nuAnio = ?
      `;
      
      const pagos = await executeQuery<RowDataPacket>(pagoQuery, [
        cdAlumno,
        cdTaller,
        periodo.mes,
        periodo.anio,
      ]);
      
      if (pagos[0].count === 0) {
        detallesDeuda.push({
          mes: periodo.mes,
          anio: periodo.anio,
          monto: precioMensual,
        });
      }
    }
    
    const montoTotal = detallesDeuda.reduce((sum, d) => sum + d.monto, 0);
    
    return {
      tieneDeudas: detallesDeuda.length > 0,
      cantidadMeses: detallesDeuda.length,
      montoTotal,
      detalles: detallesDeuda,
    };
  } catch (error) {
    console.error('Error al verificar deudas pendientes:', error);
    return { tieneDeudas: false, cantidadMeses: 0, montoTotal: 0, detalles: [] };
  }
}
