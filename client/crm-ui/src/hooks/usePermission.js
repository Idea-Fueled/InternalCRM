import { useAuth } from '../context/AuthContext';

/**
 * usePermission — React hook for checking RBAC permissions on the frontend.
 *
 * Usage:
 *   const { can, isAdmin } = usePermission();
 *   if (can('projects.create')) { ... }
 *
 * Admin always returns true for any permission check.
 */
export const usePermission = () => {
    const { user } = useAuth();

    const isAdmin = user?.role === 'admin';
    const permissions = user?.permissions || [];

    /**
     * Returns true if the current user has the given permission.
     * Admin always returns true.
     */
    const can = (permission) => {
        if (!user) return false;
        if (isAdmin) return true;
        return permissions.includes(permission);
    };

    /**
     * Returns true if user has ANY of the given permissions.
     */
    const canAny = (...perms) => {
        if (!user) return false;
        if (isAdmin) return true;
        return perms.some(p => permissions.includes(p));
    };

    /**
     * Returns true if user has ALL of the given permissions.
     */
    const canAll = (...perms) => {
        if (!user) return false;
        if (isAdmin) return true;
        return perms.every(p => permissions.includes(p));
    };

    return { can, canAny, canAll, isAdmin, permissions };
};

export default usePermission;
