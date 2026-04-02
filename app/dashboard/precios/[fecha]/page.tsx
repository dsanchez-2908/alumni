'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { ArrowLeft, DollarSign, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Precio {
  cdPrecio: number;
  feAlta: string;
  feInicioVigencia: string;
  cdTipoTaller: number;
  dsNombreTaller: string;
  nuPrecioCompletoEfectivo: number;
  nuPrecioCompletoTransferencia: number;
  nuPrecioDescuentoEfectivo: number;
  nuPrecioDescuentoTransferencia: number;
  nombreUsuarioAlta: string;
}

export default function DetallePreciosPage() {
  const router = useRouter();
  const params = useParams();
  const fecha = decodeURIComponent(params.fecha as string);

  const [precios, setPrecios] = useState<Precio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (fecha) {
      fetchPrecios();
    }
  }, [fecha]);

  const fetchPrecios = async () => {
    setLoading(true);
    try {
      console.log('Fetching precios for fecha:', fecha);
      const response = await fetch(`/api/precios/vigencia/${encodeURIComponent(fecha)}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Precios recibidos:', data.length);
        setPrecios(data);
      } else {
        console.error('Error response:', response.status);
      }
    } catch (error) {
      console.error('Error al cargar precios:', error);
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

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Fecha no disponible';
    // Si la fecha viene en formato YYYY-MM-DD, añadir tiempo para evitar problemas de zona horaria
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-AR');
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Lista de Precios', 14, 20);
    
    // Fecha de vigencia
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Vigencia desde: ${formatDate(fecha)}`, 14, 30);
    
    // Información adicional
    doc.setFontSize(10);
    doc.text(`Registrado por: ${precios[0]?.nombreUsuarioAlta || '-'}`, 14, 38);
    doc.text(`Fecha de registro: ${formatDate(precios[0]?.feAlta)}`, 14, 44);
    
    // Tabla de precios
    autoTable(doc, {
      startY: 52,
      head: [[
        'Tipo Taller',
        'Completo Efectivo',
        'Completo Transfer.',
        'Descuento Efectivo',
        'Descuento Transfer.'
      ]],
      body: precios.map(precio => [
        precio.dsNombreTaller,
        formatCurrency(precio.nuPrecioCompletoEfectivo),
        formatCurrency(precio.nuPrecioCompletoTransferencia),
        formatCurrency(precio.nuPrecioDescuentoEfectivo),
        formatCurrency(precio.nuPrecioDescuentoTransferencia)
      ]),
      headStyles: {
        fillColor: [79, 70, 229],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 32, halign: 'right' },
        2: { cellWidth: 32, halign: 'right' },
        3: { cellWidth: 32, halign: 'right' },
        4: { cellWidth: 32, halign: 'right' }
      },
      margin: { top: 52 }
    });
    
    // Pie de página con fecha de impresión
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(
        `Impreso el ${new Date().toLocaleDateString('es-AR')} a las ${new Date().toLocaleTimeString('es-AR')}`,
        14,
        doc.internal.pageSize.height - 10
      );
    }
    
    const fileName = `Precios_${fecha.replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/precios')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <Button
              onClick={exportToPDF}
              disabled={precios.length === 0}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            >
              <FileText className="h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Detalle de Precios
          </h1>
          <p className="text-gray-600 mt-1">
            Vigencia desde: {formatDate(fecha)}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Precios por Taller</CardTitle>
          <CardDescription>
            Lista completa de precios para esta vigencia
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando precios...</div>
          ) : precios.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No hay precios registrados para esta vigencia</p>
            </div>
          ) : (
            <>
              <div className="mb-4 text-sm text-gray-600">
                <p>
                  <span className="font-semibold">Registrado por:</span>{' '}
                  {precios[0]?.nombreUsuarioAlta}
                </p>
                <p>
                  <span className="font-semibold">Fecha de registro:</span>{' '}
                  {formatDate(precios[0]?.feAlta)}
                </p>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Tipo Taller</TableHead>
                      <TableHead className="text-right">
                        Completo Efectivo
                      </TableHead>
                      <TableHead className="text-right">
                        Completo Transfer.
                      </TableHead>
                      <TableHead className="text-right">
                        Descuento Efectivo
                      </TableHead>
                      <TableHead className="text-right">
                        Descuento Transfer.
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {precios.map((precio) => (
                      <TableRow key={precio.cdPrecio}>
                        <TableCell className="font-medium">
                          {precio.dsNombreTaller}
                        </TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {formatCurrency(precio.nuPrecioCompletoEfectivo)}
                        </TableCell>
                        <TableCell className="text-right text-blue-600 font-medium">
                          {formatCurrency(precio.nuPrecioCompletoTransferencia)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(precio.nuPrecioDescuentoEfectivo)}
                        </TableCell>
                        <TableCell className="text-right text-blue-600">
                          {formatCurrency(precio.nuPrecioDescuentoTransferencia)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
