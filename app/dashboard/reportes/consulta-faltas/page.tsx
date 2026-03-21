'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { Loader2, FileSpreadsheet, AlertTriangle, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface Falta {
  cdFalta: number;
  feFalta: string;
  tipoTaller: string;
  horario: string;
  profesor: string;
  alumno: string;
  snAviso: number;
  dsObservacion: string | null;
  snContactado: number | null;
  motivoFalta: string | null;
}

interface Filtros {
  tiposTalleres: Array<{ cdTipoTaller: number; dsNombreTaller: string }>;
  profesores: Array<{ cdPersonal: number; dsNombreCompleto: string }>;
  alumnos: Array<{ cdAlumno: number; nombreCompleto: string }>;
  horarios: string[];
}

interface ReporteData {
  faltas: Falta[];
  filtros: Filtros;
}

export default function ConsultaFaltasPage() {
  const [loading, setLoading] = useState(false);
  const [faltas, setFaltas] = useState<Falta[]>([]);
  const [filtros, setFiltros] = useState<Filtros>({
    tiposTalleres: [],
    profesores: [],
    alumnos: [],
    horarios: [],
  });

  // Filtros de búsqueda - Fechas obligatorias por defecto últimos 30 días
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const [fechaDesde, setFechaDesde] = useState<string>(
    thirtyDaysAgo.toISOString().split('T')[0]
  );
  const [fechaHasta, setFechaHasta] = useState<string>(
    today.toISOString().split('T')[0]
  );
  const [avisoSeleccionado, setAvisoSeleccionado] = useState<string>('ALL');
  const [contactadoSeleccionado, setContactadoSeleccionado] = useState<string>('ALL');
  const [tipoTallerSeleccionado, setTipoTallerSeleccionado] = useState<string>('todos');
  const [horarioSeleccionado, setHorarioSeleccionado] = useState<string>('todos');
  const [profesorSeleccionado, setProfesorSeleccionado] = useState<string>('todos');
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<string>('todos');

  // Cargar filtros y datos iniciales
  useEffect(() => {
    fetchReporte();
  }, []);

  const fetchReporte = async () => {
    if (!fechaDesde || !fechaHasta) {
      toast.error('Las fechas son obligatorias');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        fechaDesde,
        fechaHasta,
        snAviso: avisoSeleccionado,
        snContactado: contactadoSeleccionado,
      });

      if (tipoTallerSeleccionado !== 'todos') {
        params.append('cdTipoTaller', tipoTallerSeleccionado);
      }
      if (horarioSeleccionado !== 'todos') {
        params.append('horario', horarioSeleccionado);
      }
      if (profesorSeleccionado !== 'todos') {
        params.append('cdPersonal', profesorSeleccionado);
      }
      if (alumnoSeleccionado !== 'todos') {
        params.append('cdAlumno', alumnoSeleccionado);
      }

      const response = await fetch(`/api/reportes/consulta-faltas?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Error al cargar el reporte');
      }

      const data: ReporteData = await response.json();
      setFaltas(data.faltas);
      setFiltros(data.filtros);

      toast.success(`Se encontraron ${data.faltas.length} faltas`);
    } catch (error) {
      console.error('Error fetching reporte:', error);
      toast.error('Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (faltas.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const data: any[] = faltas.map((falta) => ({
      'Fecha': new Date(falta.feFalta).toLocaleDateString('es-AR'),
      'Tipo de Taller': falta.tipoTaller,
      'Horario': falta.horario,
      'Profesor': falta.profesor,
      'Alumno': falta.alumno,
      'Aviso': falta.snAviso === 1 ? 'SI' : 'NO',
      'Observaciones': falta.dsObservacion || '',
      'Contactado': falta.snContactado === 1 ? 'SI' : falta.snContactado === 0 ? 'NO' : 'N/A',
      'Novedad/Motivo': falta.motivoFalta || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Consulta de Faltas');

    // Ajustar ancho de columnas
    const maxWidth = 50;
    const columnWidths = [
      { wch: 12 }, // Fecha
      { wch: 20 }, // Tipo de Taller
      { wch: 15 }, // Horario
      { wch: 30 }, // Profesor
      { wch: 35 }, // Alumno
      { wch: 8 },  // Aviso
      { wch: maxWidth }, // Observaciones
      { wch: 12 }, // Contactado
      { wch: maxWidth }, // Novedad/Motivo
    ];
    worksheet['!cols'] = columnWidths;

    const fileName = `consulta_faltas_${fechaDesde}_${fechaHasta}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('Archivo Excel exportado correctamente');
  };

  const limpiarFiltros = () => {
    setFechaDesde(thirtyDaysAgo.toISOString().split('T')[0]);
    setFechaHasta(today.toISOString().split('T')[0]);
    setAvisoSeleccionado('ALL');
    setContactadoSeleccionado('ALL');
    setTipoTallerSeleccionado('todos');
    setHorarioSeleccionado('todos');
    setProfesorSeleccionado('todos');
    setAlumnoSeleccionado('todos');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Consulta de Faltas</h1>
        <p className="text-muted-foreground">
          Consulta detallada de faltas con múltiples filtros y exportación a Excel
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
          <CardDescription>
            Las fechas son obligatorias. Los demás filtros son opcionales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Fecha Desde */}
            <div className="space-y-2">
              <Label htmlFor="fechaDesde" className="text-red-600">
                Fecha Desde *
              </Label>
              <Input
                id="fechaDesde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                required
              />
            </div>

            {/* Fecha Hasta */}
            <div className="space-y-2">
              <Label htmlFor="fechaHasta" className="text-red-600">
                Fecha Hasta *
              </Label>
              <Input
                id="fechaHasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                required
              />
            </div>

            {/* Aviso */}
            <div className="space-y-2">
              <Label htmlFor="aviso">Aviso</Label>
              <Select value={avisoSeleccionado} onValueChange={setAvisoSeleccionado}>
                <SelectTrigger id="aviso">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="SI">SI</SelectItem>
                  <SelectItem value="NO">NO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contactado */}
            <div className="space-y-2">
              <Label htmlFor="contactado">Contactado</Label>
              <Select value={contactadoSeleccionado} onValueChange={setContactadoSeleccionado}>
                <SelectTrigger id="contactado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos</SelectItem>
                  <SelectItem value="SI">SI</SelectItem>
                  <SelectItem value="NO">NO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Taller */}
            <div className="space-y-2">
              <Label htmlFor="tipoTaller">Tipo de Taller</Label>
              <Select value={tipoTallerSeleccionado} onValueChange={setTipoTallerSeleccionado}>
                <SelectTrigger id="tipoTaller">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {filtros.tiposTalleres.map((tipo) => (
                    <SelectItem key={tipo.cdTipoTaller} value={tipo.cdTipoTaller.toString()}>
                      {tipo.dsNombreTaller}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Horario */}
            <div className="space-y-2">
              <Label htmlFor="horario">Horario</Label>
              <Select value={horarioSeleccionado} onValueChange={setHorarioSeleccionado}>
                <SelectTrigger id="horario">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {filtros.horarios.map((horario) => (
                    <SelectItem key={horario} value={horario}>
                      {horario}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Profesor */}
            <div className="space-y-2">
              <Label htmlFor="profesor">Profesor</Label>
              <Select value={profesorSeleccionado} onValueChange={setProfesorSeleccionado}>
                <SelectTrigger id="profesor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {filtros.profesores.map((prof) => (
                    <SelectItem key={prof.cdPersonal} value={prof.cdPersonal.toString()}>
                      {prof.dsNombreCompleto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Alumno */}
            <div className="space-y-2">
              <Label htmlFor="alumno">Alumno</Label>
              <Select value={alumnoSeleccionado} onValueChange={setAlumnoSeleccionado}>
                <SelectTrigger id="alumno">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {filtros.alumnos.map((alumno) => (
                    <SelectItem key={alumno.cdAlumno} value={alumno.cdAlumno.toString()}>
                      {alumno.nombreCompleto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={fetchReporte} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cargando...
                </>
              ) : (
                'Consultar'
              )}
            </Button>
            <Button variant="outline" onClick={limpiarFiltros}>
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {faltas.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Resultados
                </CardTitle>
                <CardDescription>
                  Se encontraron {faltas.length} faltas que coinciden con los filtros
                </CardDescription>
              </div>
              <Button onClick={exportToExcel} variant="outline" size="sm">
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exportar a Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted">
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo de Taller</TableHead>
                      <TableHead>Horario</TableHead>
                      <TableHead>Profesor</TableHead>
                      <TableHead>Alumno</TableHead>
                      <TableHead className="text-center">Aviso</TableHead>
                      <TableHead>Observaciones</TableHead>
                      <TableHead className="text-center">Contactado</TableHead>
                      <TableHead>Novedad/Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faltas.map((falta) => (
                      <TableRow key={falta.cdFalta}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(falta.feFalta).toLocaleDateString('es-AR')}
                        </TableCell>
                        <TableCell>{falta.tipoTaller}</TableCell>
                        <TableCell className="whitespace-nowrap">{falta.horario}</TableCell>
                        <TableCell>{falta.profesor}</TableCell>
                        <TableCell>{falta.alumno}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={falta.snAviso === 1 ? 'default' : 'destructive'}>
                            {falta.snAviso === 1 ? 'SI' : 'NO'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate" title={falta.dsObservacion || ''}>
                          {falta.dsObservacion || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          {falta.snContactado === 1 ? (
                            <Badge variant="default">SI</Badge>
                          ) : falta.snContactado === 0 ? (
                            <Badge variant="outline">NO</Badge>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate" title={falta.motivoFalta || ''}>
                          {falta.motivoFalta || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensaje cuando no hay resultados */}
      {!loading && faltas.length === 0 && fechaDesde && fechaHasta && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <AlertTriangle className="mx-auto h-12 w-12 mb-4 opacity-40" />
              <p className="text-lg">No se encontraron faltas con los filtros seleccionados</p>
              <p className="text-sm mt-2">Intenta modificar los criterios de búsqueda</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
