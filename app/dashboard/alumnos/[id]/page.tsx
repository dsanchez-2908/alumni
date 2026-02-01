'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  User,
  Users,
  BookOpen,
  DollarSign,
  AlertCircle,
  Calendar,
  CheckCircle2,
  XCircle,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  FileText,
  Plus,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface AlumnoDetalle {
  alumno: any;
  grupoFamiliar: any;
  miembrosGrupo: any[];
  talleresActivos: any[];
  talleresFinalizados: any[];
  pagosRealizados: any[];
  pagosPendientes: any[];
  faltas: any[];
  resumen: {
    totalTalleresActivos: number;
    totalTalleresFinalizados: number;
    totalPagosRealizados: number;
    montoPagadoTotal: number;
    totalPagosPendientes: number;
    montoPendienteTotal: number;
    totalFaltas: number;
    totalAsistencias: number;
  };
}

const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function AlumnoDetallePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [data, setData] = useState<AlumnoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [novedades, setNovedades] = useState<any[]>([]);
  const [loadingNovedades, setLoadingNovedades] = useState(false);
  const [isNovedadDialogOpen, setIsNovedadDialogOpen] = useState(false);
  const [nuevaNovedad, setNuevaNovedad] = useState('');
  const [savingNovedad, setSavingNovedad] = useState(false);

  useEffect(() => {
    fetchDetalle();
    fetchNovedades();
  }, [params.id]);

  const fetchDetalle = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/alumnos/${params.id}/detalle`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error al cargar detalle:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNovedades = async () => {
    try {
      setLoadingNovedades(true);
      const response = await fetch(`/api/alumnos/${params.id}/novedades`);
      if (response.ok) {
        const result = await response.json();
        setNovedades(result.novedades || []);
      }
    } catch (err) {
      console.error('Error al cargar novedades:', err);
    } finally {
      setLoadingNovedades(false);
    }
  };

  const handleGuardarNovedad = async () => {
    if (!nuevaNovedad.trim()) {
      error('La novedad no puede estar vacía');
      return;
    }

    try {
      setSavingNovedad(true);
      const response = await fetch(`/api/alumnos/${params.id}/novedades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dsNovedad: nuevaNovedad }),
      });

      if (response.ok) {
        success('Novedad registrada exitosamente');
        setNuevaNovedad('');
        setIsNovedadDialogOpen(false);
        fetchNovedades();
      } else {
        const data = await response.json();
        error(data.error || 'Error al registrar novedad');
      }
    } catch (err) {
      console.error('Error:', err);
      error('Error al registrar novedad');
    } finally {
      setSavingNovedad(false);
    }
  };

  const formatFechaHora = (fecha: string) => {
    if (!fecha) return '-';
    const date = new Date(fecha);
    return date.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFecha = (fecha: string) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-AR');
  };

  const formatMoneda = (monto: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(monto);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Error al cargar los datos</div>
        </div>
      </div>
    );
  }

  const { alumno, grupoFamiliar, miembrosGrupo, talleresActivos, talleresFinalizados, pagosRealizados, pagosPendientes, faltas, resumen } = data;

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/alumnos')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Alumnos
        </Button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {alumno.dsNombre} {alumno.dsApellido}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-muted-foreground">
              <span>DNI: {alumno.dsDNI}</span>
              <span>•</span>
              <span>{alumno.edad} años</span>
              <span>•</span>
              <Badge variant={alumno.cdEstado === 1 ? 'default' : 'secondary'}>
                {alumno.dsEstado}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen en Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Talleres Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumen.totalTalleresActivos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Pagado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatMoneda(resumen.montoPagadoTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {resumen.totalPagosRealizados} pagos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Deuda Pendiente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatMoneda(resumen.montoPendienteTotal)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {resumen.totalPagosPendientes} períodos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Asistencias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumen.totalAsistencias}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {resumen.totalFaltas} ausencias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de contenido */}
      <Tabs defaultValue="datos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="datos">Datos Personales</TabsTrigger>
          <TabsTrigger value="talleres">Talleres</TabsTrigger>
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
          <TabsTrigger value="pendientes">
            Pendientes {resumen.totalPagosPendientes > 0 && (
              <Badge variant="destructive" className="ml-2">{resumen.totalPagosPendientes}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="asistencias">Asistencias</TabsTrigger>
          <TabsTrigger value="novedades">Novedades</TabsTrigger>
        </TabsList>

        {/* Tab: Datos Personales */}
        <TabsContent value="datos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Columna 1 - Datos Básicos */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nombre Completo</label>
                    <p className="text-base">{alumno.dsNombre} {alumno.dsApellido}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">DNI</label>
                    <p className="text-base">{alumno.dsDNI}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Sexo</label>
                    <p className="text-base">{alumno.dsSexo}</p>
                  </div>
                  {alumno.dsNombreLlamar && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nombre a Llamar</label>
                      <p className="text-base">{alumno.dsNombreLlamar}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fecha de Nacimiento</label>
                    <p className="text-base">{formatFecha(alumno.feNacimiento)} ({alumno.edad} años)</p>
                  </div>
                  {alumno.dsDomicilio && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Domicilio
                      </label>
                      <p className="text-base">{alumno.dsDomicilio}</p>
                    </div>
                  )}
                  {alumno.dsTelefonoCelular && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Celular
                      </label>
                      <p className="text-base">{alumno.dsTelefonoCelular}</p>
                    </div>
                  )}
                  {alumno.dsMail && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </label>
                      <p className="text-base">{alumno.dsMail}</p>
                    </div>
                  )}
                </div>

                {/* Columna 2 - Observaciones y Grupo Familiar */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Discapacidad</label>
                    <p className="text-base">
                      {alumno.snDiscapacidad === 'SI' ? (
                        <Badge variant="destructive">Sí</Badge>
                      ) : (
                        <Badge variant="secondary">No</Badge>
                      )}
                    </p>
                  </div>
                  {alumno.snDiscapacidad === 'SI' && alumno.dsObservacionesDiscapacidad && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Observaciones de Discapacidad</label>
                      <p className="text-sm whitespace-pre-line bg-red-50 p-3 rounded-lg border border-red-200">{alumno.dsObservacionesDiscapacidad}</p>
                    </div>
                  )}
                  {alumno.dsObservaciones && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Observaciones Generales</label>
                      <p className="text-sm whitespace-pre-line bg-gray-50 p-3 rounded-lg border border-gray-200">{alumno.dsObservaciones}</p>
                    </div>
                  )}
                  {grupoFamiliar && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Grupo Familiar
                      </label>
                      <p className="text-base font-medium mb-2">{grupoFamiliar.dsNombreGrupo}</p>
                      {miembrosGrupo.length > 0 && (
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Miembros:</p>
                          <div className="space-y-1">
                            {miembrosGrupo.map((miembro: any) => (
                              <div key={miembro.cdAlumno} className="text-sm flex items-center justify-between">
                                <span>• {miembro.dsNombreCompleto}</span>
                                {miembro.cdAlumno === alumno.cdAlumno && (
                                  <Badge variant="outline" className="text-xs">Actual</Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Datos de Contacto 1 */}
          {(alumno.dsNombreCompletoContacto1 || alumno.dsTelefonoContacto1 || alumno.dsMailContacto1) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contacto de Emergencia 1
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {alumno.dsNombreCompletoContacto1 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nombre Completo</label>
                    <p className="text-base">{alumno.dsNombreCompletoContacto1}</p>
                  </div>
                )}
                {alumno.dsParentescoContacto1 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Parentesco</label>
                    <p className="text-base">{alumno.dsParentescoContacto1}</p>
                  </div>
                )}
                {alumno.dsDNIContacto1 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">DNI</label>
                    <p className="text-base">{alumno.dsDNIContacto1}</p>
                  </div>
                )}
                {alumno.dsTelefonoContacto1 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Teléfono</label>
                    <p className="text-base">{alumno.dsTelefonoContacto1}</p>
                  </div>
                )}
                {alumno.dsMailContacto1 && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-base">{alumno.dsMailContacto1}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Datos de Contacto 2 */}
          {(alumno.dsNombreCompletoContacto2 || alumno.dsTelefonoContacto2 || alumno.dsMailContacto2) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contacto de Emergencia 2
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {alumno.dsNombreCompletoContacto2 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nombre Completo</label>
                    <p className="text-base">{alumno.dsNombreCompletoContacto2}</p>
                  </div>
                )}
                {alumno.dsParentescoContacto2 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Parentesco</label>
                    <p className="text-base">{alumno.dsParentescoContacto2}</p>
                  </div>
                )}
                {alumno.dsDNIContacto2 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">DNI</label>
                    <p className="text-base">{alumno.dsDNIContacto2}</p>
                  </div>
                )}
                {alumno.dsTelefonoContacto2 && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Teléfono</label>
                    <p className="text-base">{alumno.dsTelefonoContacto2}</p>
                  </div>
                )}
                {alumno.dsMailContacto2 && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-base">{alumno.dsMailContacto2}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Redes Sociales */}
          {(alumno.dsInstagram || alumno.dsFacebook) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Redes Sociales
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {alumno.dsInstagram && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Instagram</label>
                    <p className="text-base">{alumno.dsInstagram}</p>
                  </div>
                )}
                {alumno.dsFacebook && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Facebook</label>
                    <p className="text-base">{alumno.dsFacebook}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notificación de Pago */}
          {(alumno.dsMailNotificacion || alumno.dsWhatsappNotificacion) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Notificación de Pago
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {alumno.dsMailNotificacion && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="text-base">{alumno.dsMailNotificacion}</p>
                  </div>
                )}
                {alumno.dsWhatsappNotificacion && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">WhatsApp</label>
                    <p className="text-base">{alumno.dsWhatsappNotificacion}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Talleres */}
        <TabsContent value="talleres" className="space-y-4">
          {/* Talleres Activos */}
          <Card>
            <CardHeader>
              <CardTitle>Talleres Activos</CardTitle>
              <CardDescription>
                Talleres en los que está inscrito actualmente
              </CardDescription>
            </CardHeader>
            <CardContent>
              {talleresActivos.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No tiene talleres activos
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Taller</TableHead>
                      <TableHead>Año</TableHead>
                      <TableHead>Profesor</TableHead>
                      <TableHead>Fecha Inscripción</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {talleresActivos.map((taller) => (
                      <TableRow
                        key={taller.cdTaller}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/dashboard/talleres/${taller.cdTaller}`)}
                      >
                        <TableCell className="font-medium">{taller.dsNombreTaller}</TableCell>
                        <TableCell>{taller.nuAnioTaller}</TableCell>
                        <TableCell>{taller.nombreProfesor}</TableCell>
                        <TableCell>{formatFecha(taller.feInscripcion)}</TableCell>
                        <TableCell>
                          <Badge variant="default">{taller.estadoEnTaller}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Talleres Finalizados */}
          <Card>
            <CardHeader>
              <CardTitle>Talleres Finalizados</CardTitle>
              <CardDescription>
                Historial de talleres completados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {talleresFinalizados.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No tiene talleres finalizados
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Taller</TableHead>
                      <TableHead>Año</TableHead>
                      <TableHead>Profesor</TableHead>
                      <TableHead>Fecha Finalización</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {talleresFinalizados.map((taller) => (
                      <TableRow key={taller.cdTaller}>
                        <TableCell className="font-medium">{taller.dsNombreTaller}</TableCell>
                        <TableCell>{taller.nuAnioTaller}</TableCell>
                        <TableCell>{taller.nombreProfesor}</TableCell>
                        <TableCell>{formatFecha(taller.feFinalizacion)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Pagos */}
        <TabsContent value="pagos">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Historial de Pagos
              </CardTitle>
              <CardDescription>
                Últimos 50 pagos realizados - Total: {formatMoneda(resumen.montoPagadoTotal)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pagosRealizados.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No hay pagos registrados
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Taller</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead className="text-right">Importe</TableHead>
                      <TableHead>Observaciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagosRealizados.map((pago) => (
                      <TableRow key={pago.cdPagoDetalle}>
                        <TableCell>{formatFecha(pago.fePago)}</TableCell>
                        <TableCell>
                          {pago.dsNombreTaller ? (
                            <>
                              {pago.dsNombreTaller}
                              <span className="text-muted-foreground text-sm ml-1">
                                ({pago.nuAnioTaller})
                              </span>
                            </>
                          ) : (
                            <span className="text-muted-foreground">Sin taller</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {pago.nuMes && pago.nuAnio ? (
                            `${meses[pago.nuMes - 1]} ${pago.nuAnio}`
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{pago.dsTipoPago}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatMoneda(pago.nuMonto)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {pago.dsObservacion || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Pendientes */}
        <TabsContent value="pendientes">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Pagos Pendientes
              </CardTitle>
              <CardDescription>
                Detalle mensual de deudas pendientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pagosPendientes.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <p className="text-lg font-medium">¡No hay pagos pendientes!</p>
                  <p className="text-muted-foreground">Todas las clases están pagas</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-lg font-bold text-red-700">
                      Total Adeudado: {formatMoneda(resumen.montoPendienteTotal)}
                    </p>
                    <p className="text-sm text-red-600">
                      {resumen.totalPagosPendientes} {resumen.totalPagosPendientes === 1 ? 'período pendiente' : 'períodos pendientes'}
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Alumno</TableHead>
                        <TableHead>Taller</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead className="text-right">Monto</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pagosPendientes.map((pendiente, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <div className="font-medium">{pendiente.nombreAlumno}</div>
                            {pendiente.cdAlumno !== alumno.cdAlumno && (
                              <Badge variant="outline" className="mt-1 text-xs">Grupo Familiar</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {pendiente.dsNombreTaller}
                            <span className="text-muted-foreground text-sm ml-1">
                              ({pendiente.nuAnioTaller})
                            </span>
                          </TableCell>
                          <TableCell>
                            {pendiente.mesNombre} {pendiente.anio}
                          </TableCell>
                          <TableCell className="text-right font-bold text-red-600">
                            {formatMoneda(pendiente.monto)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Asistencias */}
        <TabsContent value="asistencias">
          <Card>
            <CardHeader>
              <CardTitle>Registro de Asistencias</CardTitle>
              <CardDescription>
                Últimas 100 clases - {resumen.totalAsistencias} presentes, {resumen.totalFaltas} ausencias
              </CardDescription>
            </CardHeader>
            <CardContent>
              {faltas.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No hay registros de asistencia
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Taller</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Observación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {faltas.map((falta) => (
                      <TableRow key={falta.cdFalta}>
                        <TableCell>{formatFecha(falta.feFalta)}</TableCell>
                        <TableCell>
                          {falta.dsNombreTaller}
                          <span className="text-muted-foreground text-sm ml-1">
                            ({falta.nuAnioTaller})
                          </span>
                        </TableCell>
                        <TableCell>
                          {falta.snPresente === 1 ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Presente
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Ausente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {falta.dsObservacion || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Novedades */}
        <TabsContent value="novedades">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Novedades del Alumno
                  </CardTitle>
                  <CardDescription>
                    Registro de novedades y observaciones importantes
                  </CardDescription>
                </div>
                <Button onClick={() => setIsNovedadDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Novedad
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingNovedades ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Cargando novedades...</p>
                </div>
              ) : novedades.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-lg font-medium">No hay novedades registradas</p>
                  <p className="text-muted-foreground">Agregá la primera novedad para este alumno</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Fecha y Hora</TableHead>
                      <TableHead className="w-[200px]">Usuario</TableHead>
                      <TableHead>Novedad</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {novedades.map((novedad) => (
                      <TableRow key={novedad.cdNovedad}>
                        <TableCell className="font-medium">
                          {formatFechaHora(novedad.feAlta)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {novedad.nombreCompleto || novedad.nombreUsuario}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm whitespace-pre-line">{novedad.dsNovedad}</p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para agregar novedad */}
      <Dialog open={isNovedadDialogOpen} onOpenChange={setIsNovedadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Agregar Novedad</DialogTitle>
            <DialogDescription>
              Registrá una novedad u observación importante sobre el alumno
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="novedad">Novedad</Label>
            <Textarea
              id="novedad"
              value={nuevaNovedad}
              onChange={(e) => setNuevaNovedad(e.target.value)}
              placeholder="Escribí la novedad..."
              rows={6}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNovedadDialogOpen(false);
                setNuevaNovedad('');
              }}
              disabled={savingNovedad}
            >
              Cancelar
            </Button>
            <Button onClick={handleGuardarNovedad} disabled={savingNovedad}>
              {savingNovedad ? 'Guardando...' : 'Guardar Novedad'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
