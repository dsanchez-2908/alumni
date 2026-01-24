'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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
  Key,
  Search,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

interface Usuario {
  cdUsuario: number;
  dsNombreCompleto: string;
  dsUsuario: string;
  dsEstado: string;
  cdEstado: number;
  roles: string;
  rolesIds: string;
  feAlta: string;
  cdPersonal: number | null;
  nombrePersonal: string | null;
}

interface Rol {
  cdRol: number;
  dsRol: string;
}

interface Estado {
  cdEstado: number;
  dsEstado: string;
}

interface Personal {
  cdPersonal: number;
  dsNombreCompleto: string;
}

export default function UsuariosPage() {
  const { data: session } = useSession();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados del formulario
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    dsNombreCompleto: '',
    dsUsuario: '',
    dsClave: '',
    cdEstado: 1,
    cdPersonal: null as number | null,
    roles: [] as number[],
  });

  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Estado para diálogo de confirmación
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
      const [usuariosRes, personalRes] = await Promise.all([
        fetch('/api/usuarios'),
        fetch('/api/personal')
      ]);
      const usuariosData = await usuariosRes.json();
      const personalData = await personalRes.json();
      setUsuarios(usuariosData.users);
      setRoles(usuariosData.roles);
      setEstados(usuariosData.estados);
      setPersonal(personalData.personal || []);
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setLoading(false);
    }
  };

  const handleOpenDialog = (usuario?: Usuario) => {
    if (usuario) {
      setIsEditing(true);
      setCurrentUserId(usuario.cdUsuario);
      setFormData({
        dsNombreCompleto: usuario.dsNombreCompleto,
        dsUsuario: usuario.dsUsuario,
        dsClave: '',
        cdEstado: usuario.cdEstado,
        cdPersonal: usuario.cdPersonal,
        roles: usuario.rolesIds ? usuario.rolesIds.split(',').map(Number) : [],
      });
    } else {
      setIsEditing(false);
      setCurrentUserId(null);
      setFormData({
        dsNombreCompleto: '',
        dsUsuario: '',
        dsClave: '',
        cdEstado: 1,
        cdPersonal: null,
        roles: [],
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    try {
      const url = isEditing ? `/api/usuarios/${currentUserId}` : '/api/usuarios';
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
      setMessage({ type: 'error', text: 'Error al guardar el usuario' });
    }
  };

  const handleDelete = async (cdUsuario: number) => {
    setConfirmDialog({
      open: true,
      title: 'Desactivar usuario',
      description: '¿Estás seguro de desactivar este usuario?',
      onConfirm: () => deleteUsuarioConfirmado(cdUsuario),
    });
  };

  const deleteUsuarioConfirmado = async (cdUsuario: number) => {
    try {
      const response = await fetch(`/api/usuarios/${cdUsuario}`, {
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
      setMessage({ type: 'error', text: 'Error al desactivar el usuario' });
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 3) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 3 caracteres' });
      return;
    }

    try {
      const response = await fetch(`/api/usuarios/${currentUserId}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setIsPasswordDialogOpen(false);
        setNewPassword('');
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al cambiar la contraseña' });
    }
  };

  const handleRoleToggle = (cdRol: number) => {
    setFormData((prev) => ({
      ...prev,
      roles: prev.roles.includes(cdRol)
        ? prev.roles.filter((r) => r !== cdRol)
        : [...prev.roles, cdRol],
    }));
  };

  const filteredUsuarios = usuarios.filter(
    (u) =>
      u.dsNombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.dsUsuario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.roles?.toLowerCase().includes(searchTerm.toLowerCase())
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
          Gestión de Usuarios
        </h1>
        <p className="text-gray-600 mt-2">
          Administra los usuarios del sistema y sus permisos
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
                placeholder="Buscar usuarios..."
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
              Nuevo Usuario
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios Registrados</CardTitle>
          <CardDescription>
            {filteredUsuarios.length} usuario(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Profesor</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha Alta</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsuarios.map((usuario) => (
                <TableRow key={usuario.cdUsuario}>
                  <TableCell className="font-medium">
                    {usuario.dsNombreCompleto}
                  </TableCell>
                  <TableCell>{usuario.dsUsuario}</TableCell>
                  <TableCell>
                    {usuario.nombrePersonal ? (
                      <span className="text-sm text-gray-700">
                        {usuario.nombrePersonal}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-indigo-600">
                      {usuario.roles || 'Sin roles'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        usuario.dsEstado === 'Activo'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {usuario.dsEstado}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(usuario.feAlta).toLocaleDateString('es-AR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDialog(usuario)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCurrentUserId(usuario.cdUsuario);
                          setIsPasswordDialogOpen(true);
                        }}
                      >
                        <Key className="h-4 w-4" />
                      </Button>
                      {usuario.dsEstado === 'Activo' &&
                        usuario.cdUsuario !== session?.user?.cdUsuario && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(usuario.cdUsuario)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Crear/Editar Usuario */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Modifica los datos del usuario'
                : 'Completa los datos para crear un nuevo usuario'}
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
                <Label htmlFor="dsUsuario">Usuario *</Label>
                <Input
                  id="dsUsuario"
                  value={formData.dsUsuario}
                  onChange={(e) =>
                    setFormData({ ...formData, dsUsuario: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dsClave">
                  Contraseña {isEditing ? '(dejar en blanco para no cambiar)' : '*'}
                </Label>
                <Input
                  id="dsClave"
                  type="password"
                  value={formData.dsClave}
                  onChange={(e) =>
                    setFormData({ ...formData, dsClave: e.target.value })
                  }
                  required={!isEditing}
                />
              </div>
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
                    {estados.map((estado) => (
                      <SelectItem
                        key={estado.cdEstado}
                        value={estado.cdEstado.toString()}
                      >
                        {estado.dsEstado}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cdPersonal">Profesor (opcional)</Label>
                <Select
                  value={formData.cdPersonal?.toString() || '0'}
                  onValueChange={(value) =>
                    setFormData({ ...formData, cdPersonal: value === '0' ? null : parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ninguno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Ninguno</SelectItem>
                    {personal.map((p) => (
                      <SelectItem
                        key={p.cdPersonal}
                        value={p.cdPersonal.toString()}
                      >
                        {p.dsNombreCompleto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Roles * (selecciona al menos uno)</Label>
                <div className="grid grid-cols-2 gap-2 border rounded-lg p-4">
                  {roles.map((rol) => (
                    <div key={rol.cdRol} className="flex items-center space-x-2">
                      <Checkbox
                        id={`rol-${rol.cdRol}`}
                        checked={formData.roles.includes(rol.cdRol)}
                        onChange={() => handleRoleToggle(rol.cdRol)}
                      />
                      <label
                        htmlFor={`rol-${rol.cdRol}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {rol.dsRol}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
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
                {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Cambiar Contraseña */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
            <DialogDescription>
              Ingresa la nueva contraseña para el usuario
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 3 caracteres"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsPasswordDialogOpen(false);
                setNewPassword('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleChangePassword}
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
            >
              Cambiar Contraseña
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación */}
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
