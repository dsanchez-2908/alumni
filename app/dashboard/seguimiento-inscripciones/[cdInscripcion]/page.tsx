'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Eye, MessageSquare, Search, UserPlus, X, FileText, FileSpreadsheet, ExternalLink, Lock, Unlock } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/use-permissions';
import { ESTADOS_MANUALES, ETIQUETA_ESTADO_INSCRIPCION } from '@/lib/estados-inscripcion';

interface TallerResumen {
  cdTaller: number;
  nombre: string;
  horario: string;
}

interface FilaAlumno {
  cdInscripcionAlumno: number;
  cdAlumno: number;
  cdEstadoInscripcion: number;
  dsEstadoInscripcion: string;
  snAgregadoManual: boolean;
  linkVigente: boolean;
  nombreCompleto: string;
  dsDNI: string;
  alumnoInactivo: boolean;
  edad: number;
  grupoFamiliar: string | null;
  ultimoComentario: string | null;
  talleresActuales: TallerResumen[];
  talleresInscripto: TallerResumen[];
}

interface DetalleInscripcion {
  inscripcion: {
    cdInscripcion: number;
    nuAnio: number;
    cdEstado: number;
    feAlta: string;
    dsMensajeFormulario: string | null;
  };
  resumen: Record<number, number>;
  total: number;
  alumnos: FilaAlumno[];
}

interface EstadoLinkFormulario {
  estado: 'Vigente' | 'Vencido' | 'Bloqueado' | 'Completado' | 'Anulado';
  feVencimiento: string;
  feCompletado: string | null;
}

interface HistorialItem {
  cdHistorial: number;
  dsTipo: 'Estado' | 'Comentario';
  dsEstadoAnterior: string | null;
  dsEstadoNuevo: string | null;
  dsComentario: string | null;
  feAlta: string;
  nombreUsuario: string | null;
  automatico: boolean;
}

interface AlumnoBusqueda {
  cdAlumno: number;
  dsNombre: string;
  dsApellido: string;
  dsDNI: string;
  dsGrupoFamiliar?: string | null;
}

const POR_PAGINA = 25;

const COLOR_ESTADO: Record<number, string> = {
  1: 'bg-red-100 text-red-800 border-red-300',
  2: 'bg-amber-100 text-amber-800 border-amber-300',
  3: 'bg-blue-100 text-blue-800 border-blue-300',
  4: 'bg-violet-100 text-violet-800 border-violet-300',
  5: 'bg-green-100 text-green-800 border-green-300',
};

const formatFechaHora = (fecha: string) => {
  const [dia, hora] = fecha.split(' ');
  const [anio, mes, d] = dia.split('-');
  return `${d}/${mes}/${anio} ${hora?.slice(0, 5) ?? ''}`;
};

const TODOS = 'todos';

const formatearFechaCorta = (fecha: string) => {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
};

function ListaTalleres({ talleres }: { talleres: TallerResumen[] }) {
  if (talleres.length === 0) return <span className="text-gray-400">-</span>;
  return (
    <div className="space-y-1.5">
      {talleres.map((t) => (
        <div key={t.cdTaller} className="whitespace-normal leading-tight">
          <div className="text-sm">{t.nombre}</div>
          {t.horario && <div className="text-xs text-gray-500">{t.horario}</div>}
        </div>
      ))}
    </div>
  );
}

