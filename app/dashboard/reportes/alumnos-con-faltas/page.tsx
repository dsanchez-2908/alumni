'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, Phone, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Taller {
  cdTaller: number;
  dsNombreTaller: string;
  faltasConsecutivas: number;
  ultimaFalta: string;
}

interface AlumnoConFaltas {
  cdAlumno: number;
  dsNombre: string;
  dsApellido: string;
  dsDNI: string;
  dsTelefonoCelular: string | null;
  dsMail: string | null;
  talleres: Taller[];
  totalFaltasConsecutivas: number;
}

export default function AlumnosConFaltasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [alumnos, setAlumnos] = useState<AlumnoConFaltas[]>([]);

  useEffect(() => {
    fetchAlumnos();
  }, []);

  const fetchAlumnos = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reportes/alumnos-con-faltas');
      if (response.ok) {
        const data = await response.json();
        setAlumnos(data.alumnos);
      }
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR');
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="h-8 w-8 text-orange-600" />
          Seguimiento de Faltas
        </h1>
        <p className="text-gray-600 mt-1">
          Alumnos con 2 o más faltas consecutivas que requieren contacto
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Alumnos a Contactar</span>
            {!loading && (
              <Badge variant="destructive" className="text-lg">
                {alumnos.length} {alumnos.length === 1 ? 'alumno' : 'alumnos'}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Lista de alumnos con ausencias consecutivas sin contactar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : alumnos.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">
                No hay alumnos pendientes de contacto
              </p>
              <p className="text-gray-600 mt-1">
                Todos los alumnos con faltas consecutivas han sido contactados
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Alumno</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Talleres con Faltas</TableHead>
                    <TableHead className="text-center">Total Faltas</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alumnos.map((alumno) => (
                    <TableRow key={alumno.cdAlumno}>
                      <TableCell className="font-medium">
                        {alumno.dsApellido}, {alumno.dsNombre}
                      </TableCell>
                      <TableCell>{alumno.dsDNI}</TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {alumno.dsTelefonoCelular && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {alumno.dsTelefonoCelular}
                            </div>
                          )}
                          {alumno.dsMail && (
                            <div className="text-gray-600">{alumno.dsMail}</div>
                          )}
                          {!alumno.dsTelefonoCelular && !alumno.dsMail && (
                            <span className="text-gray-400">Sin datos</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {alumno.talleres.map((taller) => (
                            <div key={taller.cdTaller} className="text-sm">
                              <span className="font-medium">{taller.dsNombreTaller}</span>
                              <span className="text-gray-600 ml-2">
                                ({taller.faltasConsecutivas} faltas)
                              </span>
                              <div className="text-xs text-gray-500">
                                Última: {formatFecha(taller.ultimaFalta)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="destructive" className="font-bold">
                          {alumno.totalFaltasConsecutivas}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() =>
                            router.push(`/dashboard/reportes/alumnos-con-faltas/${alumno.cdAlumno}`)
                          }
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Ver Detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
