'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

interface GrupoFamiliar {
  cdGrupoFamiliar: number;
  dsNombreGrupo: string;
  cantidadMiembros: number;
  miembros: string;
}

interface Taller {
  cdTaller: number;
  dsNombreTaller: string;
  nombrePersonal: string | null;
  nuAnioTaller: number;
  snLunes: boolean;
  dsLunesHoraDesde: string | null;
  dsLunesHoraHasta: string | null;
  snMartes: boolean;
  dsMartesHoraDesde: string | null;
  dsMartesHoraHasta: string | null;
  snMiercoles: boolean;
  dsMiercolesHoraDesde: string | null;
  dsMiercolesHoraHasta: string | null;
  snJueves: boolean;
  dsJuevesHoraDesde: string | null;
  dsJuevesHoraHasta: string | null;
  snViernes: boolean;
  dsViernesHoraDesde: string | null;
  dsViernesHoraHasta: string | null;
  snSabado: boolean;
  dsSabadoHoraDesde: string | null;
  dsSabadoHoraHasta: string | null;
  snDomingo: boolean;
  dsDomingoHoraDesde: string | null;
  dsDomingoHoraHasta: string | null;
}

// Función helper para formatear días y horarios
const formatHorarioTaller = (taller: Taller): string => {
  const dias = [];
  
  if (taller.snLunes && taller.dsLunesHoraDesde && taller.dsLunesHoraHasta) {
    dias.push(`Lun ${taller.dsLunesHoraDesde.slice(0, 5)}-${taller.dsLunesHoraHasta.slice(0, 5)}`);
  }
  if (taller.snMartes && taller.dsMartesHoraDesde && taller.dsMartesHoraHasta) {
    dias.push(`Mar ${taller.dsMartesHoraDesde.slice(0, 5)}-${taller.dsMartesHoraHasta.slice(0, 5)}`);
  }
  if (taller.snMiercoles && taller.dsMiercolesHoraDesde && taller.dsMiercolesHoraHasta) {
    dias.push(`Mié ${taller.dsMiercolesHoraDesde.slice(0, 5)}-${taller.dsMiercolesHoraHasta.slice(0, 5)}`);
  }
  if (taller.snJueves && taller.dsJuevesHoraDesde && taller.dsJuevesHoraHasta) {
    dias.push(`Jue ${taller.dsJuevesHoraDesde.slice(0, 5)}-${taller.dsJuevesHoraHasta.slice(0, 5)}`);
  }
  if (taller.snViernes && taller.dsViernesHoraDesde && taller.dsViernesHoraHasta) {
    dias.push(`Vie ${taller.dsViernesHoraDesde.slice(0, 5)}-${taller.dsViernesHoraHasta.slice(0, 5)}`);
  }
  if (taller.snSabado && taller.dsSabadoHoraDesde && taller.dsSabadoHoraHasta) {
    dias.push(`Sáb ${taller.dsSabadoHoraDesde.slice(0, 5)}-${taller.dsSabadoHoraHasta.slice(0, 5)}`);
  }
  if (taller.snDomingo && taller.dsDomingoHoraDesde && taller.dsDomingoHoraHasta) {
    dias.push(`Dom ${taller.dsDomingoHoraDesde.slice(0, 5)}-${taller.dsDomingoHoraHasta.slice(0, 5)}`);
  }
  
  return dias.length > 0 ? dias.join(', ') : 'Sin horario definido';
};

