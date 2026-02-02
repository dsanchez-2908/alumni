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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, DollarSign, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TipoTaller {
  cdTipoTaller: number;
  dsNombreTaller: string;
}

interface Vigencia {
  feInicioVigencia: string;
  nombreUsuarioAlta: string;
  feAlta: string;
  cantidadTalleres: number;
}

interface PrecioActual {
  cdTipoTaller: number;
  nuPrecioCompletoEfectivo: number;
  nuPrecioCompletoTransferencia: number;
  nuPrecioDescuentoEfectivo: number;
  nuPrecioDescuentoTransferencia: number;
}

interface PrecioFormData {
  cdTipoTaller: number;
  dsNombreTaller: string;
  nuPrecioCompletoEfectivo: string;
  nuPrecioCompletoTransferencia: string;
  nuPrecioDescuentoEfectivo: string;
  nuPrecioDescuentoTransferencia: string;
  precioActual?: PrecioActual;
}

export default function PreciosPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [tiposTaller, setTiposTaller] = useState<TipoTaller[]>([]);
  const [vigencias, setVigencias] = useState<Vigencia[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [feInicioVigencia, setFeInicioVigencia] = useState('');
  const [preciosForm, setPreciosForm] = useState<PrecioFormData[]>([]);

  useEffect(() => {
    fetchTiposTaller();
    fetchVigencias();
  }, []);

  const fetchTiposTaller = async () => {
    try {
      const response = await fetch('/api/tipos-taller');
      if (response.ok) {
        const data = await response.json();
        // Filtrar solo talleres activos
        const talleresActivos = data.filter((t: any) => t.cdEstado === 1);
        setTiposTaller(talleresActivos);
      }
    } catch (err) {
      console.error('Error al cargar tipos de taller:', err);
    }
  };

  const fetchVigencias = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/precios?agrupado=true');
      if (response.ok) {
        const data = await response.json();
        setVigencias(data);
      }
    } catch (err) {
      console.error('Error al cargar vigencias:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreciosActuales = async () => {
    try {
      // Obtener precios vigentes para cada taller
      const response = await fetch('/api/precios?vigente=true');
      if (response.ok) {
        const data = await response.json();
        
        // Mapear precios actuales por cdTipoTaller
        const preciosActualesMap: Record<number, PrecioActual> = {};
        data.forEach((precio: any) => {
          preciosActualesMap[precio.cdTipoTaller] = {
            cdTipoTaller: precio.cdTipoTaller,
            nuPrecioCompletoEfectivo: precio.nuPrecioCompletoEfectivo,
            nuPrecioCompletoTransferencia: precio.nuPrecioCompletoTransferencia,
            nuPrecioDescuentoEfectivo: precio.nuPrecioDescuentoEfectivo,
            nuPrecioDescuentoTransferencia: precio.nuPrecioDescuentoTransferencia,
          };
        });

        // Crear formulario con todos los talleres activos
        const formData = tiposTaller.map((taller) => ({
          cdTipoTaller: taller.cdTipoTaller,
          dsNombreTaller: taller.dsNombreTaller,
          nuPrecioCompletoEfectivo: '',
          nuPrecioCompletoTransferencia: '',
          nuPrecioDescuentoEfectivo: '',
          nuPrecioDescuentoTransferencia: '',
          precioActual: preciosActualesMap[taller.cdTipoTaller],
        }));

        setPreciosForm(formData);
      }
    } catch (err) {
      console.error('Error al cargar precios actuales:', err);
    }
  };

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    setFeInicioVigencia('');
    fetchPreciosActuales();
  };

  const handlePrecioChange = (
    cdTipoTaller: number,
    field: string,
    value: string
  ) => {
    setPreciosForm((prev) =>
      prev.map((p) =>
        p.cdTipoTaller === cdTipoTaller ? { ...p, [field]: value } : p
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!feInicioVigencia) {
      error('Por favor indique la fecha de inicio de vigencia');
      return;
    }

    // Validar que al menos un precio fue modificado
    const preciosModificados = preciosForm.filter(
      (p) =>
        p.nuPrecioCompletoEfectivo ||
        p.nuPrecioCompletoTransferencia ||
        p.nuPrecioDescuentoEfectivo ||
        p.nuPrecioDescuentoTransferencia
    );

    if (preciosModificados.length === 0) {
      error('Debe modificar al menos un precio');
      return;
    }

    // Validar que los precios modificados tengan todos los campos
    const preciosIncompletos = preciosModificados.filter(
      (p) =>
        !p.nuPrecioCompletoEfectivo ||
        !p.nuPrecioCompletoTransferencia ||
        !p.nuPrecioDescuentoEfectivo ||
        !p.nuPrecioDescuentoTransferencia
    );

    if (preciosIncompletos.length > 0) {
      error(
        'Los talleres con precios deben tener todos los campos completos: ' +
          preciosIncompletos.map((p) => p.dsNombreTaller).join(', ')
      );
      return;
    }

    setSubmitting(true);

    try {
      // Preparar el array de precios para TODOS los talleres
      // Si no se modificó, usar el precio actual
      const preciosData = preciosForm.map((p) => {
        // Si el taller tiene precios nuevos ingresados, usarlos
        if (
          p.nuPrecioCompletoEfectivo &&
          p.nuPrecioCompletoTransferencia &&
          p.nuPrecioDescuentoEfectivo &&
          p.nuPrecioDescuentoTransferencia
        ) {
          return {
            feInicioVigencia,
            cdTipoTaller: p.cdTipoTaller,
            nuPrecioCompletoEfectivo: parseFloat(p.nuPrecioCompletoEfectivo),
            nuPrecioCompletoTransferencia: parseFloat(p.nuPrecioCompletoTransferencia),
            nuPrecioDescuentoEfectivo: parseFloat(p.nuPrecioDescuentoEfectivo),
            nuPrecioDescuentoTransferencia: parseFloat(p.nuPrecioDescuentoTransferencia),
          };
        }
        // Si no se modificó pero tiene precio actual, copiar el precio actual
        else if (p.precioActual) {
          return {
            feInicioVigencia,
            cdTipoTaller: p.cdTipoTaller,
            nuPrecioCompletoEfectivo: p.precioActual.nuPrecioCompletoEfectivo,
            nuPrecioCompletoTransferencia: p.precioActual.nuPrecioCompletoTransferencia,
            nuPrecioDescuentoEfectivo: p.precioActual.nuPrecioDescuentoEfectivo,
            nuPrecioDescuentoTransferencia: p.precioActual.nuPrecioDescuentoTransferencia,
          };
        }
        // Si no tiene precio actual, usar 0 (caso de taller nuevo)
        else {
          return {
            feInicioVigencia,
            cdTipoTaller: p.cdTipoTaller,
            nuPrecioCompletoEfectivo: 0,
            nuPrecioCompletoTransferencia: 0,
            nuPrecioDescuentoEfectivo: 0,
            nuPrecioDescuentoTransferencia: 0,
          };
        }
      });

      const response = await fetch('/api/precios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preciosData),
      });

      if (response.ok) {
        success(
          `${preciosData.length} precio(s) registrado(s) exitosamente para la vigencia ${new Date(feInicioVigencia).toLocaleDateString('es-AR')}`
        );
        setIsDialogOpen(false);
        setFeInicioVigencia('');
        setPreciosForm([]);
        fetchVigencias();
      } else {
        const errorData = await response.json();
        error(`Error: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Error al registrar precios:', err);
      error('Error al registrar precios');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR');
  };

  const handleVerDetalle = (fecha: string) => {
    router.push(`/dashboard/precios/${fecha}`);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Registro de Precios</h1>
          <p className="text-gray-600 mt-1">
            Gestión de precios por vigencia
          </p>
        </div>
        <Button
          onClick={handleOpenDialog}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Nuevos Precios
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Vigencias</CardTitle>
          <CardDescription>
            Lista de precios agrupados por fecha de vigencia
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando vigencias...</div>
          ) : vigencias.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No hay precios registrados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vigencia Desde</TableHead>
                  <TableHead>Registrado Por</TableHead>
                  <TableHead>Fecha de Alta</TableHead>
                  <TableHead>Cantidad Talleres</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vigencias.map((vigencia, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {formatDate(vigencia.feInicioVigencia)}
                    </TableCell>
                    <TableCell>{vigencia.nombreUsuarioAlta}</TableCell>
                    <TableCell>{formatDate(vigencia.feAlta)}</TableCell>
                    <TableCell>{vigencia.cantidadTalleres}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerDetalle(vigencia.feInicioVigencia)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalle
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para nuevos precios */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Nuevos Precios</DialogTitle>
            <DialogDescription>
              Complete los precios para todos los talleres activos. Solo se registrarán los talleres que completes.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
              <Label htmlFor="feInicioVigencia" className="text-base font-semibold">
                Fecha de Inicio de Vigencia *
              </Label>
              <Input
                id="feInicioVigencia"
                type="date"
                required
                value={feInicioVigencia}
                onChange={(e) => setFeInicioVigencia(e.target.value)}
                className="mt-2 max-w-xs"
              />
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-[200px]">Taller</TableHead>
                    <TableHead className="text-center">Completo Efectivo</TableHead>
                    <TableHead className="text-center">Completo Transfer.</TableHead>
                    <TableHead className="text-center">Descuento Efectivo</TableHead>
                    <TableHead className="text-center">Descuento Transfer.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preciosForm.map((precio) => (
                    <TableRow key={precio.cdTipoTaller}>
                      <TableCell className="font-medium">
                        {precio.dsNombreTaller}
                      </TableCell>
                      <TableCell className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={
                            precio.precioActual
                              ? formatCurrency(precio.precioActual.nuPrecioCompletoEfectivo)
                              : '0.00'
                          }
                          value={precio.nuPrecioCompletoEfectivo}
                          onChange={(e) =>
                            handlePrecioChange(
                              precio.cdTipoTaller,
                              'nuPrecioCompletoEfectivo',
                              e.target.value
                            )
                          }
                          className={
                            precio.precioActual
                              ? 'border-indigo-300 bg-indigo-50'
                              : ''
                          }
                        />
                        {precio.precioActual && (
                          <div className="text-xs text-gray-500 mt-1">
                            Actual: {formatCurrency(precio.precioActual.nuPrecioCompletoEfectivo)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={
                            precio.precioActual
                              ? formatCurrency(precio.precioActual.nuPrecioCompletoTransferencia)
                              : '0.00'
                          }
                          value={precio.nuPrecioCompletoTransferencia}
                          onChange={(e) =>
                            handlePrecioChange(
                              precio.cdTipoTaller,
                              'nuPrecioCompletoTransferencia',
                              e.target.value
                            )
                          }
                          className={
                            precio.precioActual
                              ? 'border-indigo-300 bg-indigo-50'
                              : ''
                          }
                        />
                        {precio.precioActual && (
                          <div className="text-xs text-gray-500 mt-1">
                            Actual: {formatCurrency(precio.precioActual.nuPrecioCompletoTransferencia)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={
                            precio.precioActual
                              ? formatCurrency(precio.precioActual.nuPrecioDescuentoEfectivo)
                              : '0.00'
                          }
                          value={precio.nuPrecioDescuentoEfectivo}
                          onChange={(e) =>
                            handlePrecioChange(
                              precio.cdTipoTaller,
                              'nuPrecioDescuentoEfectivo',
                              e.target.value
                            )
                          }
                          className={
                            precio.precioActual
                              ? 'border-indigo-300 bg-indigo-50'
                              : ''
                          }
                        />
                        {precio.precioActual && (
                          <div className="text-xs text-gray-500 mt-1">
                            Actual: {formatCurrency(precio.precioActual.nuPrecioDescuentoEfectivo)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="p-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={
                            precio.precioActual
                              ? formatCurrency(precio.precioActual.nuPrecioDescuentoTransferencia)
                              : '0.00'
                          }
                          value={precio.nuPrecioDescuentoTransferencia}
                          onChange={(e) =>
                            handlePrecioChange(
                              precio.cdTipoTaller,
                              'nuPrecioDescuentoTransferencia',
                              e.target.value
                            )
                          }
                          className={
                            precio.precioActual
                              ? 'border-indigo-300 bg-indigo-50'
                              : ''
                          }
                        />
                        {precio.precioActual && (
                          <div className="text-xs text-gray-500 mt-1">
                            Actual: {formatCurrency(precio.precioActual.nuPrecioDescuentoTransferencia)}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700"
                disabled={submitting}
              >
                {submitting ? 'Guardando...' : 'Guardar Precios'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
