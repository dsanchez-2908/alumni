import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

// Mapa de rutas y roles permitidos
const routePermissions: { [key: string]: string[] } = {
  // Dashboard - Todos pueden acceder
  '/dashboard': ['Administrador', 'Supervisor', 'Operador', 'Profesor', 'Externo'],
  
  // Configuración
  '/dashboard/usuarios': ['Administrador'],
  '/dashboard/tipo-talleres': ['Administrador'],
  '/dashboard/personal': ['Administrador', 'Supervisor'],
  '/dashboard/talleres': ['Administrador', 'Supervisor', 'Operador', 'Profesor'],
  '/dashboard/precios': ['Administrador', 'Supervisor'],
  
  // Alumnos
  '/dashboard/alumnos/nuevo': ['Administrador', 'Supervisor'],
  '/dashboard/alumnos': ['Administrador', 'Supervisor', 'Operador'],
  '/dashboard/grupos-familiares': ['Administrador', 'Supervisor'],
  
  // Asistencia
  '/dashboard/registro-asistencia': ['Administrador', 'Supervisor', 'Operador', 'Profesor'],
  '/dashboard/consulta-asistencia': ['Administrador', 'Supervisor'],
  '/dashboard/faltas': ['Administrador', 'Supervisor'],
  '/dashboard/reportes/consulta-faltas': ['Administrador', 'Supervisor'],
  
  // Pagos
  '/dashboard/registro-pagos': ['Administrador', 'Supervisor', 'Operador'],
  '/dashboard/pagos': ['Administrador'],
  '/dashboard/pagos/dia': ['Administrador', 'Supervisor', 'Operador'],
  
  // Reportes
  '/dashboard/reportes/asistencia-por-taller': ['Administrador', 'Supervisor'],
  '/dashboard/reportes/alumnos-con-faltas': ['Administrador', 'Supervisor'],
  '/dashboard/reportes/pagos-talleres': ['Administrador'],
  '/dashboard/reportes/consulta-historial': ['Administrador', 'Supervisor'],
};

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Si no hay token, next-auth ya redirige al login
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Obtener roles del usuario
    const userRoles = (token.roles as string[]) || [];

    // Permitir acceso a rutas de asistencia de talleres para profesores
    // Esta verificación debe ir antes de la búsqueda general de permisos
    if (path.match(/^\/dashboard\/talleres\/\d+\/asistencia/)) {
      const hasAccess = userRoles.some(role => 
        ['Administrador', 'Supervisor', 'Operador', 'Profesor'].includes(role)
      );
      if (hasAccess) {
        return NextResponse.next();
      }
    }

    // Permitir acceso a detalle de talleres para profesores
    if (path.match(/^\/dashboard\/talleres\/\d+$/)) {
      const hasAccess = userRoles.some(role => 
        ['Administrador', 'Supervisor', 'Operador', 'Profesor'].includes(role)
      );
      if (hasAccess) {
        return NextResponse.next();
      }
    }

    // Buscar la ruta más específica que coincida
    let matchedRoute: string | null = null;
    let matchedPermissions: string[] | null = null;

    // Buscar coincidencia exacta primero
    if (routePermissions[path]) {
      matchedRoute = path;
      matchedPermissions = routePermissions[path];
    } else {
      // Buscar coincidencia por prefijo (para rutas dinámicas como /dashboard/alumnos/[id])
      const sortedRoutes = Object.keys(routePermissions).sort((a, b) => b.length - a.length);
      for (const route of sortedRoutes) {
        if (path.startsWith(route)) {
          matchedRoute = route;
          matchedPermissions = routePermissions[route];
          break;
        }
      }
    }

    // Si encontramos permisos para esta ruta, verificar acceso
    if (matchedPermissions) {
      // Verificar si el usuario tiene alguno de los roles permitidos
      const hasAccess = userRoles.some(role => matchedPermissions!.includes(role));

      if (!hasAccess) {
        // Usuario no tiene acceso, redirigir al dashboard
        console.log(`Acceso denegado para ${token.username} a ${path}. Roles: ${userRoles.join(', ')}`);
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    // Permitir acceso
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/usuarios/:path*', '/talleres/:path*', '/alumnos/:path*', '/personal/:path*', '/faltas/:path*', '/pagos/:path*', '/reportes/:path*'],
};

