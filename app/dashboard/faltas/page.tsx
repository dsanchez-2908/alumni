'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClipboardCheck, Filter, Calendar } from 'lucide-react';

interface Falta {
  cdFalta: number;
  feFalta: string;
  dsObservacion: string | null;
  feRegistro: string;
  nuAnioTaller: number;
  dsNombreTaller: string;
  nombreProfesor: string;
  nombreUsuarioRegistro: string;
}

interface Alumno {
  cdAlumno: number;
  dsNombre: string;
  dsApellido: string;
  dsDNI: string;
}

interface Taller {
  cdTaller: number;
  dsNombreTaller: string;
  nuAnioTaller: number;
}

export default function FaltasPage() {
  const router = useRouter();
  
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [faltas, setFaltas] = useState<Falta[]>([]);
  
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<number | null>(null);
  const [tallerSeleccionado, setTallerSeleccionado] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAlumnos();
  }, []);

  const fetchAlumnos = async () => {
    try {
      const response = await fetch('/api/alumnos');
      if (response.ok) {
        const data = await response.json();
        setAlumnos(data.alumnos || []);
      }
    } catch (error) {
      console.error('Error al cargar alumnos:', error);
    }
  };

  const fetchTalleres = async () => {
    try {
      const response = await fetch('/api/talleres');
      if (response.ok) {
        const data = await response.json();
        // La API devuelve un array directamente
        setTalleres(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error al cargar talleres:', error);
    }
  };

  const fetchFaltas = async (cdAlumno: number) => {
    setLoading(true);
    try {
      let url = `/api/alumnos/${cdAlumno}/faltas`;
      if (tallerSeleccionado) {
        url += `?cdTaller=${tallerSeleccionado}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setFaltas(data);
      }
    } catch (error) {
      console.error('Error al cargar faltas:', error);
      setFaltas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAlumnoSelect = (cdAlumno: number) => {
    setAlumnoSeleccionado(cdAlumno);
    setTallerSeleccionado(null);
    fetchFaltas(cdAlumno);
    fetchTalleres();
  };

  const handleTallerFilter = (cdTaller: string) => {
    const cdTallerNum = cdTaller === 'todos' ? null : parseInt(cdTaller);
    setTallerSeleccionado(cdTallerNum);
  };

  // Efecto para recargar cuando cambia el filtro de taller
  useEffect(() => {
    if (alumnoSeleccionado) {
      fetchFaltas(alumnoSeleccionado);
    }
  }, [tallerSeleccionado]);

  const alumnosFiltrados = alumnos.filter((alumno) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      alumno.dsNombre.toLowerCase().includes(term) ||
      alumno.dsApellido.toLowerCase().includes(term) ||
      alumno.dsDNI.includes(term)
    );
  });

  const alumnoActual = alumnos.find((a) => a.cdAlumno === alumnoSeleccionado);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Historial de Faltas
            </h1>
            <p className="text-gray-600 mt-1">
              Consulta el registro de asistencia de los alumnos
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Panel de selección */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="search">Buscar Alumno</Label>
              <Input
                id="search"
                placeholder="Nombre, apellido o DNI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Seleccionar Alumno</Label>
              <Select
                value={alumnoSeleccionado?.toString() || ''}
                onValueChange={(value) => handleAlumnoSelect(parseInt(value))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecciona un alumno" />
                </SelectTrigger>
                <SelectContent>
                  {alumnosFiltrados.map((alumno) => (
                    <SelectItem
                      key={alumno.cdAlumno}
                      value={alumno.cdAlumno.toString()}
                    >
                      {alumno.dsApellido}, {alumno.dsNombre} - DNI: {alumno.dsDNI}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {alumnoSeleccionado && (
              <div>
                <Label>Filtrar por Taller</Label>
                <Select
                  value={tallerSeleccionado?.toString() || 'todos'}
                  onValueChange={handleTallerFilter}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Todos los talleres" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los talleres</SelectItem>
                    {talleres.map((taller) => (
                      <SelectItem
                        key={taller.cdTaller}
                        value={taller.cdTaller.toString()}
                      >
                        {taller.dsNombreTaller} - {taller.nuAnioTaller}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel de resultados */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Registro de Faltas
            </CardTitle>
            {alumnoActual && (
              <CardDescription>
                Alumno: {alumnoActual.dsApellido}, {alumnoActual.dsNombre} (
                {alumnoActual.dsDNI})
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!alumnoSeleccionado ? (
              <div className="text-center py-12 text-gray-500">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Selecciona un alumno para ver su historial de faltas</p>
              </div>
            ) : loading ? (
              <div className="text-center py-12">
                <p>Cargando faltas...</p>
              </div>
            ) : faltas.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>No hay faltas registradas</p>
              </div>
            ) : (
              <div>
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Total de faltas: {faltas.length}
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Taller</TableHead>
                      <TableHead>Profesor</TableHead>
                      <TableHead>Observación</TableHead>
                      <TableHead>Registrado por</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faltas.map((falta) => (
                      <TableRow key={falta.cdFalta}>
                        <TableCell>
                          {new Date(falta.feFalta).toLocaleDateString('es-AR')}
                        </TableCell>
                        <TableCell>
                          {falta.dsNombreTaller} ({falta.nuAnioTaller})
                        </TableCell>
                        <TableCell>{falta.nombreProfesor}</TableCell>
                        <TableCell>
                          {falta.dsObservacion || (
                            <span className="text-gray-400">Sin observación</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {falta.nombreUsuarioRegistro}
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
    </div>
  );
}
