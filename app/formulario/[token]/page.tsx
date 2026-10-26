'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle2, ShieldCheck, TriangleAlert } from 'lucide-react';
import { DatosEscuelaPermisos } from '@/components/alumnos/datos-escuela-permisos';

type Disponibilidad = 'disponible' | 'completo' | 'fuera_de_edad' | 'ya_inscripto';

interface TallerFormulario {
  cdTaller: number;
  nombre: string;
  horario: string;
  descripcionHorarios: string | null;
  rangoEdad: string | null;
  disponibilidad: Disponibilidad;
}

interface DatosFormulario {
  nuAnio: number;
  mensaje: string | null;
  alumno: Record<string, any> & { esMenor: boolean };
  talleres: TallerFormulario[];
}

type Paso = 'cargando' | 'invalido' | 'dni' | 'formulario' | 'completado';

// Datos que el alumno puede modificar
const CAMPOS_EDITABLES = [
  'dsDomicilio', 'dsCiudad', 'dsComoNosConocio', 'dsEscuela', 'dsTurnoEscuela',
  'snDiscapacidad', 'dsObservacionesDiscapacidad', 'dsObservaciones',
  'dsTelefonoCelular', 'dsTelefonoFijo', 'dsMail',
  'dsNombreCompletoContacto1', 'dsParentescoContacto1', 'dsDNIContacto1', 'dsTelefonoContacto1', 'dsMailContacto1',
  'dsNombreCompletoContacto2', 'dsParentescoContacto2', 'dsDNIContacto2', 'dsTelefonoContacto2', 'dsMailContacto2',
  'dsInstagram', 'dsFacebook', 'dsMailNotificacion', 'dsWhatsappNotificacion',
  'snPermisoUsoImagen', 'snPermisoRetiroSolo',
] as const;

const formatearFecha = (fecha: string) => {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
};

