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
  
  // Inicializar con el mes y año actual
  const fechaActual = new Date();
  const [mesSeleccionado, setMesSeleccionado] = useState(fechaActual.getMonth() + 1);
  const [anioSeleccionado, setAnioSeleccionado] = useState(fechaActual.getFullYear());
  
  const [searchTerm, setSearchTerm] = useState('');
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<Alumno | null>(null);
  const [items, setItems] = useState<ItemPago[]>([]);
  const [tipoPagoGlobal, setTipoPagoGlobal] = useState<string>('');
  const [observacion, setObservacion] = useState('');
  const [metodoNotificacion, setMetodoNotificacion] = useState<string>('Mail');
  const [contactosNotificacion, setContactosNotificacion] = useState<{emails: string[], whatsapps: string[]}>({emails: [], whatsapps: []});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [datosNotificacion, setDatosNotificacion] = useState<{whatsappLink?: string, pdfUrl?: string, pdfFilename?: string}>({});
  
  // Nuevos estados para manejar pagos previos del grupo familiar
  const [cantidadTalleresTotal, setCantidadTalleresTotal] = useState(0);
  const [pagosPrevios, setPagosPrevios] = useState<any[]>([]);
  const [cantidadPagosCompletos, setCantidadPagosCompletos] = useState(0);

  // Recalcular montos cuando cambian los items o los datos de pagos previos
  useEffect(() => {
    if (items.length > 0 && items.every(item => item.precio)) {
      calcularMontos();
    }
  }, [items.length, cantidadPagosCompletos, cantidadTalleresTotal]);

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
      const baseEndpoint = alumno.cdGrupoFamiliar
        ? `/api/grupos-familiares/${alumno.cdGrupoFamiliar}/cuotas-pendientes`
        : `/api/alumnos/${alumno.cdAlumno}/cuotas-pendientes`;
      
      // Agregar parámetros de mes y año
      const endpoint = `${baseEndpoint}?mes=${mesSeleccionado}&anio=${anioSeleccionado}`;
      
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
          setCantidadTalleresTotal(0);
          setPagosPrevios([]);
          setCantidadPagosCompletos(0);
          setAlumnoSeleccionado(null);
          setAlumnos([]);
        } else {
          setItems(data.items || []);
          // Guardar información adicional sobre pagos previos del grupo familiar
          setCantidadTalleresTotal(data.cantidadTalleres || 0);
          setPagosPrevios(data.pagosPrevios || []);
          setCantidadPagosCompletos(data.cantidadPagosCompletos || 0);
          console.log('Datos de pagos recibidos:', {
            cantidadTalleres: data.cantidadTalleres,
            itemsPendientes: data.items?.length || 0,
            pagosPrevios: data.pagosPrevios?.length || 0,
            pagosCompletos: data.cantidadPagosCompletos,
            pagosDescuento: data.cantidadPagosDescuento
          });
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
    setMetodoNotificacion('Mail');
    setContactosNotificacion({emails: [], whatsapps: []});
    setTipoPagoGlobal('');
    setAlumnos([]);
    setCantidadTalleresTotal(0);
    setPagosPrevios([]);
    setCantidadPagosCompletos(0);
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
    // 1. Si solo 1 taller EN TOTAL (incluyendo pagados): precio completo
    // 2. Si +1 taller EN TOTAL: considerar pagos previos para determinar precios
    //    - Si ya hay un pago completo previo, los siguientes con descuento
    //    - Si solo hay pagos con descuento, el siguiente debe ser completo
    
    setItems((currentItems) => {
      if (currentItems.length === 0) return currentItems;

      const itemsActualizados = [...currentItems];
      
      // Calcular total de talleres considerando los pendientes + los ya pagados
      const totalTalleres = cantidadTalleresTotal || currentItems.length;
      const yaHayPagoCompleto = cantidadPagosCompletos > 0;
      
      console.log('Calculando montos:', {
        totalTalleres,
        itemsPendientes: currentItems.length,
        yaHayPagoCompleto,
        cantidadPagosCompletos
      });

      if (totalTalleres === 1) {
        // Un solo taller en total: siempre precio completo
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

        // Si ya hay un pago completo previo, todos los pendientes van con descuento
        // Si NO hay pago completo previo, el más caro va completo y el resto con descuento
        itemsConPrecio.forEach((item, index) => {
          if (!item.esExcepcion && item.precio) {
            if (yaHayPagoCompleto) {
              // Ya se pagó uno completo, todos los pendientes con descuento
              item.montoCalculado =
                item.tipoPago === 'Transferencia'
                  ? parseFloat(item.precio.nuPrecioDescuentoTransferencia)
                  : parseFloat(item.precio.nuPrecioDescuentoEfectivo);
            } else {
              // No hay pago completo aún: el más caro completo, resto descuento
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

    // Validar que existan contactos según el método seleccionado
    if ((metodoNotificacion === 'Mail' || metodoNotificacion === 'Ambos') && contactosNotificacion.emails.length === 0) {
      error('No se encontró un email de notificación configurado para el alumno. Por favor, configure el campo "Mail Notificación" en los datos del alumno.');
      return;
    }

    if ((metodoNotificacion === 'Whatsapp' || metodoNotificacion === 'Ambos') && contactosNotificacion.whatsapps.length === 0) {
      error('No se encontró un número de WhatsApp configurado para el alumno. Por favor, configure el campo "WhatsApp Notificación" en los datos del alumno.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        cdGrupoFamiliar: alumnoSeleccionado?.cdGrupoFamiliar,
        observacion,
        metodoNotificacion, // Agregar método de notificación
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
    setMetodoNotificacion('Mail');
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
            Seleccione el mes a pagar y busque el alumno
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Selector de Mes/Año */}
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <Label className="text-sm font-medium text-blue-900 mb-2 block">
              Mes y Año del Pago
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-gray-600">Mes</Label>
                <Select 
                  value={mesSeleccionado.toString()} 
                  onValueChange={(value) => setMesSeleccionado(parseInt(value))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((mes, index) => (
                      <SelectItem key={index + 1} value={(index + 1).toString()}>
                        {mes}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Año</Label>
                <Select 
                  value={anioSeleccionado.toString()} 
                  onValueChange={(value) => setAnioSeleccionado(parseInt(value))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[anioSeleccionado - 1, anioSeleccionado, anioSeleccionado + 1].map((anio) => (
                      <SelectItem key={anio} value={anio.toString()}>
                        {anio}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
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

              {/* Mostrar contactos de notificación */}
              {(metodoNotificacion === 'Mail' || metodoNotificacion === 'Ambos') && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm font-medium text-blue-900">📧 Email de notificación:</p>
                  {contactosNotificacion.emails.length > 0 ? (
                    <p className="text-sm text-blue-700 mt-1">
                      {contactosNotificacion.emails.join(', ')}
                    </p>
                  ) : (
                    <p className="text-sm text-red-600 mt-1">
                      ⚠️ No hay email configurado. Configure el campo "Mail Notificación" en los datos del alumno.
                    </p>
                  )}
                </div>
              )}

              {(metodoNotificacion === 'Whatsapp' || metodoNotificacion === 'Ambos') && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm font-medium text-green-900">📱 WhatsApp de notificación:</p>
                  {contactosNotificacion.whatsapps.length > 0 ? (
                    <p className="text-sm text-green-700 mt-1">
                      {contactosNotificacion.whatsapps.join(', ')}
                    </p>
                  ) : (
                    <p className="text-sm text-red-600 mt-1">
                      ⚠️ No hay WhatsApp configurado. Configure el campo "WhatsApp Notificación" en los datos del alumno.
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
