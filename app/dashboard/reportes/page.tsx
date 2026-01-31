'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Users, Calendar, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ReportesPage() {
  const router = useRouter();

  const reportes = [
    {
      title: 'Asistencia por Taller',
      description: 'Estadísticas completas de asistencia por taller y alumno',
      icon: <Users className="h-8 w-8 text-indigo-600" />,
      href: '/dashboard/reportes/asistencia-por-taller',
    },
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Reportes
        </h1>
        <p className="text-gray-600 mt-1">
          Accede a los diferentes reportes y estadísticas del sistema
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reportes.map((reporte, index) => (
          <Card
            key={index}
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push(reporte.href)}
          >
            <CardHeader>
              <div className="mb-4">{reporte.icon}</div>
              <CardTitle>{reporte.title}</CardTitle>
              <CardDescription>{reporte.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Ver Reporte</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {reportes.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium">No hay reportes disponibles</p>
              <p className="text-sm mt-1">Los reportes estarán disponibles próximamente</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
