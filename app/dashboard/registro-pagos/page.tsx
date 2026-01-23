'use client';

import { useState, useEffect } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Search, DollarSign, Save } from 'lucide-react';

interface Alumno {
  cdAlumno: number;
  dsNombre: string;
  dsApellido: string;
  dsDNI: string;
  cdGrupoFamiliar: number;
}

interface ItemPago {
  cdAlumno: number;
  nombreAlumno: string;
  cdTaller: number;
  nombreTaller: string;
  cdTipoTaller: number;
  mes: number;
  anio: number;
  precio: any;
  montoCalculado: number;
  tipoPago: 'Efectivo' | 'Transferencia' | 'Excepcion';
  seleccionado: boolean;
  esExcepcion: boolean;
  montoExcepcion?: number;
}

export default function RegistroPagosPage() {
  const { success, error, warning } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<Alumno | null>(null);
  const [items, setItems] = useState<ItemPago[]>([]);
  const [tipoPagoGlobal, setTipoPagoGlobal] = useState<string>('');
  const [observacion, setObservacion] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Recalcular montos cuando cambian los items
  useEffect(() => {
    if (items.length > 0 && items.every(item => item.precio)) {
      calcularMontos();
    }
  }, [items.length]);

  const searchAlumnos = async () => {
    if (!searchTerm) {
      warning('Ingrese un término de búsqueda');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/alumnos?search=${encodeURIComponent(searchTerm)}`);
      if (response.ok) {
        const data = await response.json();
        setAlumnos(data.alumnos || []);
      }
    } catch (error) {
      console.error('Error al buscar alumnos:', error);
    } finally {
      setLoading(false);
    }
  };

  const seleccionarAlumno = async (alumno: Alumno) => {
    setAlumnoSeleccionado(alumno);
    setLoading(true);
    
    try {
      // Si tiene grupo familiar, buscar cuotas del grupo completo
      // Si no tiene, buscar solo las cuotas del alumno individual
      const endpoint = alumno.cdGrupoFamiliar
        ? `/api/grupos-familiares/${alumno.cdGrupoFamiliar}/cuotas-pendientes`
        : `/api/alumnos/${alumno.cdAlumno}/cuotas-pendientes`;
      
      const response = await fetch(endpoint);
      
      if (response.ok) {
        const data = await response.json();
        
        // Verificar si no hay talleres (para alumnos individuales) o no hay items (para grupos)
        const sinCuotas = (data.talleres && data.talleres.length === 0) || 
                          (data.items && data.items.length === 0) ||
                          (!data.items && !data.talleres);
        
        if (sinCuotas && data.mensaje) {
          error(`${alumno.dsApellido}, ${alumno.dsNombre} no tiene talleres asociados o no tiene cuotas pendientes`);
          setItems([]);
          setAlumnoSeleccionado(null);
          setAlumnos([]);
        } else {
          setItems(data.items || []);
        }
      } else {
        const errorData = await response.json();
        error(errorData.error || 'Error al cargar cuotas');
        setItems([]);
        setAlumnoSeleccionado(null);
      }
    } catch (err) {
      console.error('Error al cargar cuotas:', err);
      error('Error al cargar cuotas pendientes');
      setItems([]);
      setAlumnoSeleccionado(null);
    } finally {
      setLoading(false);
    }
  };

  const cancelarSeleccion = () => {
    setAlumnoSeleccionado(null);
    setItems([]);
    setObservacion('');
    setTipoPagoGlobal('');
    setAlumnos([]);
  };

  const calcularMontos = () => {
    // Lógica de cálculo según reglas:
    // 1. Si solo 1 taller: precio completo
    // 2. Si +1 taller: el más caro completo, resto con descuento
    
    setItems((currentItems) => {
      if (currentItems.length === 0) return currentItems;

      const itemsActualizados = [...currentItems];

      if (currentItems.length === 1) {
        // Un solo taller: precio completo
        const item = itemsActualizados[0];
        if (!item.esExcepcion && item.precio) {
          item.montoCalculado =
            item.tipoPago === 'Transferencia'
              ? parseFloat(item.precio.nuPrecioCompletoTransferencia)
              : parseFloat(item.precio.nuPrecioCompletoEfectivo);
        }
      } else {
        // Múltiples talleres: ordenar por precio completo descendente
        const itemsConPrecio = itemsActualizados.map((item) => ({
          ...item,
          precioCompletoRef: item.precio ? parseFloat(item.precio.nuPrecioCompletoEfectivo) : 0,
        }));

        itemsConPrecio.sort((a, b) => b.precioCompletoRef - a.precioCompletoRef);

        // El primero (más caro) lleva precio completo
        itemsConPrecio.forEach((item, index) => {
          if (!item.esExcepcion && item.precio) {
            if (index === 0) {
              // Más caro: precio completo
              item.montoCalculado =
                item.tipoPago === 'Transferencia'
                  ? parseFloat(item.precio.nuPrecioCompletoTransferencia)
                  : parseFloat(item.precio.nuPrecioCompletoEfectivo);
            } else {
              // Resto: precio con descuento
              item.montoCalculado =
                item.tipoPago === 'Transferencia'
                  ? parseFloat(item.precio.nuPrecioDescuentoTransferencia)
                  : parseFloat(item.precio.nuPrecioDescuentoEfectivo);
            }
          }
        });

        // Actualizar el orden original con los montos calculados
        return itemsConPrecio;
      }

      return itemsActualizados;
    });
  };

  const cambiarTipoPago = (index: number, tipo: string) => {
    const nuevosItems = [...items];
    const item = nuevosItems[index];

    if (tipo === 'Excepcion') {
      item.esExcepcion = true;
      item.tipoPago = 'Excepcion';
      item.montoExcepcion = item.montoCalculado;
    } else {
      item.esExcepcion = false;
      item.tipoPago = tipo as 'Efectivo' | 'Transferencia';
      delete item.montoExcepcion;
    }

    setItems(nuevosItems);
    // Recalcular después de cambiar
    setTimeout(() => calcularMontos(), 100);
  };

  const cambiarTipoPagoGlobal = (tipo: string) => {
    if (!tipo) return;
    
    setTipoPagoGlobal(tipo);
    const nuevosItems = items.map((item) => {
      if (tipo === 'Excepcion') {
        return {
          ...item,
          esExcepcion: true,
          tipoPago: 'Excepcion' as const,
          montoExcepcion: item.montoCalculado,
        };
      } else {
        return {
          ...item,
          esExcepcion: false,
          tipoPago: tipo as 'Efectivo' | 'Transferencia',
        };
      }
    });
    setItems(nuevosItems);
    setTimeout(() => calcularMontos(), 100);
  };

  const cambiarMontoExcepcion = (index: number, monto: number) => {
    const nuevosItems = [...items];
    nuevosItems[index].montoExcepcion = monto;
    setItems(nuevosItems);
  };

  const toggleSeleccion = (index: number) => {
    const nuevosItems = [...items];
    nuevosItems[index].seleccionado = !nuevosItems[index].seleccionado;
    setItems(nuevosItems);
  };

  const calcularTotal = () => {
    return items
      .filter((item) => item.seleccionado)
      .reduce((sum, item) => {
        const monto = item.esExcepcion
          ? parseFloat(String(item.montoExcepcion || 0))
          : parseFloat(String(item.montoCalculado || 0));
        return sum + (isNaN(monto) ? 0 : monto);
      }, 0);
  };

  const registrarPago = async () => {
    const itemsSeleccionados = items.filter((item) => item.seleccionado);

    if (itemsSeleccionados.length === 0) {
      warning('Debe seleccionar al menos un item para pagar');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        cdGrupoFamiliar: alumnoSeleccionado?.cdGrupoFamiliar,
        observacion,
        items: itemsSeleccionados.map((item) => ({
          cdAlumno: item.cdAlumno,
          cdTaller: item.cdTaller,
          mes: item.mes,
          anio: item.anio,
          monto: item.esExcepcion ? item.montoExcepcion : item.montoCalculado,
          tipoPago: item.tipoPago,
          esExcepcion: item.esExcepcion,
        })),
      };

      const response = await fetch('/api/registro-pagos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        success(`Pago registrado exitosamente. Total: $${data.montoTotal}`);
        // Limpiar formulario
        setAlumnoSeleccionado(null);
        setItems([]);
        setObservacion('');
        setSearchTerm('');
      } else {
        const errorData = await response.json();
        error(`Error: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Error al registrar pago:', err);
      error('Error al registrar pago');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(value);
  };

  const meses = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Registro de Pagos</h1>
        <p className="text-gray-600 mt-1">
          Búsqueda de alumno y registro de cuotas
        </p>
      </div>

      {/* Búsqueda */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Alumno
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Nombre, apellido o DNI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchAlumnos()}
              />
            </div>
            <Button onClick={searchAlumnos} disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>

          {alumnos.length > 0 && !alumnoSeleccionado && (
            <div className="mt-4">
              <Label>Resultados:</Label>
              <div className="mt-2 space-y-2">
                {alumnos.map((alumno) => (
                  <div
                    key={alumno.cdAlumno}
                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => seleccionarAlumno(alumno)}
                  >
                    <p className="font-medium">
                      {alumno.dsApellido}, {alumno.dsNombre}
                    </p>
                    <p className="text-sm text-gray-600">DNI: {alumno.dsDNI}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cuotas a pagar */}
      {alumnoSeleccionado && items.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Cuotas a Pagar
                </CardTitle>
                <CardDescription>
                  Grupo Familiar de: {alumnoSeleccionado.dsApellido},{' '}
                  {alumnoSeleccionado.dsNombre}
                </CardDescription>
              </div>
              <Button variant="outline" onClick={cancelarSeleccion}>
                Cancelar y buscar otro
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Control global */}
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Modo de Pago Global</Label>
                  <Select value={tipoPagoGlobal} onValueChange={cambiarTipoPagoGlobal}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Cambiar todos..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Transferencia">Transferencia</SelectItem>
                      <SelectItem value="Excepcion">Excepción</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Sel.</TableHead>
                  <TableHead>Mes</TableHead>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Taller</TableHead>
                  <TableHead>Modo de Pago</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={`${item.cdAlumno}-${item.cdTaller}`}>
                    <TableCell>
                      <Checkbox
                        checked={item.seleccionado}
                        onChange={() => toggleSeleccion(index)}
                      />
                    </TableCell>
                    <TableCell>
                      {meses[item.mes - 1]} {item.anio}
                    </TableCell>
                    <TableCell>{item.nombreAlumno}</TableCell>
                    <TableCell>{item.nombreTaller}</TableCell>
                    <TableCell>
                      {item.esExcepcion ? (
                        <div className="flex gap-2 items-center">
                          <span className="text-sm text-orange-600 font-medium">
                            Excepción
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.montoExcepcion || 0}
                            onChange={(e) =>
                              cambiarMontoExcepcion(index, parseFloat(e.target.value))
                            }
                            className="w-32"
                          />
                        </div>
                      ) : (
                        <Select
                          value={item.tipoPago}
                          onValueChange={(value) => cambiarTipoPago(index, value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Efectivo">Efectivo</SelectItem>
                            <SelectItem value="Transferencia">Transferencia</SelectItem>
                            <SelectItem value="Excepcion">Excepción</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(
                        item.esExcepcion
                          ? item.montoExcepcion || 0
                          : item.montoCalculado
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50">
                  <TableCell colSpan={5} className="text-right font-bold">
                    TOTAL A PAGAR:
                  </TableCell>
                  <TableCell className="text-right font-bold text-lg text-indigo-600">
                    {formatCurrency(calcularTotal())}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div className="mt-6">
              <Label htmlFor="observacion">Observaciones (opcional)</Label>
              <Textarea
                id="observacion"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                rows={3}
                className="mt-2"
                placeholder="Notas adicionales..."
              />
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={registrarPago}
                disabled={saving || items.filter((i) => i.seleccionado).length === 0}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Registrando...' : 'Registrar Pago'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
