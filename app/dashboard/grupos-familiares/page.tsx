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
} from 'lucide-react';

interface GrupoFamiliar {
  cdGrupoFamiliar: number;
  dsNombreGrupo: string;
  dsTelefonoContacto: string | null;
  dsParentesco1: string | null;
  dsMailContacto: string | null;
  dsTelefonoContacto2: string | null;
  dsParentesco2: string | null;
  dsMailContacto2: string | null;
  dsDomicilioFamiliar: string | null;
  dsEstado: string;
  cdEstado: number;
  cantidadMiembros: number;
  miembros: string | null;
}

export default function GruposFamiliaresPage() {
  const [grupos, setGrupos] = useState<GrupoFamiliar[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    dsNombreGrupo: '',
    dsTelefonoContacto: '',
    dsParentesco1: '',
    dsMailContacto: '',
    dsTelefonoContacto2: '',
    dsParentesco2: '',
    dsMailContacto2: '',
    dsDomicilioFamiliar: '',
    cdEstado: 1,
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/grupos-familiares');
      const data = await response.json();
      setGrupos(data.grupos);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setLoading(false);
    }
  };

  const handleOpenDialog = (grupo?: GrupoFamiliar) => {
    if (grupo) {
      setIsEditing(true);
      setCurrentId(grupo.cdGrupoFamiliar);
      setFormData({
        dsNombreGrupo: grupo.dsNombreGrupo,
        dsTelefonoContacto: grupo.dsTelefonoContacto || '',
        dsParentesco1: grupo.dsParentesco1 || '',
        dsMailContacto: grupo.dsMailContacto || '',
        dsTelefonoContacto2: grupo.dsTelefonoContacto2 || '',
        dsParentesco2: grupo.dsParentesco2 || '',
        dsMailContacto2: grupo.dsMailContacto2 || '',
        dsDomicilioFamiliar: grupo.dsDomicilioFamiliar || '',
        cdEstado: grupo.cdEstado,
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({
        dsNombreGrupo: '',
        dsTelefonoContacto: '',
        dsParentesco1: '',
        dsMailContacto: '',
        dsTelefonoContacto2: '',
        dsParentesco2: '',
        dsMailContacto2: '',
        dsDomicilioFamiliar: '',
        cdEstado: 1,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      const url = isEditing
        ? `/api/grupos-familiares/${currentId}`
        : '/api/grupos-familiares';
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
      setMessage({ type: 'error', text: 'Error al guardar el grupo familiar' });
    }
  };

  const handleDelete = async (cdGrupoFamiliar: number) => {
    if (!confirm('¿Estás seguro de desactivar este grupo familiar?')) return;

    try {
      const response = await fetch(`/api/grupos-familiares/${cdGrupoFamiliar}`, {
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
      setMessage({ type: 'error', text: 'Error al desactivar el grupo familiar' });
    }
  };

  const filteredGrupos = grupos.filter(
    (g) =>
      g.dsNombreGrupo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.miembros?.toLowerCase().includes(searchTerm.toLowerCase())
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
          Grupos Familiares
        </h1>
        <p className="text-gray-600 mt-2">
          Administra grupos familiares para organizar alumnos
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
                placeholder="Buscar grupo familiar..."
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
              Nuevo Grupo Familiar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            Grupos Registrados
          </CardTitle>
          <CardDescription>
            {filteredGrupos.length} grupo(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del Grupo</TableHead>
                <TableHead>Miembros</TableHead>
                <TableHead>Integrantes</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Domicilio</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGrupos.map((grupo) => (
                <TableRow key={grupo.cdGrupoFamiliar}>
                  <TableCell className="font-medium">
                    {grupo.dsNombreGrupo}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {grupo.cantidadMiembros} {grupo.cantidadMiembros === 1 ? 'miembro' : 'miembros'}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {grupo.miembros ? (
                      <div className="text-sm truncate" title={grupo.miembros}>
                        {grupo.miembros}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">Sin integrantes</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {grupo.dsTelefonoContacto && (
                        <div>{grupo.dsTelefonoContacto}</div>
                      )}
                      {grupo.dsMailContacto && (
                        <div className="text-gray-600 truncate max-w-[150px]">
                          {grupo.dsMailContacto}
                        </div>
                      )}
                      {!grupo.dsTelefonoContacto && !grupo.dsMailContacto && '-'}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {grupo.dsDomicilioFamiliar || '-'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        grupo.dsEstado === 'Activo'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {grupo.dsEstado}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(grupo)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {grupo.dsEstado === 'Activo' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(grupo.cdGrupoFamiliar)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredGrupos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No se encontraron grupos familiares
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Crear/Editar */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Grupo Familiar' : 'Nuevo Grupo Familiar'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Modifica los datos del grupo familiar'
                : 'Completa los datos para crear un nuevo grupo familiar'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="dsNombreGrupo">Nombre del Grupo *</Label>
                <Input
                  id="dsNombreGrupo"
                  value={formData.dsNombreGrupo}
                  onChange={(e) =>
                    setFormData({ ...formData, dsNombreGrupo: e.target.value })
                  }
                  placeholder="Ej: Familia Pérez"
                  required
                />
              </div>

              {/* Primer Contacto */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-sm mb-3 text-gray-700">Contacto 1</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="dsTelefonoContacto">Teléfono</Label>
                    <Input
                      id="dsTelefonoContacto"
                      value={formData.dsTelefonoContacto}
                      onChange={(e) =>
                        setFormData({ ...formData, dsTelefonoContacto: e.target.value })
                      }
                      placeholder="11 1234-5678"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="dsMailContacto">Email</Label>
                    <Input
                      id="dsMailContacto"
                      type="email"
                      value={formData.dsMailContacto}
                      onChange={(e) =>
                        setFormData({ ...formData, dsMailContacto: e.target.value })
                      }
                      placeholder="contacto1@ejemplo.com"
                    />
                  </div>
                </div>

                <div className="grid gap-2 mt-3">
                  <Label htmlFor="dsParentesco1">Parentesco</Label>
                  <Input
                    id="dsParentesco1"
                    value={formData.dsParentesco1}
                    onChange={(e) =>
                      setFormData({ ...formData, dsParentesco1: e.target.value })
                    }
                    placeholder="Madre, Padre, etc."
                  />
                </div>
              </div>

              {/* Segundo Contacto */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-sm mb-3 text-gray-700">Contacto 2 (Opcional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="dsTelefonoContacto2">Teléfono</Label>
                    <Input
                      id="dsTelefonoContacto2"
                      value={formData.dsTelefonoContacto2}
                      onChange={(e) =>
                        setFormData({ ...formData, dsTelefonoContacto2: e.target.value })
                      }
                      placeholder="11 9876-5432"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="dsMailContacto2">Email</Label>
                    <Input
                      id="dsMailContacto2"
                      type="email"
                      value={formData.dsMailContacto2}
                      onChange={(e) =>
                        setFormData({ ...formData, dsMailContacto2: e.target.value })
                      }
                      placeholder="contacto2@ejemplo.com"
                    />
                  </div>
                </div>

                <div className="grid gap-2 mt-3">
                  <Label htmlFor="dsParentesco2">Parentesco</Label>
                  <Input
                    id="dsParentesco2"
                    value={formData.dsParentesco2}
                    onChange={(e) =>
                      setFormData({ ...formData, dsParentesco2: e.target.value })
                    }
                    placeholder="Madre, Padre, etc."
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dsDomicilioFamiliar">Domicilio Familiar</Label>
                <Input
                  id="dsDomicilioFamiliar"
                  value={formData.dsDomicilioFamiliar}
                  onChange={(e) =>
                    setFormData({ ...formData, dsDomicilioFamiliar: e.target.value })
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
                {isEditing ? 'Guardar Cambios' : 'Crear Grupo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
