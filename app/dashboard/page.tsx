'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Cake,
  TrendingUp,
  Calendar,
  AlertCircle,
  Clock,
  DollarSign
} from 'lucide-react';

interface Stats {
  alumnos: number;
  talleres: number;
  profesores: number;
  alumnosPagoMesActual: number;
  alumnosPagoMesesAnteriores: number;
}

interface Cumpleano {
  tipo: string;
  nombre: string;
  feNacimiento: string;
  fechaCumple: string;
  diasFaltantes: number;
  esHoy: boolean;
}

interface Taller {
  cdTaller: number;
  dsNombreTaller: string;
  nuAnioTaller: number;
  fechasPendientes: number;
}

interface ProfesorPendiente {
  cdPersonal: number;
  dsNombreCompleto: string;
  talleres: Taller[];
  totalFechasPendientes: number;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    alumnos: 0,
    talleres: 0,
    profesores: 0,
    alumnosPagoMesActual: 0,
    alumnosPagoMesesAnteriores: 0,
  });
  const [cumpleanos, setCumpleanos] = useState<Cumpleano[]>([]);
  const [profesoresPendientes, setProfesoresPendientes] = useState<ProfesorPendiente[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.totales);
        setCumpleanos(data.cumpleanos || []);
        setProfesoresPendientes(data.profesoresPendientes || []);
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsCards = [
    {
      title: 'Total Alumnos',
      value: loading ? '...' : stats.alumnos.toString(),
      icon: <Users className="h-8 w-8 text-indigo-600" />,
      description: 'Alumnos activos',
      color: 'from-indigo-500 to-indigo-600',
    },
    {
      title: 'Talleres Activos',
      value: loading ? '...' : stats.talleres.toString(),
      icon: <BookOpen className="h-8 w-8 text-violet-600" />,
      description: 'Talleres en curso',
      color: 'from-violet-500 to-violet-600',
    },
    {
      title: 'Profesores',
      value: loading ? '...' : stats.profesores.toString(),
      icon: <GraduationCap className="h-8 w-8 text-purple-600" />,
      description: 'Personal activo',
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'Deben Pagar - Mes Actual',
      value: loading ? '...' : stats.alumnosPagoMesActual.toString(),
      icon: <DollarSign className="h-8 w-8 text-amber-600" />,
      description: 'Alumnos con pago pendiente',
      color: 'from-amber-500 to-amber-600',
    },
    {
      title: 'Deben Pagar - Meses Anteriores',
      value: loading ? '...' : stats.alumnosPagoMesesAnteriores.toString(),
      icon: <DollarSign className="h-8 w-8 text-red-600" />,
      description: 'Alumnos con deuda acumulada',
      color: 'from-red-500 to-red-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
            ¡Bienvenido de nuevo!
          </h1>
          <p className="text-gray-600 mt-2 text-lg">
            {session?.user?.name}
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>{new Date().toLocaleDateString('es-AR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {statsCards.map((stat, index) => (
          <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.title}
              </CardTitle>
              <div className={`p-3 rounded-lg bg-gradient-to-br ${stat.color} bg-opacity-10`}>
                {stat.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900 mb-1">
                {stat.value}
              </div>
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Cumpleaños */}
        <Card className="border-pink-100 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
              <Cake className="h-5 w-5 text-pink-600" />
              Próximos Cumpleaños
            </CardTitle>
            <CardDescription>Alumnos y profesores próximos a cumplir años</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4 text-gray-500">Cargando...</div>
            ) : cumpleanos.length > 0 ? (
              <div className="space-y-3">
                {cumpleanos.map((cumple, index) => (
                  <div 
                    key={index} 
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      cumple.esHoy 
                        ? 'bg-gradient-to-r from-pink-100 to-rose-100 border-2 border-pink-300' 
                        : 'bg-pink-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Cake className={`h-5 w-5 ${cumple.esHoy ? 'text-pink-600' : 'text-pink-500'}`} />
                      <div>
                        <p className="font-medium text-gray-800 text-sm">
                          {cumple.nombre}
                          {cumple.esHoy && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-600 text-white">
                              ¡Hoy!
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-600">
                          {cumple.tipo} - {cumple.fechaCumple}
                        </p>
                      </div>
                    </div>
                    {!cumple.esHoy && (
                      <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded">
                        {cumple.diasFaltantes === 0 ? 'Mañana' : `en ${cumple.diasFaltantes} día${cumple.diasFaltantes > 1 ? 's' : ''}`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Cake className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">No hay cumpleaños próximos</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profesores con Fechas Pendientes */}
        <Card className="border-orange-100 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Asistencias Pendientes
            </CardTitle>
            <CardDescription>Profesores con fechas de asistencia sin registrar</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4 text-gray-500">Cargando...</div>
            ) : profesoresPendientes.length > 0 ? (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {profesoresPendientes.map((profesor) => (
                  <div key={profesor.cdPersonal} className="border border-orange-200 rounded-lg p-3 bg-orange-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-5 w-5 text-orange-600" />
                        <p className="font-medium text-gray-800 text-sm">{profesor.dsNombreCompleto}</p>
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-600 text-white">
                        {profesor.totalFechasPendientes} fecha{profesor.totalFechasPendientes > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="ml-7 space-y-1">
                      {profesor.talleres.map((taller) => (
                        <div key={taller.cdTaller} className="flex items-center justify-between text-xs">
                          <span className="text-gray-700">
                            {taller.dsNombreTaller} ({taller.nuAnioTaller})
                          </span>
                          <span className="flex items-center gap-1 text-orange-700">
                            <Clock className="h-3 w-3" />
                            {taller.fechasPendientes}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">¡Todas las asistencias están al día!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50">
        <CardHeader>
          <CardTitle className="text-xl text-gray-800">Sistema Alumni</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700">
            Sistema completo de gestión para institución de talleres de arte. 
            Administra alumnos, talleres, personal, faltas y pagos desde un solo lugar.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Versión 1.0.0
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              Sistema Activo
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
