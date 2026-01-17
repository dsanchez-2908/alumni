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
  Plus,
  Edit,
  Trash2,
  Search,
  AlertCircle,
  CheckCircle,
  BookOpen,
} from 'lucide-react';

interface TipoTaller {
  cdTipoTaller: number;
  dsNombreTaller: string;
  dsDescripcionTaller: string;
  nuEdadDesde: number;
  nuEdadHasta: number;
  dsEstado: string;
  cdEstado: number;
  feCreacion: string;
}

export default function TipoTalleresPage() {
  const [tiposTalleres, setTiposTalleres] = useState<TipoTaller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    dsNombreTaller: '',
    dsDescripcionTaller: '',
    nuEdadDesde: '',
    nuEdadHasta: '',
    cdEstado: 1,
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/tipo-talleres');
      const data = await response.json();
      setTiposTalleres(data.tiposTalleres);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setLoading(false);
    }
  };

  const handleOpenDialog = (tipoTaller?: TipoTaller) => {
    if (tipoTaller) {
      setIsEditing(true);
      setCurrentId(tipoTaller.cdTipoTaller);
      setFormData({
        dsNombreTaller: tipoTaller.dsNombreTaller,
        dsDescripcionTaller: tipoTaller.dsDescripcionTaller || '',
        nuEdadDesde: tipoTaller.nuEdadDesde?.toString() || '',
        nuEdadHasta: tipoTaller.nuEdadHasta?.toString() || '',
        cdEstado: tipoTaller.cdEstado,
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({
        dsNombreTaller: '',
        dsDescripcionTaller: '',
        nuEdadDesde: '',
        nuEdadHasta: '',
        cdEstado: 1,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      const url = isEditing ? `/api/tipo-talleres/${currentId}` : '/api/tipo-talleres';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          nuEdadDesde: formData.nuEdadDesde ? parseInt(formData.nuEdadDesde) : null,
          nuEdadHasta: formData.nuEdadHasta ? parseInt(formData.nuEdadHasta) : null,
        }),
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
      setMessage({ type: 'error', text: 'Error al guardar el tipo de taller' });
    }
  };

  const handleDelete = async (cdTipoTaller: number) => {
    if (!confirm('¿Estás seguro de desactivar este tipo de taller?')) return;

    try {
      const response = await fetch(`/api/tipo-talleres/${cdTipoTaller}`, {
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
      setMessage({ type: 'error', text: 'Error al desactivar el tipo de taller' });
    }
  };

  const filteredTiposTalleres = tiposTalleres.filter(
    (tt) =>
      tt.dsNombreTaller.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tt.dsDescripcionTaller?.toLowerCase().includes(searchTerm.toLowerCase())
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
          Tipos de Talleres
        </h1>
        <p className="text-gray-600 mt-2">
          Gestiona los diferentes tipos de talleres disponibles
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
                placeholder="Buscar tipos de talleres..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Tipo de Taller
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            Tipos de Talleres Registrados
          </CardTitle>
          <CardDescription>
            {filteredTiposTalleres.length} tipo(s) de taller encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Edad Desde</TableHead>
                <TableHead>Edad Hasta</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTiposTalleres.map((tipoTaller) => (
                <TableRow key={tipoTaller.cdTipoTaller}>
                  <TableCell className="font-medium">
                    {tipoTaller.dsNombreTaller}
                  </TableCell>
                  <TableCell className="max-w-md truncate">
                    {tipoTaller.dsDescripcionTaller || '-'}
                  </TableCell>
                  <TableCell>{tipoTaller.nuEdadDesde || '-'}</TableCell>
                  <TableCell>{tipoTaller.nuEdadHasta || '-'}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tipoTaller.dsEstado === 'Activo'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {tipoTaller.dsEstado}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(tipoTaller)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {tipoTaller.dsEstado === 'Activo' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(tipoTaller.cdTipoTaller)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredTiposTalleres.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No se encontraron tipos de talleres
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
              {isEditing ? 'Editar Tipo de Taller' : 'Nuevo Tipo de Taller'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Modifica los datos del tipo de taller'
                : 'Completa los datos para crear un nuevo tipo de taller'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="dsNombreTaller">Nombre del Taller *</Label>
                <Input
                  id="dsNombreTaller"
                  value={formData.dsNombreTaller}
                  onChange={(e) =>
                    setFormData({ ...formData, dsNombreTaller: e.target.value })
                  }
                  placeholder="Ej: Teatro, Baile, Canto, Pintura"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dsDescripcionTaller">Descripción</Label>
                <Input
                  id="dsDescripcionTaller"
                  value={formData.dsDescripcionTaller}
                  onChange={(e) =>
                    setFormData({ ...formData, dsDescripcionTaller: e.target.value })
                  }
                  placeholder="Descripción del taller"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="nuEdadDesde">Edad Desde</Label>
                  <Input
                    id="nuEdadDesde"
                    type="number"
                    min="0"
                    value={formData.nuEdadDesde}
                    onChange={(e) =>
                      setFormData({ ...formData, nuEdadDesde: e.target.value })
                    }
                    placeholder="Edad mínima"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nuEdadHasta">Edad Hasta</Label>
                  <Input
                    id="nuEdadHasta"
                    type="number"
                    min="0"
                    value={formData.nuEdadHasta}
                    onChange={(e) =>
                      setFormData({ ...formData, nuEdadHasta: e.target.value })
                    }
                    placeholder="Edad máxima"
                  />
                </div>
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
                {isEditing ? 'Guardar Cambios' : 'Crear Tipo de Taller'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
