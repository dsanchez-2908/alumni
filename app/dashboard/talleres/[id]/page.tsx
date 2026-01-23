'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { ArrowLeft, UserPlus, Search, UserCheck, UserX, Calendar, Users, ClipboardCheck, FileSpreadsheet, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Taller {
  cdTaller: number;
  nuAnioTaller: number;
  feInicioTaller: string;
  dsDescripcionHorarios: string;
  dsNombreTaller: string;
  nombrePersonal: string;
  dsEstado: string;
  snLunes: boolean;
  dsLunesHoraDesde: string;
  dsLunesHoraHasta: string;
  snMartes: boolean;
  dsMartesHoraDesde: string;
  dsMartesHoraHasta: string;
  snMiercoles: boolean;
  dsMiercolesHoraDesde: string;
  dsMiercolesHoraHasta: string;
  snJueves: boolean;
  dsJuevesHoraDesde: string;
  dsJuevesHoraHasta: string;
  snViernes: boolean;
  dsViernesHoraDesde: string;
  dsViernesHoraHasta: string;
  snSabado: boolean;
  dsSabadoHoraDesde: string;
  dsSabadoHoraHasta: string;
  snDomingo: boolean;
  dsDomingoHoraDesde: string;
  dsDomingoHoraHasta: string;
}

interface AlumnoInscrito {
  id: number;
  cdAlumno: number;
  dsNombre: string;
  dsApellido: string;
  dsDNI: string;
  feNacimiento: string;
  feInscripcion: string;
  feBaja: string | null;
  estado: string;
}

interface AlumnoDisponible {
  cdAlumno: number;
  dsNombre: string;
  dsApellido: string;
  dsDNI: string;
  feNacimiento: string;
}

