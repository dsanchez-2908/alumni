'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Eye, FileText, DollarSign, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PagoDetalle {
  cdPagoDetalle: number;
  cdAlumno: number;
  nombreAlumno: string;
  cdTaller: number;
  nombreTaller: string;
  nuMonto: number;
  dsTipoPago: string;
  snEsExcepcion: boolean;
  horarios?: {
    snLunes: boolean;
    dsLunesHoraDesde: string;
    dsLunesHoraHasta: string;
    snMartes: boolean;
    dsMartesHoraDesde: string;
    dsMartesHoraHasta: string;
    snMiercoles: boolean;
    dsMiercolesHoraDesde: string;
    dsMiercolesHoraHasta: string;
    snJueves: boolean;
    dsJuevesHoraDesde: string;
    dsJuevesHoraHasta: string;
    snViernes: boolean;
    dsViernesHoraDesde: string;
    dsViernesHoraHasta: string;
    snSabado: boolean;
    dsSabadoHoraDesde: string;
    dsSabadoHoraHasta: string;
    snDomingo: boolean;
    dsDomingoHoraDesde: string;
    dsDomingoHoraHasta: string;
  };
}

interface Pago {
  cdPago?: number;
  fePago?: string;
  mes: number;
  anio: number;
  periodo: string;
  tipoPagoGlobal?: string;
  montoTotal?: number;
  montoTotalEsperadoEfectivo?: number;
  montoTotalEsperadoTransferencia?: number;
  observacion?: string | null;
  cdGrupoFamiliar?: number | null;
  nombreGrupoFamiliar?: string | null;
  alumno?: {
    cdAlumno: number;
    nombre: string;
    dni: string;
  };
  cdAlumno?: number;
  nombreAlumno?: string;
  dsDNI?: string;
  dsNombreGrupo?: string;
  usuarioRegistro?: string;
  feRegistro?: string;
  detalles?: PagoDetalle[];
  talleres?: Array<{
    cdTaller: number;
    nombreTaller: string;
    montoEsperadoEfectivo: number;
    montoEsperadoTransferencia: number;
  }>;
  cantidadItems?: number;
}

