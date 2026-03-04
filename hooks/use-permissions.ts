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

  return {
    userRoles,
    hasRole,
    isAdmin,
    canAccessRoute,
  };
}
