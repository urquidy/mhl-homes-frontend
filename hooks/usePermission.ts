import { useAuth } from '../contexts/AuthContext';

export const usePermission = () => {
  const { user } = useAuth();

  /**
   * Verifica si el usuario tiene un permiso específico.
   * Retorna true si tiene el permiso explícito O si tiene el rol de ADMIN.
   */
  const hasPermission = (permission: string): boolean => {
    if (!user?.permissions) return false;
    // Admin has all permissions
    if (user.permissions.includes('ROLE_ADMIN') || user.permissions.includes('ADMIN')) return true;
    return user.permissions.includes(permission);
  };

  /**
   * Verifica si el usuario tiene al menos uno de los permisos proporcionados.
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user?.permissions) return false;
    if (user.permissions.includes('ROLE_ADMIN') || user.permissions.includes('ADMIN')) return true;
    return permissions.some(p => user.permissions?.includes(p));
  };

  /**
   * Verifica si el usuario tiene todos los permisos proporcionados.
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user?.permissions) return false;
    if (user.permissions.includes('ROLE_ADMIN') || user.permissions.includes('ADMIN')) return true;
    return permissions.every(p => user.permissions?.includes(p));
  };

  return { hasPermission, hasAnyPermission, hasAllPermissions, user };
};