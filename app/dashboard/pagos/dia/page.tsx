'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DollarSign, FileText, RefreshCw, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PagoDetalle {
  cdPagoDetalle: number;
  cdPago: number;
  cdAlumno: number;
  nombreAlumno: string;
  dsDNI: string;
  cdTaller: number;
  nombreTaller: string;
  nuAnioTaller: number;
  nuMonto: number;
  dsTipoPago: string;
  snEsExcepcion: number;
  fePago: string;
  nuMes: number;
  nuAnio: number;
  dsObservacion: string | null;
  cdGrupoFamiliar: number | null;
  dsNombreGrupo: string | null;
  usuarioRegistro: string;
  feRegistro: string;
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

interface DatosPagosDia {
  fecha: string;
  pagos: {
    efectivo: PagoDetalle[];
    transferencia: PagoDetalle[];
    excepcion: PagoDetalle[];
  };
  totales: {
    efectivo: number;
    transferencia: number;
    excepcion: number;
    general: number;
  };
  cantidades: {
    efectivo: number;
    transferencia: number;
    excepcion: number;
    total: number;
  };
}

export default function PagosDelDiaPage() {
  const { error, success } = useToast();
  
  const [datos, setDatos] = useState<DatosPagosDia | null>(null);
  const [loading, setLoading] = useState(true);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  useEffect(() => {
    cargarPagosDelDia();
  }, []);

  const cargarPagosDelDia = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pagos/dia');
      if (response.ok) {
        const data = await response.json();
        setDatos(data);
      } else {
        error('Error al cargar pagos del día');
      }
    } catch (err) {
      console.error('Error:', err);
      error('Error al cargar pagos del día');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(value);
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

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
        const horaDesde = dia.desde.substring(0, 5);
        const horaHasta = dia.hasta.substring(0, 5);
        return `${dia.nombre} ${horaDesde}-${horaHasta}`;
      })
      .join(', ');
  };

  const generarPDF = () => {
    if (!datos) return;

    setGenerandoPDF(true);

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Título principal
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Pagos del Día - Indigo Teatro', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 10;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(formatFecha(datos.fecha), pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 15;

      // Función helper para crear tabla
      const crearTabla = (titulo: string, pagos: PagoDetalle[], total: number, color: [number, number, number]) => {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(titulo, 14, yPos);
        yPos += 2;

        if (pagos.length === 0) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(128, 128, 128);
          doc.text('No hay pagos registrados', 14, yPos + 5);
          yPos += 15;
        } else {
          const tableData = pagos.map(p => [
            p.nombreAlumno,
            p.dsDNI,
            `${p.nombreTaller} - ${p.nuAnioTaller}`,
            formatHorarioTaller(p.horarios),
            formatCurrency(p.nuMonto),
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Alumno', 'DNI', 'Taller', 'Horario', 'Monto']],
            body: tableData,
            theme: 'striped',
            headStyles: {
              fillColor: color,
              textColor: [255, 255, 255],
              fontSize: 9,
              fontStyle: 'bold',
            },
            bodyStyles: {
              fontSize: 8,
            },
            columnStyles: {
              0: { cellWidth: 45 },
              1: { cellWidth: 25 },
              2: { cellWidth: 50 },
              3: { cellWidth: 40 },
              4: { cellWidth: 25, halign: 'right' },
            },
            margin: { left: 14, right: 14 },
            didDrawPage: (data) => {
              yPos = data.cursor!.y;
            },
          });

          yPos += 8;
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
          doc.text(`Total ${titulo}: ${formatCurrency(total)}`, pageWidth - 14, yPos, { align: 'right' });
          yPos += 12;
        }

        // Verificar si se necesita una nueva página
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
      };

      // Crear tablas para cada tipo de pago
      crearTabla('Efectivo', datos.pagos.efectivo, datos.totales.efectivo, [34, 197, 94]); // Verde
      crearTabla('Transferencia', datos.pagos.transferencia, datos.totales.transferencia, [59, 130, 246]); // Azul
      crearTabla('Excepción', datos.pagos.excepcion, datos.totales.excepcion, [168, 85, 247]); // Púrpura

      // Total general
      yPos += 5;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.setFillColor(240, 240, 240);
      doc.rect(14, yPos - 5, pageWidth - 28, 10, 'F');
      doc.text(`TOTAL GENERAL: ${formatCurrency(datos.totales.general)}`, pageWidth / 2, yPos, { align: 'center' });

      // Resumen de cantidades
      yPos += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de pagos: ${datos.cantidades.total}`, 14, yPos);
      doc.text(`(Efectivo: ${datos.cantidades.efectivo} | Transferencia: ${datos.cantidades.transferencia} | Excepción: ${datos.cantidades.excepcion})`, 14, yPos + 5);

      // Guardar PDF
      const fechaArchivo = new Date().toISOString().split('T')[0];
      doc.save(`pagos-del-dia-${fechaArchivo}.pdf`);
      
      success('PDF generado exitosamente');
    } catch (err) {
      console.error('Error al generar PDF:', err);
      error('Error al generar el PDF');
    } finally {
      setGenerandoPDF(false);
    }
  };

  const renderTabla = (titulo: string, pagos: PagoDetalle[], total: number, colorClass: string) => {
    return (
      <Card className="mb-6">
        <CardHeader className={`${colorClass} text-white`}>
          <CardTitle className="flex items-center justify-between">
            <span>{titulo}</span>
            <span className="text-lg font-bold">{formatCurrency(total)}</span>
          </CardTitle>
          <CardDescription className="text-white/90">
            {pagos.length} {pagos.length === 1 ? 'pago registrado' : 'pagos registrados'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {pagos.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No hay pagos registrados en esta categoría
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alumno</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Taller</TableHead>
                  <TableHead>Horario</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagos.map((pago) => (
                  <TableRow key={pago.cdPagoDetalle}>
                    <TableCell className="font-medium">{pago.nombreAlumno}</TableCell>
                    <TableCell>{pago.dsDNI}</TableCell>
                    <TableCell>
                      {pago.nombreTaller} - {pago.nuAnioTaller}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatHorarioTaller(pago.horarios)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(pago.nuMonto)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50 font-bold">
                  <TableCell colSpan={4} className="text-right">
                    Subtotal {titulo}:
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(total)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Cargando pagos del día...</p>
        </div>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-600">No se pudieron cargar los datos</p>
          <Button onClick={cargarPagosDelDia} className="mt-4">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-indigo-600" />
            Pagos del Día
          </h1>
          <p className="text-gray-600 mt-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {formatFecha(datos.fecha)}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={cargarPagosDelDia}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button
            onClick={generarPDF}
            disabled={generandoPDF || datos.cantidades.total === 0}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            <FileText className="h-4 w-4" />
            {generandoPDF ? 'Generando...' : 'Exportar PDF'}
          </Button>
        </div>
      </div>

      {/* Resumen de totales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Efectivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">
              {formatCurrency(datos.totales.efectivo)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {datos.cantidades.efectivo} {datos.cantidades.efectivo === 1 ? 'pago' : 'pagos'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Transferencia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">
              {formatCurrency(datos.totales.transferencia)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {datos.cantidades.transferencia} {datos.cantidades.transferencia === 1 ? 'pago' : 'pagos'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Excepción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">
              {formatCurrency(datos.totales.excepcion)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {datos.cantidades.excepcion} {datos.cantidades.excepcion === 1 ? 'pago' : 'pagos'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-indigo-300 bg-indigo-100">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">
              Total General
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-800">
              {formatCurrency(datos.totales.general)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {datos.cantidades.total} {datos.cantidades.total === 1 ? 'pago' : 'pagos'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tablas por tipo de pago */}
      {renderTabla('Efectivo', datos.pagos.efectivo, datos.totales.efectivo, 'bg-green-600')}
      {renderTabla('Transferencia', datos.pagos.transferencia, datos.totales.transferencia, 'bg-blue-600')}
      {renderTabla('Excepción', datos.pagos.excepcion, datos.totales.excepcion, 'bg-purple-600')}

      {/* Mensaje si no hay pagos */}
      {datos.cantidades.total === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-8 text-center">
            <DollarSign className="h-12 w-12 mx-auto mb-4 text-amber-500" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No hay pagos registrados hoy
            </h3>
            <p className="text-gray-600">
              No se han registrado pagos en el día de hoy.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
