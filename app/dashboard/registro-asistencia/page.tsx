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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ClipboardCheck, Calendar, AlertCircle } from 'lucide-react';

interface Personal {
  cdPersonal: number;
  dsNombreCompleto: string;
}

interface Taller {
  cdTaller: number;
  nuAnioTaller: number;
  dsNombreTaller: string;
  nombrePersonal: string;
  cdPersonal: number;
}

interface FechasPendientes {
  fechasPendientes: string[];
  diasClase: number[];
  fechaInicio: string;
}

const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function RegistroAsistenciaProfesorPage() {
  const router = useRouter();

  const [personal, setPersonal] = useState<Personal[]>([]);
  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [talleresFiltrados, setTalleresFiltrados] = useState<Taller[]>([]);
  const [fechasPendientes, setFechasPendientes] = useState<FechasPendientes | null>(null);

  const [profesorSeleccionado, setProfesorSeleccionado] = useState<number | null>(null);
  const [tallerSeleccionado, setTallerSeleccionado] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPersonal();
    fetchTalleres();
  }, []);

  useEffect(() => {
    if (profesorSeleccionado) {
      const filtrados = talleres.filter((t) => t.cdPersonal === profesorSeleccionado);
      setTalleresFiltrados(filtrados);
      setTallerSeleccionado(null);
      setFechasPendientes(null);
    } else {
      setTalleresFiltrados([]);
      setTallerSeleccionado(null);
      setFechasPendientes(null);
    }
  }, [profesorSeleccionado, talleres]);

  useEffect(() => {
    if (tallerSeleccionado) {
      fetchFechasPendientes(tallerSeleccionado);
    } else {
      setFechasPendientes(null);
    }
  }, [tallerSeleccionado]);

  const fetchPersonal = async () => {
    try {
      const response = await fetch('/api/personal');
      if (response.ok) {
        const data = await response.json();
        setPersonal(data.personal || []);
      }
    } catch (error) {
      console.error('Error al cargar personal:', error);
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

  const fetchFechasPendientes = async (cdTaller: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/talleres/${cdTaller}/fechas-pendientes`);
      if (response.ok) {
        const data = await response.json();
        setFechasPendientes(data);
      }
    } catch (error) {
      console.error('Error al cargar fechas pendientes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarAsistencia = (fecha: string) => {
    if (tallerSeleccionado) {
      router.push(`/dashboard/talleres/${tallerSeleccionado}/asistencia?fecha=${fecha}&from=registro`);
    }
  };

  const tallerActual = talleresFiltrados.find((t) => t.cdTaller === tallerSeleccionado);
  const profesorActual = personal.find((p) => p.cdPersonal === profesorSeleccionado);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Registro de Asistencia - Profesores
        </h1>
        <p className="text-gray-600 mt-1">
          Registra la asistencia de tus talleres en las fechas de clase
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Panel de selección */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Seleccionar Taller
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Profesor</Label>
              <Select
                value={profesorSeleccionado?.toString() || ''}
                onValueChange={(value) => setProfesorSeleccionado(parseInt(value))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecciona un profesor" />
                </SelectTrigger>
                <SelectContent>
                  {personal.map((p) => (
                    <SelectItem key={p.cdPersonal} value={p.cdPersonal.toString()}>
                      {p.dsNombreCompleto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {profesorSeleccionado && (
              <div>
                <Label>Taller</Label>
                <Select
                  value={tallerSeleccionado?.toString() || ''}
                  onValueChange={(value) => setTallerSeleccionado(parseInt(value))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecciona un taller" />
                  </SelectTrigger>
                  <SelectContent>
                    {talleresFiltrados.length === 0 ? (
                      <SelectItem value="none" disabled>
                        Sin talleres asignados
                      </SelectItem>
                    ) : (
                      talleresFiltrados.map((t) => (
                        <SelectItem key={t.cdTaller} value={t.cdTaller.toString()}>
                          {t.dsNombreTaller} - {t.nuAnioTaller}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {tallerActual && fechasPendientes && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Información del Taller
                </p>
                <div className="space-y-1 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Días de clase:</span>{' '}
                    {fechasPendientes.diasClase.map((d) => diasSemana[d]).join(', ')}
                  </p>
                  <p>
                    <span className="font-medium">Inicio:</span>{' '}
                    {new Date(fechasPendientes.fechaInicio + 'T00:00:00').toLocaleDateString(
                      'es-AR'
                    )}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Panel de fechas pendientes */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Fechas Pendientes de Registro
            </CardTitle>
            {tallerActual && (
              <CardDescription>
                Taller: {tallerActual.dsNombreTaller} - {tallerActual.nuAnioTaller}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {!tallerSeleccionado ? (
              <div className="text-center py-12 text-gray-500">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Selecciona un profesor y un taller para ver las fechas pendientes</p>
              </div>
            ) : loading ? (
              <div className="text-center py-12">
                <p>Cargando fechas pendientes...</p>
              </div>
            ) : !fechasPendientes || fechasPendientes.fechasPendientes.length === 0 ? (
              <div className="text-center py-12 text-green-600">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4" />
                <p className="font-medium">¡Todo al día!</p>
                <p className="text-sm text-gray-600 mt-2">
                  No hay fechas pendientes de registro
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-900">
                      Hay {fechasPendientes.fechasPendientes.length} fecha(s) pendiente(s) de
                      registro
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      Haz click en una fecha para registrar la asistencia de ese día
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {fechasPendientes.fechasPendientes.map((fecha) => {
                    const fechaObj = new Date(fecha + 'T00:00:00');
                    const diaSemana = diasSemana[fechaObj.getDay()];
                    const esHoy = fecha === new Date().toISOString().split('T')[0];

                    return (
                      <Card
                        key={fecha}
                        className={`cursor-pointer hover:shadow-md transition-shadow ${
                          esHoy ? 'border-indigo-500 border-2' : ''
                        }`}
                        onClick={() => handleRegistrarAsistencia(fecha)}
                      >
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">
                            {fechaObj.toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </CardTitle>
                          <CardDescription>{diaSemana}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button
                            className="w-full"
                            variant={esHoy ? 'default' : 'outline'}
                          >
                            {esHoy ? 'Registrar Hoy' : 'Registrar'}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