export default function ConsultaPagosPage() {
  const { error } = useToast();
  
  // Filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [tipoPago, setTipoPago] = useState('Todos');
  const [searchAlumno, setSearchAlumno] = useState('');
  const [mes, setMes] = useState('0');
  const [anio, setAnio] = useState('');
  const [estadoPago, setEstadoPago] = useState('Pagado'); // Solo pagados por ahora

  // Estado
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState<Pago | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Limpiar resultados cuando se cambia el estado
  const handleEstadoChange = (nuevoEstado: string) => {
    setEstadoPago(nuevoEstado);
    setPagos([]); // Limpiar resultados para evitar mostrar datos incompatibles
  };

  const buscarPagos = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fechaDesde) params.append('fechaDesde', fechaDesde);
      if (fechaHasta) params.append('fechaHasta', fechaHasta);
      if (tipoPago && tipoPago !== 'Todos') params.append('tipoPago', tipoPago);
      if (searchAlumno) params.append('searchAlumno', searchAlumno);
      if (mes && mes !== '0') params.append('mes', mes);
      if (anio) params.append('anio', anio);
      params.append('estadoPago', estadoPago);

      const response = await fetch(`/api/pagos?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setPagos(data.pagos || []);
      } else {
        error('Error al consultar pagos');
      }
    } catch (err) {
      console.error('Error:', err);
      error('Error al consultar pagos');
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setFechaDesde('');
    setFechaHasta('');
    setTipoPago('Todos');
    setSearchAlumno('');
    setMes('0');
    setAnio('');
    setEstadoPago('Pagado');
    setPagos([]);
  };

  const verDetalle = (pago: Pago) => {
    setPagoSeleccionado(pago);
    setDialogOpen(true);
  };

  // Función para formatear horarios de taller (igual a la de nuevo/page.tsx)
  const formatHorarioTaller = (horarios: any): string => {
    if (!horarios) return '';
    
    const dias = [
      { nombre: 'Lun', sn: horarios.snLunes, desde: horarios.dsLunesHoraDesde, hasta: horarios.dsLunesHoraHasta },
      { nombre: 'Mar', sn: horarios.snMartes, desde: horarios.dsMartesHoraDesde, hasta: horarios.dsMartesHoraHasta },
      { nombre: 'Mié', sn: horarios.snMiercoles, desde: horarios.dsMiercolesHoraDesde, hasta: horarios.dsMiercolesHoraHasta },
      { nombre: 'Jue', sn: horarios.snJueves, desde: horarios.dsJuevesHoraDesde, hasta: horarios.dsJuevesHoraHasta },
      { nombre: 'Vie', sn: horarios.snViernes, desde: horarios.dsViernesHoraDesde, hasta: horarios.dsViernesHoraHasta },
      { nombre: 'Sáb', sn: horarios.snSabado, desde: horarios.dsSabadoHoraDesde, hasta: horarios.dsSabadoHoraHasta },
      { nombre: 'Dom', sn: horarios.snDomingo, desde: horarios.dsDomingoHoraDesde, hasta: horarios.dsDomingoHoraHasta },
    ];

    const diasActivos = dias.filter((dia) => dia.sn && dia.desde && dia.hasta);
    
    if (diasActivos.length === 0) return '';

    return diasActivos
      .map((dia) => {
        const horaDesde = dia.desde.substring(0, 5); // HH:MM
        const horaHasta = dia.hasta.substring(0, 5); // HH:MM
        return `${dia.nombre} ${horaDesde}-${horaHasta}`;
      })
      .join(', ');
  };

  // Función helper para obtener talleres únicos con horarios
  const getTalleresUnicos = (pago: Pago) => {
    if (!pago.detalles || pago.detalles.length === 0) return [];
    
    const talleresMap = new Map();
    pago.detalles.forEach(det => {
      if (!talleresMap.has(det.cdTaller)) {
        talleresMap.set(det.cdTaller, {
          nombreTaller: det.nombreTaller,
          horario: formatHorarioTaller(det.horarios)
        });
      }
    });
    
    return Array.from(talleresMap.values());
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(value);
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR');
  };

  const getTipoPagoBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'Efectivo':
        return 'bg-green-100 text-green-800';
      case 'Transferencia':
        return 'bg-blue-100 text-blue-800';
      case 'Excepción':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calcularTotalFiltrado = () => {
    if (estadoPago === 'Pendiente') {
      // Para pendientes, sumar el monto esperado en efectivo
      return pagos.reduce((sum, pago) => sum + (pago.montoTotalEsperadoEfectivo || 0), 0);
    }
    return pagos.reduce((sum, pago) => sum + (pago.montoTotal || 0), 0);
  };

  // Exportar a Excel
  const exportToExcel = () => {
    const data = pagos.map((pago) => {
      const talleres = getTalleresUnicos(pago);
      const talleresInfo = talleres.map(t => `${t.nombreTaller} (${t.horario})`).join('; ');
      
      const baseData: any = {
        Período: pago.periodo,
        Alumno: estadoPago === 'Pagado' ? pago.alumno?.nombre : pago.nombreAlumno,
        DNI: estadoPago === 'Pagado' ? pago.alumno?.dni : pago.dsDNI,
        'Grupo Familiar': (estadoPago === 'Pagado' ? pago.nombreGrupoFamiliar : pago.dsNombreGrupo) || 'Individual',
        'Talleres': talleresInfo,
        Items: estadoPago === 'Pagado' ? pago.cantidadItems : pago.talleres?.length || 0,
      };

      if (estadoPago === 'Pagado') {
        baseData['Fecha Pago'] = pago.fePago ? new Date(pago.fePago).toLocaleDateString('es-AR') : '';
        baseData['Modo Pago'] = pago.tipoPagoGlobal || '';
        baseData['Monto Total'] = pago.montoTotal || 0;
        if (pago.observacion) {
          baseData['Observación'] = pago.observacion;
        }
      } else {
        baseData['Monto Esperado Efectivo'] = pago.montoTotalEsperadoEfectivo || 0;
        baseData['Monto Esperado Transferencia'] = pago.montoTotalEsperadoTransferencia || 0;
      }

      return baseData;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pagos');
    
    const estado = estadoPago === 'Pagado' ? 'Pagados' : 'Pendientes';
    const fileName = `Pagos_${estado}_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Exportar a PDF
  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    
    // Título
    doc.setFontSize(16);
    const estado = estadoPago === 'Pagado' ? 'Pagados' : 'Pendientes';
    doc.text(`Reporte de Pagos ${estado}`, 14, 20);
    
    // Subtítulo
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 14, 28);
    doc.text(`Total: ${formatCurrency(calcularTotalFiltrado())}`, 14, 34);
    
    // Preparar datos para la tabla
    const headers = estadoPago === 'Pagado' 
      ? [['Fecha', 'Período', 'Alumno', 'DNI', 'Grupo Familiar', 'Talleres', 'Modo Pago', 'Monto']]
      : [['Período', 'Alumno', 'DNI', 'Grupo Familiar', 'Talleres', 'Monto Efvo', 'Monto Transf']];

    const body = pagos.map((pago) => {
      const talleres = getTalleresUnicos(pago);
      const talleresInfo = talleres.map(t => `${t.nombreTaller}\n${t.horario}`).join('\n');
      
      if (estadoPago === 'Pagado') {
        return [
          pago.fePago ? formatFecha(pago.fePago) : '',
          pago.periodo,
          pago.alumno?.nombre || '',
          pago.alumno?.dni || '',
          pago.nombreGrupoFamiliar || 'Individual',
          talleresInfo,
          pago.tipoPagoGlobal || '',
          formatCurrency(pago.montoTotal || 0),
        ];
      } else {
        return [
          pago.periodo,
          pago.nombreAlumno || '',
          pago.dsDNI || '',
          pago.dsNombreGrupo || 'Individual',
          talleresInfo,
          formatCurrency(pago.montoTotalEsperadoEfectivo || 0),
          formatCurrency(pago.montoTotalEsperadoTransferencia || 0),
        ];
      }
    });
    
    // Tabla
    autoTable(doc, {
      startY: 40,
      head: headers,
      body: body,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [79, 70, 229] },
      columnStyles: {
        [estadoPago === 'Pagado' ? 5 : 4]: { cellWidth: 45 }, // Columna Talleres más ancha
        [estadoPago === 'Pagado' ? 7 : 5]: { halign: 'right' },
        [estadoPago === 'Pagado' ? 7 : 6]: { halign: 'right' },
      },
    });
    
    const fileName = `Pagos_${estado}_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Consulta de Pagos</h1>
        <p className="text-gray-600 mt-2">
          Consulte los pagos registrados aplicando filtros
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
          <CardDescription>
            Complete los campos para filtrar los pagos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Fecha Desde */}
            <div>
              <Label htmlFor="fechaDesde">Fecha Desde</Label>
              <Input
                id="fechaDesde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>

            {/* Fecha Hasta */}
            <div>
              <Label htmlFor="fechaHasta">Fecha Hasta</Label>
              <Input
                id="fechaHasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>

            {/* Tipo de Pago */}
            <div>
              <Label htmlFor="tipoPago">Modo de Pago</Label>
              <Select value={tipoPago} onValueChange={setTipoPago}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                  <SelectItem value="Excepción">Excepción</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estado del Pago */}
            <div>
              <Label htmlFor="estadoPago">Estado</Label>
              <Select value={estadoPago} onValueChange={handleEstadoChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pagado">Pagado</SelectItem>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Alumno (Nombre/Apellido/DNI) */}
            <div>
              <Label htmlFor="searchAlumno">Alumno (Nombre/Apellido/DNI)</Label>
              <Input
                id="searchAlumno"
                placeholder="Buscar por nombre, apellido o DNI"
                value={searchAlumno}
                onChange={(e) => setSearchAlumno(e.target.value)}
              />
            </div>

            {/* Mes */}
            <div>
              <Label htmlFor="mes">Mes</Label>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los meses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Todos</SelectItem>
                  <SelectItem value="1">Enero</SelectItem>
                  <SelectItem value="2">Febrero</SelectItem>
                  <SelectItem value="3">Marzo</SelectItem>
                  <SelectItem value="4">Abril</SelectItem>
                  <SelectItem value="5">Mayo</SelectItem>
                  <SelectItem value="6">Junio</SelectItem>
                  <SelectItem value="7">Julio</SelectItem>
                  <SelectItem value="8">Agosto</SelectItem>
                  <SelectItem value="9">Septiembre</SelectItem>
                  <SelectItem value="10">Octubre</SelectItem>
                  <SelectItem value="11">Noviembre</SelectItem>
                  <SelectItem value="12">Diciembre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Año */}
            <div>
              <Label htmlFor="anio">Año</Label>
              <Input
                id="anio"
                type="number"
                placeholder="2026"
                value={anio}
                onChange={(e) => setAnio(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={buscarPagos} disabled={loading}>
              <Search className="h-4 w-4 mr-2" />
              {loading ? 'Buscando...' : 'Buscar'}
            </Button>
            <Button variant="outline" onClick={limpiarFiltros}>
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {pagos.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Resultados ({pagos.length} pagos)
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button onClick={exportToExcel} variant="outline" size="sm" disabled={pagos.length === 0}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportar Excel
                </Button>
                <Button onClick={exportToPDF} variant="outline" size="sm" disabled={pagos.length === 0}>
                  <FileText className="mr-2 h-4 w-4" />
                  Exportar PDF
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-lg font-bold text-indigo-600">
              <DollarSign className="h-5 w-5" />
              Total: {formatCurrency(calcularTotalFiltrado())}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {estadoPago === 'Pagado' && <TableHead>Fecha Pago</TableHead>}
                    <TableHead>Período</TableHead>
                    <TableHead>Alumno</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Grupo Familiar</TableHead>
                    <TableHead>Talleres</TableHead>
                    {estadoPago === 'Pagado' && <TableHead>Modo Pago</TableHead>}
                    <TableHead className="text-right">
                      {estadoPago === 'Pendiente' ? 'Monto Esperado' : 'Monto Total'}
                    </TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagos.map((pago, index) => {
                    const talleres = getTalleresUnicos(pago);
                    
                    return (
                      <TableRow key={pago.cdPago || `pendiente-${pago.cdAlumno}-${index}`}>
                        {estadoPago === 'Pagado' && pago.fePago && (
                          <TableCell>{formatFecha(pago.fePago)}</TableCell>
                        )}
                        <TableCell className="font-medium">
                          {pago.periodo}
                        </TableCell>
                        <TableCell>
                          {estadoPago === 'Pagado' ? pago.alumno?.nombre : pago.nombreAlumno}
                        </TableCell>
                        <TableCell>
                          {estadoPago === 'Pagado' ? pago.alumno?.dni : pago.dsDNI}
                        </TableCell>
                        <TableCell>
                          {(estadoPago === 'Pagado' ? pago.nombreGrupoFamiliar : pago.dsNombreGrupo) || (
                            <span className="text-gray-400 italic">Individual</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {talleres.map((taller, idx) => (
                              <div key={idx} className="text-sm">
                                <div className="font-medium">{taller.nombreTaller}</div>
                                <div className="text-xs text-indigo-600">{taller.horario}</div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        {estadoPago === 'Pagado' && pago.tipoPagoGlobal && (
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoPagoBadgeColor(
                                pago.tipoPagoGlobal
                              )}`}
                            >
                              {pago.tipoPagoGlobal}
                            </span>
                          </TableCell>
                        )}
                        <TableCell className="text-right font-bold">
                          {estadoPago === 'Pendiente' ? (
                            <div>
                              <div className="text-green-600">
                                {formatCurrency(pago.montoTotalEsperadoEfectivo || 0)}
                                <span className="text-xs ml-1">Efvo</span>
                              </div>
                              <div className="text-blue-600 text-sm">
                                {formatCurrency(pago.montoTotalEsperadoTransferencia || 0)}
                                <span className="text-xs ml-1">Transf</span>
                              </div>
                            </div>
                          ) : (
                            formatCurrency(pago.montoTotal || 0)
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => verDetalle(pago)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Detalle */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {estadoPago === 'Pendiente' 
                ? `Detalle de Cuotas Pendientes - ${pagoSeleccionado?.nombreAlumno}`
                : `Detalle del Pago #${pagoSeleccionado?.cdPago}`}
            </DialogTitle>
            <DialogDescription>
              {estadoPago === 'Pendiente'
                ? 'Información de los talleres con cuotas pendientes de pago'
                : 'Información completa del pago registrado'}
            </DialogDescription>
          </DialogHeader>

          {pagoSeleccionado && (
            <div className="space-y-6">
              {/* Información General */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                {estadoPago === 'Pagado' && pagoSeleccionado.fePago && (
                  <div>
                    <p className="text-sm text-gray-500">Fecha de Pago</p>
                    <p className="font-medium">
                      {formatFecha(pagoSeleccionado.fePago)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Período</p>
                  <p className="font-medium">{pagoSeleccionado.periodo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Alumno</p>
                  <p className="font-medium">
                    {estadoPago === 'Pagado' 
                      ? pagoSeleccionado.alumno?.nombre 
                      : pagoSeleccionado.nombreAlumno}
                  </p>
                  <p className="text-xs text-gray-500">
                    DNI: {estadoPago === 'Pagado' 
                      ? pagoSeleccionado.alumno?.dni 
                      : pagoSeleccionado.dsDNI}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Grupo Familiar</p>
                  <p className="font-medium">
                    {(estadoPago === 'Pagado' 
                      ? pagoSeleccionado.nombreGrupoFamiliar 
                      : pagoSeleccionado.dsNombreGrupo) || (
                      <span className="italic text-gray-400">Individual</span>
                    )}
                  </p>
                </div>
                {estadoPago === 'Pagado' && pagoSeleccionado.tipoPagoGlobal && (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Modo de Pago</p>
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTipoPagoBadgeColor(
                          pagoSeleccionado.tipoPagoGlobal
                        )}`}
                      >
                        {pagoSeleccionado.tipoPagoGlobal}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Monto Total</p>
                      <p className="font-bold text-lg text-indigo-600">
                        {formatCurrency(pagoSeleccionado.montoTotal || 0)}
                      </p>
                    </div>
                  </>
                )}
                {estadoPago === 'Pendiente' && (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Monto Esperado (Efectivo)</p>
                      <p className="font-bold text-lg text-green-600">
                        {formatCurrency(pagoSeleccionado.montoTotalEsperadoEfectivo || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Monto Esperado (Transferencia)</p>
                      <p className="font-bold text-lg text-blue-600">
                        {formatCurrency(pagoSeleccionado.montoTotalEsperadoTransferencia || 0)}
                      </p>
                    </div>
                  </>
                )}
                {estadoPago === 'Pagado' && pagoSeleccionado.observacion && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Observación</p>
                    <p className="font-medium">{pagoSeleccionado.observacion}</p>
                  </div>
                )}
                {estadoPago === 'Pagado' && pagoSeleccionado.usuarioRegistro && (
                  <>
                    <div>
                      <p className="text-sm text-gray-500">Registrado por</p>
                      <p className="font-medium">{pagoSeleccionado.usuarioRegistro}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Fecha de Registro</p>
                      <p className="font-medium">
                        {pagoSeleccionado.feRegistro && formatFecha(pagoSeleccionado.feRegistro)}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Detalle de Items */}
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  {estadoPago === 'Pendiente' ? 'Talleres Pendientes' : 'Items del Pago'}
                </h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {estadoPago === 'Pagado' && <TableHead>Alumno</TableHead>}
                      <TableHead>Taller</TableHead>
                      {estadoPago === 'Pagado' && <TableHead>Modo Pago</TableHead>}
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {estadoPago === 'Pagado' && pagoSeleccionado.detalles?.map((detalle) => (
                      <TableRow key={detalle.cdPagoDetalle}>
                        <TableCell>{detalle.nombreAlumno}</TableCell>
                        <TableCell>
                          {detalle.nombreTaller}
                          {detalle.snEsExcepcion && (
                            <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                              Excepción
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getTipoPagoBadgeColor(
                              detalle.dsTipoPago
                            )}`}
                          >
                            {detalle.dsTipoPago}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(detalle.nuMonto)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {estadoPago === 'Pendiente' && pagoSeleccionado.talleres?.map((taller, idx) => (
                      <TableRow key={`${taller.cdTaller}-${idx}`}>
                        <TableCell className="font-medium">{taller.nombreTaller}</TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div className="text-green-600 font-medium">
                              {formatCurrency(taller.montoEsperadoEfectivo)}
                              <span className="text-xs ml-1">Efectivo</span>
                            </div>
                            <div className="text-blue-600 text-sm font-medium">
                              {formatCurrency(taller.montoEsperadoTransferencia)}
                              <span className="text-xs ml-1">Transferencia</span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-gray-50 font-bold">
                      <TableCell 
                        colSpan={estadoPago === 'Pagado' ? 3 : 1} 
                        className="text-right"
                      >
                        TOTAL
                      </TableCell>
                      <TableCell className="text-right text-indigo-600">
                        {estadoPago === 'Pendiente' ? (
                          <div className="space-y-1">
                            <div className="text-green-600">
                              {formatCurrency(pagoSeleccionado.montoTotalEsperadoEfectivo || 0)}
                            </div>
                            <div className="text-blue-600 text-sm">
                              {formatCurrency(pagoSeleccionado.montoTotalEsperadoTransferencia || 0)}
                            </div>
                          </div>
                        ) : (
                          formatCurrency(pagoSeleccionado.montoTotal || 0)
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mensaje cuando no hay resultados */}
      {!loading && pagos.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg">No hay pagos para mostrar</p>
            <p className="text-sm">
              Use los filtros para buscar pagos registrados
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
