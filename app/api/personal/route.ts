import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { executeQuery, executeUpdate, insert, registrarTraza, executeTransaction } from '@/lib/db-utils';
import { RowDataPacket } from 'mysql2';
import pool from '@/lib/db';

// GET - Obtener todo el personal
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const personal = await executeQuery<RowDataPacket>(
      `SELECT 
        p.cdPersonal,
        p.dsNombreCompleto,
        p.dsTipoPersonal,
        p.dsDescripcionPuesto,
        p.dsDomicilio,
        p.dsTelefono,
        p.dsMail,
        p.feNacimiento,
        p.dsDni,
        p.dsCuil,
        p.dsEntidad,
        p.dsCbuCvu,
        p.dsObservaciones,
        p.cdEstado,
        e.dsEstado,
        p.feCreacion,
        GROUP_CONCAT(tt.dsNombreTaller SEPARATOR ', ') as talleres,
        GROUP_CONCAT(tt.cdTipoTaller) as talleresIds
      FROM TD_PERSONAL p
      INNER JOIN TD_ESTADOS e ON p.cdEstado = e.cdEstado
      LEFT JOIN TR_PERSONAL_TIPO_TALLER ptt ON p.cdPersonal = ptt.cdPersonal
      LEFT JOIN TD_TIPO_TALLERES tt ON ptt.cdTipoTaller = tt.cdTipoTaller
      GROUP BY p.cdPersonal
      ORDER BY p.dsNombreCompleto`
    );

    // Obtener tipos de talleres activos
    const tiposTalleres = await executeQuery<RowDataPacket>(
      `SELECT cdTipoTaller, dsNombreTaller 
       FROM TD_TIPO_TALLERES 
       WHERE cdEstado = 1 
       ORDER BY dsNombreTaller`
    );

    return NextResponse.json({ personal, tiposTalleres });
  } catch (error) {
    console.error('Error en GET /api/personal:', error);
    return NextResponse.json(
      { error: 'Error al obtener personal' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo personal
export async function POST(request: Request) {
  const connection = await pool.getConnection();
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    
    // Validaciones
    if (!data.dsNombreCompleto) {
      return NextResponse.json(
        { error: 'El nombre completo es requerido' },
        { status: 400 }
      );
    }

    if (!data.dsTipoPersonal) {
      return NextResponse.json(
        { error: 'El tipo de personal es requerido' },
        { status: 400 }
      );
    }

    if (data.dsTipoPersonal === 'Profesor' && (!data.talleres || data.talleres.length === 0)) {
      return NextResponse.json(
        { error: 'Debe asignar al menos un taller para un profesor' },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    // Insertar personal
    const [result]: any = await connection.execute(
      `INSERT INTO TD_PERSONAL 
       (dsNombreCompleto, dsTipoPersonal, dsDescripcionPuesto, dsDomicilio, dsTelefono, dsMail, feNacimiento, dsDni, dsCuil, dsEntidad, dsCbuCvu, dsObservaciones, cdEstado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.dsNombreCompleto,
        data.dsTipoPersonal,
        data.dsDescripcionPuesto || null,
        data.dsDomicilio || null,
        data.dsTelefono || null,
        data.dsMail || null,
        data.feNacimiento || null,
        data.dsDni || null,
        data.dsCuil || null,
        data.dsEntidad || null,
        data.dsCbuCvu || null,
        data.dsObservaciones || null,
        data.cdEstado || 1,
      ]
    );

    const cdPersonal = result.insertId;

    // Si es profesor, asociar talleres
    if (data.dsTipoPersonal === 'Profesor' && data.talleres) {
      for (const cdTipoTaller of data.talleres) {
        await connection.execute(
          'INSERT INTO TR_PERSONAL_TIPO_TALLER (cdPersonal, cdTipoTaller) VALUES (?, ?)',
          [cdPersonal, cdTipoTaller]
        );
      }
    }

    await connection.commit();

    // Registrar en traza
    await registrarTraza({
      dsProceso: 'Personal',
      dsAccion: 'Agregar',
      cdUsuario: session.user.cdUsuario,
      cdElemento: cdPersonal,
      dsDetalle: `Personal creado: ${data.dsNombreCompleto} - ${data.dsTipoPersonal}`,
    });

    return NextResponse.json({ 
      success: true, 
      cdPersonal,
      message: 'Personal creado exitosamente' 
    });
  } catch (error: any) {
    await connection.rollback();
    console.error('Error en POST /api/personal:', error);
    
    return NextResponse.json(
      { error: 'Error al crear personal' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
