'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Save, Calendar } from 'lucide-react';

interface AlumnoAsistencia {
  inscripcionId: number;
  cdAlumno: number;
  dsNombre: string;
  dsApellido: string;
  dsDNI: string;
  cdFalta: number | null;
  dsObservacion: string | null;
}

interface Taller {
  cdTaller: number;
  nuAnioTaller: number;
  dsNombreTaller: string;
  nombrePersonal: string;
}

export default function AsistenciaPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cdTaller = params?.id as string;
  const fromRegistro = searchParams.get('from') === 'registro';

  const [taller, setTaller] = useState<Taller | null>(null);
  const [alumnos, setAlumnos] = useState<AlumnoAsistencia[]>([]);
  const [fecha, setFecha] = useState<string>(
    searchParams.get('fecha') || new Date().toISOString().split('T')[0]
  );
  const [faltas, setFaltas] = useState<Set<number>>(new Set());
  const [observaciones, setObservaciones] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [diasClase, setDiasClase] = useState<number[]>([]);

  useEffect(() => {
    if (cdTaller) {
      fetchTaller();
    }
  }, [cdTaller]);

  useEffect(() => {
    if (cdTaller && fecha) {
      fetchAsistencia();
    }
  }, [cdTaller, fecha]);

  const fetchTaller = async () => {
    try {
      const response = await fetch(`/api/talleres/${cdTaller}`);
      if (response.ok) {
        const data = await response.json();
        setTaller(data);
        
        // Identificar días de clase
        const dias: number[] = [];
        if (data.snDomingo) dias.push(0);
        if (data.snLunes) dias.push(1);
        if (data.snMartes) dias.push(2);
        if (data.snMiercoles) dias.push(3);
        if (data.snJueves) dias.push(4);
        if (data.snViernes) dias.push(5);
        if (data.snSabado) dias.push(6);
        setDiasClase(dias);
      }
    } catch (error) {
      console.error('Error al cargar taller:', error);
    }
  };

  const fetchAsistencia = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/talleres/${cdTaller}/faltas?fecha=${fecha}`
      );
      if (response.ok) {
        const data = await response.json();
        setAlumnos(data);

        // Marcar los que ya tienen falta registrada
        const faltasSet = new Set<number>();
        const obs: Record<number, string> = {};
        data.forEach((alumno: AlumnoAsistencia) => {
          if (alumno.cdFalta) {
            faltasSet.add(alumno.cdAlumno);
            if (alumno.dsObservacion) {
              obs[alumno.cdAlumno] = alumno.dsObservacion;
            }
          }
        });
        setFaltas(faltasSet);
        setObservaciones(obs);
      }
    } catch (error) {
      console.error('Error al cargar asistencia:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFalta = (cdAlumno: number) => {
    setFaltas((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(cdAlumno)) {
        newSet.delete(cdAlumno);
        // Limpiar observación si ya no tiene falta
        setObservaciones((obs) => {
          const newObs = { ...obs };
          delete newObs[cdAlumno];
          return newObs;
        });
      } else {
        newSet.add(cdAlumno);
      }
      return newSet;
    });
  };

  const handleObservacionChange = (cdAlumno: number, value: string) => {
    setObservaciones((prev) => ({
      ...prev,
      [cdAlumno]: value,
    }));
  };

  const guardarAsistencia = async () => {
    // Validar que la fecha sea un día de clase
    const fechaObj = new Date(fecha + 'T00:00:00');
    const diaSemana = fechaObj.getDay();
    
    if (!diasClase.includes(diaSemana)) {
      const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const diasClaseNombres = diasClase.map(d => diasNombres[d]).join(', ');
      alert(`La fecha seleccionada no es un día de clase. Este taller tiene clase los días: ${diasClaseNombres}`);
      return;
    }

    setSaving(true);
    try {
      const faltasArray = Array.from(faltas).map((cdAlumno) => ({
        cdAlumno,
        dsObservacion: observaciones[cdAlumno] || null,
      }));

      const response = await fetch(`/api/talleres/${cdTaller}/faltas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fecha,
          faltas: faltasArray,
        }),
      });

      if (response.ok) {
        alert('Asistencia guardada exitosamente');
        // Volver a la pantalla de origen
        if (fromRegistro) {
          router.push('/dashboard/registro-asistencia');
        } else {
          router.push(`/dashboard/talleres/${cdTaller}`);
        }
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error al guardar asistencia:', error);
      alert('Error al guardar asistencia');
    } finally {
      setSaving(false);
    }
  };

  if (!taller) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/talleres/${cdTaller}`)}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <Button
          onClick={guardarAsistencia}
          disabled={saving}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar Asistencia'}
        </Button>
      </div>

      {/* Info del Taller y Fecha */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Registro de Asistencia
          </CardTitle>
          <CardDescription>
            {taller.dsNombreTaller} - {taller.nuAnioTaller} | Profesor:{' '}
            {taller.nombrePersonal}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="fecha" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha
              </Label>
              <Input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="mt-2"
              />
              {fecha && diasClase.length > 0 && (() => {
                const fechaObj = new Date(fecha + 'T00:00:00');
                const diaSemana = fechaObj.getDay();
                const esValido = diasClase.includes(diaSemana);
                const diasNombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                
                return (
                  <p className={`text-sm mt-2 ${esValido ? 'text-green-600' : 'text-red-600'}`}>
                    {esValido 
                      ? `✓ ${diasNombres[diaSemana]} - Día de clase válido`
                      : `✗ ${diasNombres[diaSemana]} - No es día de clase. Este taller tiene clase los: ${diasClase.map(d => diasNombres[d]).join(', ')}`
                    }
                  </p>
                );
              })()}
            </div>
            <div className="pt-8">
              <p className="text-sm text-gray-600">
                Total alumnos: {alumnos.length} | Faltas marcadas:{' '}
                {faltas.size}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Alumnos */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Alumnos</CardTitle>
          <CardDescription>
            Marca los alumnos ausentes y agrega observaciones si es necesario
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando alumnos...</div>
          ) : alumnos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay alumnos inscritos en este taller
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Ausente</TableHead>
                  <TableHead>Nombre y Apellido</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead className="w-[300px]">Observación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alumnos.map((alumno) => (
                  <TableRow
                    key={alumno.cdAlumno}
                    className={faltas.has(alumno.cdAlumno) ? 'bg-red-50' : ''}
                  >
                    <TableCell>
                      <Checkbox
                        checked={faltas.has(alumno.cdAlumno)}
                        onChange={() => toggleFalta(alumno.cdAlumno)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {alumno.dsApellido}, {alumno.dsNombre}
                    </TableCell>
                    <TableCell>{alumno.dsDNI}</TableCell>
                    <TableCell>
                      {faltas.has(alumno.cdAlumno) && (
                        <Textarea
                          placeholder="Observación (opcional)"
                          value={observaciones[alumno.cdAlumno] || ''}
                          onChange={(e) =>
                            handleObservacionChange(
                              alumno.cdAlumno,
                              e.target.value
                            )
                          }
                          rows={2}
                          className="text-sm"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
