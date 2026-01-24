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
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const [data, setData] = useState<AlumnoDetalle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDetalle();
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
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div>
                <label className="text-sm font-medium text-muted-foreground">Fecha de Nacimiento</label>
                <p className="text-base">{formatFecha(alumno.feNacimiento)} ({alumno.edad} años)</p>
              </div>
              {alumno.dsDomicilio && (
                <div className="md:col-span-2">
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
              {alumno.dsTelefonoFijo && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Teléfono Fijo
                  </label>
                  <p className="text-base">{alumno.dsTelefonoFijo}</p>
                </div>
              )}
              {alumno.dsMail && (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </label>
                  <p className="text-base">{alumno.dsMail}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Grupo Familiar */}
          {grupoFamiliar && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Grupo Familiar
                </CardTitle>
                <CardDescription>{grupoFamiliar.dsNombreGrupo}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {grupoFamiliar.dsMailContacto && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email Contacto</label>
                        <p className="text-base">{grupoFamiliar.dsMailContacto}</p>
                      </div>
                    )}
                    {grupoFamiliar.dsMailContacto2 && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Email Contacto 2</label>
                        <p className="text-base">{grupoFamiliar.dsMailContacto2}</p>
                      </div>
                    )}
                    {grupoFamiliar.dsTelefonoContacto && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Teléfono Contacto</label>
                        <p className="text-base">{grupoFamiliar.dsTelefonoContacto}</p>
                      </div>
                    )}
                  </div>

                  {miembrosGrupo.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Otros Miembros</h4>
                      <div className="space-y-2">
                        {miembrosGrupo.map((miembro: any) => (
                          <div
                            key={miembro.cdAlumno}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80"
                            onClick={() => router.push(`/dashboard/alumnos/${miembro.cdAlumno}`)}
                          >
                            <div>
                              <p className="font-medium">{miembro.dsNombreCompleto}</p>
                              <p className="text-sm text-muted-foreground">
                                DNI: {miembro.dsDNI} - {miembro.edad} años
                              </p>
                            </div>
                            <Badge variant={miembro.dsEstado === 'Activo' ? 'default' : 'secondary'}>
                              {miembro.dsEstado}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
                Períodos con clases tomadas sin pagar - Total Adeudado: {formatMoneda(resumen.montoPendienteTotal)}
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Taller</TableHead>
                      <TableHead className="text-right">Meses Transcurridos</TableHead>
                      <TableHead className="text-right">Meses Pagados</TableHead>
                      <TableHead className="text-right">Meses Adeudados</TableHead>
                      <TableHead className="text-right">Precio/Mes</TableHead>
                      <TableHead className="text-right">Total Adeudado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagosPendientes.map((pendiente, idx) => {
                      const mesesDebe = pendiente.mesesTranscurridos - pendiente.mesesPagados;
                      const totalDebe = mesesDebe * pendiente.precioPorClase;
                      
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">
                            {pendiente.dsNombreTaller}
                            <span className="text-muted-foreground text-sm ml-1">
                              ({pendiente.nuAnioTaller})
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{pendiente.mesesTranscurridos}</TableCell>
                          <TableCell className="text-right text-green-600">{pendiente.mesesPagados}</TableCell>
                          <TableCell className="text-right font-bold">{mesesDebe}</TableCell>
                          <TableCell className="text-right">{formatMoneda(pendiente.precioPorClase)}</TableCell>
                          <TableCell className="text-right font-bold text-red-600">
                            {formatMoneda(totalDebe)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
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
      </Tabs>
    </div>
  );
}
