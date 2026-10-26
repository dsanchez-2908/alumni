'use client';

import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';

interface PrecioInscripcion {
  cdPrecioInscripcion: number;
  feInicioVigencia: string;
  feAlta: string;
  nuPrecioAlumnoActivo: number;
  nuPrecioFamiliarActivo: number;
  nuPrecioAlumnoNuevo: number;
  nuPrecioFamiliarNuevo: number;
  nombreUsuarioAlta: string;
  vigente: boolean;
}

interface FormPrecios {
  feInicioVigencia: string;
  nuPrecioAlumnoActivo: string;
  nuPrecioFamiliarActivo: string;
  nuPrecioAlumnoNuevo: string;
  nuPrecioFamiliarNuevo: string;
}

const FORM_VACIO: FormPrecios = {
  feInicioVigencia: '',
  nuPrecioAlumnoActivo: '',
  nuPrecioFamiliarActivo: '',
  nuPrecioAlumnoNuevo: '',
  nuPrecioFamiliarNuevo: '',
};

const CAMPOS_PRECIO: { campo: keyof Omit<FormPrecios, 'feInicioVigencia'>; label: string }[] = [
  { campo: 'nuPrecioAlumnoActivo', label: 'Alumno Activo' },
  { campo: 'nuPrecioFamiliarActivo', label: 'Familiar de Alumno Activo' },
  { campo: 'nuPrecioAlumnoNuevo', label: 'Alumno Nuevo' },
  { campo: 'nuPrecioFamiliarNuevo', label: 'Familiar de Alumno Nuevo' },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);

const formatDate = (fecha: string) => {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
};

export default function PreciosInscripcionesPage() {
  const { success, error } = useToast();
  const { canCreate, canEdit } = usePermissions();

  const [precios, setPrecios] = useState<PrecioInscripcion[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [editando, setEditando] = useState<PrecioInscripcion | null>(null);
  const [form, setForm] = useState<FormPrecios>(FORM_VACIO);

  useEffect(() => {
    fetchPrecios();
  }, []);

  const fetchPrecios = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/precios-inscripciones');
      if (response.ok) {
        setPrecios(await response.json());
      }
    } catch (err) {
      console.error('Error al cargar precios de inscripción:', err);
    } finally {
      setLoading(false);
    }
  };

  const abrirNuevo = () => {
    // Se precargan los precios vigentes para modificar solo lo que cambia
    const vigente = precios.find((p) => p.vigente) || precios[0];
    setEditando(null);
    setForm({
      ...FORM_VACIO,
      ...(vigente && {
        nuPrecioAlumnoActivo: String(vigente.nuPrecioAlumnoActivo),
        nuPrecioFamiliarActivo: String(vigente.nuPrecioFamiliarActivo),
        nuPrecioAlumnoNuevo: String(vigente.nuPrecioAlumnoNuevo),
        nuPrecioFamiliarNuevo: String(vigente.nuPrecioFamiliarNuevo),
      }),
    });
    setDialogAbierto(true);
  };

  const abrirEdicion = (precio: PrecioInscripcion) => {
    setEditando(precio);
    setForm({
      feInicioVigencia: precio.feInicioVigencia,
      nuPrecioAlumnoActivo: String(precio.nuPrecioAlumnoActivo),
      nuPrecioFamiliarActivo: String(precio.nuPrecioFamiliarActivo),
      nuPrecioAlumnoNuevo: String(precio.nuPrecioAlumnoNuevo),
      nuPrecioFamiliarNuevo: String(precio.nuPrecioFamiliarNuevo),
    });
    setDialogAbierto(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editando && !form.feInicioVigencia) {
      error('Por favor indique la fecha de inicio de vigencia');
      return;
    }
    if (CAMPOS_PRECIO.some(({ campo }) => form[campo] === '' || parseFloat(form[campo]) < 0)) {
      error('Complete los 4 precios con valores válidos');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        editando ? `/api/precios-inscripciones/${editando.cdPrecioInscripcion}` : '/api/precios-inscripciones',
        {
          method: editando ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      );

      if (response.ok) {
        success(editando ? 'Precios actualizados' : 'Precios de inscripción registrados');
        setDialogAbierto(false);
        fetchPrecios();
      } else {
        const errorData = await response.json();
        error(errorData.error || 'Error al guardar los precios');
      }
    } catch (err) {
      console.error('Error al guardar precios de inscripción:', err);
      error('Error al guardar los precios');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Precios de Inscripción</h1>
          <p className="text-gray-600 mt-1">Gestión de precios de inscripción por vigencia</p>
        </div>
        {canCreate('precios') && (
          <Button onClick={abrirNuevo} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4" />
            Nuevos Precios
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Vigencias</CardTitle>
          <CardDescription>
            Los precios de inscripción son los mismos para efectivo y transferencia
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando precios...</div>
          ) : precios.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No hay precios de inscripción registrados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vigencia Desde</TableHead>
                  <TableHead className="text-right">Alumno Activo</TableHead>
                  <TableHead className="text-right">Familiar Activo</TableHead>
                  <TableHead className="text-right">Alumno Nuevo</TableHead>
                  <TableHead className="text-right">Familiar Nuevo</TableHead>
                  <TableHead>Registrado Por</TableHead>
                  <TableHead>Fecha de Alta</TableHead>
                  {canEdit('precios') && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {precios.map((precio) => (
                  <TableRow key={precio.cdPrecioInscripcion}>
                    <TableCell className="font-medium">
                      {formatDate(precio.feInicioVigencia)}
                      {precio.vigente && (
                        <Badge
                          variant="outline"
                          className="ml-2 bg-green-100 text-green-800 border-green-300"
                        >
                          Vigente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(precio.nuPrecioAlumnoActivo)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(precio.nuPrecioFamiliarActivo)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(precio.nuPrecioAlumnoNuevo)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(precio.nuPrecioFamiliarNuevo)}</TableCell>
                    <TableCell>{precio.nombreUsuarioAlta}</TableCell>
                    <TableCell>{formatDate(precio.feAlta)}</TableCell>
                    {canEdit('precios') && (
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => abrirEdicion(precio)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editando
                ? `Editar precios (vigencia ${formatDate(editando.feInicioVigencia)})`
                : 'Registrar Nuevos Precios de Inscripción'}
            </DialogTitle>
            <DialogDescription>
              {editando
                ? 'Corrige los precios de esta vigencia.'
                : 'Los nuevos precios se aplican desde la fecha de inicio de vigencia.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editando && (
              <div>
                <Label htmlFor="feInicioVigencia">Fecha de inicio de vigencia *</Label>
                <Input
                  id="feInicioVigencia"
                  type="date"
                  value={form.feInicioVigencia}
                  onChange={(e) => setForm({ ...form, feInicioVigencia: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {CAMPOS_PRECIO.map(({ campo, label }) => (
                <div key={campo}>
                  <Label htmlFor={campo}>{label} *</Label>
                  <Input
                    id={campo}
                    type="number"
                    step="0.01"
                    min="0"
                    value={form[campo]}
                    onChange={(e) => setForm({ ...form, [campo]: e.target.value })}
                    className="mt-2"
                    required
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogAbierto(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={submitting}>
                {submitting ? 'Guardando...' : 'Guardar Precios'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