export default function TallerDetallePage() {
  const params = useParams();
  const router = useRouter();
  const { success, error, warning } = useToast();
  const cdTaller = parseInt(params.id as string);

  const [taller, setTaller] = useState<Taller | null>(null);
  const [alumnosInscritos, setAlumnosInscritos] = useState<AlumnoInscrito[]>([]);
  const [alumnosDisponibles, setAlumnosDisponibles] = useState<AlumnoDisponible[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  // Filtros para tabla de inscritos
  const [searchInscritos, setSearchInscritos] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('Todos');

  useEffect(() => {
    fetchTaller();
    fetchAlumnosInscritos();
  }, [cdTaller]);

  const fetchTaller = async () => {
    try {
      const response = await fetch(`/api/talleres/${cdTaller}`);
      if (response.ok) {
        const data = await response.json();
        setTaller(data);
      }
    } catch (error) {
      console.error('Error al cargar taller:', error);
    }
  };

  const fetchAlumnosInscritos = async () => {
    try {
      const response = await fetch(`/api/talleres/${cdTaller}/alumnos`);
      if (response.ok) {
        const data = await response.json();
        setAlumnosInscritos(data);
      }
    } catch (error) {
      console.error('Error al cargar alumnos inscritos:', error);
    }
  };

  const searchAlumnos = async () => {
    if (searchTerm.length < 2) {
      warning('Ingresa al menos 2 caracteres para buscar');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/alumnos?search=${encodeURIComponent(searchTerm)}`);
      if (response.ok) {
        const data = await response.json();
        // La API devuelve un objeto con { alumnos, gruposFamiliares, talleres }
        const todosAlumnos = data.alumnos || [];
        
        // Filtrar alumnos que ya están inscritos activamente
        const alumnosActivosIds = alumnosInscritos
          .filter(a => !a.feBaja)
          .map(a => a.cdAlumno);
        
        // Filtrar por término de búsqueda y excluir ya inscritos
        const disponibles = todosAlumnos.filter((a: AlumnoDisponible) => {
          const matchSearch = 
            a.dsNombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.dsApellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.dsDNI.includes(searchTerm);
          return matchSearch && !alumnosActivosIds.includes(a.cdAlumno);
        });
        
        setAlumnosDisponibles(disponibles);
      }
    } catch (error) {
      console.error('Error al buscar alumnos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInscribirAlumno = async (cdAlumno: number) => {
    if (!confirm('¿Confirmar inscripción del alumno?')) return;

    try {
      const response = await fetch(`/api/talleres/${cdTaller}/alumnos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cdAlumno }),
      });

      if (response.ok) {
        success('Alumno inscrito exitosamente');
        setIsDialogOpen(false);
        setSearchTerm('');
        setAlumnosDisponibles([]);
        fetchAlumnosInscritos();
      } else {
        const errorData = await response.json();
        error(errorData.error || 'Error al inscribir alumno');
      }
    } catch (err) {
      error('Error de conexión');
    }
  };

  const handleCambiarEstado = async (id: number, activo: boolean) => {
    const accion = activo ? 'reactivar' : 'dar de baja';
    if (!confirm(`¿Confirmar ${accion} al alumno?`)) return;

    try {
      const response = await fetch(`/api/talleres/${cdTaller}/alumnos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo }),
      });

      if (response.ok) {
        success(`Alumno ${activo ? 'reactivado' : 'dado de baja'} exitosamente`);
        fetchAlumnosInscritos();
      } else {
        const errorData = await response.json();
        error(errorData.error || 'Error al cambiar estado');
      }
    } catch (err) {
      error('Error de conexión');
    }
  };

  const formatHorario = () => {
    if (!taller) return '';
    const dias: string[] = [];
    const diasSemana = [
      { key: 'Lunes', label: 'Lun' },
      { key: 'Martes', label: 'Mar' },
      { key: 'Miercoles', label: 'Mié' },
      { key: 'Jueves', label: 'Jue' },
      { key: 'Viernes', label: 'Vie' },
      { key: 'Sabado', label: 'Sáb' },
      { key: 'Domingo', label: 'Dom' },
    ];

    diasSemana.forEach(({ key, label }) => {
      const snKey = `sn${key}` as keyof Taller;
      const horaDesdeKey = `ds${key}HoraDesde` as keyof Taller;
      const horaHastaKey = `ds${key}HoraHasta` as keyof Taller;
      
      if (taller[snKey]) {
        const desde = (taller[horaDesdeKey] as string)?.slice(0, 5);
        const hasta = (taller[horaHastaKey] as string)?.slice(0, 5);
        dias.push(`${label}: ${desde}-${hasta}`);
      }
    });
    return dias.join(' | ');
  };

  // Filtrar alumnos inscritos
  const filteredAlumnos = alumnosInscritos.filter((alumno) => {
    const matchesSearch = searchInscritos === '' || 
      alumno.dsNombre.toLowerCase().includes(searchInscritos.toLowerCase()) ||
      alumno.dsApellido.toLowerCase().includes(searchInscritos.toLowerCase()) ||
      alumno.dsDNI.includes(searchInscritos);
    
    const matchesEstado = estadoFilter === 'Todos' || alumno.estado === estadoFilter;
    
    return matchesSearch && matchesEstado;
  });

  // Exportar a Excel
  const exportToExcel = () => {
    const data = filteredAlumnos.map((alumno) => ({
      Apellido: alumno.dsApellido,
      Nombre: alumno.dsNombre,
      DNI: alumno.dsDNI,
      'Fecha Nacimiento': new Date(alumno.feNacimiento).toLocaleDateString('es-AR'),
      'Fecha Inscripción': new Date(alumno.feInscripcion).toLocaleDateString('es-AR'),
      Estado: alumno.estado,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Alumnos');
    
    const fileName = `Alumnos_${taller?.dsNombreTaller}_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  // Exportar a PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.text(`Listado de Alumnos - ${taller?.dsNombreTaller}`, 14, 20);
    
    // Subtítulo
    doc.setFontSize(10);
    doc.text(`Año: ${taller?.nuAnioTaller} | Profesor: ${taller?.nombrePersonal}`, 14, 28);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, 14, 34);
    
    // Tabla
    autoTable(doc, {
      startY: 40,
      head: [['Apellido', 'Nombre', 'DNI', 'Fecha Nac.', 'Fecha Insc.', 'Estado']],
      body: filteredAlumnos.map((alumno) => [
        alumno.dsApellido,
        alumno.dsNombre,
        alumno.dsDNI,
        new Date(alumno.feNacimiento).toLocaleDateString('es-AR'),
        new Date(alumno.feInscripcion).toLocaleDateString('es-AR'),
        alumno.estado,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] },
    });
    
    const fileName = `Alumnos_${taller?.dsNombreTaller}_${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.pdf`;
    doc.save(fileName);
  };

  if (!taller) {
    return (
      <div className="container mx-auto py-8">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      {/* Header con botón volver */}
      <div className="mb-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/talleres')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Talleres
        </Button>
        <Button
          onClick={() => router.push(`/dashboard/talleres/${cdTaller}/asistencia`)}
          className="gap-2 bg-indigo-600 hover:bg-indigo-700"
        >
          <ClipboardCheck className="h-4 w-4" />
          Registrar Asistencia
        </Button>
      </div>

      {/* Información del Taller */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">
                {taller.dsNombreTaller} - {taller.nuAnioTaller}
              </CardTitle>
              <CardDescription>
                Profesor: {taller.nombrePersonal}
              </CardDescription>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                taller.dsEstado === 'Activo'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {taller.dsEstado}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700">Fecha de Inicio</Label>
                <p className="flex items-center gap-2 mt-1">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  {new Date(taller.feInicioTaller).toLocaleDateString('es-AR')}
                </p>
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Alumnos Inscritos</Label>
                <p className="flex items-center gap-2 mt-1">
                  <Users className="h-4 w-4 text-gray-500" />
                  {alumnosInscritos.filter(a => !a.feBaja).length} activos
                </p>
              </div>
            </div>
            
            <div>
              <Label className="text-sm font-semibold text-gray-700">Horarios</Label>
              <p className="mt-1 text-sm">{formatHorario()}</p>
            </div>

            {taller.dsDescripcionHorarios && (
              <div>
                <Label className="text-sm font-semibold text-gray-700">Descripción</Label>
                <p className="mt-1 text-sm text-gray-600">{taller.dsDescripcionHorarios}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Alumnos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Alumnos del Taller</CardTitle>
              <CardDescription>
                Gestiona los alumnos inscritos en este taller
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={exportToExcel}
                variant="outline"
                disabled={filteredAlumnos.length === 0}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
              <Button
                onClick={exportToPDF}
                variant="outline"
                disabled={filteredAlumnos.length === 0}
              >
                <FileText className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
              <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Inscribir Alumno
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, apellido o DNI..."
                  value={searchInscritos}
                  onChange={(e) => setSearchInscritos(e.target.value)}
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
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="Inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Apellido</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Fecha Inscripción</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlumnos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    {searchInscritos || estadoFilter !== 'Todos'
                      ? 'No se encontraron alumnos con los filtros aplicados'
                      : 'No hay alumnos inscritos'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAlumnos.map((alumno) => (
                  <TableRow key={alumno.id}>
                    <TableCell className="font-medium">{alumno.dsApellido}</TableCell>
                    <TableCell>{alumno.dsNombre}</TableCell>
                    <TableCell>{alumno.dsDNI}</TableCell>
                    <TableCell>
                      {new Date(alumno.feInscripcion).toLocaleDateString('es-AR')}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          alumno.estado === 'Activo'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {alumno.estado}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {alumno.feBaja ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCambiarEstado(alumno.id, true)}
                          className="gap-2"
                        >
                          <UserCheck className="h-4 w-4" />
                          Reactivar
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCambiarEstado(alumno.id, false)}
                          className="gap-2"
                        >
                          <UserX className="h-4 w-4" />
                          Dar de Baja
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Buscar e Inscribir Alumno */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Inscribir Alumno al Taller</DialogTitle>
            <DialogDescription>
              Busca por nombre, apellido o DNI del alumno
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder="Buscar por nombre, apellido o DNI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchAlumnos()}
              />
              <Button onClick={searchAlumnos} disabled={loading} className="gap-2">
                <Search className="h-4 w-4" />
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>

            {alumnosDisponibles.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Apellido</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>DNI</TableHead>
                      <TableHead>Fecha Nac.</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alumnosDisponibles.map((alumno) => (
                      <TableRow key={alumno.cdAlumno}>
                        <TableCell className="font-medium">{alumno.dsApellido}</TableCell>
                        <TableCell>{alumno.dsNombre}</TableCell>
                        <TableCell>{alumno.dsDNI}</TableCell>
                        <TableCell>
                          {new Date(alumno.feNacimiento).toLocaleDateString('es-AR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleInscribirAlumno(alumno.cdAlumno)}
                          >
                            Inscribir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {searchTerm && alumnosDisponibles.length === 0 && !loading && (
              <p className="text-center text-gray-500 py-4">
                No se encontraron alumnos disponibles
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
