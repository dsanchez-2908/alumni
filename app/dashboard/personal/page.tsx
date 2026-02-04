'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  GraduationCap,
  Eye,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Personal {
  cdPersonal: number;
  dsNombreCompleto: string;
  dsTipoPersonal: 'Profesor' | 'Auxiliar';
  dsDescripcionPuesto: string;
  dsDomicilio: string;
  dsTelefono: string;
  dsMail: string;
  feNacimiento: string;
  dsDni: string;
  dsCuil: string;
  dsEntidad: string;
  dsCbuCvu: string;
  dsObservaciones: string;
  dsEstado: string;
  cdEstado: number;
  talleres: string;
  talleresIds: string;
  feCreacion: string;
}

interface TipoTaller {
  cdTipoTaller: number;
  dsNombreTaller: string;
}

export default function PersonalPage() {
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [tiposTalleres, setTiposTalleres] = useState<TipoTaller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingPersonal, setViewingPersonal] = useState<Personal | null>(null);

  const [formData, setFormData] = useState({
    dsNombreCompleto: '',
    dsTipoPersonal: 'Profesor' as 'Profesor' | 'Auxiliar',
    dsDescripcionPuesto: '',
    dsDomicilio: '',
    dsTelefono: '',
    dsMail: '',
    feNacimiento: '',
    dsDni: '',
    dsCuil: '',
    dsEntidad: '',
    dsCbuCvu: '',
    dsObservaciones: '',
    talleres: [] as number[],
    cdEstado: 1,
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/personal');
      const data = await response.json();
      setPersonal(data.personal);
      setTiposTalleres(data.tiposTalleres);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setLoading(false);
    }
  };

  const handleOpenDialog = (pers?: Personal) => {
    if (pers) {
      setIsEditing(true);
      setCurrentId(pers.cdPersonal);
      setFormData({
        dsNombreCompleto: pers.dsNombreCompleto,
        dsTipoPersonal: pers.dsTipoPersonal,
        dsDescripcionPuesto: pers.dsDescripcionPuesto || '',
        dsDomicilio: pers.dsDomicilio || '',
        dsTelefono: pers.dsTelefono || '',
        dsMail: pers.dsMail || '',
        feNacimiento: pers.feNacimiento ? new Date(pers.feNacimiento).toISOString().split('T')[0] : '',
        dsDni: pers.dsDni || '',
        dsCuil: pers.dsCuil || '',
        dsEntidad: pers.dsEntidad || '',
        dsCbuCvu: pers.dsCbuCvu || '',
        dsObservaciones: pers.dsObservaciones || '',
        talleres: pers.talleresIds ? pers.talleresIds.split(',').map(Number) : [],
        cdEstado: pers.cdEstado,
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({
        dsNombreCompleto: '',
        dsTipoPersonal: 'Profesor',
        dsDescripcionPuesto: '',
        dsDomicilio: '',
        dsTelefono: '',
        dsMail: '',
        feNacimiento: '',
        dsDni: '',
        dsCuil: '',
        dsEntidad: '',
        dsCbuCvu: '',
        dsObservaciones: '',
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
      const url = isEditing ? `/api/personal/${currentId}` : '/api/personal';
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
      setMessage({ type: 'error', text: 'Error al guardar el personal' });
    }
  };

  const handleDelete = async (cdPersonal: number) => {
    setConfirmDialog({
      open: true,
      title: 'Desactivar Personal',
      description: '¿Estás seguro de que deseas desactivar este personal? Esta acción no se puede deshacer.',
      onConfirm: () => deleteConfirmado(cdPersonal),
    });
  };

  const deleteConfirmado = async (cdPersonal: number) => {
    try {
      const response = await fetch(`/api/personal/${cdPersonal}`, {
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
      setMessage({ type: 'error', text: 'Error al desactivar el personal' });
    }
  };

  const handleTallerToggle = (cdTipoTaller: number) => {
    setFormData((prev) => ({
      ...prev,
      talleres: prev.talleres.includes(cdTipoTaller)
        ? prev.talleres.filter((t) => t !== cdTipoTaller)
        : [...prev.talleres, cdTipoTaller],
    }));
  };

  const handleViewPersonal = (pers: Personal) => {
    setViewingPersonal(pers);
    setIsViewDialogOpen(true);
  };

  const filteredPersonal = personal.filter(
    (p) =>
      p.dsNombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.dsTipoPersonal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.talleres?.toLowerCase().includes(searchTerm.toLowerCase())
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
          Gestión de Personal
        </h1>
        <p className="text-gray-600 mt-2">
          Administra profesores y personal auxiliar
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
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar personal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Nuevo Personal
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            Personal Registrado
          </CardTitle>
          <CardDescription>
            {filteredPersonal.length} persona(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Talleres/Puesto</TableHead>
                <TableHead>Fecha Nac.</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPersonal.map((pers) => (
                <TableRow key={pers.cdPersonal}>
                  <TableCell className="font-medium">
                    {pers.dsNombreCompleto}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        pers.dsTipoPersonal === 'Profesor'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {pers.dsTipoPersonal}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {pers.dsTipoPersonal === 'Profesor'
                      ? pers.talleres || 'Sin talleres'
                      : pers.dsDescripcionPuesto || '-'}
                  </TableCell>
                  <TableCell>
                    {pers.feNacimiento ? new Date(pers.feNacimiento).toLocaleDateString('es-AR') : '-'}
                  </TableCell>
                  <TableCell>{pers.dsTelefono || '-'}</TableCell>
                  <TableCell>{pers.dsMail || '-'}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        pers.dsEstado === 'Activo'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {pers.dsEstado}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewPersonal(pers)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(pers)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {pers.dsEstado === 'Activo' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(pers.cdPersonal)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredPersonal.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    No se encontró personal
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Crear/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Personal' : 'Nuevo Personal'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Modifica los datos del personal'
                : 'Completa los datos para agregar nuevo personal'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="dsNombreCompleto">Nombre Completo *</Label>
                <Input
                  id="dsNombreCompleto"
                  value={formData.dsNombreCompleto}
                  onChange={(e) =>
                    setFormData({ ...formData, dsNombreCompleto: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dsTipoPersonal">Tipo de Personal *</Label>
                <Select
                  value={formData.dsTipoPersonal}
                  onValueChange={(value: 'Profesor' | 'Auxiliar') =>
                    setFormData({ ...formData, dsTipoPersonal: value, talleres: [] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Profesor">Profesor</SelectItem>
                    <SelectItem value="Auxiliar">Auxiliar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.dsTipoPersonal === 'Profesor' ? (
                <div className="grid gap-2">
                  <Label>Talleres que Dicta * (selecciona al menos uno)</Label>
                  <div className="grid grid-cols-2 gap-2 border rounded-lg p-4 max-h-48 overflow-y-auto">
                    {tiposTalleres.map((taller) => (
                      <div key={taller.cdTipoTaller} className="flex items-center space-x-2">
                        <Checkbox
                          id={`taller-${taller.cdTipoTaller}`}
                          checked={formData.talleres.includes(taller.cdTipoTaller)}
                          onChange={() => handleTallerToggle(taller.cdTipoTaller)}
                        />
                        <label
                          htmlFor={`taller-${taller.cdTipoTaller}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {taller.dsNombreTaller}
                        </label>
                      </div>
                    ))}
                  </div>
                  {tiposTalleres.length === 0 && (
                    <p className="text-sm text-amber-600">
                      No hay tipos de talleres disponibles. Crea algunos primero.
                    </p>
                  )}
                </div>
              ) : (
                <div className="grid gap-2">
                  <Label htmlFor="dsDescripcionPuesto">Descripción del Puesto</Label>
                  <Input
                    id="dsDescripcionPuesto"
                    value={formData.dsDescripcionPuesto}
                    onChange={(e) =>
                      setFormData({ ...formData, dsDescripcionPuesto: e.target.value })
                    }
                    placeholder="Ej: Asistente administrativo, Mantenimiento"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="dsTelefono">Teléfono</Label>
                  <Input
                    id="dsTelefono"
                    value={formData.dsTelefono}
                    onChange={(e) =>
                      setFormData({ ...formData, dsTelefono: e.target.value })
                    }
                    placeholder="Ej: 11 1234-5678"
                  />
                </div>
                <div className="grid gap-2">
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
              </div>

              <div className="grid gap-2">
                <Label htmlFor="feNacimiento">Fecha de Nacimiento</Label>
                <Input
                  id="feNacimiento"
                  type="date"
                  value={formData.feNacimiento}
                  onChange={(e) =>
                    setFormData({ ...formData, feNacimiento: e.target.value })
                  }
                />
              </div>

              <div className="grid gap-2">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="dsDni">DNI</Label>
                  <Input
                    id="dsDni"
                    value={formData.dsDni}
                    onChange={(e) =>
                      setFormData({ ...formData, dsDni: e.target.value })
                    }
                    placeholder="12345678"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dsCuil">CUIL</Label>
                  <Input
                    id="dsCuil"
                    value={formData.dsCuil}
                    onChange={(e) =>
                      setFormData({ ...formData, dsCuil: e.target.value })
                    }
                    placeholder="20-12345678-9"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dsEntidad">Entidad</Label>
                <Input
                  id="dsEntidad"
                  value={formData.dsEntidad}
                  onChange={(e) =>
                    setFormData({ ...formData, dsEntidad: e.target.value })
                  }
                  placeholder="Nombre de la entidad bancaria"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dsCbuCvu">CBU/CVU</Label>
                <Input
                  id="dsCbuCvu"
                  value={formData.dsCbuCvu}
                  onChange={(e) =>
                    setFormData({ ...formData, dsCbuCvu: e.target.value })
                  }
                  placeholder="0000003100010000000000"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dsObservaciones">Observaciones</Label>
                <Textarea
                  id="dsObservaciones"
                  value={formData.dsObservaciones}
                  onChange={(e) =>
                    setFormData({ ...formData, dsObservaciones: e.target.value })
                  }
                  placeholder="Observaciones adicionales..."
                  rows={3}
                />
              </div>

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
                {isEditing ? 'Guardar Cambios' : 'Crear Personal'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Ver Detalles */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Detalles del Personal
            </DialogTitle>
            <DialogDescription>
              Información completa del registro
            </DialogDescription>
          </DialogHeader>
          {viewingPersonal && (
            <div className="grid gap-6 py-4">
              {/* Información Básica */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Información Básica
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600 text-sm">Nombre Completo</Label>
                    <p className="font-medium text-gray-900 mt-1">
                      {viewingPersonal.dsNombreCompleto}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm">Tipo de Personal</Label>
                    <p className="mt-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          viewingPersonal.dsTipoPersonal === 'Profesor'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {viewingPersonal.dsTipoPersonal}
                      </span>
                    </p>
                  </div>
                </div>
                {viewingPersonal.dsTipoPersonal === 'Profesor' ? (
                  <div>
                    <Label className="text-gray-600 text-sm">Talleres que Dicta</Label>
                    <p className="font-medium text-gray-900 mt-1">
                      {viewingPersonal.talleres || 'Sin talleres'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <Label className="text-gray-600 text-sm">Descripción del Puesto</Label>
                    <p className="font-medium text-gray-900 mt-1">
                      {viewingPersonal.dsDescripcionPuesto || '-'}
                    </p>
                  </div>
                )}
                <div>
                  <Label className="text-gray-600 text-sm">Estado</Label>
                  <p className="mt-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        viewingPersonal.dsEstado === 'Activo'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {viewingPersonal.dsEstado}
                    </span>
                  </p>
                </div>
              </div>

              {/* Datos de Contacto */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Datos de Contacto
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600 text-sm">Teléfono</Label>
                    <p className="font-medium text-gray-900 mt-1">
                      {viewingPersonal.dsTelefono || '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm">Email</Label>
                    <p className="font-medium text-gray-900 mt-1">
                      {viewingPersonal.dsMail || '-'}
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-600 text-sm">Domicilio</Label>
                  <p className="font-medium text-gray-900 mt-1">
                    {viewingPersonal.dsDomicilio || '-'}
                  </p>
                </div>
              </div>

              {/* Datos Personales */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Datos Personales
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600 text-sm">Fecha de Nacimiento</Label>
                    <p className="font-medium text-gray-900 mt-1">
                      {viewingPersonal.feNacimiento 
                        ? new Date(viewingPersonal.feNacimiento).toLocaleDateString('es-AR')
                        : '-'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600 text-sm">DNI</Label>
                    <p className="font-medium text-gray-900 mt-1">
                      {viewingPersonal.dsDni || '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm">CUIL</Label>
                    <p className="font-medium text-gray-900 mt-1">
                      {viewingPersonal.dsCuil || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Datos Bancarios */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                  Datos Bancarios
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600 text-sm">Entidad</Label>
                    <p className="font-medium text-gray-900 mt-1">
                      {viewingPersonal.dsEntidad || '-'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600 text-sm">CBU/CVU</Label>
                    <p className="font-medium text-gray-900 mt-1 font-mono text-sm">
                      {viewingPersonal.dsCbuCvu || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              {viewingPersonal.dsObservaciones && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                    Observaciones
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {viewingPersonal.dsObservaciones}
                    </p>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="space-y-2 pt-4 border-t">
                <div className="text-xs text-gray-500">
                  <span className="font-medium">Fecha de Creación:</span>{' '}
                  {new Date(viewingPersonal.feCreacion).toLocaleString('es-AR')}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              onClick={() => setIsViewDialogOpen(false)}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        variant="destructive"
      />
    </div>
  );
}
