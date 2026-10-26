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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Search, DollarSign, Save, Download, MessageCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AlumnoBusqueda {
  cdAlumno: number;
  dsNombre: string;
  dsApellido: string;
  dsDNI: string;
  cdGrupoFamiliar: number | null;
}

interface MiembroInscripcion {
  cdAlumno: number;
  dsNombre: string;
  dsApellido: string;
  dsDNI: string;
  dsMailNotificacion: string | null;
  dsWhatsappNotificacion: string | null;
  inscripto: boolean;
  tipoPrecio: 'ALUMNO_ACTIVO' | 'FAMILIAR_ACTIVO' | 'ALUMNO_NUEVO' | 'FAMILIAR_NUEVO';
  monto: number;
  yaPagado: boolean;
  pago: {
    cdComprobante: number | null;
    fePago: string;
    nuMonto: number;
    dsTipoPago: string;
  } | null;
}

interface CalculoInscripcion {
  anio: number;
  grupoActivo: boolean;
  precio: { feInicioVigencia: string } | null;
  miembros: MiembroInscripcion[];
}

interface ConfigInscripcion {
  anioActual: number;
  aniosHabilitados: number[];
}

interface ItemPago {
  seleccionado: boolean;
  tipoPago: 'Efectivo' | 'Transferencia' | 'Excepcion';
  montoExcepcion: string;
}

const ETIQUETA_TIPO_PRECIO: Record<MiembroInscripcion['tipoPrecio'], string> = {
  ALUMNO_ACTIVO: 'Alumno Activo',
  FAMILIAR_ACTIVO: 'Familiar de Alumno Activo',
  ALUMNO_NUEVO: 'Alumno Nuevo',
  FAMILIAR_NUEVO: 'Familiar de Alumno Nuevo',
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);

const formatDate = (fecha: string) => {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
};

