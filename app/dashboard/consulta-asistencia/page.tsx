'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
import { Search, Calendar, Eye, CheckCircle, XCircle, Users } from 'lucide-react';

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
  snDomingo: boolean;
  dsDomingoHoraDesde: string | null;
  dsDomingoHoraHasta: string | null;
  snLunes: boolean;
  dsLunesHoraDesde: string | null;
  dsLunesHoraHasta: string | null;
  snMartes: boolean;
  dsMartesHoraDesde: string | null;
  dsMartesHoraHasta: string | null;
  snMiercoles: boolean;
  dsMiercolesHoraDesde: string | null;
  dsMiercolesHoraHasta: string | null;
  snJueves: boolean;
  dsJuevesHoraDesde: string | null;
  dsJuevesHoraHasta: string | null;
  snViernes: boolean;
  dsViernesHoraDesde: string | null;
  dsViernesHoraHasta: string | null;
  snSabado: boolean;
  dsSabadoHoraDesde: string | null;
  dsSabadoHoraHasta: string | null;
}

interface FechaRegistrada {
  fecha: string;
  totalAlumnos: number;
  presentes: number;
  ausentes: number;
}

interface TallerInfo {
  cdTaller: number;
  nuAnioTaller: number;
  dsNombreTaller: string;
  feInicioTaller: string;
  nombreProfesor: string;
}

const mesesDelAnio = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

