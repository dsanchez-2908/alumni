import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import pool from '@/lib/db';

// GET - Obtener alumnos con 2 o más faltas consecutivas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const currentYear = new Date().getFullYear();

    // Obtener todas las ausencias del año actual para alumnos activos en talleres activos
    const [ausencias] = await pool.execute<any[]>(
      `SELECT 
        a.cdAlumno,
        a.dsNombre,
        a.dsApellido,
        a.dsDNI,
        a.dsTelefonoCelular,
        a.dsMail,
        t.cdTaller,
        tt.dsNombreTaller,
        ast.feFalta,
        ast.dsObservacion,
        ast.snContactado
      FROM TD_ALUMNOS a
      INNER JOIN tr_alumno_taller at ON a.cdAlumno = at.cdAlumno
      INNER JOIN TD_TALLERES t ON at.cdTaller = t.cdTaller
      INNER JOIN td_tipo_talleres tt ON t.cdTipoTaller = tt.cdTipoTaller
      INNER JOIN td_asistencias ast ON a.cdAlumno = ast.cdAlumno AND t.cdTaller = ast.cdTaller
      WHERE a.cdEstado = 1
        AND at.feBaja IS NULL
        AND t.cdEstado = 1
        AND t.nuAnioTaller = ?
        AND YEAR(ast.feFalta) = ?
        AND ast.snPresente = 0
        AND (ast.snContactado IS NULL OR ast.snContactado = 0)
      ORDER BY a.cdAlumno, t.cdTaller, ast.feFalta`,
      [currentYear, currentYear]
    );

    // Agrupar por alumno y taller, y buscar faltas consecutivas
    const alumnosConFaltas: any[] = [];
    const alumnosMap = new Map<number, any>();

    // Organizar ausencias por alumno y taller
    const ausenciasPorAlumnoTaller = new Map<string, any[]>();
    
    ausencias.forEach((ausencia: any) => {
      const key = `${ausencia.cdAlumno}-${ausencia.cdTaller}`;
      if (!ausenciasPorAlumnoTaller.has(key)) {
        ausenciasPorAlumnoTaller.set(key, []);
      }
      ausenciasPorAlumnoTaller.get(key)!.push(ausencia);
    });

    // Buscar faltas consecutivas (2 o más)
    ausenciasPorAlumnoTaller.forEach((ausenciasLista, key) => {
      const [cdAlumno, cdTaller] = key.split('-').map(Number);
      
      // Ordenar por fecha
      ausenciasLista.sort((a, b) => 
        new Date(a.feFalta).getTime() - new Date(b.feFalta).getTime()
      );

      // Buscar secuencias de faltas consecutivas
      let faltasConsecutivas = 1;
      let maxConsecutivas = 1;
      
      for (let i = 1; i < ausenciasLista.length; i++) {
        const fechaAnterior = new Date(ausenciasLista[i - 1].feFalta);
        const fechaActual = new Date(ausenciasLista[i].feFalta);
        
        // Calcular diferencia en días
        const diffTime = fechaActual.getTime() - fechaAnterior.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        // Considerar consecutivas si la diferencia es <= 7 días (una semana)
        if (diffDays <= 7) {
          faltasConsecutivas++;
          maxConsecutivas = Math.max(maxConsecutivas, faltasConsecutivas);
        } else {
          faltasConsecutivas = 1;
        }
      }

      // Si tiene 2 o más faltas consecutivas
      if (maxConsecutivas >= 2) {
        const alumno = ausenciasLista[0];
        
        if (!alumnosMap.has(cdAlumno)) {
          alumnosMap.set(cdAlumno, {
            cdAlumno: alumno.cdAlumno,
            dsNombre: alumno.dsNombre,
            dsApellido: alumno.dsApellido,
            dsDNI: alumno.dsDNI,
            dsTelefonoCelular: alumno.dsTelefonoCelular,
            dsMail: alumno.dsMail,
            talleres: [],
            totalFaltasConsecutivas: 0
          });
        }

        const alumnoData = alumnosMap.get(cdAlumno)!;
        const ultimaFecha = ausenciasLista[ausenciasLista.length - 1].feFalta;
        alumnoData.talleres.push({
          cdTaller: cdTaller,
          dsNombreTaller: alumno.dsNombreTaller,
          faltasConsecutivas: maxConsecutivas,
          ultimaFalta: ultimaFecha instanceof Date 
            ? ultimaFecha.toISOString().split('T')[0] 
            : typeof ultimaFecha === 'string' 
            ? ultimaFecha.split('T')[0] 
            : ultimaFecha
        });
        alumnoData.totalFaltasConsecutivas += maxConsecutivas;
      }
    });

    // Convertir a array y ordenar por cantidad de faltas
    const resultado = Array.from(alumnosMap.values()).sort(
      (a, b) => b.totalFaltasConsecutivas - a.totalFaltasConsecutivas
    );

    return NextResponse.json({ alumnos: resultado });
  } catch (error: any) {
    console.error('Error al obtener alumnos con faltas:', error);
    return NextResponse.json(
      { error: 'Error al obtener reporte', details: error.message },
      { status: 500 }
    );
  }
}