export default function NuevoAlumnoPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [gruposFamiliares, setGruposFamiliares] = useState<GrupoFamiliar[]>([]);
  const [talleres, setTalleres] = useState<Taller[]>([]);

  const [formData, setFormData] = useState({
    dsNombre: '',
    dsApellido: '',
    dsDNI: '',
    dsSexo: '',
    dsNombreLlamar: '',
    feNacimiento: '',
    dsDomicilio: '',
    // Nuevos campos
    snDiscapacidad: 'NO',
    dsObservacionesDiscapacidad: '',
    dsObservaciones: '',
    // Datos de contacto del alumno (opcionales)
    dsTelefonoCelular: '',
    dsTelefonoFijo: '',
    dsMail: '',
    // Redes sociales
    dsInstagram: '',
    dsFacebook: '',
    // Notificaciones de pago
    dsMailNotificacion: '',
    dsWhatsappNotificacion: '',
    // Contacto 1 (opcional)
    dsNombreCompletoContacto1: '',
    dsParentescoContacto1: '',
    dsDNIContacto1: '',
    dsTelefonoContacto1: '',
    dsMailContacto1: '',
    // Contacto 2 (opcional)
    dsNombreCompletoContacto2: '',
    dsParentescoContacto2: '',
    dsDNIContacto2: '',
    dsTelefonoContacto2: '',
    dsMailContacto2: '',
    cdGrupoFamiliar: '',
    talleres: [] as number[],
  });

  useEffect(() => {
    fetchGruposFamiliares();
    fetchTalleres();
  }, []);

  const fetchGruposFamiliares = async () => {
    try {
      const response = await fetch('/api/grupos-familiares');
      if (response.ok) {
        const data = await response.json();
        // El API devuelve { grupos: [...] }
        const grupos = data.grupos || [];
        setGruposFamiliares(Array.isArray(grupos) ? grupos : []);
      } else {
        setGruposFamiliares([]);
      }
    } catch (err) {
      console.error('Error al cargar grupos familiares:', err);
      setGruposFamiliares([]);
    }
  };

  const fetchTalleres = async () => {
    try {
      const response = await fetch('/api/talleres');
      if (response.ok) {
        const data = await response.json();
        // Filtrar solo talleres activos
        const talleresActivos = data.filter((t: any) => t.dsEstado === 'Activo');
        setTalleres(talleresActivos);
      }
    } catch (err) {
      console.error('Error al cargar talleres:', err);
    }
  };

  const handleTallerToggle = (cdTaller: number) => {
    setFormData(prev => {
      const talleres = prev.talleres.includes(cdTaller)
        ? prev.talleres.filter(id => id !== cdTaller)
        : [...prev.talleres, cdTaller];
      return { ...prev, talleres };
    });
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        cdGrupoFamiliar: formData.cdGrupoFamiliar ? parseInt(formData.cdGrupoFamiliar) : null,
      };

      const response = await fetch('/api/alumnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        success('Alumno registrado exitosamente');
        router.push('/dashboard/alumnos');
      } else {
        const data = await response.json();
        error(data.error || 'Error al registrar alumno');
      }
    } catch (err) {
      console.error('Error:', err);
      error('Error al registrar alumno');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="mb-6 flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/alumnos')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nuevo Alumno</h1>
          <p className="text-gray-600 mt-1">
            Complete los datos del alumno
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos Personales */}
        <Card>
          <CardHeader>
            <CardTitle>Datos Personales</CardTitle>
            <CardDescription>
              Información básica del alumno (campos obligatorios *)
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dsNombre">Nombre *</Label>
              <Input
                id="dsNombre"
                value={formData.dsNombre}
                onChange={(e) => handleChange('dsNombre', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="dsApellido">Apellido *</Label>
              <Input
                id="dsApellido"
                value={formData.dsApellido}
                onChange={(e) => handleChange('dsApellido', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="dsDNI">DNI *</Label>
              <Input
                id="dsDNI"
                value={formData.dsDNI}
                onChange={(e) => handleChange('dsDNI', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="dsSexo">Sexo *</Label>
              <Select
                value={formData.dsSexo}
                onValueChange={(value) => handleChange('dsSexo', value)}
                required
              >
                <SelectTrigger id="dsSexo">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Femenino">Femenino</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dsNombreLlamar">Nombre a Llamar</Label>
              <Input
                id="dsNombreLlamar"
                value={formData.dsNombreLlamar}
                onChange={(e) => handleChange('dsNombreLlamar', e.target.value)}
                placeholder="Opcional - Apodo o diminutivo"
              />
            </div>

            <div>
              <Label htmlFor="feNacimiento">Fecha de Nacimiento *</Label>
              <Input
                id="feNacimiento"
                type="date"
                value={formData.feNacimiento}
                onChange={(e) => handleChange('feNacimiento', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="dsDomicilio">Domicilio</Label>
              <Input
                id="dsDomicilio"
                value={formData.dsDomicilio}
                onChange={(e) => handleChange('dsDomicilio', e.target.value)}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="cdGrupoFamiliar">Grupo Familiar</Label>
              <Select
                value={formData.cdGrupoFamiliar}
                onValueChange={(value) => handleChange('cdGrupoFamiliar', value)}
              >
                <SelectTrigger id="cdGrupoFamiliar">
                  <SelectValue placeholder="Sin grupo familiar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Sin grupo familiar</SelectItem>
                  {Array.isArray(gruposFamiliares) && gruposFamiliares.map((grupo) => (
                    <SelectItem
                      key={grupo.cdGrupoFamiliar}
                      value={grupo.cdGrupoFamiliar.toString()}
                    >
                      {grupo.dsNombreGrupo} ({grupo.cantidadMiembros} miembros)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Mostrar miembros del grupo seleccionado */}
              {formData.cdGrupoFamiliar && formData.cdGrupoFamiliar !== '0' && (() => {
                const grupoSeleccionado = gruposFamiliares.find(
                  g => g.cdGrupoFamiliar.toString() === formData.cdGrupoFamiliar
                );
                return grupoSeleccionado && grupoSeleccionado.miembros ? (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">Miembros del grupo:</p>
                    <div className="space-y-1">
                      {grupoSeleccionado.miembros.split(',').map((miembro, idx) => (
                        <div key={idx} className="text-sm text-gray-600">
                          • {miembro.trim()}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            <div>
              <Label htmlFor="snDiscapacidad">¿Tiene alguna discapacidad?</Label>
              <Select
                value={formData.snDiscapacidad}
                onValueChange={(value) => handleChange('snDiscapacidad', value)}
              >
                <SelectTrigger id="snDiscapacidad">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NO">No</SelectItem>
                  <SelectItem value="SI">Sí</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.snDiscapacidad === 'SI' && (
              <div>
                <Label htmlFor="dsObservacionesDiscapacidad">Observaciones de Discapacidad</Label>
                <Textarea
                  id="dsObservacionesDiscapacidad"
                  value={formData.dsObservacionesDiscapacidad}
                  onChange={(e) => handleChange('dsObservacionesDiscapacidad', e.target.value)}
                  placeholder="Describir la discapacidad y consideraciones especiales"
                  rows={3}
                />
              </div>
            )}

            <div className={formData.snDiscapacidad === 'SI' ? '' : 'col-span-2'}>
              <Label htmlFor="dsObservaciones">Observaciones Generales</Label>
              <Textarea
                id="dsObservaciones"
                value={formData.dsObservaciones}
                onChange={(e) => handleChange('dsObservaciones', e.target.value)}
                placeholder="Cualquier información adicional relevante"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Datos de Contacto del Alumno */}
        <Card>
          <CardHeader>
            <CardTitle>Datos de Contacto del Alumno</CardTitle>
            <CardDescription>
              Información de contacto del alumno (opcional, especialmente para menores de edad)
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dsTelefonoCelular">Teléfono Celular</Label>
              <Input
                id="dsTelefonoCelular"
                value={formData.dsTelefonoCelular}
                onChange={(e) => handleChange('dsTelefonoCelular', e.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div>
              <Label htmlFor="dsTelefonoFijo">Teléfono Fijo</Label>
              <Input
                id="dsTelefonoFijo"
                value={formData.dsTelefonoFijo}
                onChange={(e) => handleChange('dsTelefonoFijo', e.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="dsMail">Email</Label>
              <Input
                id="dsMail"
                type="email"
                value={formData.dsMail}
                onChange={(e) => handleChange('dsMail', e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </CardContent>
        </Card>

        {/* Datos de Contacto 1 */}
        <Card>
          <CardHeader>
            <CardTitle>Datos de Contacto 1</CardTitle>
            <CardDescription>
              Información de un contacto de emergencia o responsable (opcional)
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="dsNombreCompletoContacto1">Nombre Completo</Label>
              <Input
                id="dsNombreCompletoContacto1"
                value={formData.dsNombreCompletoContacto1}
                onChange={(e) => handleChange('dsNombreCompletoContacto1', e.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div>
              <Label htmlFor="dsParentescoContacto1">Parentesco</Label>
              <Input
                id="dsParentescoContacto1"
                value={formData.dsParentescoContacto1}
                onChange={(e) => handleChange('dsParentescoContacto1', e.target.value)}
                placeholder="Ej: Madre, Padre, Tutor"
              />
            </div>

            <div>
              <Label htmlFor="dsDNIContacto1">DNI</Label>
              <Input
                id="dsDNIContacto1"
                value={formData.dsDNIContacto1}
                onChange={(e) => handleChange('dsDNIContacto1', e.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div>
              <Label htmlFor="dsTelefonoContacto1">Teléfono</Label>
              <Input
                id="dsTelefonoContacto1"
                value={formData.dsTelefonoContacto1}
                onChange={(e) => handleChange('dsTelefonoContacto1', e.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div>
              <Label htmlFor="dsMailContacto1">Email</Label>
              <Input
                id="dsMailContacto1"
                type="email"
                value={formData.dsMailContacto1}
                onChange={(e) => handleChange('dsMailContacto1', e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </CardContent>
        </Card>

        {/* Datos de Contacto 2 */}
        <Card>
          <CardHeader>
            <CardTitle>Datos de Contacto 2</CardTitle>
            <CardDescription>
              Información de un segundo contacto de emergencia (opcional)
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="dsNombreCompletoContacto2">Nombre Completo</Label>
              <Input
                id="dsNombreCompletoContacto2"
                value={formData.dsNombreCompletoContacto2}
                onChange={(e) => handleChange('dsNombreCompletoContacto2', e.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div>
              <Label htmlFor="dsParentescoContacto2">Parentesco</Label>
              <Input
                id="dsParentescoContacto2"
                value={formData.dsParentescoContacto2}
                onChange={(e) => handleChange('dsParentescoContacto2', e.target.value)}
                placeholder="Ej: Madre, Padre, Tutor"
              />
            </div>

            <div>
              <Label htmlFor="dsDNIContacto2">DNI</Label>
              <Input
                id="dsDNIContacto2"
                value={formData.dsDNIContacto2}
                onChange={(e) => handleChange('dsDNIContacto2', e.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div>
              <Label htmlFor="dsTelefonoContacto2">Teléfono</Label>
              <Input
                id="dsTelefonoContacto2"
                value={formData.dsTelefonoContacto2}
                onChange={(e) => handleChange('dsTelefonoContacto2', e.target.value)}
                placeholder="Opcional"
              />
            </div>

            <div>
              <Label htmlFor="dsMailContacto2">Email</Label>
              <Input
                id="dsMailContacto2"
                type="email"
                value={formData.dsMailContacto2}
                onChange={(e) => handleChange('dsMailContacto2', e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </CardContent>
        </Card>

        {/* Redes Sociales */}
        <Card>
          <CardHeader>
            <CardTitle>Redes Sociales</CardTitle>
            <CardDescription>
              Datos de redes sociales del alumno (opcional)
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dsInstagram">Instagram</Label>
              <Input
                id="dsInstagram"
                value={formData.dsInstagram}
                onChange={(e) => handleChange('dsInstagram', e.target.value)}
                placeholder="@usuario"
              />
            </div>
            <div>
              <Label htmlFor="dsFacebook">Facebook</Label>
              <Input
                id="dsFacebook"
                value={formData.dsFacebook}
                onChange={(e) => handleChange('dsFacebook', e.target.value)}
                placeholder="Nombre de usuario o URL"
              />
            </div>
          </CardContent>
        </Card>

        {/* Notificación de Pago */}
        <Card>
          <CardHeader>
            <CardTitle>Notificación de Pago</CardTitle>
            <CardDescription>
              Datos de contacto para notificaciones de pago
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dsMailNotificacion">Email</Label>
              <Input
                id="dsMailNotificacion"
                type="email"
                value={formData.dsMailNotificacion}
                onChange={(e) => handleChange('dsMailNotificacion', e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="dsWhatsappNotificacion">WhatsApp</Label>
              <Input
                id="dsWhatsappNotificacion"
                value={formData.dsWhatsappNotificacion}
                onChange={(e) => handleChange('dsWhatsappNotificacion', e.target.value)}
                placeholder="+54 9 11 1234-5678"
              />
            </div>
          </CardContent>
        </Card>

        {/* Talleres */}
        <Card>
          <CardHeader>
            <CardTitle>Inscripción a Talleres</CardTitle>
            <CardDescription>
              Selecciona los talleres a los que deseas inscribir al alumno (opcional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {talleres.length === 0 ? (
              <p className="text-gray-500 text-sm">No hay talleres activos disponibles</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto border rounded-lg p-4">
                {talleres.map((taller) => (
                  <div key={taller.cdTaller} className="flex items-start space-x-2">
                    <Checkbox
                      id={`taller-${taller.cdTaller}`}
                      checked={formData.talleres.includes(taller.cdTaller)}
                      onChange={() => handleTallerToggle(taller.cdTaller)}
                    />
                    <label
                      htmlFor={`taller-${taller.cdTaller}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {taller.dsNombreTaller} - {taller.nuAnioTaller}
                      {taller.nombrePersonal && (
                        <span className="block text-xs text-gray-500 font-normal mt-1">
                          Prof: {taller.nombrePersonal}
                        </span>
                      )}
                      <span className="block text-xs text-indigo-600 font-normal mt-1">
                        {formatHorarioTaller(taller)}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botones */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/dashboard/alumnos')}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={loading}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            {loading ? 'Guardando...' : 'Guardar Alumno'}
          </Button>
        </div>
      </form>
    </div>
  );
}
