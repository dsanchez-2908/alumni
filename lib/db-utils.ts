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
