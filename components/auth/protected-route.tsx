'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
  showDeniedMessage?: boolean;
}

/**
 * Componente para proteger rutas del lado del cliente
 * Verifica si el usuario tiene los roles necesarios para acceder
 */
export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/dashboard',
  showDeniedMessage = true,
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/login');
      return;
    }

    const userRoles = (session.user?.roles as string[]) || [];
    
    // Administrador tiene acceso a todo
    if (userRoles.includes('Administrador')) {
      setHasAccess(true);
      return;
    }

    // Verificar si el usuario tiene alguno de los roles permitidos
    const access = userRoles.some(role => allowedRoles.includes(role));
    setHasAccess(access);

    // Si no tiene acceso y no debe mostrar mensaje, redirigir
    if (!access && !showDeniedMessage) {
      router.push(redirectTo);
    }
  }, [session, status, allowedRoles, redirectTo, showDeniedMessage, router]);

  // Mostrar loading mientras se verifica
  if (status === 'loading' || hasAccess === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Si no tiene acceso, mostrar mensaje de denegación
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <ShieldAlert className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-2xl">Acceso Denegado</CardTitle>
            <CardDescription>
              No tienes permisos para acceder a esta página
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Esta sección está restringida para tu rol de usuario.
              Si crees que deberías tener acceso, contacta con un administrador.
            </p>
            <Button
              onClick={() => router.push(redirectTo)}
              className="w-full"
              variant="default"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Usuario tiene acceso, mostrar contenido
  return <>{children}</>;
}
