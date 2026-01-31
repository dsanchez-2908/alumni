'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, FileText, Users, Calendar, Check, X, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Taller {
  cdTaller: number;
  nuAnioTaller: number;
  dsNombreTaller: string;
  nombrePersonal: string;
  feInicioTaller: string;
}

interface TotalesGenerales {
  totalPresentes: number;
  totalAusentes: number;
  totalFeriados: number;
}

interface EstadisticaAlumno {
  cdAlumno: number;
  dsNombre: string;
  dsApellido: string;
  totalPresentes: number;
  totalAusentes: number;
  totalFeriados: number;
  totalRegistros: number;
}

interface AlumnoPorMes {
  cdAlumno: number;
  dsNombre: string;
  dsApellido: string;
  dsDNI: string;
  meses: {
    [key: number]: {
      presentes: number;
      ausentes: number;
      feriados: number;
    };
  };
}

interface ReporteData {
  taller: Taller;
  totalClases: number;
  totalesGenerales: TotalesGenerales;
  estadisticasPorAlumno: EstadisticaAlumno[];
  alumnosPorMes: AlumnoPorMes[];
}

const mesesNombres = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function AsistenciaPorTallerPage() {
  const currentYear = new Date().getFullYear();
  const [anioSeleccionado, setAnioSeleccionado] = useState<string>(currentYear.toString());
  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [tallerSeleccionado, setTallerSeleccionado] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingTalleres, setLoadingTalleres] = useState(false);
  const [reporteData, setReporteData] = useState<ReporteData | null>(null);

  // Generar años (últimos 5 años + próximos 2)
  const anios = Array.from({ length: 8 }, (_, i) => currentYear - 3 + i);

  useEffect(() => {
    if (anioSeleccionado) {
      fetchTalleres();
    }
  }, [anioSeleccionado]);

  useEffect(() => {
    if (tallerSeleccionado && anioSeleccionado) {
      fetchReporte();
    } else {
      setReporteData(null);
    }
  }, [tallerSeleccionado, anioSeleccionado]);

  const fetchTalleres = async () => {
    setLoadingTalleres(true);
    try {
      const response = await fetch('/api/talleres');
      if (response.ok) {
        const data = await response.json();
        // Filtrar talleres por año
        const talleresFiltrados = Array.isArray(data)
          ? data.filter((t: Taller) => t.nuAnioTaller.toString() === anioSeleccionado)
          : [];
        setTalleres(talleresFiltrados);
        setTallerSeleccionado('');
      }
    } catch (error) {
      console.error('Error al cargar talleres:', error);
    } finally {
      setLoadingTalleres(false);
    }
  };

  const fetchReporte = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/reportes/asistencia-por-taller?cdTaller=${tallerSeleccionado}&anio=${anioSeleccionado}`
      );
      if (response.ok) {
        const data = await response.json();
        setReporteData(data);
      }
    } catch (error) {
      console.error('Error al cargar reporte:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Reporte de Asistencia por Taller
        </h1>
        <p className="text-gray-600 mt-1">
          Estadísticas completas de asistencia por taller y alumno
        </p>
      </div>

      {/* Selectores */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Seleccionar Taller</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Año</Label>
              <Select value={anioSeleccionado} onValueChange={setAnioSeleccionado}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecciona un año" />
                </SelectTrigger>
                <SelectContent>
                  {anios.map((anio) => (
                    <SelectItem key={anio} value={anio.toString()}>
                      {anio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Taller</Label>
              <Select
                value={tallerSeleccionado}
                onValueChange={setTallerSeleccionado}
                disabled={loadingTalleres || talleres.length === 0}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecciona un taller" />
                </SelectTrigger>
                <SelectContent>
                  {talleres.length === 0 ? (
                    <SelectItem value="none" disabled>
                      {loadingTalleres ? 'Cargando...' : 'No hay talleres para este año'}
                    </SelectItem>
                  ) : (
                    talleres.map((taller) => (
                      <SelectItem key={taller.cdTaller} value={taller.cdTaller.toString()}>
                        {taller.dsNombreTaller} - {taller.nombrePersonal}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      )}

      {/* Contenido del Reporte */}
      {!loading && reporteData && (
        <>
          {/* Información del Taller */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Información del Taller
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Taller:</span>
                  <span>{reporteData.taller.dsNombreTaller}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Profesor:</span>
                  <span>{reporteData.taller.nombrePersonal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Año:</span>
                  <span>{reporteData.taller.nuAnioTaller}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Fecha de Inicio:</span>
                  <span>
                    {new Date(reporteData.taller.feInicioTaller + 'T00:00:00').toLocaleDateString('es-AR')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Totales Generales */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total de Clases
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{reporteData.totalClases}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  Total Presentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {reporteData.totalesGenerales.totalPresentes}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <X className="h-4 w-4 text-red-600" />
                  Total Ausentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {reporteData.totalesGenerales.totalAusentes}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  Total Feriados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  {reporteData.totalesGenerales.totalFeriados}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Estadísticas por Alumno */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Estadísticas por Alumno
              </CardTitle>
              <CardDescription>
                Detalle de asistencia de cada alumno inscrito en el taller
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Alumno</TableHead>
                      <TableHead className="text-center">Total Clases</TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Check className="h-4 w-4 text-green-600" />
                          Presentes
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <X className="h-4 w-4 text-red-600" />
                          Ausentes
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          Feriados
                        </div>
                      </TableHead>
                      <TableHead className="text-center">% Asistencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reporteData.estadisticasPorAlumno.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                          No hay alumnos inscritos en este taller
                        </TableCell>
                      </TableRow>
                    ) : (
                      reporteData.estadisticasPorAlumno.map((alumno) => {
                        const porcentajeAsistencia =
                          reporteData.totalClases > 0
                            ? ((alumno.totalPresentes / reporteData.totalClases) * 100).toFixed(1)
                            : '0.0';
                        return (
                          <TableRow key={alumno.cdAlumno}>
                            <TableCell className="font-medium">
                              {alumno.dsApellido}, {alumno.dsNombre}
                            </TableCell>
                            <TableCell className="text-center">{reporteData.totalClases}</TableCell>
                            <TableCell className="text-center text-green-600 font-semibold">
                              {alumno.totalPresentes}
                            </TableCell>
                            <TableCell className="text-center text-red-600 font-semibold">
                              {alumno.totalAusentes}
                            </TableCell>
                            <TableCell className="text-center text-orange-600 font-semibold">
                              {alumno.totalFeriados}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant={
                                  parseFloat(porcentajeAsistencia) >= 80
                                    ? 'default'
                                    : parseFloat(porcentajeAsistencia) >= 60
                                    ? 'secondary'
                                    : 'destructive'
                                }
                              >
                                {porcentajeAsistencia}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Asistencia por Mes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Asistencia Mensual por Alumno
              </CardTitle>
              <CardDescription>
                Total de presentes y ausentes por cada mes del año
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-white z-10">Alumno</TableHead>
                      {mesesNombres.map((mes, index) => (
                        <TableHead key={index} className="text-center min-w-[100px]">
                          {mes}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reporteData.alumnosPorMes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={13} className="text-center text-gray-500 py-8">
                          No hay datos de asistencia
                        </TableCell>
                      </TableRow>
                    ) : (
                      reporteData.alumnosPorMes.map((alumno) => (
                        <TableRow key={alumno.cdAlumno}>
                          <TableCell className="font-medium sticky left-0 bg-white z-10">
                            {alumno.dsApellido}, {alumno.dsNombre}
                          </TableCell>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mes) => {
                            const datos = alumno.meses[mes];
                            const total = datos.presentes + datos.ausentes + datos.feriados;
                            return (
                              <TableCell key={mes} className="text-center">
                                {total > 0 ? (
                                  <div className="text-xs">
                                    <div className="text-green-600 font-semibold">
                                      P: {datos.presentes}
                                    </div>
                                    <div className="text-red-600">A: {datos.ausentes}</div>
                                    {datos.feriados > 0 && (
                                      <div className="text-orange-600">F: {datos.feriados}</div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 text-xs text-gray-600 flex gap-6">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-green-600">P:</span> Presentes
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-red-600">A:</span> Ausentes
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-orange-600">F:</span> Feriados
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Estado sin selección */}
      {!loading && !reporteData && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">Selecciona un año y un taller</p>
              <p className="text-sm mt-1">para ver el reporte de asistencia</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
