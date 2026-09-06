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
import { Search, DollarSign, Save, Download, MessageCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface Alumno {
  cdAlumno: number;
  dsNombre: string;
  dsApellido: string;
  dsDNI: string;
  cdGrupoFamiliar: number;
  dsMailNotificacion?: string;
  dsWhatsappNotificacion?: string;
}

interface ItemPago {
  cdAlumno: number;
  nombreAlumno: string;
  cdTaller: number;
  nombreTaller: string;
  cdTipoTaller: number;
  nombreProfesor?: string;
  diasClase?: string;
  horarioClase?: string;
  mes: number;
  anio: number;
  precio: any;
  montoCalculado: number;
  tipoPago: 'Efectivo' | 'Transferencia' | 'Excepcion';
  seleccionado: boolean;
  esExcepcion: boolean;
  montoExcepcion?: number;
  atrasado: boolean;
}

interface ResumenPeriodo {
  cantidadPagosCompletos: number;
  cantidadPagosDescuento: number;
}

export default function RegistroPagosPage() {
  const { success, error, warning } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<Alumno | null>(null);
  const [items, setItems] = useState<ItemPago[]>([]);
  const [tipoPagoGlobal, setTipoPagoGlobal] = useState<string>('');
  const [observacion, setObservacion] = useState('');
  const [metodoNotificacion, setMetodoNotificacion] = useState<string>('Whatsapp');
  const [contactosNotificacion, setContactosNotificacion] = useState<{emails: string[], whatsapps: string[]}>({emails: [], whatsapps: []});
  const [emailNotificacion, setEmailNotificacion] = useState('');
  const [whatsappNotificacion, setWhatsappNotificacion] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [datosNotificacion, setDatosNotificacion] = useState<{whatsappLink?: string, pdfUrl?: string, pdfFilename?: string}>({});

  // Cantidad total de talleres del alumno/grupo (para la regla de "único taller = precio completo")
  const [cantidadTalleresTotal, setCantidadTalleresTotal] = useState(0);
  // Conteo de pagos completos/descuento ya registrados, por período ("anio-mes"), para el descuento familiar
  const [resumenPorPeriodo, setResumenPorPeriodo] = useState<Record<string, ResumenPeriodo>>({});

  // Recalcular montos cuando cambian los items o el resumen de pagos previos
  useEffect(() => {
    if (items.length > 0 && items.every(item => item.precio)) {
      calcularMontos();
    }
  }, [items.length, cantidadTalleresTotal, resumenPorPeriodo]);

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
      // Buscar TODAS las cuotas pendientes (pasadas y del mes actual) del alumno o su grupo familiar
      const baseEndpoint = alumno.cdGrupoFamiliar
        ? `/api/grupos-familiares/${alumno.cdGrupoFamiliar}/cuotas-pendientes`
        : `/api/alumnos/${alumno.cdAlumno}/cuotas-pendientes`;

      const response = await fetch(baseEndpoint);
      
      if (response.ok) {
        const data = await response.json();
        
        // Verificar si no hay talleres (para alumnos individuales) o no hay items (para grupos)
        const sinCuotas = (data.talleres && data.talleres.length === 0) || 
                          (data.items && data.items.length === 0) ||
                          (!data.items && !data.talleres);
        
        if (sinCuotas) {
          error(data.mensaje || `${alumno.dsApellido}, ${alumno.dsNombre} no tiene cuotas pendientes`);
          setItems([]);
          setCantidadTalleresTotal(0);
          setResumenPorPeriodo({});
          setAlumnoSeleccionado(null);
          setAlumnos([]);
        } else {
          setItems(data.items || []);
          setCantidadTalleresTotal(data.cantidadTalleres || 0);
          setResumenPorPeriodo(data.resumenPorPeriodo || {});
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
    setMetodoNotificacion('Whatsapp');
    setContactosNotificacion({emails: [], whatsapps: []});
    setEmailNotificacion('');
    setWhatsappNotificacion('');
    setTipoPagoGlobal('');
    setAlumnos([]);
    setCantidadTalleresTotal(0);
    setResumenPorPeriodo({});
  };


  // Cargar contactos de notificación cuando cambian los items
  const cargarContactosNotificacion = async () => {
    if (items.length === 0) return;

    const alumnosEnPago = [...new Set(items.map(item => item.cdAlumno))];
    const emails = new Set<string>();
    const whatsapps = new Set<string>();

    try {
      for (const cdAlumno of alumnosEnPago) {
        const response = await fetch(`/api/alumnos/${cdAlumno}`);
        if (response.ok) {
          const data = await response.json();
          const alumno = data.alumno; // El endpoint retorna { alumno: {...}, talleresIds: [...] }
          
          console.log(`Cargando contactos del alumno ${cdAlumno}:`, {
            mail: alumno.dsMailNotificacion,
            whatsapp: alumno.dsWhatsappNotificacion
          });
          
          if (alumno.dsMailNotificacion?.trim()) {
            emails.add(alumno.dsMailNotificacion.trim());
          }
          if (alumno.dsWhatsappNotificacion?.trim()) {
            whatsapps.add(alumno.dsWhatsappNotificacion.trim());
          }
        }
      }
      
      console.log('Contactos cargados:', {
        emails: Array.from(emails),
        whatsapps: Array.from(whatsapps)
      });
      
      setContactosNotificacion({
        emails: Array.from(emails),
        whatsapps: Array.from(whatsapps)
      });
      
      // Setear los valores editables con el primer email/whatsapp encontrado
      if (emails.size > 0) {
        setEmailNotificacion(Array.from(emails)[0]);
      } else {
        setEmailNotificacion('');
      }
      
      if (whatsapps.size > 0) {
        setWhatsappNotificacion(Array.from(whatsapps)[0]);
      } else {
        setWhatsappNotificacion('');
      }
    } catch (error) {
      console.error('Error al cargar contactos:', error);
    }
  };

  useEffect(() => {
    if (items.length > 0) {
      cargarContactosNotificacion();
    }
  }, [items.length]);

  const calcularMontos = () => {
    // Lógica de cálculo según reglas:
    // 1. Si solo 1 taller EN TOTAL (incluyendo pagados): precio completo siempre
    // 2. Si +1 taller EN TOTAL: los ítems se agrupan por período (mes-año) y el
    //    descuento familiar se calcula de forma INDEPENDIENTE dentro de cada período,
    //    porque el beneficio de "grupo familiar" aplica mes a mes, no en conjunto.
    //    - Si ya hay un pago completo previo ese mes, los pendientes de ese mes van con descuento
    //    - Si no hay pago completo ese mes, el más caro pendiente de ese mes va completo, el resto descuento

    setItems((currentItems) => {
      if (currentItems.length === 0) return currentItems;

      const totalTalleres = cantidadTalleresTotal || currentItems.length;

      if (totalTalleres === 1) {
        return currentItems.map((item) => {
          if (!item.esExcepcion && item.precio) {
            item.montoCalculado =
              item.tipoPago === 'Transferencia'
                ? parseFloat(item.precio.nuPrecioCompletoTransferencia)
                : parseFloat(item.precio.nuPrecioCompletoEfectivo);
          }
          return item;
        });
      }

      // Agrupar los ítems pendientes por período (mismo mes y año)
      const grupos = new Map<string, ItemPago[]>();
      currentItems.forEach((item) => {
        const key = `${item.anio}-${item.mes}`;
        if (!grupos.has(key)) grupos.set(key, []);
        grupos.get(key)!.push(item);
      });

      const itemsActualizados: ItemPago[] = [];

      grupos.forEach((itemsDelPeriodo, key) => {
        const resumen = resumenPorPeriodo[key];
        const yaHayPagoCompleto = (resumen?.cantidadPagosCompletos || 0) > 0;

        // Dentro del período: el más caro (precio completo de referencia) paga completo,
        // el resto paga con descuento; si ya hay un pago completo ese mes, todos con descuento.
        const itemsConPrecio = itemsDelPeriodo.map((item) => ({
          ...item,
          precioCompletoRef: item.precio ? parseFloat(item.precio.nuPrecioCompletoEfectivo) : 0,
        }));

        itemsConPrecio.sort((a, b) => b.precioCompletoRef - a.precioCompletoRef);

        itemsConPrecio.forEach((item, index) => {
          if (!item.esExcepcion && item.precio) {
            if (yaHayPagoCompleto || index !== 0) {
              item.montoCalculado =
                item.tipoPago === 'Transferencia'
                  ? parseFloat(item.precio.nuPrecioDescuentoTransferencia)
                  : parseFloat(item.precio.nuPrecioDescuentoEfectivo);
            } else {
              item.montoCalculado =
                item.tipoPago === 'Transferencia'
                  ? parseFloat(item.precio.nuPrecioCompletoTransferencia)
                  : parseFloat(item.precio.nuPrecioCompletoEfectivo);
            }
          }
          itemsActualizados.push(item);
        });
      });

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

    // Validar que existan valores en los campos editables según el método seleccionado
    if ((metodoNotificacion === 'Mail' || metodoNotificacion === 'Ambos') && !emailNotificacion.trim()) {
      error('Por favor, ingrese un email de notificación');
      return;
    }

    if ((metodoNotificacion === 'Whatsapp' || metodoNotificacion === 'Ambos') && !whatsappNotificacion.trim()) {
      error('Por favor, ingrese un número de WhatsApp para notificación');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        cdGrupoFamiliar: alumnoSeleccionado?.cdGrupoFamiliar,
        observacion,
        metodoNotificacion, // Agregar método de notificación
        emailNotificacion: emailNotificacion.trim() || undefined,
        whatsappNotificacion: whatsappNotificacion.trim() || undefined,
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
        
        // Si hay WhatsApp o PDF, mostrar diálogo
        if (data.whatsappLink || data.pdfUrl) {
          setDatosNotificacion({
            whatsappLink: data.whatsappLink,
            pdfUrl: data.pdfUrl,
            pdfFilename: data.pdfFilename
          });
          setDialogAbierto(true);
        } else {
          // Si no hay notificación, limpiar directamente
          limpiarFormulario();
        }
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

  const limpiarFormulario = () => {
    setAlumnoSeleccionado(null);
    setItems([]);
    setObservacion('');
    setMetodoNotificacion('Whatsapp');
    setSearchTerm('');
  };

  const abrirWhatsApp = () => {
    if (datosNotificacion.whatsappLink) {
      window.open(datosNotificacion.whatsappLink, '_blank');
    }
  };

  const descargarPDF = () => {
    if (datosNotificacion.pdfUrl) {
      const link = document.createElement('a');
      link.href = datosNotificacion.pdfUrl;
      link.download = datosNotificacion.pdfFilename || 'Recibo.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const cerrarDialogYLimpiar = () => {
    setDialogAbierto(false);
    setDatosNotificacion({});
    limpiarFormulario();
  };

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
          <CardDescription>
            Busque al alumno (o su grupo familiar) para ver todas las cuotas pendientes
          </CardDescription>
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
                  <TableHead>Período</TableHead>
                  <TableHead>Alumno</TableHead>
                  <TableHead>Taller</TableHead>
                  <TableHead>Profesor</TableHead>
                  <TableHead className="min-w-[200px]">Días y Horario</TableHead>
                  <TableHead>Modo de Pago</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow
                    key={`${item.cdAlumno}-${item.cdTaller}-${item.anio}-${item.mes}`}
                    className={item.atrasado ? 'bg-orange-50 hover:bg-orange-100' : undefined}
                  >
                    <TableCell>
                      <Checkbox
                        checked={item.seleccionado}
                        onChange={() => toggleSeleccion(index)}
                      />
                    </TableCell>
                    <TableCell>
                      {item.atrasado ? (
                        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                          {meses[item.mes - 1]} {item.anio}
                        </Badge>
                      ) : (
                        <span>{meses[item.mes - 1]} {item.anio}</span>
                      )}
                    </TableCell>
                    <TableCell>{item.nombreAlumno}</TableCell>
                    <TableCell>{item.nombreTaller}</TableCell>
                    <TableCell className="text-sm">{item.nombreProfesor || '-'}</TableCell>
                    <TableCell className="text-sm min-w-[200px] whitespace-normal">
                      {item.diasClase || '-'}
                      {item.horarioClase && ` (${item.horarioClase})`}
                    </TableCell>
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

            <div className="mt-6">
              <Label htmlFor="metodoNotificacion">Notificar a</Label>
              <Select value={metodoNotificacion} onValueChange={setMetodoNotificacion}>
                <SelectTrigger id="metodoNotificacion" className="mt-2">
                  <SelectValue placeholder="Seleccione método de notificación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mail">Mail</SelectItem>
                  <SelectItem value="Whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="Ambos">Ambos</SelectItem>
                </SelectContent>
              </Select>

              {/* Campos editables de notificación */}
              {(metodoNotificacion === 'Mail' || metodoNotificacion === 'Ambos') && (
                <div className="mt-4">
                  <Label htmlFor="emailNotificacion" className="text-sm font-medium">
                    📧 Email de notificación
                  </Label>
                  <Input
                    id="emailNotificacion"
                    type="email"
                    value={emailNotificacion}
                    onChange={(e) => setEmailNotificacion(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="mt-2"
                  />
                  {contactosNotificacion.emails.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      ℹ️ El alumno no tiene email registrado. Puede ingresar uno manualmente.
                    </p>
                  )}
                </div>
              )}

              {(metodoNotificacion === 'Whatsapp' || metodoNotificacion === 'Ambos') && (
                <div className="mt-4">
                  <Label htmlFor="whatsappNotificacion" className="text-sm font-medium">
                    📱 WhatsApp de notificación
                  </Label>
                  <Input
                    id="whatsappNotificacion"
                    type="text"
                    value={whatsappNotificacion}
                    onChange={(e) => setWhatsappNotificacion(e.target.value)}
                    placeholder="+54 9 11 1234-5678"
                    className="mt-2"
                  />
                  {contactosNotificacion.whatsapps.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      ℹ️ El alumno no tiene WhatsApp registrado. Puede ingresar uno manualmente.
                    </p>
                  )}
                </div>
              )}
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

      {/* Diálogo de notificación */}
      <Dialog open={dialogAbierto} onOpenChange={(open) => {
        if (!open) cerrarDialogYLimpiar();
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-green-700">✅ Pago Registrado</DialogTitle>
            <DialogDescription>
              El pago se registró correctamente. Complete las siguientes acciones:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {datosNotificacion.whatsappLink && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                  <p className="font-medium text-green-900">Enviar por WhatsApp</p>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Haga clic para abrir WhatsApp Web y enviar el comprobante
                </p>
                <Button
                  onClick={abrirWhatsApp}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Abrir WhatsApp Web
                </Button>
              </div>
            )}

            {datosNotificacion.pdfUrl && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="h-5 w-5 text-blue-600" />
                  <p className="font-medium text-blue-900">Descargar Comprobante</p>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Descargue el PDF del recibo de pago
                </p>
                <Button
                  onClick={descargarPDF}
                  variant="outline"
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={cerrarDialogYLimpiar}
              variant="default"
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Finalizar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