export default function ConsultaAsistenciaPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [personal, setPersonal] = useState<Personal[]>([]);
  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [talleresFiltrados, setTalleresFiltrados] = useState<Taller[]>([]);
  const [fechasRegistradas, setFechasRegistradas] = useState<FechaRegistrada[]>([]);
  const [tallerInfo, setTallerInfo] = useState<TallerInfo | null>(null);

  const [profesorSeleccionado, setProfesorSeleccionado] = useState<number | null>(null);
  const [tallerSeleccionado, setTallerSeleccionado] = useState<number | null>(null);
  const [anioSeleccionado, setAnioSeleccionado] = useState<string>('');
  const [mesSeleccionado, setMesSeleccionado] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [profesorBloqueado, setProfesorBloqueado] = useState(false);
  const [esProfesor, setEsProfesor] = useState(false);

  // Generar lista de años (año actual - 2 hasta año actual + 1)
  const aniosDisponibles = Array.from({ length: 4 }, (_, i) => {
    const anio = new Date().getFullYear() - 2 + i;
    return { value: anio.toString(), label: anio.toString() };
  });

  // Verificar si el usuario es profesor y precargar su cdPersonal
  useEffect(() => {
    if (session?.user) {
      const user = session.user as any;
      const roles = user.roles || [];
      const esProf = roles.includes('Profesor');
      const cdPersonal = user.cdPersonal;

      setEsProfesor(esProf);

      if (esProf && cdPersonal) {
        setProfesorSeleccionado(cdPersonal);
        setProfesorBloqueado(true);
      }
    }
  }, [session]);

  useEffect(() => {
    fetchPersonal();
    fetchTalleres();
    
    // Preseleccionar año y mes actual
    const now = new Date();
    setAnioSeleccionado(now.getFullYear().toString());
    setMesSeleccionado((now.getMonth() + 1).toString());
  }, []);

  useEffect(() => {
    if (profesorSeleccionado) {
      const filtrados = talleres.filter((t) => t.cdPersonal === profesorSeleccionado);
      setTalleresFiltrados(filtrados);
      setTallerSeleccionado(null);
      setFechasRegistradas([]);
      setTallerInfo(null);
    } else {
      setTalleresFiltrados([]);
      setTallerSeleccionado(null);
      setFechasRegistradas([]);
      setTallerInfo(null);
    }
  }, [profesorSeleccionado, talleres]);

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
        setTalleres(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error al cargar talleres:', error);
    }
  };

  const handleBuscar = async () => {
    if (!profesorSeleccionado || !tallerSeleccionado || !anioSeleccionado || !mesSeleccionado) {
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        cdPersonal: profesorSeleccionado.toString(),
        cdTaller: tallerSeleccionado.toString(),
        anio: anioSeleccionado,
        mes: mesSeleccionado,
      });

      const response = await fetch(`/api/consulta-asistencia?${params}`);
      if (response.ok) {
        const data = await response.json();
        setFechasRegistradas(data.fechasRegistradas || []);
        setTallerInfo(data.taller);
      }
    } catch (error) {
      console.error('Error al buscar fechas registradas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = (fecha: string) => {
    if (tallerSeleccionado) {
      // Extraer solo la parte de fecha (YYYY-MM-DD) del string ISO
      const fechaSoloFecha = fecha.split('T')[0];
      // Agregar parámetro readonly=true solo si es profesor
      const readonlyParam = esProfesor ? '&readonly=true' : '';
      router.push(
        `/dashboard/talleres/${tallerSeleccionado}/asistencia?fecha=${fechaSoloFecha}&from=consulta${readonlyParam}`
      );
    }
  };

  const formatFecha = (fecha: string) => {
    try {
      const date = new Date(fecha);
      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }
      return date.toLocaleDateString('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const formatFechaCorta = (fecha: string) => {
    try {
      const date = new Date(fecha);
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      return date.toLocaleDateString('es-AR');
    } catch (error) {
      return 'N/A';
    }
  };

  const puedeConsultar =
    profesorSeleccionado && tallerSeleccionado && anioSeleccionado && mesSeleccionado;

  const mesNombre = mesesDelAnio.find((m) => m.value === mesSeleccionado)?.label || '';

  // Función helper para formatear días y horarios
  const formatDiasHorarios = (taller: Taller): string => {
    const dias = [];
    const formatTime = (time: string | null) => {
      if (!time) return null;
      return time.substring(0, 5); // HH:MM
    };

    if (taller.snDomingo && taller.dsDomingoHoraDesde) {
      dias.push(`Dom ${formatTime(taller.dsDomingoHoraDesde)}`);
    }
    if (taller.snLunes && taller.dsLunesHoraDesde) {
      dias.push(`Lun ${formatTime(taller.dsLunesHoraDesde)}`);
    }
    if (taller.snMartes && taller.dsMartesHoraDesde) {
      dias.push(`Mar ${formatTime(taller.dsMartesHoraDesde)}`);
    }
    if (taller.snMiercoles && taller.dsMiercolesHoraDesde) {
      dias.push(`Mié ${formatTime(taller.dsMiercolesHoraDesde)}`);
    }
    if (taller.snJueves && taller.dsJuevesHoraDesde) {
      dias.push(`Jue ${formatTime(taller.dsJuevesHoraDesde)}`);
    }
    if (taller.snViernes && taller.dsViernesHoraDesde) {
      dias.push(`Vie ${formatTime(taller.dsViernesHoraDesde)}`);
    }
    if (taller.snSabado && taller.dsSabadoHoraDesde) {
      dias.push(`Sáb ${formatTime(taller.dsSabadoHoraDesde)}`);
    }

    return dias.length > 0 ? dias.join(', ') : 'Sin horarios';
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Consulta de Asistencia Registrada</h1>
        <p className="text-gray-600 mt-1">
          Consulta las fechas en que se registró asistencia y revisa los detalles
        </p>
      </div>

      <div className="grid gap-6">
        {/* Panel de búsqueda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Criterios de Búsqueda
            </CardTitle>
            <CardDescription>
              Selecciona los criterios para consultar las asistencias registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Profesor */}
              <div>
                <Label>Profesor</Label>
                <Select
                  value={profesorSeleccionado?.toString() || ''}
                  onValueChange={(value) => setProfesorSeleccionado(parseInt(value))}
                  disabled={profesorBloqueado}
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
                {profesorBloqueado && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Como profesor, solo puedes consultar tus talleres
                  </p>
                )}
              </div>

              {/* Taller */}
              <div>
                <Label>Taller</Label>
                <Select
                  value={tallerSeleccionado?.toString() || ''}
                  onValueChange={(value) => setTallerSeleccionado(parseInt(value))}
                  disabled={!profesorSeleccionado}
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
                          {t.dsNombreTaller} - {t.nuAnioTaller} | {formatDiasHorarios(t)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Año */}
              <div>
                <Label>Año</Label>
                <Select value={anioSeleccionado} onValueChange={setAnioSeleccionado}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecciona un año" />
                  </SelectTrigger>
                  <SelectContent>
                    {aniosDisponibles.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mes */}
              <div>
                <Label>Mes</Label>
                <Select value={mesSeleccionado} onValueChange={setMesSeleccionado}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Selecciona un mes" />
                  </SelectTrigger>
                  <SelectContent>
                    {mesesDelAnio.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4">
              <Button
                onClick={handleBuscar}
                disabled={!puedeConsultar || loading}
                className="w-full md:w-auto"
              >
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        {tallerInfo && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Fechas Registradas - {mesNombre} {anioSeleccionado}
              </CardTitle>
              <CardDescription>
                Taller: {tallerInfo.dsNombreTaller} - {tallerInfo.nuAnioTaller} | Profesor:{' '}
                {tallerInfo.nombreProfesor}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">
                  <p>Cargando fechas registradas...</p>
                </div>
              ) : fechasRegistradas.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="font-medium">No hay registros de asistencia</p>
                  <p className="text-sm mt-2">
                    No se encontraron asistencias registradas para {mesNombre} {anioSeleccionado}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="mb-4 text-sm text-gray-600">
                    <p>
                      <strong>Total de fechas registradas:</strong> {fechasRegistradas.length}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {fechasRegistradas.map((fecha, index) => {
                      const porcentajePresentes =
                        fecha.totalAlumnos > 0
                          ? Math.round((fecha.presentes / fecha.totalAlumnos) * 100)
                          : 0;

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <Calendar className="h-5 w-5 text-indigo-600" />
                              <div>
                                <p className="font-medium text-gray-900">
                                  {formatFechaCorta(fecha.fecha)}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {formatFecha(fecha.fecha)}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 mr-4">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-gray-600" />
                              <span className="text-sm font-medium text-gray-700">
                                {fecha.totalAlumnos}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-700">
                                {fecha.presentes}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-red-600" />
                              <span className="text-sm font-medium text-red-700">
                                {fecha.ausentes}
                              </span>
                            </div>

                            <div className="text-sm font-medium text-gray-700">
                              {porcentajePresentes}% asist.
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerDetalle(fecha.fecha)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            Ver
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  {esProfesor && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                      <p className="font-medium">Nota:</p>
                      <p className="mt-1">
                        Como profesor, solo puedes visualizar las asistencias. No puedes realizar
                        modificaciones.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
