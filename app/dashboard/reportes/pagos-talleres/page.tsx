'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { Loader2, FileSpreadsheet, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface Resultado {
  mes: number;
  anio: number;
  cdTaller: number;
  tipoTaller: string;
  horario: string;
  profesor: string;
  cdPersonal: number;
  cdAlumno: number;
  alumno: string;
  pago: 'SI' | 'NO';
  fechaPago: string | null;
  modoPago: string | null;
  monto: number;
}

interface Totales {
  pagado: number;
  pendiente: number;
  total: number;
}

interface Filtros {
  tiposTalleres: Array<{ cdTipoTaller: number; dsNombreTaller: string }>;
  profesores: Array<{ cdPersonal: number; dsNombreCompleto: string }>;
  horarios: string[];
}

interface ReporteData {
  resultados: Resultado[];
  totales: Totales;
  filtros: Filtros;
}

const mesesNombres = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function PagosPorTalleresPage() {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [totales, setTotales] = useState<Totales>({ pagado: 0, pendiente: 0, total: 0 });
  const [filtros, setFiltros] = useState<Filtros>({
    tiposTalleres: [],
    profesores: [],
    horarios: [],
  });

  // Filtros de búsqueda
  const [mesSeleccionado, setMesSeleccionado] = useState<string>(currentMonth.toString());
  const [anioSeleccionado, setAnioSeleccionado] = useState<string>(currentYear.toString());
  const [tipoTallerSeleccionado, setTipoTallerSeleccionado] = useState<string>('todos');
  const [horarioSeleccionado, setHorarioSeleccionado] = useState<string>('todos');
  const [profesorSeleccionado, setProfesorSeleccionado] = useState<string>('todos');
  const [pagoSeleccionado, setPagoSeleccionado] = useState<string>('todos');
  const [loadingFiltros, setLoadingFiltros] = useState(false);

  // Usar ref para rastrear los últimos parámetros de filtros cargados
  const lastFiltrosParams = useRef<string>('');
  const isValidating = useRef(false);

  // Cargar filtros iniciales al montar el componente
  useEffect(() => {
    fetchFiltrosDinamicos();
  }, []);

  // Cargar filtros dinámicos cuando cambian las selecciones
  useEffect(() => {
    // Construir string de parámetros actuales
    const currentParams = `${tipoTallerSeleccionado}|${profesorSeleccionado}|${horarioSeleccionado}`;
    
    // Solo cargar si los parámetros realmente cambiaron y no estamos validando
    if (currentParams !== lastFiltrosParams.current && !isValidating.current) {
      lastFiltrosParams.current = currentParams;
      fetchFiltrosDinamicos();
    }
  }, [tipoTallerSeleccionado, profesorSeleccionado, horarioSeleccionado]);

  const fetchFiltrosDinamicos = async (
    overrideTipoTaller?: string,
    overrideProfesor?: string,
    overrideHorario?: string
  ) => {
    setLoadingFiltros(true);
    try {
      const params = new URLSearchParams();
      
      const tipoTaller = overrideTipoTaller ?? tipoTallerSeleccionado;
      const profesor = overrideProfesor ?? profesorSeleccionado;
      const horario = overrideHorario ?? horarioSeleccionado;
      
      if (tipoTaller !== 'todos') {
        params.append('cdTipoTaller', tipoTaller);
      }
      if (profesor !== 'todos') {
        params.append('cdPersonal', profesor);
      }
      if (horario !== 'todos') {
        params.append('horario', horario);
      }

      const response = await fetch(`/api/reportes/pagos-talleres/filtros?${params}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar filtros');
      }

      const data: Filtros = await response.json();
      setFiltros(data);

      // Si se pasaron overrides, actualizar el ref con esos valores
      if (overrideTipoTaller !== undefined || overrideProfesor !== undefined || overrideHorario !== undefined) {
        lastFiltrosParams.current = `${tipoTaller}|${profesor}|${horario}`;
      }

      // Validar selecciones actuales con los nuevos filtros (solo si no estamos reseteando)
      if (overrideTipoTaller === undefined && overrideProfesor === undefined && overrideHorario === undefined) {
        isValidating.current = true;

        // Validar tipo de taller
        if (tipoTallerSeleccionado !== 'todos') {
          const tallerValido = data.tiposTalleres.some(
            (t) => t.cdTipoTaller.toString() === tipoTallerSeleccionado
          );
          if (!tallerValido) {
            setTipoTallerSeleccionado('todos');
          }
        }

        // Validar profesor
        if (profesorSeleccionado !== 'todos') {
          const profesorValido = data.profesores.some(
            (p) => p.cdPersonal.toString() === profesorSeleccionado
          );
          if (!profesorValido) {
            setProfesorSeleccionado('todos');
          }
        }

        // Validar horario
        if (horarioSeleccionado !== 'todos') {
          const horarioValido = data.horarios.some((h) => h === horarioSeleccionado);
          if (!horarioValido) {
            setHorarioSeleccionado('todos');
          }
        }

        // Delay para permitir que los estados se actualicen antes de permitir nuevas cargas
        setTimeout(() => {
          isValidating.current = false;
        }, 100);
      } else {
        // Si estamos reseteando, no necesitamos validar
        isValidating.current = false;
      }

    } catch (error: any) {
      console.error('Error al cargar filtros dinámicos:', error);
      toast.error('Error al cargar filtros');
      isValidating.current = false;
    } finally {
      setLoadingFiltros(false);
    }
  };

  const fetchReporte = async () => {
    if (!mesSeleccionado || !anioSeleccionado) {
      toast.error('Debes seleccionar mes y año');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        mes: mesSeleccionado,
        anio: anioSeleccionado,
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
      if (pagoSeleccionado !== 'todos') {
        params.append('pago', pagoSeleccionado);
      }

      const response = await fetch(`/api/reportes/pagos-talleres?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar el reporte');
      }

      const data: ReporteData = await response.json();
      setResultados(data.resultados);
      setTotales(data.totales);
      // No actualizar filtros aquí - se manejan con fetchFiltrosDinamicos
    } catch (error: any) {
      console.error('Error al cargar reporte:', error);
      toast.error(error.message || 'Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = () => {
    fetchReporte();
  };

  const handleLimpiarFiltros = () => {
    setMesSeleccionado(currentMonth.toString());
    setAnioSeleccionado(currentYear.toString());
    setTipoTallerSeleccionado('todos');
    setHorarioSeleccionado('todos');
    setProfesorSeleccionado('todos');
    setPagoSeleccionado('todos');
    
    // Recargar todos los filtros disponibles forzando 'todos' para evitar usar estados antiguos
    fetchFiltrosDinamicos('todos', 'todos', 'todos');
  };

  const handleTipoTallerChange = (value: string) => {
    setTipoTallerSeleccionado(value);
    // Los filtros dinámicos se actualizarán automáticamente
    // y la validación reseteará selecciones inválidas
  };

  const handleProfesorChange = (value: string) => {
    setProfesorSeleccionado(value);
    // Los filtros dinámicos se actualizarán automáticamente
  };

  const handleHorarioChange = (value: string) => {
    setHorarioSeleccionado(value);
    // Los filtros dinámicos se actualizarán automáticamente
  };

  const exportToExcel = () => {
    if (resultados.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }

    const data: any[] = resultados.map((row) => ({
      'Año': row.anio,
      'Mes': mesesNombres[row.mes - 1],
      'Tipo de Taller': row.tipoTaller,
      'Horario': row.horario,
      'Profesor': row.profesor,
      'Alumno': row.alumno,
      'Pago?': row.pago,
      'Fecha de Pago': row.fechaPago || '-',
      'Modo de Pago': row.modoPago || '-',
      'Monto': row.monto.toFixed(2),
    }));

    // Agregar fila de totales
    data.push({
      'Año': '',
      'Mes': '',
      'Tipo de Taller': '',
      'Horario': '',
      'Profesor': '',
      'Alumno': '',
      'Pago?': 'TOTALES',
      'Fecha de Pago': '',
      'Modo de Pago': '',
      'Monto': '',
    });
    data.push({
      'Año': '',
      'Mes': '',
      'Tipo de Taller': '',
      'Horario': '',
      'Profesor': '',
      'Alumno': '',
      'Pago?': 'Total Pagado',
      'Fecha de Pago': '',
      'Modo de Pago': '',
      'Monto': totales.pagado.toFixed(2),
    });
    data.push({
      'Año': '',
      'Mes': '',
      'Tipo de Taller': '',
      'Horario': '',
      'Profesor': '',
      'Alumno': '',
      'Pago?': 'Total Pendiente',
      'Fecha de Pago': '',
      'Modo de Pago': '',
      'Monto': totales.pendiente.toFixed(2),
    });
    data.push({
      'Año': '',
      'Mes': '',
      'Tipo de Taller': '',
      'Horario': '',
      'Profesor': '',
      'Alumno': '',
      'Pago?': 'Total General',
      'Fecha de Pago': '',
      'Modo de Pago': '',
      'Monto': totales.total.toFixed(2),
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pagos por Talleres');

    const mesNombre = mesesNombres[parseInt(mesSeleccionado) - 1];
    const fileName = `Pagos_Talleres_${mesNombre}_${anioSeleccionado}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('Reporte exportado exitosamente');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const aniosDisponibles = Array.from(
    { length: 5 },
    (_, i) => currentYear - 2 + i
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
          Pagos por Talleres
        </h1>
        <p className="text-gray-600 mt-2">
          Reporte de pagos mensuales por taller con estado de cada alumno
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
          <CardDescription>
            Selecciona el periodo y filtros opcionales para generar el reporte
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Mes (Obligatorio) */}
            <div className="space-y-2">
              <Label htmlFor="mes">
                Mes <span className="text-red-500">*</span>
              </Label>
              <Select value={mesSeleccionado} onValueChange={setMesSeleccionado}>
                <SelectTrigger id="mes">
                  <SelectValue placeholder="Seleccionar mes" />
                </SelectTrigger>
                <SelectContent>
                  {mesesNombres.map((mes, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {mes}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Año (Obligatorio) */}
            <div className="space-y-2">
              <Label htmlFor="anio">
                Año <span className="text-red-500">*</span>
              </Label>
              <Select value={anioSeleccionado} onValueChange={setAnioSeleccionado}>
                <SelectTrigger id="anio">
                  <SelectValue placeholder="Seleccionar año" />
                </SelectTrigger>
                <SelectContent>
                  {aniosDisponibles.map((anio) => (
                    <SelectItem key={anio} value={anio.toString()}>
                      {anio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Taller (Opcional) */}
            <div className="space-y-2">
              <Label htmlFor="tipoTaller">Tipo de Taller</Label>
              <Select 
                value={tipoTallerSeleccionado} 
                onValueChange={handleTipoTallerChange}
                disabled={loadingFiltros}
              >
                <SelectTrigger id="tipoTaller">
                  <SelectValue placeholder="Todos" />
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

            {/* Horario (Opcional) */}
            <div className="space-y-2">
              <Label htmlFor="horario">
                Horario
                {tipoTallerSeleccionado === 'todos' && (
                  <span className="text-xs text-gray-500 ml-1">(Selecciona tipo de taller)</span>
                )}
              </Label>
              <Select 
                value={horarioSeleccionado} 
                onValueChange={handleHorarioChange}
                disabled={loadingFiltros}
              >
                <SelectTrigger id="horario">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {filtros.horarios.map((horario, index) => (
                    <SelectItem key={index} value={horario}>
                      {horario}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Profesor (Opcional) */}
            <div className="space-y-2">
              <Label htmlFor="profesor">Profesor</Label>
              <Select 
                value={profesorSeleccionado} 
                onValueChange={handleProfesorChange}
                disabled={loadingFiltros}
              >
                <SelectTrigger id="profesor">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {filtros.profesores.map((profesor) => (
                    <SelectItem key={profesor.cdPersonal} value={profesor.cdPersonal.toString()}>
                      {profesor.dsNombreCompleto}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estado de Pago (Opcional) */}
            <div className="space-y-2">
              <Label htmlFor="pago">Pago?</Label>
              <Select value={pagoSeleccionado} onValueChange={setPagoSeleccionado}>
                <SelectTrigger id="pago">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="SI">SI</SelectItem>
                  <SelectItem value="NO">NO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleBuscar} disabled={loading || !mesSeleccionado || !anioSeleccionado}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cargando...
                </>
              ) : (
                'Buscar'
              )}
            </Button>
            <Button onClick={handleLimpiarFiltros} variant="outline" disabled={loading}>
              Limpiar Filtros
            </Button>
            <Button
              onClick={exportToExcel}
              variant="outline"
              className="ml-auto gap-2"
              disabled={loading || resultados.length === 0}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar a Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Totales */}
      {resultados.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totales.pagado)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pendiente</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(totales.pendiente)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total General</CardTitle>
              <TrendingUp className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">
                {formatCurrency(totales.total)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabla de Resultados */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
          <CardDescription>
            {resultados.length > 0
              ? `${resultados.length} registro${resultados.length !== 1 ? 's' : ''} encontrado${
                  resultados.length !== 1 ? 's' : ''
                }`
              : 'No hay resultados para mostrar'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : resultados.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No hay datos para mostrar</p>
              <p className="text-sm mt-1">
                Selecciona un periodo y presiona &quot;Buscar&quot; para generar el reporte
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Año</TableHead>
                    <TableHead>Mes</TableHead>
                    <TableHead>Tipo de Taller</TableHead>
                    <TableHead className="min-w-[200px]">Horario</TableHead>
                    <TableHead>Profesor</TableHead>
                    <TableHead>Alumno</TableHead>
                    <TableHead className="text-center">Pago?</TableHead>
                    <TableHead>Fecha de Pago</TableHead>
                    <TableHead>Modo de Pago</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resultados.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>{row.anio}</TableCell>
                      <TableCell>{mesesNombres[row.mes - 1]}</TableCell>
                      <TableCell className="font-medium">{row.tipoTaller}</TableCell>
                      <TableCell className="text-sm">{row.horario}</TableCell>
                      <TableCell>{row.profesor}</TableCell>
                      <TableCell>{row.alumno}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={row.pago === 'SI' ? 'default' : 'destructive'}>
                          {row.pago}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.fechaPago || '-'}</TableCell>
                      <TableCell>{row.modoPago || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.monto)}
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
