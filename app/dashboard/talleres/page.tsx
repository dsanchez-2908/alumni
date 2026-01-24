'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Pencil, Trash2, Calendar, Users, Eye, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Taller {
  cdTaller: number;
  nuAnioTaller: number;
  cdTipoTaller: number;
  cdPersonal: number;
  feInicioTaller: string;
  dsDescripcionHorarios: string | null;
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
  cdEstado: number;
  dsEstado: string;
  dsNombreTaller: string;
  nombrePersonal: string;
  cantidadAlumnos: number;
}

interface TipoTaller {
  cdTipoTaller: number;
  dsNombreTaller: string;
}

interface Personal {
  cdPersonal: number;
  dsNombreCompleto: string;
}

export default function TalleresPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [tiposTaller, setTiposTaller] = useState<TipoTaller[]>([]);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('Activo');

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const [formData, setFormData] = useState({
    nuAnioTaller: new Date().getFullYear(),
    cdTipoTaller: 0,
    cdPersonal: 0,
    feInicioTaller: '',
    dsDescripcionHorarios: '',
    snLunes: false,
    dsLunesHoraDesde: '',
    dsLunesHoraHasta: '',
    snMartes: false,
    dsMartesHoraDesde: '',
    dsMartesHoraHasta: '',
    snMiercoles: false,
    dsMiercolesHoraDesde: '',
    dsMiercolesHoraHasta: '',
    snJueves: false,
    dsJuevesHoraDesde: '',
    dsJuevesHoraHasta: '',
    snViernes: false,
    dsViernesHoraDesde: '',
    dsViernesHoraHasta: '',
    snSabado: false,
    dsSabadoHoraDesde: '',
    dsSabadoHoraHasta: '',
    snDomingo: false,
    dsDomingoHoraDesde: '',
    dsDomingoHoraHasta: '',
    cdEstado: 1,
  });

  const diasSemana = [
    { key: 'Lunes', label: 'Lunes' },
    { key: 'Martes', label: 'Martes' },
    { key: 'Miercoles', label: 'Miércoles' },
    { key: 'Jueves', label: 'Jueves' },
    { key: 'Viernes', label: 'Viernes' },
    { key: 'Sabado', label: 'Sábado' },
    { key: 'Domingo', label: 'Domingo' },
  ];

  useEffect(() => {
    fetchTalleres();
    fetchTiposTaller();
    fetchPersonal();
  }, []);

  const fetchTalleres = async () => {
    try {
      const response = await fetch('/api/talleres');
      if (response.ok) {
        const data = await response.json();
        setTalleres(data);
      }
    } catch (error) {
      console.error('Error al cargar talleres:', error);
    }
  };

  const fetchTiposTaller = async () => {
    try {
      const response = await fetch('/api/tipos-taller');
      if (response.ok) {
        const data = await response.json();
        setTiposTaller(data);
      }
    } catch (error) {
      console.error('Error al cargar tipos de taller:', error);
    }
  };

  const fetchPersonal = async () => {
    try {
      const response = await fetch('/api/personal');
      if (response.ok) {
        const data = await response.json();
        setPersonal(data.personal || []);
      }
    } catch (error) {
      console.error('Error al cargar personal:', error);
    }
  };

  const handleOpenDialog = (taller?: Taller) => {
    if (taller) {
      setIsEditing(true);
      setCurrentId(taller.cdTaller);
      setFormData({
        nuAnioTaller: taller.nuAnioTaller,
        cdTipoTaller: taller.cdTipoTaller,
        cdPersonal: taller.cdPersonal,
        feInicioTaller: taller.feInicioTaller.split('T')[0],
        dsDescripcionHorarios: taller.dsDescripcionHorarios || '',
        snLunes: taller.snLunes,
        dsLunesHoraDesde: taller.dsLunesHoraDesde || '',
        dsLunesHoraHasta: taller.dsLunesHoraHasta || '',
        snMartes: taller.snMartes,
        dsMartesHoraDesde: taller.dsMartesHoraDesde || '',
        dsMartesHoraHasta: taller.dsMartesHoraHasta || '',
        snMiercoles: taller.snMiercoles,
        dsMiercolesHoraDesde: taller.dsMiercolesHoraDesde || '',
        dsMiercolesHoraHasta: taller.dsMiercolesHoraHasta || '',
        snJueves: taller.snJueves,
        dsJuevesHoraDesde: taller.dsJuevesHoraDesde || '',
        dsJuevesHoraHasta: taller.dsJuevesHoraHasta || '',
        snViernes: taller.snViernes,
        dsViernesHoraDesde: taller.dsViernesHoraDesde || '',
        dsViernesHoraHasta: taller.dsViernesHoraHasta || '',
        snSabado: taller.snSabado,
        dsSabadoHoraDesde: taller.dsSabadoHoraDesde || '',
        dsSabadoHoraHasta: taller.dsSabadoHoraHasta || '',
        snDomingo: taller.snDomingo,
        dsDomingoHoraDesde: taller.dsDomingoHoraDesde || '',
        dsDomingoHoraHasta: taller.dsDomingoHoraHasta || '',
        cdEstado: taller.cdEstado,
      });
    } else {
      setIsEditing(false);
      setCurrentId(null);
      setFormData({
        nuAnioTaller: new Date().getFullYear(),
        cdTipoTaller: 0,
        cdPersonal: 0,
        feInicioTaller: '',
        dsDescripcionHorarios: '',
        snLunes: false,
        dsLunesHoraDesde: '',
        dsLunesHoraHasta: '',
        snMartes: false,
        dsMartesHoraDesde: '',
        dsMartesHoraHasta: '',
        snMiercoles: false,
        dsMiercolesHoraDesde: '',
        dsMiercolesHoraHasta: '',
        snJueves: false,
        dsJuevesHoraDesde: '',
        dsJuevesHoraHasta: '',
        snViernes: false,
        dsViernesHoraDesde: '',
        dsViernesHoraHasta: '',
        snSabado: false,
        dsSabadoHoraDesde: '',
        dsSabadoHoraHasta: '',
        snDomingo: false,
        dsDomingoHoraDesde: '',
        dsDomingoHoraHasta: '',
        cdEstado: 1,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEditing ? `/api/talleres/${currentId}` : '/api/talleres';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        success(isEditing ? 'Taller actualizado correctamente' : 'Taller creado correctamente');
        setIsDialogOpen(false);
        fetchTalleres();
      } else {
        const errorData = await response.json();
        error(errorData.error || 'Ocurrió un error');
      }
    } catch (err) {
      error('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cdTaller: number) => {
    setConfirmDialog({
      open: true,
      title: 'Eliminar Taller',
      description: '¿Está seguro de eliminar este taller? Esta acción eliminará también las inscripciones y registros de asistencia asociados.',
      onConfirm: () => deleteConfirmado(cdTaller),
    });
  };

  const deleteConfirmado = async (cdTaller: number) => {
    try {
      const response = await fetch(`/api/talleres/${cdTaller}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        success('Taller eliminado correctamente');
        fetchTalleres();
      } else {
        const errorData = await response.json();
        error(errorData.error || 'No se pudo eliminar el taller');
      }
    } catch (err) {
      error('Error de conexión');
    }
  };

  const formatHorario = (taller: Taller) => {
    const dias: string[] = [];
    diasSemana.forEach(({ key }) => {
      const snKey = `sn${key}` as keyof Taller;
      const horaDesdeKey = `ds${key}HoraDesde` as keyof Taller;
      const horaHastaKey = `ds${key}HoraHasta` as keyof Taller;
      
      if (taller[snKey]) {
        const desde = taller[horaDesdeKey] as string;
        const hasta = taller[horaHastaKey] as string;
        dias.push(`${key.slice(0, 3)}: ${desde?.slice(0, 5)}-${hasta?.slice(0, 5)}`);
      }
    });
    return dias.join(', ') || 'Sin horarios';
  };

  // Filtrar talleres
  const filteredTalleres = talleres.filter((taller) => {
    const matchesSearch = searchTerm === '' || 
      taller.dsNombreTaller.toLowerCase().includes(searchTerm.toLowerCase()) ||
      taller.nombrePersonal.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesEstado = estadoFilter === 'Todos' || taller.dsEstado === estadoFilter;
    
    return matchesSearch && matchesEstado;
  });

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Talleres</CardTitle>
              <CardDescription>
                Gestiona los talleres y sus horarios
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Nuevo Taller
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por taller o profesor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos los estados</SelectItem>
                <SelectItem value="Activo">Activos</SelectItem>
                <SelectItem value="Inactivo">Inactivo</SelectItem>
                <SelectItem value="Finalizado">Finalizados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Año</TableHead>
                <TableHead>Taller</TableHead>
                <TableHead>Profesor</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Horarios</TableHead>
                <TableHead className="text-center">Alumnos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTalleres.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500">
                    {searchTerm || estadoFilter !== 'Todos' 
                      ? 'No se encontraron talleres con los filtros aplicados'
                      : 'No hay talleres activos registrados'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredTalleres.map((taller) => (
                  <TableRow key={taller.cdTaller}>
                    <TableCell className="font-medium">{taller.nuAnioTaller}</TableCell>
                    <TableCell>{taller.dsNombreTaller}</TableCell>
                    <TableCell>{taller.nombrePersonal}</TableCell>
                    <TableCell>
                      {new Date(taller.feInicioTaller).toLocaleDateString('es-AR')}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatHorario(taller)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {taller.cantidadAlumnos}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          taller.cdEstado === 1
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {taller.dsEstado}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/talleres/${taller.cdTaller}`)}
                          title="Ver detalle"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(taller)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(taller.cdTaller)}
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
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
              {isEditing ? 'Editar Taller' : 'Nuevo Taller'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Modifica los datos del taller'
                : 'Completa los datos para crear un nuevo taller'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              {/* Datos básicos */}
              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="nuAnioTaller">Año *</Label>
                  <Input
                    id="nuAnioTaller"
                    type="number"
                    value={formData.nuAnioTaller}
                    onChange={(e) =>
                      setFormData({ ...formData, nuAnioTaller: parseInt(e.target.value) })
                    }
                    min="2020"
                    max="2099"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cdTipoTaller">Tipo de Taller *</Label>
                  <Select
                    value={formData.cdTipoTaller.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, cdTipoTaller: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Seleccionar</SelectItem>
                      {tiposTaller.map((tipo) => (
                        <SelectItem key={tipo.cdTipoTaller} value={tipo.cdTipoTaller.toString()}>
                          {tipo.dsNombreTaller}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cdPersonal">Profesor *</Label>
                  <Select
                    value={formData.cdPersonal.toString()}
                    onValueChange={(value) =>
                      setFormData({ ...formData, cdPersonal: parseInt(value) })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Seleccionar</SelectItem>
                      {personal.map((p) => (
                        <SelectItem key={p.cdPersonal} value={p.cdPersonal.toString()}>
                          {p.dsNombreCompleto}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="feInicioTaller">Fecha de Inicio *</Label>
                <Input
                  id="feInicioTaller"
                  type="date"
                  value={formData.feInicioTaller}
                  onChange={(e) =>
                    setFormData({ ...formData, feInicioTaller: e.target.value })
                  }
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="dsDescripcionHorarios">Descripción de Horarios</Label>
                <Textarea
                  id="dsDescripcionHorarios"
                  value={formData.dsDescripcionHorarios}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData({ ...formData, dsDescripcionHorarios: e.target.value })
                  }
                  placeholder="Información adicional sobre los horarios"
                  rows={2}
                />
              </div>

              {/* Horarios por día */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-sm mb-3 text-gray-700">Horarios Semanales</h3>
                <div className="space-y-3">
                  {diasSemana.map(({ key, label }) => {
                    const snKey = `sn${key}` as keyof typeof formData;
                    const horaDesdeKey = `ds${key}HoraDesde` as keyof typeof formData;
                    const horaHastaKey = `ds${key}HoraHasta` as keyof typeof formData;

                    return (
                      <div key={key} className="flex items-center gap-4 p-3 bg-gray-50 rounded">
                        <div className="flex items-center gap-2 w-32">
                          <Checkbox
                            id={snKey}
                            checked={formData[snKey] as boolean}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              setFormData({ ...formData, [snKey]: e.target.checked })
                            }
                          />
                          <Label htmlFor={snKey} className="cursor-pointer">
                            {label}
                          </Label>
                        </div>
                        
                        {formData[snKey] && (
                          <div className="flex items-center gap-2 flex-1">
                            <Label className="text-sm text-gray-600">Desde:</Label>
                            <Input
                              type="time"
                              value={formData[horaDesdeKey] as string}
                              onChange={(e) =>
                                setFormData({ ...formData, [horaDesdeKey]: e.target.value })
                              }
                              className="w-32"
                            />
                            <Label className="text-sm text-gray-600">Hasta:</Label>
                            <Input
                              type="time"
                              value={formData[horaHastaKey] as string}
                              onChange={(e) =>
                                setFormData({ ...formData, [horaHastaKey]: e.target.value })
                              }
                              className="w-32"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
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

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
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
