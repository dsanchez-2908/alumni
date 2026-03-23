'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { FileText, Download, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

interface Traza {
  cdTrazaDetalle: number;
  feHora: string;
  dsProceso: string;
  dsAccion: string;
  cdElemento: number | null;
  dsDetalle: string | null;
  nombreUsuario: string;
  cdUsuario: number;
}

interface Filtros {
  procesos: string[];
  acciones: string[];
  usuarios: { cdUsuario: number; dsUsuario: string }[];
}

export default function ConsultaHistorialPage() {
  const { success, error: showError, warning } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [trazas, setTrazas] = useState<Traza[]>([]);
  const [limiteSuperado, setLimiteSuperado] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>({
    procesos: [],
    acciones: [],
    usuarios: [],
  });

  // Estado de filtros seleccionados
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [procesoSeleccionado, setProcesoSeleccionado] = useState('todos');
  const [accionSeleccionada, setAccionSeleccionada] = useState('todos');
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState('todos');
  const [detalleBusqueda, setDetalleBusqueda] = useState('');

  const cargarFiltrosIniciales = async () => {
    try {
      // Obtener solo las listas de filtros sin hacer búsqueda
      const [procesos, acciones, usuarios] = await Promise.all([
        fetch('/api/traza/filtros?tipo=procesos').then(r => r.ok ? r.json() : []),
        fetch('/api/traza/filtros?tipo=acciones').then(r => r.ok ? r.json() : []),
        fetch('/api/traza/filtros?tipo=usuarios').then(r => r.ok ? r.json() : []),
      ]);
      
      setFiltros({
        procesos: procesos || [],
        acciones: acciones || [],
        usuarios: usuarios || [],
      });
    } catch (error) {
      // Silenciar error al cargar filtros iniciales
      console.error('Error al cargar filtros:', error);
    }
  };

  const cargarTrazas = async () => {
    // Validar que las fechas sean obligatorias
    if (!fechaDesde || !fechaHasta) {
      showError('Campos requeridos', 'Debe seleccionar un rango de fechas (desde/hasta)');
      return;
    }

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      
      params.append('fechaDesde', fechaDesde);
      params.append('fechaHasta', fechaHasta);
      if (procesoSeleccionado !== 'todos') params.append('dsProceso', procesoSeleccionado);
      if (accionSeleccionada !== 'todos') params.append('dsAccion', accionSeleccionada);
      if (usuarioSeleccionado !== 'todos') params.append('cdUsuario', usuarioSeleccionado);
      if (detalleBusqueda) params.append('dsDetalle', detalleBusqueda);

      const response = await fetch(`/api/traza?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar el historial');
      }

      const data = await response.json();
      setTrazas(data.trazas);
      setLimiteSuperado(data.limiteSuperado);
      
      // Actualizar filtros con los datos completos
      if (data.filtros) {
        setFiltros(data.filtros);
      }

      // Mostrar advertencia si se superó el límite
      if (data.limiteSuperado) {
        warning(
          'Límite de registros alcanzado',
          'Se encontraron más de 1000 registros. Se muestran solo los primeros 1000. Ajuste los filtros para ver otros resultados.'
        );
      }
    } catch (error: any) {
      showError(
        'Error al cargar el historial',
        error.message || 'Ocurrió un error inesperado'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Solo cargar los filtros iniciales, NO las trazas
    cargarFiltrosIniciales();
  }, []);

  const handleBuscar = () => {
    cargarTrazas();
  };

  const handleLimpiar = () => {
    setFechaDesde('');
    setFechaHasta('');
    setProcesoSeleccionado('todos');
    setAccionSeleccionada('todos');
    setUsuarioSeleccionado('todos');
    setDetalleBusqueda('');
    setTrazas([]); // Limpiar la grilla también
    setLimiteSuperado(false);
  };

  const exportarExcel = () => {
    try {
      // Preparar datos para exportar
      const datosExport = trazas.map(t => ({
        'Fecha y Hora': new Date(t.feHora).toLocaleString('es-AR'),
        'Usuario': t.nombreUsuario,
        'Proceso': t.dsProceso,
        'Acción': t.dsAccion,
        'Código Elemento': t.cdElemento || '',
        'Detalle': t.dsDetalle || '',
      }));

      // Crear libro de trabajo
      const ws = XLSX.utils.json_to_sheet(datosExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Historial');

      // Ajustar anchos de columna
      const columnWidths = [
        { wch: 20 }, // Fecha y Hora
        { wch: 20 }, // Usuario
        { wch: 25 }, // Proceso
        { wch: 15 }, // Acción
        { wch: 15 }, // Código Elemento
        { wch: 60 }, // Detalle
      ];
      ws['!cols'] = columnWidths;

      // Generar archivo
      const fileName = `historial_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      success('Archivo exportado', 'El archivo Excel se ha descargado correctamente');
    } catch (error) {
      showError('Error al exportar', 'Error al generar el archivo Excel');
    }
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString('es-AR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Consulta de Historial
        </h1>
        <p className="text-gray-600 mt-1">
          Consulta el historial de acciones realizadas en el sistema
        </p>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Fecha Desde */}
            <div className="space-y-2">
              <Label htmlFor="fechaDesde">
                Fecha Desde <span className="text-red-500">*</span>
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
              <Label htmlFor="fechaHasta">
                Fecha Hasta <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fechaHasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                required
              />
            </div>

            {/* Proceso */}
            <div className="space-y-2">
              <Label htmlFor="proceso">Proceso</Label>
              <Select value={procesoSeleccionado} onValueChange={setProcesoSeleccionado}>
                <SelectTrigger id="proceso">
                  <SelectValue placeholder="Seleccione un proceso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {filtros.procesos.map((proceso) => (
                    <SelectItem key={proceso} value={proceso}>
                      {proceso}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Acción */}
            <div className="space-y-2">
              <Label htmlFor="accion">Acción</Label>
              <Select value={accionSeleccionada} onValueChange={setAccionSeleccionada}>
                <SelectTrigger id="accion">
                  <SelectValue placeholder="Seleccione una acción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {filtros.acciones.map((accion) => (
                    <SelectItem key={accion} value={accion}>
                      {accion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Usuario */}
            <div className="space-y-2">
              <Label htmlFor="usuario">Usuario</Label>
              <Select value={usuarioSeleccionado} onValueChange={setUsuarioSeleccionado}>
                <SelectTrigger id="usuario">
                  <SelectValue placeholder="Seleccione un usuario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {filtros.usuarios.map((usuario) => (
                    <SelectItem key={usuario.cdUsuario} value={usuario.cdUsuario.toString()}>
                      {usuario.dsUsuario}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Detalle */}
            <div className="space-y-2">
              <Label htmlFor="detalle">Detalle (búsqueda parcial)</Label>
              <Input
                id="detalle"
                type="text"
                placeholder="Buscar en detalle..."
                value={detalleBusqueda}
                onChange={(e) => setDetalleBusqueda(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleBuscar} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Buscar
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleLimpiar}>
              Limpiar Filtros
            </Button>
            <Button 
              variant="outline" 
              onClick={exportarExcel}
              disabled={trazas.length === 0}
              className="ml-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar a Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <Card>
        <CardHeader>
          <CardTitle>
            Resultados ({trazas.length} registro{trazas.length !== 1 ? 's' : ''})
            {limiteSuperado && (
              <span className="ml-2 text-sm font-normal text-orange-600">
                (Mostrando primeros 1000 de más resultados disponibles)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trazas.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No hay registros para mostrar</p>
              <p className="text-sm mt-1">
                Seleccione un rango de fechas y presione "Buscar" para ver resultados
              </p>
            </div>
          )}
          
          {trazas.length > 0 && (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Fecha y Hora</TableHead>
                    <TableHead className="whitespace-nowrap">Usuario</TableHead>
                    <TableHead className="whitespace-nowrap">Proceso</TableHead>
                    <TableHead className="whitespace-nowrap">Acción</TableHead>
                    <TableHead className="whitespace-nowrap">Código</TableHead>
                    <TableHead className="whitespace-nowrap">Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trazas.map((traza) => (
                    <TableRow key={traza.cdTrazaDetalle}>
                      <TableCell className="whitespace-nowrap">
                        {formatearFecha(traza.feHora)}
                      </TableCell>
                      <TableCell>{traza.nombreUsuario}</TableCell>
                      <TableCell>{traza.dsProceso}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            traza.dsAccion === 'Agregar'
                              ? 'bg-green-100 text-green-800'
                              : traza.dsAccion === 'Modificar'
                              ? 'bg-blue-100 text-blue-800'
                              : traza.dsAccion === 'Eliminar'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {traza.dsAccion}
                        </span>
                      </TableCell>
                      <TableCell>{traza.cdElemento || '-'}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {traza.dsDetalle || '-'}
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