function Seccion({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{titulo}</CardTitle>
        {descripcion && <CardDescription>{descripcion}</CardDescription>}
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

function SoloLectura({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-500">{etiqueta}</p>
      <p className="text-base">{valor || '-'}</p>
    </div>
  );
}

export default function FormularioInscripcionPage() {
  const params = useParams();
  const token = params.token as string;

  const [paso, setPaso] = useState<Paso>('cargando');
  const [anio, setAnio] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const [dni, setDni] = useState('');
  const [errorDni, setErrorDni] = useState('');
  const [verificando, setVerificando] = useState(false);

  const [datos, setDatos] = useState<DatosFormulario | null>(null);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [talleresElegidos, setTalleresElegidos] = useState<number[]>([]);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [talleresInscriptos, setTalleresInscriptos] = useState<string[]>([]);

  useEffect(() => {
    const validar = async () => {
      try {
        const respuesta = await fetch(`/api/formulario/${token}`, { cache: 'no-store' });
        if (!respuesta.ok) {
          setPaso('invalido');
          return;
        }
        const data = await respuesta.json();
        setAnio(data.nuAnio);
        setMensaje(data.mensaje);
        setPaso('dni');
      } catch {
        setPaso('invalido');
      }
    };
    validar();
  }, [token]);

  const ingresar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorDni('');
    setVerificando(true);
    try {
      const respuesta = await fetch(`/api/formulario/${token}/datos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni }),
      });
      const data = await respuesta.json();

      if (respuesta.status === 404) {
        setPaso('invalido');
        return;
      }
      if (!respuesta.ok) {
        setErrorDni(
          data.bloqueado
            ? data.error
            : `${data.error}${typeof data.restantes === 'number' ? ` Te quedan ${data.restantes} intento(s).` : ''}`
        );
        if (data.bloqueado) setPaso('invalido');
        return;
      }

      const inicial: Record<string, string> = {};
      CAMPOS_EDITABLES.forEach((campo) => {
        inicial[campo] = data.alumno[campo] ?? '';
      });
      if (!inicial.snDiscapacidad) inicial.snDiscapacidad = 'NO';

      setDatos(data);
      setValores(inicial);
      setTalleresElegidos(
        data.talleres
          .filter((t: TallerFormulario) => t.disponibilidad === 'ya_inscripto')
          .map((t: TallerFormulario) => t.cdTaller)
      );
      setPaso('formulario');
    } catch {
      setErrorDni('No se pudo conectar. Intentá nuevamente.');
    } finally {
      setVerificando(false);
    }
  };

  const cambiar = (campo: string, valor: string) => setValores((prev) => ({ ...prev, [campo]: valor }));

  const alternarTaller = (cdTaller: number) =>
    setTalleresElegidos((prev) =>
      prev.includes(cdTaller) ? prev.filter((id) => id !== cdTaller) : [...prev, cdTaller]
    );

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!datos) return;
    setErrorEnvio('');

    const esMenor = datos.alumno.esMenor;
    if (!valores.snPermisoUsoImagen) {
      setErrorEnvio('Indicá si das el Permiso de Uso de Imagen.');
      return;
    }
    if (esMenor && !valores.snPermisoRetiroSolo) {
      setErrorEnvio('Indicá si das el Permiso de Retiro Solo.');
      return;
    }
    if (talleresElegidos.length === 0) {
      setErrorEnvio('Elegí al menos un taller para completar la inscripción.');
      return;
    }

    setEnviando(true);
    try {
      const respuesta = await fetch(`/api/formulario/${token}/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dni,
          datos: valores,
          talleres: talleresElegidos.filter(
            (id) => datos.talleres.find((t) => t.cdTaller === id)?.disponibilidad !== 'ya_inscripto'
          ),
        }),
      });
      const data = await respuesta.json();

      if (respuesta.ok) {
        setTalleresInscriptos(data.talleres || []);
        setPaso('completado');
        window.scrollTo({ top: 0 });
      } else if (respuesta.status === 404 || data.bloqueado) {
        setPaso('invalido');
      } else {
        setErrorEnvio(data.error || 'No se pudo enviar el formulario.');
        // Si el cupo cambió mientras completaba, se refleja la disponibilidad actual
        if (respuesta.status === 409) recargarTalleres();
      }
    } catch {
      setErrorEnvio('No se pudo conectar. Intentá nuevamente.');
    } finally {
      setEnviando(false);
    }
  };

  const recargarTalleres = async () => {
    try {
      const respuesta = await fetch(`/api/formulario/${token}/datos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni }),
      });
      if (respuesta.ok) {
        const data = await respuesta.json();
        setDatos((prev) => (prev ? { ...prev, talleres: data.talleres } : prev));
        setTalleresElegidos((prev) =>
          prev.filter((id) =>
            data.talleres.some(
              (t: TallerFormulario) =>
                t.cdTaller === id && (t.disponibilidad === 'disponible' || t.disponibilidad === 'ya_inscripto')
            )
          )
        );
      }
    } catch {
      // Se mantiene la lista actual
    }
  };

  const campo = (id: string, etiqueta: string, opciones: { tipo?: string; max?: number; placeholder?: string } = {}) => (
    <div>
      <Label htmlFor={id}>{etiqueta}</Label>
      <Input
        id={id}
        type={opciones.tipo || 'text'}
        value={valores[id] ?? ''}
        maxLength={opciones.max}
        placeholder={opciones.placeholder}
        onChange={(e) => cambiar(id, e.target.value)}
        className="mt-1"
      />
    </div>
  );

  const encabezado = (
    <div className="mb-6 text-center">
      <h1 className="text-2xl font-bold text-indigo-700">Índigo Teatro</h1>
      <p className="text-gray-600">
        {anio ? `Formulario de inscripción ${anio}` : 'Formulario de inscripción'}
      </p>
    </div>
  );

  if (paso === 'cargando') {
    return <div className="mx-auto max-w-3xl p-6 text-center text-gray-600">Cargando...</div>;
  }

  if (paso === 'invalido') {
    return (
      <div className="mx-auto max-w-lg p-6">
        {encabezado}
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <TriangleAlert className="h-10 w-10 text-amber-500" />
            <p className="font-medium">Este link no es válido o ya fue utilizado.</p>
            <p className="text-sm text-gray-600">
              Si necesitás completar el formulario, pedí un nuevo link a Índigo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paso === 'completado') {
    return (
      <div className="mx-auto max-w-lg p-6">
        {encabezado}
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <p className="text-lg font-semibold">¡Inscripción completada!</p>
            {talleresInscriptos.length > 0 && (
              <p className="text-sm text-gray-700">
                Quedaste inscripto en: <strong>{talleresInscriptos.join(', ')}</strong>
              </p>
            )}
            <p className="text-sm text-gray-600">
              Ya podés cerrar esta ventana. Este link no se puede volver a usar.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paso === 'dni' || !datos) {
    return (
      <div className="mx-auto max-w-lg p-6">
        {encabezado}
        {mensaje && (
          <div className="mb-4 whitespace-pre-wrap rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-indigo-900">
            {mensaje}
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              Confirmá tu identidad
            </CardTitle>
            <CardDescription>
              Ingresá el DNI del alumno para acceder al formulario.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={ingresar} className="space-y-4">
              <div>
                <Label htmlFor="dni">DNI del alumno</Label>
                <Input
                  id="dni"
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={30}
                  className="mt-1"
                  autoFocus
                />
              </div>
              {errorDni && <p className="text-sm text-red-600">{errorDni}</p>}
              <Button
                type="submit"
                disabled={verificando || !dni.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {verificando ? 'Verificando...' : 'Ingresar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { alumno, talleres } = datos;
  const esMenor: boolean = alumno.esMenor;

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      {encabezado}

      {datos.mensaje && (
        <div className="mb-6 whitespace-pre-wrap rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-indigo-900">
          {datos.mensaje}
        </div>
      )}

      <form onSubmit={enviar} className="space-y-6">
        <Seccion titulo="Datos del alumno" descripcion="Estos datos no se pueden modificar desde el formulario.">
          <SoloLectura etiqueta="Nombre y apellido" valor={`${alumno.dsNombre} ${alumno.dsApellido}`} />
          <SoloLectura etiqueta="DNI" valor={alumno.dsDNI} />
          <SoloLectura etiqueta="Sexo" valor={alumno.dsSexo} />
          <SoloLectura etiqueta="Fecha de nacimiento" valor={`${formatearFecha(alumno.feNacimiento)} (${alumno.edad} años)`} />
          {alumno.dsNombreLlamar && <SoloLectura etiqueta="Nombre a llamar" valor={alumno.dsNombreLlamar} />}
        </Seccion>

        <Seccion titulo="Domicilio">
          <div className="sm:col-span-2">{campo('dsDomicilio', 'Dirección', { max: 255 })}</div>
          {campo('dsCiudad', 'Ciudad / Localidad', { max: 100 })}
          {campo('dsComoNosConocio', '¿Cómo nos conocieron?', { max: 255 })}
        </Seccion>

        <DatosEscuelaPermisos
          variante="card"
          secciones="escuela"
          idPrefijo="f-"
          valores={valores as any}
          esMenor={esMenor}
          onChange={(c, v) => cambiar(c, v)}
        />

        <Seccion titulo="Salud y observaciones">
          <div>
            <Label htmlFor="snDiscapacidad">¿Tiene alguna discapacidad?</Label>
            <Select value={valores.snDiscapacidad} onValueChange={(v) => cambiar('snDiscapacidad', v)}>
              <SelectTrigger id="snDiscapacidad" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NO">No</SelectItem>
                <SelectItem value="SI">Sí</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {valores.snDiscapacidad === 'SI' && (
            <div className="sm:col-span-2">
              <Label htmlFor="dsObservacionesDiscapacidad">Observaciones de discapacidad</Label>
              <Textarea
                id="dsObservacionesDiscapacidad"
                rows={3}
                maxLength={2000}
                value={valores.dsObservacionesDiscapacidad}
                onChange={(e) => cambiar('dsObservacionesDiscapacidad', e.target.value)}
                className="mt-1"
              />
            </div>
          )}
          <div className="sm:col-span-2">
            <Label htmlFor="dsObservaciones">Observaciones generales</Label>
            <Textarea
              id="dsObservaciones"
              rows={3}
              maxLength={2000}
              value={valores.dsObservaciones}
              onChange={(e) => cambiar('dsObservaciones', e.target.value)}
              className="mt-1"
            />
          </div>
        </Seccion>

        <Seccion titulo="Datos de contacto del alumno">
          {campo('dsTelefonoCelular', 'Teléfono celular', { max: 50 })}
          {campo('dsTelefonoFijo', 'Teléfono fijo', { max: 50 })}
          <div className="sm:col-span-2">{campo('dsMail', 'Email', { tipo: 'email', max: 100 })}</div>
        </Seccion>

        <Seccion titulo="Datos de contacto 1">
          {campo('dsNombreCompletoContacto1', 'Nombre completo', { max: 255 })}
          {campo('dsParentescoContacto1', 'Parentesco', { max: 100 })}
          {campo('dsDNIContacto1', 'DNI', { max: 20 })}
          {campo('dsTelefonoContacto1', 'Teléfono', { max: 50 })}
          <div className="sm:col-span-2">{campo('dsMailContacto1', 'Email', { tipo: 'email', max: 100 })}</div>
        </Seccion>

        <Seccion titulo="Datos de contacto 2">
          {campo('dsNombreCompletoContacto2', 'Nombre completo', { max: 255 })}
          {campo('dsParentescoContacto2', 'Parentesco', { max: 100 })}
          {campo('dsDNIContacto2', 'DNI', { max: 20 })}
          {campo('dsTelefonoContacto2', 'Teléfono', { max: 50 })}
          <div className="sm:col-span-2">{campo('dsMailContacto2', 'Email', { tipo: 'email', max: 100 })}</div>
        </Seccion>

        <Seccion titulo="Redes sociales">
          {campo('dsInstagram', 'Instagram', { max: 100 })}
          {campo('dsFacebook', 'Facebook', { max: 100 })}
        </Seccion>

        <Seccion titulo="Notificación de pago" descripcion="Donde recibirán los comprobantes de pago.">
          {campo('dsMailNotificacion', 'Email', { tipo: 'email', max: 100 })}
          {campo('dsWhatsappNotificacion', 'WhatsApp', { max: 50, placeholder: '11 1234-5678' })}
        </Seccion>

        <DatosEscuelaPermisos
          variante="card"
          secciones="permisos"
          idPrefijo="f-"
          valores={valores as any}
          esMenor={esMenor}
          onChange={(c, v) => cambiar(c, v)}
        />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Inscripción a talleres {datos.nuAnio}</CardTitle>
            <CardDescription>
              Elegí uno o más talleres. Los talleres sin lugar o que no corresponden a la edad del alumno no se pueden seleccionar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {talleres.length === 0 ? (
              <p className="text-sm text-gray-600">Todavía no hay talleres disponibles para {datos.nuAnio}.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]" />
                      <TableHead>Tipo de taller</TableHead>
                      <TableHead>Día y horarios</TableHead>
                      <TableHead>Disponible</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {talleres.map((t) => {
                      const habilitado = t.disponibilidad === 'disponible';
                      return (
                        <TableRow key={t.cdTaller} className={habilitado ? undefined : 'bg-gray-50 text-gray-500'}>
                          <TableCell>
                            <Checkbox
                              id={`taller-${t.cdTaller}`}
                              checked={talleresElegidos.includes(t.cdTaller)}
                              disabled={!habilitado}
                              onChange={() => alternarTaller(t.cdTaller)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <label htmlFor={`taller-${t.cdTaller}`}>{t.nombre}</label>
                            {t.rangoEdad && <div className="text-xs font-normal text-gray-500">{t.rangoEdad}</div>}
                          </TableCell>
                          <TableCell className="whitespace-normal text-sm">
                            {t.horario || '-'}
                            {t.descripcionHorarios && (
                              <div className="text-xs text-gray-500">{t.descripcionHorarios}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            {t.disponibilidad === 'disponible' && (
                              <Badge variant="outline" className="border-green-300 bg-green-100 text-green-800">
                                Disponible
                              </Badge>
                            )}
                            {t.disponibilidad === 'completo' && (
                              <Badge variant="outline" className="border-red-300 bg-red-100 text-red-800">
                                Sin lugar
                              </Badge>
                            )}
                            {t.disponibilidad === 'fuera_de_edad' && (
                              <Badge variant="outline" className="whitespace-nowrap">No corresponde a la edad</Badge>
                            )}
                            {t.disponibilidad === 'ya_inscripto' && (
                              <Badge variant="outline" className="border-indigo-300 bg-indigo-100 text-indigo-800">
                                Ya inscripto
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {errorEnvio && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorEnvio}</div>
        )}

        <Button
          type="submit"
          disabled={enviando}
          className="w-full bg-indigo-600 py-6 text-base hover:bg-indigo-700"
        >
          {enviando ? 'Enviando...' : 'Completar inscripción'}
        </Button>
        <p className="pb-6 text-center text-xs text-gray-500">
          Al enviar el formulario el link deja de funcionar.
        </p>
      </form>
    </div>
  );
}
