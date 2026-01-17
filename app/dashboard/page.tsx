'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  DollarSign,
  TrendingUp,
  Calendar
} from 'lucide-react';

interface Stats {
  alumnos: number;
  talleres: number;
  profesores: number;
  ingresos: number;
}

interface TallerPopular {
  cdTaller: number;
  dsTaller: string;
  totalAlumnos: number;
}

interface PagoReciente {
  cdPago: number;
  dsAlumno: string;
  nuMonto: number;
  fePago: string;
  dsFormaPago: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    alumnos: 0,
    talleres: 0,
    profesores: 0,
    ingresos: 0,
  });
  const [talleresPopulares, setTalleresPopulares] = useState<TallerPopular[]>([]);
  const [pagosRecientes, setPagosRecientes] = useState<PagoReciente[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.totales);
        setTalleresPopulares(data.talleresPopulares);
        setPagosRecientes(data.pagosRecientes);
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
      title: 'Ingresos del Mes',
      value: loading ? '...' : `$${stats.ingresos.toLocaleString('es-AR')}`,
      icon: <DollarSign className="h-8 w-8 text-emerald-600" />,
      description: 'Pagos registrados',
      color: 'from-emerald-500 to-emerald-600',
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        <Card className="border-indigo-100 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800">Talleres Populares</CardTitle>
            <CardDescription>Talleres con mayor cantidad de alumnos</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4 text-gray-500">Cargando...</div>
            ) : talleresPopulares.length > 0 ? (
              <div className="space-y-3">
                {talleresPopulares.map((taller) => (
                  <div key={taller.cdTaller} className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <BookOpen className="h-5 w-5 text-indigo-600" />
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{taller.dsTaller}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                      {taller.totalAlumnos} alumnos
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No hay talleres registrados</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-violet-100 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-gray-800">Pagos Recientes</CardTitle>
            <CardDescription>Últimos pagos registrados</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4 text-gray-500">Cargando...</div>
            ) : pagosRecientes.length > 0 ? (
              <div className="space-y-3">
                {pagosRecientes.map((pago) => (
                  <div key={pago.cdPago} className="flex items-center justify-between p-3 bg-violet-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-violet-600" />
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{pago.dsAlumno}</p>
                        <p className="text-xs text-gray-600">
                          {new Date(pago.fePago).toLocaleDateString('es-AR')} - {pago.dsFormaPago}
                        </p>
                      </div>
                    </div>
                    <span className="font-semibold text-emerald-600">
                      ${pago.nuMonto.toLocaleString('es-AR')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No hay pagos registrados</p>
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