export default function PagoInscripcionesPage() {
  const { success, error, warning } = useToast();

  const [config, setConfig] = useState<ConfigInscripcion | null>(null);
  const [anio, setAnio] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [alumnos, setAlumnos] = useState<AlumnoBusqueda[]>([]);
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<AlumnoBusqueda | null>(null);
  const [calculo, setCalculo] = useState<CalculoInscripcion | null>(null);
  const [items, setItems] = useState<Record<number, ItemPago>>({});
  const [observacion, setObservacion] = useState('');
  const [metodoNotificacion, setMetodoNotificacion] = useState('Whatsapp');
  const [emailNotificacion, setEmailNotificacion] = useState('');
  const [whatsappNotificacion, setWhatsappNotificacion] = useState('');
  const [sinEmail, setSinEmail] = useState(false);
  const [sinWhatsapp, setSinWhatsapp] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [datosNotificacion, setDatosNotificacion] = useState<{
    whatsappLink?: string;
    pdfUrl?: string;
    pdfFilename?: string;
  }>({});

  useEffect(() => {
    const cargarConfig = async () => {
      try {
        const response = await fetch('/api/inscripciones/config');
        if (response.ok) {
          const data: ConfigInscripcion = await response.json();
          setConfig(data);
          setAnio(data.anioActual);
        }
      } catch (err) {
        console.error('Error al cargar configuración:', err);
      }
    };
    cargarConfig();
  }, []);

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
    } catch (err) {
      console.error('Error al buscar alumnos:', err);
    } finally {
      setLoading(false);
    }
  };

  const cargarCalculo = async (alumno: AlumnoBusqueda, anioPago: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        cdAlumno: String(alumno.cdAlumno),
        anio: String(anioPago),
      });
      if (alumno.cdGrupoFamiliar) params.set('cdGrupoFamiliar', String(alumno.cdGrupoFamiliar));

      const response = await fetch(`/api/pago-inscripciones/calculo?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        error(errorData.error || 'Error al calcular la inscripción');
        return;
      }

      const data: CalculoInscripcion = await response.json();
      setCalculo(data);

      const buscado = data.miembros.find((m) => m.cdAlumno === alumno.cdAlumno);
      if (buscado?.yaPagado) {
        error(
          `${buscado.dsApellido}, ${buscado.dsNombre} ya tiene pagada la inscripción ${anioPago}`
        );
      }
      if (!data.precio) {
        warning('No hay precios de inscripción vigentes. Solo se podrán registrar excepciones.');
      }

      setItems(
        Object.fromEntries(
          data.miembros.map((m) => [
            m.cdAlumno,
            {
              seleccionado: m.cdAlumno === alumno.cdAlumno && !m.yaPagado,
              tipoPago: 'Efectivo' as const,
              montoExcepcion: '',
            },
          ])
        )
      );

      const contacto = buscado || data.miembros[0];
      const email = contacto?.dsMailNotificacion?.trim() || '';
      const whatsapp = contacto?.dsWhatsappNotificacion?.trim() || '';
      setEmailNotificacion(email);
      setWhatsappNotificacion(whatsapp);
      setSinEmail(!email);
      setSinWhatsapp(!whatsapp);
    } catch (err) {
      console.error('Error al calcular inscripción:', err);
      error('Error al calcular la inscripción');
    } finally {
      setLoading(false);
    }
  };

  const seleccionarAlumno = async (alumno: AlumnoBusqueda) => {
    if (!anio) return;
    setAlumnoSeleccionado(alumno);
    setAlumnos([]);
    await cargarCalculo(alumno, anio);
  };

  const cambiarAnio = async (valor: string) => {
    const nuevoAnio = parseInt(valor);
    setAnio(nuevoAnio);
    if (alumnoSeleccionado) {
      await cargarCalculo(alumnoSeleccionado, nuevoAnio);
    }
  };

  const limpiarFormulario = () => {
    setAlumnoSeleccionado(null);
    setCalculo(null);
    setItems({});
    setObservacion('');
    setMetodoNotificacion('Whatsapp');
    setEmailNotificacion('');
    setWhatsappNotificacion('');
    setSearchTerm('');
    setAlumnos([]);
  };

  const actualizarItem = (cdAlumno: number, cambios: Partial<ItemPago>) => {
    setItems((prev) => ({ ...prev, [cdAlumno]: { ...prev[cdAlumno], ...cambios } }));
  };

  const montoDe = (m: MiembroInscripcion) => {
    const item = items[m.cdAlumno];
    if (item?.tipoPago === 'Excepcion') {
      const monto = parseFloat(item.montoExcepcion);
      return isNaN(monto) ? 0 : monto;
    }
    return m.monto;
  };

  const calcularTotal = () =>
    (calculo?.miembros || [])
      .filter((m) => items[m.cdAlumno]?.seleccionado && !m.yaPagado)
      .reduce((sum, m) => sum + montoDe(m), 0);

  const registrarPago = async () => {
    if (!alumnoSeleccionado || !calculo || !anio) return;

    const seleccionados = calculo.miembros.filter(
      (m) => items[m.cdAlumno]?.seleccionado && !m.yaPagado
    );
    if (seleccionados.length === 0) {
      warning('Debe seleccionar al menos un alumno para pagar');
      return;
    }

    for (const m of seleccionados) {
      const item = items[m.cdAlumno];
      if (item.tipoPago === 'Excepcion' && (item.montoExcepcion === '' || parseFloat(item.montoExcepcion) < 0)) {
        error(`Ingrese el monto de la excepción de ${m.dsApellido}, ${m.dsNombre}`);
        return;
      }
      if (item.tipoPago !== 'Excepcion' && !calculo.precio) {
        error('No hay precios de inscripción vigentes. Use el modo Excepción o cargue los precios.');
        return;
      }
    }

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
      const response = await fetch('/api/pago-inscripciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cdAlumno: alumnoSeleccionado.cdAlumno,
          cdGrupoFamiliar: alumnoSeleccionado.cdGrupoFamiliar,
          anio,
          observacion,
          metodoNotificacion,
          emailNotificacion: emailNotificacion.trim() || undefined,
          whatsappNotificacion: whatsappNotificacion.trim() || undefined,
          items: seleccionados.map((m) => ({
            cdAlumno: m.cdAlumno,
            tipoPago: items[m.cdAlumno].tipoPago,
            montoExcepcion:
              items[m.cdAlumno].tipoPago === 'Excepcion'
                ? parseFloat(items[m.cdAlumno].montoExcepcion)
                : undefined,
          })),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        success(`Inscripción ${anio} registrada. Total: ${formatCurrency(data.montoTotal)}`);
        if (data.whatsappLink || data.pdfUrl) {
          setDatosNotificacion({
            whatsappLink: data.whatsappLink,
            pdfUrl: data.pdfUrl,
            pdfFilename: data.pdfFilename,
          });
          setDialogAbierto(true);
        } else {
          limpiarFormulario();
        }
      } else {
        error(data.error || 'Error al registrar el pago de inscripción');
        // Refresca el estado por si otro usuario ya registró alguno de los pagos
        if (response.status === 409) await cargarCalculo(alumnoSeleccionado, anio);
      }
    } catch (err) {
      console.error('Error al registrar pago de inscripción:', err);
      error('Error al registrar el pago de inscripción');
    } finally {
      setSaving(false);
    }
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
      link.download = datosNotificacion.pdfFilename || 'Comprobante_Inscripcion.pdf';
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

  const seleccionados = (calculo?.miembros || []).filter(
    (m) => items[m.cdAlumno]?.seleccionado && !m.yaPagado
  );

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Pago de Inscripciones</h1>
        <p className="text-gray-600 mt-1">Búsqueda de alumno y registro del pago de inscripción anual</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Alumno
          </CardTitle>
          <CardDescription>
            Busque al alumno para ver su grupo familiar y el precio de inscripción de cada uno
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
                disabled={!!alumnoSeleccionado}
              />
            </div>
            <Button onClick={searchAlumnos} disabled={loading || !!alumnoSeleccionado}>
              {loading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>

          {alumnos.length > 0 && !alumnoSeleccionado && (
            <div className="mt-4">
              <Label>Resultados:</Label>
              <div className="mt-2 space-y-2">
                {alumnos.map((alumno) => (
                  <div
                    key={`${alumno.cdAlumno}-${alumno.cdGrupoFamiliar ?? 'sin-grupo'}`}
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

      {alumnoSeleccionado && calculo && anio && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Inscripción {anio}
                </CardTitle>
                <CardDescription>
                  Grupo familiar de: {alumnoSeleccionado.dsApellido}, {alumnoSeleccionado.dsNombre}
                  {' · '}
                  {calculo.grupoActivo
                    ? 'Hay alumnos inscriptos en talleres (precios de Alumno Activo)'
                    : 'Ningún alumno inscripto en talleres (precios de Alumno Nuevo)'}
                  {calculo.precio && ` · Precios vigentes desde ${formatDate(calculo.precio.feInicioVigencia)}`}
                </CardDescription>
              </div>
              <Button variant="outline" onClick={limpiarFormulario}>
                Cancelar y buscar otro
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Año de inscripción a pagar</Label>
                  {config && config.aniosHabilitados.length > 1 ? (
                    <Select value={String(anio)} onValueChange={cambiarAnio}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {config.aniosHabilitados.map((a) => (
                          <SelectItem key={a} value={String(a)}>
                            {a} {a === config.anioActual ? '(año actual)' : a > config.anioActual ? '(año próximo)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="mt-3 font-medium">{anio} (año actual)</p>
                  )}
                </div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Sel.</TableHead>
                  <TableHead>Alumno</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Situación</TableHead>
                  <TableHead>Modo de Pago</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculo.miembros.map((m) => {
                  const item = items[m.cdAlumno];
                  return (
                    <TableRow key={m.cdAlumno} className={m.yaPagado ? 'bg-green-50' : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={!!item?.seleccionado && !m.yaPagado}
                          disabled={m.yaPagado}
                          onChange={() => actualizarItem(m.cdAlumno, { seleccionado: !item?.seleccionado })}
                        />
                      </TableCell>
                      <TableCell>
                        {m.dsApellido}, {m.dsNombre}
                        {m.inscripto && (
                          <Badge variant="outline" className="ml-2">
                            En taller
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{m.dsDNI}</TableCell>
                      <TableCell>
                        {m.yaPagado && m.pago ? (
                          <Badge className="bg-green-100 text-green-800 border-green-300" variant="outline">
                            Pagada el {formatDate(m.pago.fePago)} ({formatCurrency(m.pago.nuMonto)})
                          </Badge>
                        ) : (
                          ETIQUETA_TIPO_PRECIO[m.tipoPrecio]
                        )}
                      </TableCell>
                      <TableCell>
                        {m.yaPagado ? (
                          <span className="text-sm text-gray-500">{m.pago?.dsTipoPago}</span>
                        ) : (
                          <div className="flex gap-2 items-center">
                            <Select
                              value={item?.tipoPago}
                              onValueChange={(value) =>
                                actualizarItem(m.cdAlumno, {
                                  tipoPago: value as ItemPago['tipoPago'],
                                  montoExcepcion:
                                    value === 'Excepcion' && !item?.montoExcepcion
                                      ? String(m.monto)
                                      : item?.montoExcepcion,
                                })
                              }
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
                            {item?.tipoPago === 'Excepcion' && (
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.montoExcepcion}
                                onChange={(e) => actualizarItem(m.cdAlumno, { montoExcepcion: e.target.value })}
                                className="w-32"
                              />
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {m.yaPagado ? '-' : formatCurrency(montoDe(m))}
                      </TableCell>
                    </TableRow>
                  );
                })}
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
                  {sinEmail && (
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
                  {sinWhatsapp && (
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
                disabled={saving || seleccionados.length === 0}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Registrando...' : 'Registrar Pago de Inscripción'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={dialogAbierto}
        onOpenChange={(open) => {
          if (!open) cerrarDialogYLimpiar();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-green-700">✅ Inscripción Registrada</DialogTitle>
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
                <Button onClick={abrirWhatsApp} className="w-full bg-green-600 hover:bg-green-700">
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
                <p className="text-sm text-gray-600 mb-3">Descargue el PDF del comprobante de pago</p>
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
            <Button onClick={cerrarDialogYLimpiar} className="bg-indigo-600 hover:bg-indigo-700">
              Finalizar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
