'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Calendar, Check, X, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Alumno {
  cdAlumno: number;
  dsNombre: string;
  dsApellido: string;
  dsDNI: string;
}

interface Taller {
  cdTaller: number;
  nuAnioTaller: number;
  dsNombreTaller: string;
  feInicioTaller: string;
  diasSemana: string[];
}

interface Asistencia {
  fecha: string;
  snPresente: number;
  dsObservacion: string | null;
  cdFalta: number | null;
}

export default function ConsultaAsistenciaPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<Alumno | null>(null);
  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [tallerSeleccionado, setTallerSeleccionado] = useState<string>('');
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [fechasClase, setFechasClase] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchingAlumnos, setSearchingAlumnos] = useState(false);
  const [editandoObservacion, setEditandoObservacion] = useState<{
    fecha: string;
    observacion: string;
    cdFalta: number | null;
  } | null>(null);
  const [guardandoObservacion, setGuardandoObservacion] = useState(false);

  // Buscar alumnos
  const buscarAlumnos = async () => {
    if (searchTerm.length < 2) {
      setAlumnos([]);
      return;
    }

    setSearchingAlumnos(true);
    try {
      const response = await fetch(
        `/api/alumnos/buscar?q=${encodeURIComponent(searchTerm)}`
      );
      if (response.ok) {
        const data = await response.json();
        setAlumnos(data);
      }
    } catch (error) {
      console.error('Error al buscar alumnos:', error);
    } finally {
      setSearchingAlumnos(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      buscarAlumnos();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Cargar talleres del alumno
  const cargarTalleresAlumno = async (cdAlumno: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/alumnos/${cdAlumno}/talleres`);
      if (response.ok) {
        const data = await response.json();
        setTalleres(data);
        if (data.length > 0) {
          setTallerSeleccionado(data[0].cdTaller.toString());
        } else {
          setTallerSeleccionado('');
        }
      }
    } catch (error) {
      console.error('Error al cargar talleres:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar asistencias del alumno en el taller
  const cargarAsistencias = async () => {
    if (!alumnoSeleccionado || !tallerSeleccionado) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/alumnos/${alumnoSeleccionado.cdAlumno}/asistencias?cdTaller=${tallerSeleccionado}`
      );
      if (response.ok) {
        const data = await response.json();
        setAsistencias(data.asistencias);
        setFechasClase(data.fechasClase);
      }
    } catch (error) {
      console.error('Error al cargar asistencias:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (alumnoSeleccionado) {
      cargarTalleresAlumno(alumnoSeleccionado.cdAlumno);
    }
  }, [alumnoSeleccionado]);

  useEffect(() => {
    if (tallerSeleccionado) {
      cargarAsistencias();
    }
  }, [tallerSeleccionado]);

  // Seleccionar alumno
  const seleccionarAlumno = (alumno: Alumno) => {
    setAlumnoSeleccionado(alumno);
    setAlumnos([]);
    setSearchTerm('');
  };

  // Obtener información de asistencia para una fecha
  const getAsistenciaFecha = (fecha: string): Asistencia | null => {
    return asistencias.find((a) => a.fecha === fecha) || null;
  };

  // Abrir modal para editar observación
  const abrirEdicionObservacion = (fecha: string, asistencia: Asistencia | null) => {
    if (!asistencia || asistencia.snPresente === 1) return; // Solo ausencias
    setEditandoObservacion({
      fecha,
      observacion: asistencia.dsObservacion || '',
      cdFalta: asistencia.cdFalta,
    });
  };

  // Guardar observación
  const guardarObservacion = async () => {
    if (!editandoObservacion || !alumnoSeleccionado || !tallerSeleccionado) return;

    setGuardandoObservacion(true);
    try {
      const response = await fetch(
        `/api/alumnos/${alumnoSeleccionado.cdAlumno}/asistencias/${editandoObservacion.cdFalta}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dsObservacion: editandoObservacion.observacion,
          }),
        }
      );

      if (response.ok) {
        // Actualizar asistencias localmente
        setAsistencias((prev) =>
          prev.map((a) =>
            a.cdFalta === editandoObservacion.cdFalta
              ? { ...a, dsObservacion: editandoObservacion.observacion }
              : a
          )
        );
        setEditandoObservacion(null);
      }
    } catch (error) {
      console.error('Error al guardar observación:', error);
    } finally {
      setGuardandoObservacion(false);
    }
  };

  // Agrupar fechas por mes
  const agruparPorMes = () => {
    const meses: { [key: string]: string[] } = {};
    fechasClase.forEach((fecha) => {
      const [anio, mes] = fecha.split('-');
      const claveMes = `${anio}-${mes}`;
      if (!meses[claveMes]) {
        meses[claveMes] = [];
      }
      meses[claveMes].push(fecha);
    });
    return meses;
  };

  const mesesAgrupados = agruparPorMes();
  const nombresMeses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Consulta de Asistencia</h1>
      </div>

      {/* Buscador de Alumno */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Alumno
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Label htmlFor="buscar-alumno">Nombre, Apellido o DNI</Label>
            <div className="relative">
              <Input
                id="buscar-alumno"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Escribe para buscar..."
                disabled={!!alumnoSeleccionado}
              />
              {searchingAlumnos && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin" />
              )}
            </div>

            {/* Lista de resultados */}
            {alumnos.length > 0 && !alumnoSeleccionado && (
              <div className="absolute z-10 mt-1 w-full rounded-md border bg-white shadow-lg">
                {alumnos.map((alumno) => (
                  <button
                    key={alumno.cdAlumno}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100"
                    onClick={() => seleccionarAlumno(alumno)}
                  >
                    <div className="font-medium">
                      {alumno.dsApellido}, {alumno.dsNombre}
                    </div>
                    <div className="text-sm text-gray-500">DNI: {alumno.dsDNI}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Alumno seleccionado */}
          {alumnoSeleccionado && (
            <div className="flex items-center justify-between rounded-md border bg-blue-50 p-3">
              <div>
                <div className="font-medium">
                  {alumnoSeleccionado.dsApellido}, {alumnoSeleccionado.dsNombre}
                </div>
                <div className="text-sm text-gray-600">
                  DNI: {alumnoSeleccionado.dsDNI}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAlumnoSeleccionado(null);
                  setTalleres([]);
                  setTallerSeleccionado('');
                  setAsistencias([]);
                  setFechasClase([]);
                }}
              >
                Cambiar
              </Button>
            </div>
          )}

          {/* Selector de Taller */}
          {alumnoSeleccionado && talleres.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="taller">Taller</Label>
              <Select value={tallerSeleccionado} onValueChange={setTallerSeleccionado}>
                <SelectTrigger id="taller">
                  <SelectValue placeholder="Seleccione un taller" />
                </SelectTrigger>
                <SelectContent>
                  {talleres.map((taller) => (
                    <SelectItem key={taller.cdTaller} value={taller.cdTaller.toString()}>
                      {taller.dsNombreTaller} - {taller.nuAnioTaller}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Calendario de Asistencia */}
      {alumnoSeleccionado && tallerSeleccionado && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendario de Asistencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : fechasClase.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No hay fechas de clase registradas para este taller.
              </p>
            ) : (
              <div className="space-y-8">
                {Object.entries(mesesAgrupados)
                  .sort()
                  .reverse()
                  .map(([mes, fechas]) => {
                    const [anio, mesNum] = mes.split('-');
                    const nombreMes = nombresMeses[parseInt(mesNum) - 1];

                    return (
                      <div key={mes}>
                        <h3 className="text-lg font-semibold mb-4">
                          {nombreMes} {anio}
                        </h3>
                        <div className="grid grid-cols-7 gap-2">
                          {fechas.sort().map((fecha) => {
                            const asistencia = getAsistenciaFecha(fecha);
                            const fechaObj = new Date(fecha + 'T00:00:00');
                            const dia = fechaObj.getDate();
                            const nombreDia = nombresDias[fechaObj.getDay()];

                            return (
                              <div
                                key={fecha}
                                className={`
                                  relative p-3 rounded-lg border-2 transition-all
                                  ${
                                    !asistencia
                                      ? 'border-gray-300 bg-gray-50'
                                      : asistencia.snPresente === 1
                                      ? 'border-green-500 bg-green-50 cursor-default'
                                      : 'border-red-500 bg-red-50 cursor-pointer hover:shadow-md'
                                  }
                                `}
                                onClick={() => {
                                  if (asistencia && asistencia.snPresente === 0) {
                                    abrirEdicionObservacion(fecha, asistencia);
                                  }
                                }}
                              >
                                <div className="text-xs text-gray-600 font-medium">
                                  {nombreDia}
                                </div>
                                <div className="text-2xl font-bold">{dia}</div>
                                <div className="absolute top-1 right-1">
                                  {!asistencia ? (
                                    <Badge variant="outline" className="text-xs">
                                      N/R
                                    </Badge>
                                  ) : asistencia.snPresente === 1 ? (
                                    <Check className="h-5 w-5 text-green-600" />
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <X className="h-5 w-5 text-red-600" />
                                      {asistencia.dsObservacion && (
                                        <Edit className="h-3 w-3 text-gray-600" />
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            <div className="mt-6 flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                <span>Presente</span>
              </div>
              <div className="flex items-center gap-2">
                <X className="h-5 w-5 text-red-600" />
                <span>Ausente</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  N/R
                </Badge>
                <span>No Registrado</span>
              </div>
              <div className="flex items-center gap-2">
                <Edit className="h-4 w-4 text-gray-600" />
                <span>Click en ausente para ver/editar observación</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal para editar observación */}
      <Dialog
        open={!!editandoObservacion}
        onOpenChange={(open) => !open && setEditandoObservacion(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observación de Ausencia</DialogTitle>
            <DialogDescription>
              Fecha: {editandoObservacion?.fecha}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="observacion">Observación</Label>
              <Textarea
                id="observacion"
                value={editandoObservacion?.observacion || ''}
                onChange={(e) =>
                  setEditandoObservacion((prev) =>
                    prev ? { ...prev, observacion: e.target.value } : null
                  )
                }
                placeholder="Ingrese una observación sobre la ausencia..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditandoObservacion(null)}
              disabled={guardandoObservacion}
            >
              Cancelar
            </Button>
            <Button onClick={guardarObservacion} disabled={guardandoObservacion}>
              {guardandoObservacion ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