export default function DetalleInscripcionPage() {
  const params = useParams();
  const router = useRouter();
  const { success, error } = useToast();
  const { hasRole } = usePermissions();
  const cdInscripcion = parseInt(params.cdInscripcion as string);

  const [detalle, setDetalle] = useState<DetalleInscripcion | null>(null);
  const [loading, setLoading] = useState(true);

  // Mensaje del formulario digital (null = todavía no se cargó)
  const [mensajeFormulario, setMensajeFormulario] = useState<string | null>(null);
  const [mensajeAbierto, setMensajeAbierto] = useState(false);
  const [abriendoLink, setAbriendoLink] = useState<number | null>(null);
  const [guardandoMensaje, setGuardandoMensaje] = useState(false);
  const puedeEditarMensaje = hasRole(['Administrador', 'Supervisor']);
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  const [cambiandoEstadoAnio, setCambiandoEstadoAnio] = useState(false);

  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState(TODOS);
  const [filtroTallerActual, setFiltroTallerActual] = useState(TODOS);
  const [filtroTallerInscripto, setFiltroTallerInscripto] = useState(TODOS);
  const [pagina, setPagina] = useState(1);

  // Seguimiento (estado + comentarios)
  const [seguimiento, setSeguimiento] = useState<FilaAlumno | null>(null);
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [estadoLink, setEstadoLink] = useState<EstadoLinkFormulario | null>(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [estadoNuevo, setEstadoNuevo] = useState('');
  const [comentario, setComentario] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Agregar alumno
  const [agregarAbierto, setAgregarAbierto] = useState(false);
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [resultados, setResultados] = useState<AlumnoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [agregando, setAgregando] = useState<number | null>(null);

  useEffect(() => {
    fetchDetalle();
  }, [cdInscripcion]);

  const fetchDetalle = async () => {
    try {
      const response = await fetch(`/api/inscripciones/${cdInscripcion}`);
      if (response.ok) {
        const data: DetalleInscripcion = await response.json();
        setDetalle(data);
        // Solo se carga la primera vez para no pisar lo que el usuario esté escribiendo
        setMensajeFormulario((actual) => actual ?? data.inscripcion.dsMensajeFormulario ?? '');
      } else {
        const data = await response.json();
        error(data.error || 'No se pudo cargar la inscripción');
      }
    } catch (err) {
      console.error('Error al cargar inscripción:', err);
      error('Error al cargar la inscripción');
    } finally {
      setLoading(false);
    }
  };

  // Los talleres se filtran por taller concreto (nombre + día y horario): puede haber varios del mismo tipo
  const etiquetaTaller = (t: TallerResumen) => (t.horario ? `${t.nombre} · ${t.horario}` : t.nombre);

  const armarOpciones = (campo: 'talleresActuales' | 'talleresInscripto') => {
    const mapa = new Map<number, string>();
    detalle?.alumnos.forEach((a) => a[campo].forEach((t) => mapa.set(t.cdTaller, etiquetaTaller(t))));
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'));
  };

  const opcionesTallerActual = useMemo(() => armarOpciones('talleresActuales'), [detalle]);
  const opcionesTallerInscripto = useMemo(() => armarOpciones('talleresInscripto'), [detalle]);

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return (detalle?.alumnos || []).filter((a) => {
      if (
        texto &&
        !a.nombreCompleto.toLowerCase().includes(texto) &&
        !a.dsDNI.toLowerCase().includes(texto) &&
        !(a.grupoFamiliar || '').toLowerCase().includes(texto)
      ) {
        return false;
      }
      if (filtroEstado !== TODOS && a.cdEstadoInscripcion !== parseInt(filtroEstado)) return false;
      if (
        filtroTallerActual !== TODOS &&
        !a.talleresActuales.some((t) => t.cdTaller === parseInt(filtroTallerActual))
      ) {
        return false;
      }
      if (filtroTallerInscripto !== TODOS) {
        if (filtroTallerInscripto === 'ninguno') {
          if (a.talleresInscripto.length > 0) return false;
        } else if (!a.talleresInscripto.some((t) => t.cdTaller === parseInt(filtroTallerInscripto))) {
          return false;
        }
      }
      return true;
    });
  }, [detalle, busqueda, filtroEstado, filtroTallerActual, filtroTallerInscripto]);

  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroEstado, filtroTallerActual, filtroTallerInscripto]);

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
  const visibles = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const hayFiltros =
    busqueda !== '' ||
    filtroEstado !== TODOS ||
    filtroTallerActual !== TODOS ||
    filtroTallerInscripto !== TODOS;

  const limpiarFiltros = () => {
    setBusqueda('');
    setFiltroEstado(TODOS);
    setFiltroTallerActual(TODOS);
    setFiltroTallerInscripto(TODOS);
  };

  const cargarHistorial = async (fila: FilaAlumno) => {
    setCargandoHistorial(true);
    try {
      const response = await fetch(
        `/api/inscripciones/${cdInscripcion}/alumnos/${fila.cdInscripcionAlumno}/historial`
      );
      if (response.ok) {
        const data = await response.json();
        setHistorial(data.historial);
        setEstadoLink(data.formulario);
      }
    } catch (err) {
      console.error('Error al cargar historial:', err);
    } finally {
      setCargandoHistorial(false);
    }
  };

  const abrirSeguimiento = (fila: FilaAlumno) => {
    setSeguimiento(fila);
    setEstadoNuevo(String(fila.cdEstadoInscripcion));
    setComentario('');
    setHistorial([]);
    setEstadoLink(null);
    cargarHistorial(fila);
  };

  const verLink = async (fila: FilaAlumno) => {
    // La pestaña se abre en el clic (los navegadores bloquean las que se abren después de una espera)
    const ventana = window.open('', '_blank');
    setAbriendoLink(fila.cdInscripcionAlumno);
    try {
      const response = await fetch(
        `/api/inscripciones/${cdInscripcion}/alumnos/${fila.cdInscripcionAlumno}/formulario`,
        { cache: 'no-store' }
      );
      const data = await response.json();
      if (!response.ok) {
        ventana?.close();
        error(data.error || 'No se pudo obtener el link');
        fetchDetalle();
        return;
      }
      const url = `${window.location.origin}/formulario/${data.token}`;
      if (ventana) ventana.location.href = url;
      else window.open(url, '_blank');
    } catch (err) {
      console.error('Error al obtener el link:', err);
      ventana?.close();
      error('No se pudo obtener el link');
    } finally {
      setAbriendoLink(null);
    }
  };

  const exportarExcel = () => {
    const unir = (talleres: TallerResumen[], campo: 'nombre' | 'horario') =>
      talleres.map((t) => t[campo]).filter(Boolean).join(' | ');

    const filas = filtrados.map((a) => ({
      'Estado': a.dsEstadoInscripcion,
      'Nombre Completo': a.nombreCompleto,
      'DNI': a.dsDNI,
      'Edad': a.edad,
      'Grupo Familiar': a.grupoFamiliar || 'Individual',
      'Talleres Actuales': unir(a.talleresActuales, 'nombre'),
      'Día y Horarios': unir(a.talleresActuales, 'horario'),
      [`Talleres Inscripto ${detalle?.inscripcion.nuAnio ?? ''}`]: unir(a.talleresInscripto, 'nombre'),
      [`Día y Horarios Inscripto ${detalle?.inscripcion.nuAnio ?? ''}`]: unir(a.talleresInscripto, 'horario'),
      'Último comentario': a.ultimoComentario || '',
    }));

    const hoja = XLSX.utils.json_to_sheet(filas);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, `Inscripción ${detalle?.inscripcion.nuAnio ?? ''}`);
    const fecha = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
    XLSX.writeFile(libro, `Seguimiento_Inscripcion_${detalle?.inscripcion.nuAnio ?? ''}_${fecha}.xlsx`);
  };

  const cambiarEstadoInscripcion = async (accion: 'cerrar' | 'reabrir') => {
    setCambiandoEstadoAnio(true);
    try {
      const response = await fetch(`/api/inscripciones/${cdInscripcion}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion }),
      });
      const data = await response.json();
      if (response.ok) {
        success(data.message);
        setDetalle((actual) =>
          actual ? { ...actual, inscripcion: { ...actual.inscripcion, cdEstado: data.cdEstado } } : actual
        );
      } else {
        error(data.error || 'No se pudo actualizar la inscripción');
      }
    } catch (err) {
      console.error('Error al cerrar/reabrir la inscripción:', err);
      error('No se pudo actualizar la inscripción');
    } finally {
      setCambiandoEstadoAnio(false);
    }
  };

  const guardarMensaje = async () => {
    setGuardandoMensaje(true);
    try {
      const response = await fetch(`/api/inscripciones/${cdInscripcion}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dsMensajeFormulario: mensajeFormulario ?? '' }),
      });
      const data = await response.json();
      if (response.ok) {
        success(data.message);
        setMensajeAbierto(false);
        setMensajeFormulario(data.dsMensajeFormulario ?? '');
        setDetalle((actual) =>
          actual
            ? { ...actual, inscripcion: { ...actual.inscripcion, dsMensajeFormulario: data.dsMensajeFormulario } }
            : actual
        );
      } else {
        error(data.error || 'Error al guardar el mensaje');
      }
    } catch (err) {
      console.error('Error al guardar el mensaje del formulario:', err);
      error('Error al guardar el mensaje');
    } finally {
      setGuardandoMensaje(false);
    }
  };

  const guardarSeguimiento = async () => {
    if (!seguimiento) return;
    setGuardando(true);
    try {
      const response = await fetch(
        `/api/inscripciones/${cdInscripcion}/alumnos/${seguimiento.cdInscripcionAlumno}/historial`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cdEstadoNuevo: parseInt(estadoNuevo), comentario }),
        }
      );
      const data = await response.json();

      if (response.ok) {
        success(data.message);
        await fetchDetalle();
        const nuevoEstado = parseInt(estadoNuevo);
        const actualizada = { ...seguimiento, cdEstadoInscripcion: nuevoEstado };
        setSeguimiento(actualizada);
        setComentario('');
        cargarHistorial(actualizada);
      } else {
        error(data.error || 'Error al guardar el seguimiento');
      }
    } catch (err) {
      console.error('Error al guardar seguimiento:', err);
      error('Error al guardar el seguimiento');
    } finally {
      setGuardando(false);
    }
  };

  const buscarAlumnos = async () => {
    if (!terminoBusqueda.trim()) return;
    setBuscando(true);
    try {
      const response = await fetch(`/api/alumnos?search=${encodeURIComponent(terminoBusqueda.trim())}`);
      if (response.ok) {
        const data = await response.json();
        const vistos = new Set<number>();
        setResultados(
          (data.alumnos || []).filter((a: AlumnoBusqueda) => {
            if (vistos.has(a.cdAlumno)) return false;
            vistos.add(a.cdAlumno);
            return true;
          })
        );
      }
    } catch (err) {
      console.error('Error al buscar alumnos:', err);
    } finally {
      setBuscando(false);
    }
  };

  const agregarAlumno = async (cdAlumno: number) => {
    setAgregando(cdAlumno);
    try {
      const response = await fetch(`/api/inscripciones/${cdInscripcion}/alumnos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cdAlumno }),
      });
      const data = await response.json();

      if (response.ok) {
        success(data.message);
        await fetchDetalle();
      } else {
        error(data.error || 'Error al agregar el alumno');
      }
    } catch (err) {
      console.error('Error al agregar alumno:', err);
      error('Error al agregar el alumno');
    } finally {
      setAgregando(null);
    }
  };

  const cerrarAgregar = () => {
    setAgregarAbierto(false);
    setTerminoBusqueda('');
    setResultados([]);
  };

  if (loading) {
    return <div className="container mx-auto py-8 text-center">Cargando inscripción...</div>;
  }

  if (!detalle) {
    return (
      <div className="container mx-auto py-8">
        <Button variant="ghost" onClick={() => router.push('/dashboard/seguimiento-inscripciones')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <p className="mt-6 text-center text-red-600">No se pudo cargar la inscripción</p>
      </div>
    );
  }

  const { inscripcion, resumen } = detalle;
  const idsEnInscripcion = new Set(detalle.alumnos.map((a) => a.cdAlumno));
  const puedeCambiarEstado = (e: number) => ESTADOS_MANUALES.includes(e);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/dashboard/seguimiento-inscripciones')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Seguimiento de Inscripciones
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Inscripción {inscripcion.nuAnio}
              {inscripcion.cdEstado !== 1 && (
                <Badge variant="secondary" className="ml-3 align-middle">
                  Cerrada
                </Badge>
              )}
            </h1>
            <p className="text-gray-600 mt-1">{detalle.total} alumnos en seguimiento</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setMensajeFormulario(inscripcion.dsMensajeFormulario ?? '');
                setMensajeAbierto(true);
              }}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Mensaje del formulario
            </Button>
            <Button
              variant="outline"
              onClick={exportarExcel}
              disabled={filtrados.length === 0}
              className="gap-2"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Exportar Excel
            </Button>
            {inscripcion.cdEstado === 1 && (
              <Button onClick={() => setAgregarAbierto(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                <UserPlus className="h-4 w-4" />
                Agregar Alumno
              </Button>
            )}
            {puedeEditarMensaje &&
              (inscripcion.cdEstado === 1 ? (
                <Button
                  variant="outline"
                  onClick={() => setConfirmarCierre(true)}
                  disabled={cambiandoEstadoAnio}
                  className="gap-2 border-red-300 text-red-700 hover:bg-red-50"
                >
                  <Lock className="h-4 w-4" />
                  Cerrar Inscripción
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => cambiarEstadoInscripcion('reabrir')}
                  disabled={cambiandoEstadoAnio}
                  className="gap-2"
                >
                  <Unlock className="h-4 w-4" />
                  Reabrir Inscripción
                </Button>
              ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[1, 2, 3, 4, 5].map((estado) => (
          <button
            key={estado}
            type="button"
            onClick={() => setFiltroEstado(filtroEstado === String(estado) ? TODOS : String(estado))}
            className={`rounded-lg border p-3 text-left transition-shadow hover:shadow ${
              filtroEstado === String(estado) ? 'ring-2 ring-indigo-500' : ''
            } ${COLOR_ESTADO[estado]}`}
          >
            <div className="text-2xl font-bold">{resumen[estado] ?? 0}</div>
            <div className="text-xs font-medium">{ETIQUETA_ESTADO_INSCRIPCION[estado]}</div>
          </button>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="busqueda">Nombre, DNI o grupo familiar</Label>
              <Input
                id="busqueda"
                className="mt-2"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar..."
              />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos</SelectItem>
                  {[1, 2, 3, 4, 5].map((e) => (
                    <SelectItem key={e} value={String(e)}>
                      {ETIQUETA_ESTADO_INSCRIPCION[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Taller actual</Label>
              <Select value={filtroTallerActual} onValueChange={setFiltroTallerActual}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos</SelectItem>
                  {opcionesTallerActual.map(([cdTaller, etiqueta]) => (
                    <SelectItem key={cdTaller} value={String(cdTaller)}>
                      {etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Taller inscripto {inscripcion.nuAnio}</Label>
              <Select value={filtroTallerInscripto} onValueChange={setFiltroTallerInscripto}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Todos</SelectItem>
                  <SelectItem value="ninguno">Sin talleres inscriptos</SelectItem>
                  {opcionesTallerInscripto.map(([cdTaller, etiqueta]) => (
                    <SelectItem key={cdTaller} value={String(cdTaller)}>
                      {etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {hayFiltros && (
            <Button variant="outline" size="sm" className="mt-4" onClick={limpiarFiltros}>
              <X className="h-4 w-4 mr-1" />
              Limpiar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alumnos</CardTitle>
          <CardDescription>
            {filtrados.length} de {detalle.total} alumnos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-2">Estado</TableHead>
                <TableHead className="px-2">Nombre Completo</TableHead>
                <TableHead className="px-2 text-center">Edad</TableHead>
                <TableHead className="px-2">Grupo Familiar</TableHead>
                <TableHead className="px-2">Talleres Actuales</TableHead>
                <TableHead className="px-2">Talleres Inscripto {inscripcion.nuAnio}</TableHead>
                <TableHead className="px-2 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500">
                    No se encontraron alumnos con los filtros aplicados
                  </TableCell>
                </TableRow>
              ) : (
                visibles.map((a) => (
                  <TableRow key={a.cdInscripcionAlumno}>
                    <TableCell className="px-2">
                      <Badge variant="outline" className={`${COLOR_ESTADO[a.cdEstadoInscripcion]} whitespace-normal text-center leading-tight`}>
                        {a.dsEstadoInscripcion}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-2 font-medium">
                      {a.nombreCompleto}
                      {a.alumnoInactivo && (
                        <Badge variant="secondary" className="ml-2">
                          Inactivo
                        </Badge>
                      )}
                      {a.snAgregadoManual && (
                        <Badge variant="outline" className="ml-2">
                          Agregado
                        </Badge>
                      )}
                      {a.ultimoComentario && (
                        <div
                          className="text-xs font-normal text-gray-500 mt-1 max-w-[220px] truncate"
                          title={a.ultimoComentario}
                        >
                          💬 {a.ultimoComentario}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-2 text-center">{a.edad}</TableCell>
                    <TableCell className="px-2 text-sm">{a.grupoFamiliar || 'Individual'}</TableCell>
                    <TableCell className="px-2">
                      <ListaTalleres talleres={a.talleresActuales} />
                    </TableCell>
                    <TableCell className="px-2">
                      <ListaTalleres talleres={a.talleresInscripto} />
                    </TableCell>
                    <TableCell className="px-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => router.push(`/dashboard/alumnos/${a.cdAlumno}`)}
                          title="Ver detalle del alumno"
                          aria-label="Ver detalle del alumno"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0"
                          onClick={() => abrirSeguimiento(a)}
                          title="Seguimiento: estado y comentarios"
                          aria-label="Seguimiento: estado y comentarios"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        {a.linkVigente && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => verLink(a)}
                            disabled={abriendoLink === a.cdInscripcionAlumno}
                            title="Ver link: abre el último link vigente del formulario"
                            aria-label="Ver link del formulario"
                            className="h-8 w-8 border-indigo-300 p-0 text-indigo-700 hover:bg-indigo-50"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-gray-600">
                Página {pagina} de {totalPaginas}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagina === 1}
                  onClick={() => setPagina(pagina - 1)}
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagina === totalPaginas}
                  onClick={() => setPagina(pagina + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mensaje del formulario digital */}
      <ConfirmDialog
        open={confirmarCierre}
        onOpenChange={setConfirmarCierre}
        title={`Cerrar la inscripción ${inscripcion.nuAnio}`}
        description={
          `Quedan ${(resumen[1] ?? 0) + (resumen[2] ?? 0) + (resumen[3] ?? 0) + (resumen[4] ?? 0)} alumnos sin completar la inscripción. ` +
          'Al cerrarla ya no se podrá agregar alumnos ni cambiar estados, los links del formulario digital dejarán de funcionar ' +
          'y el pago de esta inscripción solo estará disponible si corresponde al año actual. Podés reabrirla más adelante.'
        }
        confirmText="Cerrar Inscripción"
        variant="destructive"
        onConfirm={() => cambiarEstadoInscripcion('cerrar')}
      />

      <Dialog open={mensajeAbierto} onOpenChange={setMensajeAbierto}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Mensaje del formulario digital</DialogTitle>
            <DialogDescription>
              Aparece al comienzo del formulario que completa el alumno. Ej: &quot;Desde Índigo le pedimos que
              complete este formulario digital para reservar la vacante&quot;.
            </DialogDescription>
          </DialogHeader>
          {puedeEditarMensaje ? (
            <div className="space-y-3">
              <Textarea
                rows={5}
                maxLength={1000}
                value={mensajeFormulario ?? ''}
                onChange={(e) => setMensajeFormulario(e.target.value)}
                placeholder="Mensaje para el alumno (opcional)"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{(mensajeFormulario ?? '').length} / 1000</span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setMensajeAbierto(false)} disabled={guardandoMensaje}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={guardarMensaje}
                    disabled={
                      guardandoMensaje ||
                      (mensajeFormulario ?? '').trim() === (inscripcion.dsMensajeFormulario ?? '')
                    }
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {guardandoMensaje ? 'Guardando...' : 'Guardar mensaje'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap rounded-md border bg-gray-50 p-3 text-sm text-gray-700">
              {inscripcion.dsMensajeFormulario || 'Sin mensaje configurado'}
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Seguimiento: estado + comentarios */}
      <Dialog open={!!seguimiento} onOpenChange={(open) => !open && setSeguimiento(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Seguimiento: {seguimiento?.nombreCompleto}</DialogTitle>
            <DialogDescription>
              Inscripción {inscripcion.nuAnio} ·{' '}
              {seguimiento && ETIQUETA_ESTADO_INSCRIPCION[seguimiento.cdEstadoInscripcion]}
            </DialogDescription>
          </DialogHeader>

          {seguimiento && (
            <div className="space-y-4">
              <div className="grid gap-4">
                {puedeCambiarEstado(seguimiento.cdEstadoInscripcion) ? (
                  <div>
                    <Label>Estado</Label>
                    <Select value={estadoNuevo} onValueChange={setEstadoNuevo}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS_MANUALES.map((e) => (
                          <SelectItem key={e} value={String(e)}>
                            {ETIQUETA_ESTADO_INSCRIPCION[e]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 rounded-md bg-gray-50 border p-3">
                    {seguimiento.cdEstadoInscripcion === 1
                      ? 'El estado avanza automáticamente cuando se registra el pago de la inscripción.'
                      : 'El estado se actualiza automáticamente según los talleres en los que está inscripto.'}
                  </p>
                )}
                <div>
                  <Label htmlFor="comentario">Comentario</Label>
                  <Textarea
                    id="comentario"
                    className="mt-2"
                    rows={3}
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    placeholder="Ej: Se avisó por WhatsApp, queda esperando respuesta..."
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={guardarSeguimiento}
                    disabled={
                      guardando ||
                      (!comentario.trim() && parseInt(estadoNuevo) === seguimiento.cdEstadoInscripcion)
                    }
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {guardando ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                {estadoLink && (
                  <p className="mb-3 rounded-md border bg-gray-50 p-3 text-sm">
                    <span className="font-medium">Formulario digital: </span>
                    {estadoLink.estado === 'Vigente' && `link vigente hasta el ${formatearFechaCorta(estadoLink.feVencimiento)}`}
                    {estadoLink.estado === 'Vencido' && `el link venció el ${formatearFechaCorta(estadoLink.feVencimiento)} (genere uno nuevo desde el detalle del alumno)`}
                    {estadoLink.estado === 'Bloqueado' && 'link bloqueado por intentos fallidos de DNI (genere uno nuevo desde el detalle del alumno)'}
                    {estadoLink.estado === 'Completado' && `completado el ${estadoLink.feCompletado ? formatFechaHora(estadoLink.feCompletado) : ''}`}
                    {estadoLink.estado === 'Anulado' && 'el último link fue reemplazado por uno nuevo'}
                  </p>
                )}
                <h3 className="font-semibold text-sm mb-3">Historial</h3>
                {cargandoHistorial ? (
                  <p className="text-sm text-gray-500">Cargando historial...</p>
                ) : historial.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin movimientos registrados</p>
                ) : (
                  <ul className="space-y-3">
                    {historial.map((h) => (
                      <li key={h.cdHistorial} className="rounded-md border p-3 text-sm">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>{formatFechaHora(h.feAlta)}</span>
                          <span>{h.automatico ? 'Automático' : h.nombreUsuario}</span>
                        </div>
                        {h.dsTipo === 'Estado' && (
                          <div className="font-medium">
                            {h.dsEstadoAnterior ? `${h.dsEstadoAnterior} → ` : 'Estado inicial: '}
                            {h.dsEstadoNuevo}
                          </div>
                        )}
                        {h.dsComentario && (
                          <div className="text-gray-700 whitespace-pre-wrap">{h.dsComentario}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Agregar alumno */}
      <Dialog open={agregarAbierto} onOpenChange={(open) => !open && cerrarAgregar()}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agregar Alumno a la Inscripción {inscripcion.nuAnio}</DialogTitle>
            <DialogDescription>
              Busque alumnos que se dieron de alta después de iniciar la inscripción.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-3">
              <Input
                value={terminoBusqueda}
                onChange={(e) => setTerminoBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscarAlumnos()}
                placeholder="Nombre, apellido o DNI..."
              />
              <Button onClick={buscarAlumnos} disabled={buscando}>
                {buscando ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
            <div className="space-y-2">
              {resultados.map((alumno) => {
                const yaEsta = idsEnInscripcion.has(alumno.cdAlumno);
                return (
                  <div
                    key={alumno.cdAlumno}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {alumno.dsApellido}, {alumno.dsNombre}
                      </p>
                      <p className="text-sm text-gray-600">DNI: {alumno.dsDNI}</p>
                    </div>
                    {yaEsta ? (
                      <Badge variant="secondary">Ya está en la inscripción</Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => agregarAlumno(alumno.cdAlumno)}
                        disabled={agregando === alumno.cdAlumno}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        {agregando === alumno.cdAlumno ? 'Agregando...' : 'Agregar'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
