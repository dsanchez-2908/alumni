import { useSession } from 'next-auth/react';
import { useMemo } from 'react';

/**
 * Hook para verificar permisos del usuario basado en roles
 */
export function usePermissions() {
  const { data: session } = useSession();
  
  const userRoles = useMemo(() => {
    return (session?.user?.roles as string[]) || [];
  }, [session]);

  /**
   * Verifica si el usuario tiene al menos uno de los roles especificados
   */
  const hasRole = (roles: string | string[]): boolean => {
    if (!session) return false;
    
    const rolesToCheck = Array.isArray(roles) ? roles : [roles];
    return userRoles.some(role => rolesToCheck.includes(role));
  };

  /**
   * Verifica si el usuario es administrador
   */
  const isAdmin = (): boolean => {
    return hasRole('Administrador');
  };

  /**
   * Verifica si el usuario puede acceder a una ruta específica
   */
  const canAccessRoute = (path: string, allowedRoles: string[]): boolean => {
    if (!session) return false;
    if (isAdmin()) return true; // Administrador puede acceder a todo
    
    return userRoles.some(role => allowedRoles.includes(role));
  };

  /**
   * Verifica si el usuario puede crear recursos
   */
  const canCreate = (resource: string): boolean => {
    if (!session) return false;
    if (isAdmin()) return true;

    // Operador no puede crear en talleres, alumnos ni precios
    if (hasRole('Operador')) {
      return false;
    }

    // Supervisor puede crear excepto precios
    if (hasRole('Supervisor')) {
      if (resource === 'precios') return false;
      return true;
    }

    // Profesor no puede crear nada (solo accede a asistencias)
    if (hasRole('Profesor')) {
      return false;
    }

    return false;
  };

  /**
   * Verifica si el usuario puede editar recursos
   */
  const canEdit = (resource: string): boolean => {
    if (!session) return false;
    if (isAdmin()) return true;

    // Operador no puede editar talleres ni alumnos
    if (hasRole('Operador')) {
      if (resource === 'talleres' || resource === 'alumnos') {
        return false;
      }
      return true; // Puede editar en pagos y asistencias
    }

    // Supervisor puede editar todo excepto precios
    if (hasRole('Supervisor')) {
      if (resource === 'precios') return false;
      return true;
    }

    // Profesor no puede editar nada (solo accede a asistencias)
    if (hasRole('Profesor')) {
      return false;
    }

    return false;
  };

  /**
   * Verifica si el usuario puede eliminar recursos
   */
  const canDelete = (resource: string): boolean => {
    if (!session) return false;
    if (isAdmin()) return true;

    // Operador no puede eliminar talleres ni alumnos
    if (hasRole('Operador')) {
      if (resource === 'talleres' || resource === 'alumnos') {
        return false;
      }
      return true;
    }

    // Supervisor puede eliminar todo
    if (hasRole('Supervisor')) {
      return true;
    }

    // Profesor no puede eliminar nada
    if (hasRole('Profesor')) {
      return false;
    }

    return false;
  };

  /**
   * Verifica permisos específicos para talleres (detalle)
   */
  const canDoTallerAction = (action: 'inscribir' | 'registrar-asistencia' | 'finalizar' | 'quitar-alumno' | 'dar-baja' | 'reactivar' | 'exportar-excel'): boolean => {
    if (!session) return false;
    if (isAdmin()) return true;

    // Profesor NO puede hacer ninguna acción de estas
    if (hasRole('Profesor')) {
      return false;
    }

    // Operador puede inscribir, dar de baja y reactivar
    if (hasRole('Operador')) {
      return action === 'inscribir' || action === 'dar-baja' || action === 'reactivar';
    }

    // Supervisor puede hacer todo
    if (hasRole('Supervisor')) {
      return true;
    }

    return false;
  };

  return {
    userRoles,
    hasRole,
    isAdmin,
    canAccessRoute,
    canCreate,
    canEdit,
    canDelete,
    canDoTallerAction,
  };
}
