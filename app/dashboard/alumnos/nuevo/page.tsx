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

interface GrupoFamiliar {
  cdGrupoFamiliar: number;
  dsNombreGrupo: string;
  cantidadMiembros: number;
}

export default function NuevoAlumnoPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [gruposFamiliares, setGruposFamiliares] = useState<GrupoFamiliar[]>([]);

  const [formData, setFormData] = useState({
    dsNombre: '',
    dsApellido: '',
    dsDNI: '',
    dsSexo: '',
    feNacimiento: '',
    dsDomicilio: '',
    // Datos de contacto del alumno (opcionales)
    dsTelefonoCelular: '',
    dsTelefonoFijo: '',
    dsMail: '',
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
  });

  useEffect(() => {
    fetchGruposFamiliares();
  }, []);

  const fetchGruposFamiliares = async () => {
    try {
      const response = await fetch('/api/grupos-familiares');
      if (response.ok) {
        const data = await response.json();
        setGruposFamiliares(Array.isArray(data) ? data : []);
      } else {
        setGruposFamiliares([]);
      }
    } catch (err) {
      console.error('Error al cargar grupos familiares:', err);
      setGruposFamiliares([]);
    }
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

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
