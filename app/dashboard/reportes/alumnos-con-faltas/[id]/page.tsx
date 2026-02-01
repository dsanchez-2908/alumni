'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ArrowLeft, Save, Phone, Mail, User, Calendar, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Alumno {
  cdAlumno: number;
  dsNombre: string;
  dsApellido: string;
  dsDNI: string;
  dsSexo: string;
  dsNombreLlamar: string | null;
  feNacimiento: string;
  edad: number;
  dsDomicilio: string | null;
  dsTelefonoCelular: string | null;
  dsTelefonoFijo: string | null;
  dsMail: string | null;
  dsInstagram: string | null;
  dsFacebook: string | null;
  dsMailNotificacion: string | null;
  dsWhatsappNotificacion: string | null;
  dsNombreCompletoContacto1: string | null;
  dsParentescoContacto1: string | null;
  dsTelefonoContacto1: string | null;
  dsMailContacto1: string | null;
  dsNombreCompletoContacto2: string | null;
  dsParentescoContacto2: string | null;
  dsTelefonoContacto2: string | null;
  dsMailContacto2: string | null;
}

interface Falta {
  cdFalta: number;
  cdTaller: number;
  dsNombreTaller: string;
  feFalta: string;
  dsObservacion: string | null;
  snContactado: number;
}

