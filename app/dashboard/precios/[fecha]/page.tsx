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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, DollarSign, FileText, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
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
  const { success, error: showError } = useToast();
  const { isAdmin } = usePermissions();

  const [precios, setPrecios] = useState<Precio[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPrecio, setSelectedPrecio] = useState<Precio | null>(null);
  const [editingValues, setEditingValues] = useState({
    nuPrecioCompletoEfectivo: 0,
    nuPrecioCompletoTransferencia: 0,
    nuPrecioDescuentoEfectivo: 0,
    nuPrecioDescuentoTransferencia: 0,
  });
  const [isSaving, setIsSaving] = useState(false);

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

  const handleEditClick = (precio: Precio) => {
    if (!isAdmin()) {
      showError('Acceso denegado', 'Solo los administradores pueden modificar precios');
      return;
    }
    setSelectedPrecio(precio);
    setEditingValues({
      nuPrecioCompletoEfectivo: precio.nuPrecioCompletoEfectivo,
      nuPrecioCompletoTransferencia: precio.nuPrecioCompletoTransferencia,
      nuPrecioDescuentoEfectivo: precio.nuPrecioDescuentoEfectivo,
      nuPrecioDescuentoTransferencia: precio.nuPrecioDescuentoTransferencia,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPrecio) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/precios/${selectedPrecio.cdPrecio}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingValues),
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Mostrar mensaje específico para error 403 (Forbidden)
        if (response.status === 403) {
          throw new Error('No tienes permisos para modificar precios. Solo los administradores pueden realizar esta acción.');
        }
        
        throw new Error(error.error || 'Error al actualizar el precio');
      }

      const result = await response.json();

      success(
        'Precio actualizado',
        'Los precios han sido actualizados correctamente.'
      );

      // Actualizar la lista local
      setPrecios(precios.map(p => 
        p.cdPrecio === selectedPrecio.cdPrecio 
          ? { ...p, ...editingValues }
          : p
      ));

      setIsEditDialogOpen(false);
    } catch (error: any) {
      console.error('Error al actualizar precio:', error);
      showError(
        'Error',
        error.message || 'No se pudo actualizar el precio'
      );
    } finally {
      setIsSaving(false);
    }
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
                      <TableHead className="text-center">Acciones</TableHead>
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
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(precio)}
                            disabled={!isAdmin()}
                            className="gap-2"
                            title={!isAdmin() ? 'Solo administradores pueden editar precios' : ''}
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </Button>
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

      {/* Modal de Edición */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Precios</DialogTitle>
            <DialogDescription>
              Modifica los precios para {selectedPrecio?.dsNombreTaller}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="precioCompletoEfectivo">
                Precio Completo - Efectivo
              </Label>
              <Input
                id="precioCompletoEfectivo"
                type="number"
                step="0.01"
                min="0"
                value={editingValues.nuPrecioCompletoEfectivo}
                onChange={(e) =>
                  setEditingValues({
                    ...editingValues,
                    nuPrecioCompletoEfectivo: parseFloat(e.target.value) || 0,
                  })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="precioCompletoTransferencia">
                Precio Completo - Transferencia
              </Label>
              <Input
                id="precioCompletoTransferencia"
                type="number"
                step="0.01"
                min="0"
                value={editingValues.nuPrecioCompletoTransferencia}
                onChange={(e) =>
                  setEditingValues({
                    ...editingValues,
                    nuPrecioCompletoTransferencia: parseFloat(e.target.value) || 0,
                  })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="precioDescuentoEfectivo">
                Precio con Descuento - Efectivo
              </Label>
              <Input
                id="precioDescuentoEfectivo"
                type="number"
                step="0.01"
                min="0"
                value={editingValues.nuPrecioDescuentoEfectivo}
                onChange={(e) =>
                  setEditingValues({
                    ...editingValues,
                    nuPrecioDescuentoEfectivo: parseFloat(e.target.value) || 0,
                  })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="precioDescuentoTransferencia">
                Precio con Descuento - Transferencia
              </Label>
              <Input
                id="precioDescuentoTransferencia"
                type="number"
                step="0.01"
                min="0"
                value={editingValues.nuPrecioDescuentoTransferencia}
                onChange={(e) =>
                  setEditingValues({
                    ...editingValues,
                    nuPrecioDescuentoTransferencia: parseFloat(e.target.value) || 0,
                  })
                }
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
