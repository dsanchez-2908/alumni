import bcrypt from 'bcryptjs';
import pool from './db';
import { Usuario, Rol } from '@/types';
import { RowDataPacket } from 'mysql2';

/**
 * Autentica un usuario con usuario y contraseña
 */
export async function authenticateUser(
  username: string,
  password: string
): Promise<{ user: Usuario; roles: Rol[] } | null> {
  try {
    // Buscar usuario
    const [users] = await pool.execute<Usuario[]>(
      `SELECT u.* FROM TD_USUARIOS u
       INNER JOIN TD_ESTADOS e ON u.cdEstado = e.cdEstado
       WHERE u.dsUsuario = ? AND e.dsEstado = 'Activo'`,
      [username]
    );

    if (users.length === 0) {
      return null;
    }

    const user = users[0];

    // Verificar contraseña
    const isValid = await bcrypt.compare(password, user.dsClave);
    if (!isValid) {
      return null;
    }

    // Obtener roles del usuario
    const [roles] = await pool.execute<Rol[]>(
      `SELECT r.* FROM TD_ROLES r
       INNER JOIN TR_USUARIO_ROL ur ON r.cdRol = ur.cdRol
       WHERE ur.cdUsuario = ?`,
      [user.cdUsuario]
    );

    return { user, roles };
  } catch (error) {
    console.error('Error en authenticateUser:', error);
    return null;
  }
}

/**
 * Obtiene un usuario por su ID
 */
export async function getUserById(cdUsuario: number): Promise<Usuario | null> {
  try {
    const [users] = await pool.execute<Usuario[]>(
      'SELECT * FROM TD_USUARIOS WHERE cdUsuario = ?',
      [cdUsuario]
    );

    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Error en getUserById:', error);
    return null;
  }
}

/**
 * Obtiene los roles de un usuario
 */
export async function getUserRoles(cdUsuario: number): Promise<Rol[]> {
  try {
    const [roles] = await pool.execute<Rol[]>(
      `SELECT r.* FROM TD_ROLES r
       INNER JOIN TR_USUARIO_ROL ur ON r.cdRol = ur.cdRol
       WHERE ur.cdUsuario = ?`,
      [cdUsuario]
    );

    return roles;
  } catch (error) {
    console.error('Error en getUserRoles:', error);
    return [];
  }
}

/**
 * Obtiene todos los usuarios con sus roles
 */
export async function getAllUsers() {
  try {
    const [users] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        u.cdUsuario,
        u.dsNombreCompleto,
        u.dsUsuario,
        u.cdPersonal,
        u.feAlta,
        e.dsEstado,
        e.cdEstado,
        GROUP_CONCAT(r.dsRol SEPARATOR ', ') as roles,
        GROUP_CONCAT(r.cdRol) as rolesIds
      FROM TD_USUARIOS u
      INNER JOIN TD_ESTADOS e ON u.cdEstado = e.cdEstado
      LEFT JOIN TR_USUARIO_ROL ur ON u.cdUsuario = ur.cdUsuario
      LEFT JOIN TD_ROLES r ON ur.cdRol = r.cdRol
      GROUP BY u.cdUsuario
      ORDER BY u.feAlta DESC`
    );

    return users;
  } catch (error) {
    console.error('Error en getAllUsers:', error);
    return [];
  }
}

/**
 * Crea un nuevo usuario
 */
export async function createUser(data: {
  dsNombreCompleto: string;
  dsUsuario: string;
  dsClave: string;
  cdPersonal?: number | null;
  roles: number[];
  cdEstado: number;
}) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(data.dsClave, 10);

    // Insertar usuario
    const [result]: any = await connection.execute(
      `INSERT INTO TD_USUARIOS 
       (dsNombreCompleto, dsUsuario, dsClave, cdPersonal, cdEstado)
       VALUES (?, ?, ?, ?, ?)`,
      [
        data.dsNombreCompleto,
        data.dsUsuario,
        hashedPassword,
        data.cdPersonal || null,
        data.cdEstado,
      ]
    );

    const cdUsuario = result.insertId;

    // Insertar roles
    for (const cdRol of data.roles) {
      await connection.execute(
        'INSERT INTO TR_USUARIO_ROL (cdUsuario, cdRol) VALUES (?, ?)',
        [cdUsuario, cdRol]
      );
    }

    await connection.commit();
    return cdUsuario;
  } catch (error) {
    await connection.rollback();
    console.error('Error en createUser:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Actualiza un usuario existente
 */
export async function updateUser(
  cdUsuario: number,
  data: {
    dsNombreCompleto: string;
    dsUsuario: string;
    dsClave?: string;
    cdPersonal?: number | null;
    roles: number[];
    cdEstado: number;
  }
) {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Actualizar usuario
    if (data.dsClave) {
      const hashedPassword = await bcrypt.hash(data.dsClave, 10);
      await connection.execute(
        `UPDATE TD_USUARIOS 
         SET dsNombreCompleto = ?, dsUsuario = ?, dsClave = ?, cdPersonal = ?, cdEstado = ?
         WHERE cdUsuario = ?`,
        [
          data.dsNombreCompleto,
          data.dsUsuario,
          hashedPassword,
          data.cdPersonal || null,
          data.cdEstado,
          cdUsuario,
        ]
      );
    } else {
      await connection.execute(
        `UPDATE TD_USUARIOS 
         SET dsNombreCompleto = ?, dsUsuario = ?, cdPersonal = ?, cdEstado = ?
         WHERE cdUsuario = ?`,
        [
          data.dsNombreCompleto,
          data.dsUsuario,
          data.cdPersonal || null,
          data.cdEstado,
          cdUsuario,
        ]
      );
    }

    // Eliminar roles existentes
    await connection.execute(
      'DELETE FROM TR_USUARIO_ROL WHERE cdUsuario = ?',
      [cdUsuario]
    );

    // Insertar nuevos roles
    for (const cdRol of data.roles) {
      await connection.execute(
        'INSERT INTO TR_USUARIO_ROL (cdUsuario, cdRol) VALUES (?, ?)',
        [cdUsuario, cdRol]
      );
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    console.error('Error en updateUser:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Cambia la contraseña de un usuario
 */
export async function changePassword(
  cdUsuario: number,
  newPassword: string
): Promise<boolean> {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const [result]: any = await pool.execute(
      'UPDATE TD_USUARIOS SET dsClave = ? WHERE cdUsuario = ?',
      [hashedPassword, cdUsuario]
    );

    return result.affectedRows > 0;
  } catch (error) {
    console.error('Error en changePassword:', error);
    return false;
  }
}

/**
 * Obtiene todos los roles disponibles
 */
export async function getAllRoles(): Promise<Rol[]> {
  try {
    const [roles] = await pool.execute<Rol[]>(
      'SELECT * FROM TD_ROLES ORDER BY dsRol'
    );

    return roles;
  } catch (error) {
    console.error('Error en getAllRoles:', error);
    return [];
  }
}

/**
 * Obtiene todos los estados disponibles
 */
export async function getAllEstados() {
  try {
    const [estados] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM TD_ESTADOS ORDER BY dsEstado'
    );

    return estados;
  } catch (error) {
    console.error('Error en getAllEstados:', error);
    return [];
  }
}