export default function DetalleAlumnoFaltasPage() {
  const router = useRouter();
  const params = useParams();
  const { success, error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alumno, setAlumno] = useState<Alumno | null>(null);
  const [faltas, setFaltas] = useState<Falta[]>([]);
  const [observaciones, setObservaciones] = useState<Record<number, string>>({});
  const [novedad, setNovedad] = useState('');
  const [snContactado, setSnContactado] = useState(false);

  useEffect(() => {
    fetchDetalle();
  }, [params.id]);

  const fetchDetalle = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reportes/alumnos-con-faltas/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setAlumno(data.alumno);
        setFaltas(data.faltas);
        
        // Inicializar observaciones
        const obs: Record<number, string> = {};
        data.faltas.forEach((falta: Falta) => {
          obs[falta.cdFalta] = falta.dsObservacion || '';
        });
        setObservaciones(obs);
      }
    } catch (err) {
      console.error('Error al cargar detalle:', err);
      showError('Error al cargar los datos del alumno');
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async () => {
    if (!snContactado && !novedad.trim()) {
      showError('Debe agregar una novedad o marcar como contactado');
      return;
    }

    setSaving(true);
    try {
      // Preparar observaciones modificadas
      const observacionesModificadas = faltas
        .filter(falta => observaciones[falta.cdFalta] !== falta.dsObservacion)
        .map(falta => ({
          cdFalta: falta.cdFalta,
          dsObservacion: observaciones[falta.cdFalta]
        }));

      const response = await fetch(`/api/reportes/alumnos-con-faltas/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observaciones: observacionesModificadas,
          novedad: novedad.trim(),
          snContactado
        })
      });

      if (response.ok) {
        const data = await response.json();
        success(
          snContactado
            ? 'Alumno contactado. Cambios guardados exitosamente'
            : 'Novedad registrada exitosamente'
        );
        
        if (data.contactado) {
          // Volver a la lista
          setTimeout(() => router.push('/dashboard/reportes/alumnos-con-faltas'), 1500);
        } else {
          // Limpiar novedad pero mantener en la página
          setNovedad('');
        }
      } else {
        const data = await response.json();
        showError(data.error || 'Error al guardar cambios');
      }
    } catch (err) {
      console.error('Error:', err);
      showError('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  const formatFecha = (fecha: string) => {
    return new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR');
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  if (!alumno) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <p className="text-lg text-gray-900">Alumno no encontrado</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
            Seguimiento de Faltas
          </h1>
          <p className="text-gray-600 mt-1">
            {alumno.dsApellido}, {alumno.dsNombre}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/reportes/alumnos-con-faltas')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>

      {/* Datos del Alumno */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Datos del Alumno
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Columna 1 - Datos Básicos */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Nombre Completo</label>
                <p className="text-base font-medium">
                  {alumno.dsApellido}, {alumno.dsNombre}
                  {alumno.dsNombreLlamar && ` (${alumno.dsNombreLlamar})`}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">DNI</label>
                <p className="text-base">{alumno.dsDNI}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Edad</label>
                <p className="text-base">{alumno.edad} años</p>
              </div>
              {alumno.dsDomicilio && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Domicilio</label>
                  <p className="text-base">{alumno.dsDomicilio}</p>
                </div>
              )}
            </div>

            {/* Columna 2 - Contacto del Alumno */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 mb-2">Contacto Directo</h3>
              {alumno.dsTelefonoCelular && (
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Celular
                  </label>
                  <p className="text-base">{alumno.dsTelefonoCelular}</p>
                </div>
              )}
              {alumno.dsTelefonoFijo && (
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Teléfono Fijo
                  </label>
                  <p className="text-base">{alumno.dsTelefonoFijo}</p>
                </div>
              )}
              {alumno.dsMail && (
                <div>
                  <label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </label>
                  <p className="text-base">{alumno.dsMail}</p>
                </div>
              )}
              {alumno.dsWhatsappNotificacion && (
                <div>
                  <label className="text-sm font-medium text-gray-600">WhatsApp Notif.</label>
                  <p className="text-base">{alumno.dsWhatsappNotificacion}</p>
                </div>
              )}
              {alumno.dsMailNotificacion && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Email Notif.</label>
                  <p className="text-base">{alumno.dsMailNotificacion}</p>
                </div>
              )}
            </div>

            {/* Columna 3 - Contactos de Emergencia */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 mb-2">Contactos de Emergencia</h3>
              {alumno.dsNombreCompletoContacto1 && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Contacto 1</label>
                  <p className="text-base font-medium">{alumno.dsNombreCompletoContacto1}</p>
                  {alumno.dsParentescoContacto1 && (
                    <p className="text-sm text-gray-600">{alumno.dsParentescoContacto1}</p>
                  )}
                  {alumno.dsTelefonoContacto1 && (
                    <p className="text-sm">Tel: {alumno.dsTelefonoContacto1}</p>
                  )}
                  {alumno.dsMailContacto1 && (
                    <p className="text-sm">{alumno.dsMailContacto1}</p>
                  )}
                </div>
              )}
              {alumno.dsNombreCompletoContacto2 && (
                <div className="mt-3">
                  <label className="text-sm font-medium text-gray-600">Contacto 2</label>
                  <p className="text-base font-medium">{alumno.dsNombreCompletoContacto2}</p>
                  {alumno.dsParentescoContacto2 && (
                    <p className="text-sm text-gray-600">{alumno.dsParentescoContacto2}</p>
                  )}
                  {alumno.dsTelefonoContacto2 && (
                    <p className="text-sm">Tel: {alumno.dsTelefonoContacto2}</p>
                  )}
                  {alumno.dsMailContacto2 && (
                    <p className="text-sm">{alumno.dsMailContacto2}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detalle de Faltas */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Detalle de Faltas
          </CardTitle>
          <CardDescription>
            {faltas.length} {faltas.length === 1 ? 'falta registrada' : 'faltas registradas'} sin contacto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Taller</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Observaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {faltas.map((falta) => (
                  <TableRow key={falta.cdFalta}>
                    <TableCell className="font-medium">{falta.dsNombreTaller}</TableCell>
                    <TableCell>{formatFecha(falta.feFalta)}</TableCell>
                    <TableCell>
                      <Input
                        value={observaciones[falta.cdFalta] || ''}
                        onChange={(e) =>
                          setObservaciones({
                            ...observaciones,
                            [falta.cdFalta]: e.target.value
                          })
                        }
                        placeholder="Agregar observación..."
                        className="max-w-md"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Novedad y Acciones */}
      <Card>
        <CardHeader>
          <CardTitle>Registrar Seguimiento</CardTitle>
          <CardDescription>
            Agregue una novedad sobre el contacto con el alumno
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="novedad">Novedad / Motivo de las Faltas</Label>
            <Textarea
              id="novedad"
              value={novedad}
              onChange={(e) => setNovedad(e.target.value)}
              placeholder="Ej: Se comunicó el padre, indica que el alumno estuvo enfermo..."
              rows={4}
              className="mt-2"
            />
          </div>

          <div className="flex items-center space-x-2 bg-gray-50 p-4 rounded-lg">
            <Checkbox
              id="contactado"
              checked={snContactado}
              onChange={(e) => setSnContactado(e.target.checked)}
            />
            <label
              htmlFor="contactado"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Me pude comunicar con el alumno o sus contactos
            </label>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">Importante:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Si marca "Me pude comunicar", el alumno{' '}
                <strong>no aparecerá más en el reporte</strong>
              </li>
              <li>
                Si NO marca el check, el alumno{' '}
                <strong>seguirá apareciendo en el reporte</strong> para seguimiento
              </li>
            </ul>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/reportes/alumnos-con-faltas')}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleGuardar} disabled={saving} className="gap-2">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
