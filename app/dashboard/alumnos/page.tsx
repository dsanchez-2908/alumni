'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  UserPlus,
  Edit,
  Trash2,
  Search,
  AlertCircle,
  CheckCircle,
  Users,
  Calendar,
} from 'lucide-react';

interface Alumno {
  cdAlumno: number;
  dsNombreCompleto: string;
  dsNombre: string;
  dsApellido: string;
  dsDNI: string;
  dsSexo: string;
  feNacimiento: string;
  edad: number;
  dsDomicilio: string | null;
  dsTelefonoCelular: string | null;
  dsTelefonoFijo: string | null;
  dsMail: string | null;
  cdGrupoFamiliar: number | null;
  dsGrupoFamiliar: string | null;
  dsEstado: string;
  cdEstado: number;
  talleres: string | null;
  feCreacion: string;
}

interface GrupoFamiliar {
  cdGrupoFamiliar: number;
  dsNombreGrupo: string;
  cantidadMiembros: number;
}

interface Taller {
  cdTaller: number;
  dsTaller: string;
  dsProfesor: string | null;
}

export default function AlumnosPage() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [gruposFamiliares, setGruposFamiliares] = useState<GrupoFamiliar[]>([]);
  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    dsNombre: '',
    dsApellido: '',
    dsDNI: '',
    dsSexo: 'Masculino' as 'Masculino' | 'Femenino',
    feNacimiento: '',
    dsDomicilio: '',
    dsTelefonoCelular: '',
    dsTelefonoFijo: '',
    dsMail: '',
    cdGrupoFamiliar: null as number | null,
    talleres: [] as number[],
    cdEstado: 1,
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/alumnos');
      const data = await response.json();
      setAlumnos(data.alumnos);
      setGruposFamiliares(data.gruposFamiliares);
      setTalleres(data.talleres);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setLoading(false);
    }
  };

  const handleOpenDialog = async (alumno?: Alumno) => {
    if (alumno) {
      setIsEditing(true);
      setCurrentId(alumno.cdAlumno);
      
      // Obtener talleres inscritos
      try {
        const response = await fetch(`/api/alumnos/${alumno.cdAlumno}`);
        const data = await response.json();
        
        setFormData({
          dsNombre: alumno.dsNombre,
          dsApellido: alumno.dsApellido,
          dsDNI: alumno.dsDNI,
          dsSexo: alumno.dsSexo as 'Masculino' | 'Femenino',
          feNacimiento: alumno.feNacimiento.split('T')[0],
          dsDomicilio: alumno.dsDomicilio || '',
          dsTelefonoCelular: alumno.dsTelefonoCelular || '',
          dsTelefonoFijo: alumno.dsTelefonoFijo || '',
          dsMail: alumno.dsMail || '',
          cdGrupoFamiliar: alumno.cdGrupoFamiliar,
          talleres: data.talleresIds || [],
          cdEstado: alumno.cdEstado,
        });
      } catch (error) {
        console.error('Error al cargar datos del alumno:', error);
      }
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({
        dsNombre: '',
        dsApellido: '',
        dsDNI: '',
        dsSexo: 'Masculino',
        feNacimiento: '',
        dsDomicilio: '',
        dsTelefonoCelular: '',
        dsTelefonoFijo: '',
        dsMail: '',
        cdGrupoFamiliar: null,
        talleres: [],
        cdEstado: 1,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      const url = isEditing ? `/api/alumnos/${currentId}` : '/api/alumnos';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setIsDialogOpen(false);
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar el alumno' });
    }
  };

  const handleDelete = async (cdAlumno: number) => {
    if (!confirm('¿Estás seguro de desactivar este alumno?')) return;

    try {
      const response = await fetch(`/api/alumnos/${cdAlumno}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        fetchData();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al desactivar el alumno' });
    }
  };

  const handleTallerToggle = (cdTaller: number) => {
    setFormData((prev) => ({
      ...prev,
      talleres: prev.talleres.includes(cdTaller)
        ? prev.talleres.filter((t) => t !== cdTaller)
        : [...prev.talleres, cdTaller],
    }));
  };

  const filteredAlumnos = alumnos.filter(
    (a) =>
      a.dsNombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.dsDNI.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.dsGrupoFamiliar?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.talleres?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
          Consulta de Alumnos
        </h1>
        <p className="text-gray-600 mt-2">
          Visualiza y administra la información de los alumnos
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-2 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar alumno, documento, grupo familiar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Alumnos
            </CardTitle>
            <Users className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{alumnos.filter(a => a.cdEstado === 1).length}</div>
            <p className="text-xs text-gray-600">Alumnos activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Grupos Familiares
            </CardTitle>
            <Users className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gruposFamiliares.length}</div>
            <p className="text-xs text-gray-600">Familias registradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Edad Promedio
            </CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {alumnos.length > 0
                ? Math.round(alumnos.reduce((sum, a) => sum + a.edad, 0) / alumnos.length)
                : 0}
            </div>
            <p className="text-xs text-gray-600">Años</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Alumnos Registrados
          </CardTitle>
          <CardDescription>
            {filteredAlumnos.length} alumno(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Edad</TableHead>
                <TableHead>Grupo Familiar</TableHead>
                <TableHead>Talleres</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlumnos.map((alumno) => (
                <TableRow key={alumno.cdAlumno}>
                  <TableCell className="font-medium">
                    {alumno.dsNombreCompleto}
                  </TableCell>
                  <TableCell>{alumno.dsDNI}</TableCell>
                  <TableCell>{alumno.edad} años</TableCell>
                  <TableCell>
                    {alumno.dsGrupoFamiliar ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {alumno.dsGrupoFamiliar}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {alumno.talleres || (
                      <span className="text-gray-400">Sin talleres</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {alumno.dsTelefonoCelular && <div>{alumno.dsTelefonoCelular}</div>}
                      {alumno.dsTelefonoFijo && <div className="text-gray-600">{alumno.dsTelefonoFijo}</div>}
                      {alumno.dsMail && (
                        <div className="text-gray-600 truncate max-w-[150px]">
                          {alumno.dsMail}
                        </div>
                      )}
                      {!alumno.dsTelefonoCelular && !alumno.dsTelefonoFijo && !alumno.dsMail && '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        alumno.dsEstado === 'Activo'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {alumno.dsEstado}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(alumno)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {alumno.dsEstado === 'Activo' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(alumno.cdAlumno)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredAlumnos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No se encontraron alumnos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Crear/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Alumno' : 'Nuevo Alumno'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Modifica los datos del alumno'
                : 'Completa los datos para agregar un nuevo alumno'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Datos Personales */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-lg mb-3">Datos Personales</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="dsNombre">Nombre *</Label>
                    <Input
                      id="dsNombre"
                      value={formData.dsNombre}
                      onChange={(e) =>
                        setFormData({ ...formData, dsNombre: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="dsApellido">Apellido *</Label>
                    <Input
                      id="dsApellido"
                      value={formData.dsApellido}
                      onChange={(e) =>
                        setFormData({ ...formData, dsApellido: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="dsDNI">DNI *</Label>
                    <Input
                      id="dsDNI"
                      value={formData.dsDNI}
                      onChange={(e) =>
                        setFormData({ ...formData, dsDNI: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="dsSexo">Sexo *</Label>
                    <Select
                      value={formData.dsSexo}
                      onValueChange={(value: 'Masculino' | 'Femenino') =>
                        setFormData({ ...formData, dsSexo: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Femenino">Femenino</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2 col-span-2">
                    <Label htmlFor="feNacimiento">Fecha de Nacimiento *</Label>
                    <Input
                      id="feNacimiento"
                      type="date"
                      value={formData.feNacimiento}
                      onChange={(e) =>
                        setFormData({ ...formData, feNacimiento: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Contacto */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-lg mb-3">Datos de Contacto</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="dsTelefonoCelular">Teléfono Celular</Label>
                    <Input
                      id="dsTelefonoCelular"
                      value={formData.dsTelefonoCelular}
                      onChange={(e) =>
                        setFormData({ ...formData, dsTelefonoCelular: e.target.value })
                      }
                      placeholder="11 1234-5678"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="dsTelefonoFijo">Teléfono Fijo</Label>
                    <Input
                      id="dsTelefonoFijo"
                      value={formData.dsTelefonoFijo}
                      onChange={(e) =>
                        setFormData({ ...formData, dsTelefonoFijo: e.target.value })
                      }
                      placeholder="011 4567-8901"
                    />
                  </div>

                  <div className="col-span-2 grid gap-2">
                    <Label htmlFor="dsMail">Email</Label>
                    <Input
                      id="dsMail"
                      type="email"
                      value={formData.dsMail}
                      onChange={(e) =>
                        setFormData({ ...formData, dsMail: e.target.value })
                      }
                      placeholder="correo@ejemplo.com"
                    />
                  </div>

                  <div className="col-span-2 grid gap-2">
                    <Label htmlFor="dsDomicilio">Domicilio</Label>
                    <Input
                      id="dsDomicilio"
                      value={formData.dsDomicilio}
                      onChange={(e) =>
                        setFormData({ ...formData, dsDomicilio: e.target.value })
                      }
                      placeholder="Dirección completa"
                    />
                  </div>
                </div>
              </div>

              {/* Grupo Familiar */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-lg mb-3">Grupo Familiar</h3>
                <div className="grid gap-2">
                  <Label htmlFor="cdGrupoFamiliar">Grupo Familiar (opcional)</Label>
                  <Select
                    value={formData.cdGrupoFamiliar?.toString() || '0'}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        cdGrupoFamiliar: value !== '0' ? parseInt(value) : null,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin grupo familiar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sin grupo familiar</SelectItem>
                      {gruposFamiliares.map((gf) => (
                        <SelectItem
                          key={gf.cdGrupoFamiliar}
                          value={gf.cdGrupoFamiliar.toString()}
                        >
                          {gf.dsNombreGrupo} ({gf.cantidadMiembros} miembros)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Talleres */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-lg mb-3">Talleres</h3>
                <div className="grid gap-2">
                  <Label>Talleres a inscribir (opcional)</Label>
                  <div className="grid grid-cols-2 gap-2 border rounded-lg p-4 max-h-48 overflow-y-auto">
                    {talleres.map((taller) => (
                      <div key={taller.cdTaller} className="flex items-center space-x-2">
                        <Checkbox
                          id={`taller-${taller.cdTaller}`}
                          checked={formData.talleres.includes(taller.cdTaller)}
                          onChange={() => handleTallerToggle(taller.cdTaller)}
                        />
                        <label
                          htmlFor={`taller-${taller.cdTaller}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {taller.dsTaller}
                          {taller.dsProfesor && (
                            <span className="text-gray-500 block text-xs">
                              Prof: {taller.dsProfesor}
                            </span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                  {talleres.length === 0 && (
                    <p className="text-sm text-amber-600">
                      No hay talleres disponibles. Crea talleres primero.
                    </p>
                  )}
                </div>
              </div>

              {/* Estado */}
              {isEditing && (
                <div className="grid gap-2">
                  <Label htmlFor="cdEstado">Estado</Label>
                  <Select
                    value={formData.cdEstado.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, cdEstado: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Activo</SelectItem>
                      <SelectItem value="2">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
              >
                {isEditing ? 'Guardar Cambios' : 'Crear Alumno'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
