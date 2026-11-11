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
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, ClipboardList, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';

interface ResumenInscripcion {
  cdInscripcion: number;
  nuAnio: number;
  cdEstado: number;
  feAlta: string;
  nombreUsuarioAlta: string;
  cantidadAlumnos: number;
  pagoInscripcion: number;
  pendientePago: number;
  inscriptos: number;
  pendienteInscribir: number;
}

const formatFecha = (fecha: string) => {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
};

export default function SeguimientoInscripcionesPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const { hasRole } = usePermissions();

  const [inscripciones, setInscripciones] = useState<ResumenInscripcion[]>([]);
  const [aniosDisponibles, setAniosDisponibles] = useState<number[]>([]);
  const [anioActual, setAnioActual] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const [dialogAbierto, setDialogAbierto] = useState(false);
  const [anioSeleccionado, setAnioSeleccionado] = useState('');
  const [iniciando, setIniciando] = useState(false);

  const puedeIniciar = hasRole(['Administrador', 'Supervisor']);

  useEffect(() => {
    fetchInscripciones();
  }, []);

  const fetchInscripciones = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/inscripciones');
      if (response.ok) {
        const data = await response.json();
        setInscripciones(data.inscripciones);
        setAniosDisponibles(data.aniosDisponibles);
        setAnioActual(data.anioActual);
      }
    } catch (err) {
      console.error('Error al cargar inscripciones:', err);
    } finally {
      setLoading(false);
    }
  };

  const abrirDialogo = () => {
    // Por defecto, el año siguiente (si todavía no se inició)
    const porDefecto = aniosDisponibles.includes(anioActual + 1)
      ? anioActual + 1
      : aniosDisponibles[0];
    setAnioSeleccionado(porDefecto ? String(porDefecto) : '');
    setDialogAbierto(true);
  };

  const iniciarInscripcion = async () => {
    if (!anioSeleccionado) return;
    setIniciando(true);
    try {
      const response = await fetch('/api/inscripciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuAnio: parseInt(anioSeleccionado) }),
      });
      const data = await response.json();

      if (response.ok) {
        success(`${data.message} con ${data.cantidadAlumnos} alumnos`);
        setDialogAbierto(false);
        fetchInscripciones();
      } else {
        error(data.error || 'Error al iniciar la inscripción');
      }
    } catch (err) {
      console.error('Error al iniciar inscripción:', err);
      error('Error al iniciar la inscripción');
    } finally {
      setIniciando(false);
    }
  };

  const verDetalle = (cdInscripcion: number) => {
    router.push(`/dashboard/seguimiento-inscripciones/${cdInscripcion}`);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Seguimiento de Inscripciones</h1>
          <p className="text-gray-600 mt-1">
            Seguimiento anual de pagos e inscripciones de los alumnos
          </p>
        </div>
        {puedeIniciar && (
          <Button
            onClick={abrirDialogo}
            disabled={aniosDisponibles.length === 0}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            title={aniosDisponibles.length === 0 ? 'Ya están iniciadas las inscripciones disponibles' : undefined}
          >
            <Plus className="h-4 w-4" />
            Iniciar Inscripción
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inscripciones</CardTitle>
          <CardDescription>Seleccione un año para ver el detalle de sus alumnos</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando inscripciones...</div>
          ) : inscripciones.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>Todavía no se inició ninguna inscripción</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Año</TableHead>
                  <TableHead className="text-center">Cantidad de Alumnos</TableHead>
                  <TableHead className="text-center">Pago Inscripción</TableHead>
                  <TableHead className="text-center">Pendiente Pago</TableHead>
                  <TableHead className="text-center">Inscriptos</TableHead>
                  <TableHead className="text-center">Pendiente de Inscribir</TableHead>
                  <TableHead>Iniciada</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inscripciones.map((i) => (
                  <TableRow
                    key={i.cdInscripcion}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => verDetalle(i.cdInscripcion)}
                  >
                    <TableCell className="font-semibold">
                      {i.nuAnio}
                      {i.cdEstado !== 1 && (
                        <Badge variant="secondary" className="ml-2">
                          Cerrada
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{i.cantidadAlumnos}</TableCell>
                    <TableCell className="text-center text-green-700">{i.pagoInscripcion}</TableCell>
                    <TableCell className="text-center text-red-600">{i.pendientePago}</TableCell>
                    <TableCell className="text-center text-green-700">{i.inscriptos}</TableCell>
                    <TableCell className="text-center text-amber-600">{i.pendienteInscribir}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatFecha(i.feAlta)} · {i.nombreUsuarioAlta}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          verDetalle(i.cdInscripcion);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogAbierto} onOpenChange={setDialogAbierto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Iniciar Inscripción</DialogTitle>
            <DialogDescription>
              Se registrarán todos los alumnos activos para su seguimiento y se habilitará el pago de la
              inscripción de ese año en Pagos &gt; Pago Inscripciones.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="anioInscripcion">Año de la inscripción</Label>
              <Select value={anioSeleccionado} onValueChange={setAnioSeleccionado}>
                <SelectTrigger id="anioInscripcion" className="mt-2">
                  <SelectValue placeholder="Seleccione un año" />
                </SelectTrigger>
                <SelectContent>
                  {aniosDisponibles.map((anio) => (
                    <SelectItem key={anio} value={String(anio)}>
                      {anio} {anio === anioActual ? '(año actual)' : '(año siguiente)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialogAbierto(false)} disabled={iniciando}>
                Cancelar
              </Button>
              <Button
                onClick={iniciarInscripcion}
                disabled={iniciando || !anioSeleccionado}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {iniciando ? 'Iniciando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
