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
  GraduationCap,
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

  const [formData, setFormData] = useState({
    dsNombreCompleto: '',
    dsTipoPersonal: 'Profesor' as 'Profesor' | 'Auxiliar',
    dsDescripcionPuesto: '',
    dsDomicilio: '',
    dsTelefono: '',
    dsMail: '',
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
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
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
