/**
 * RBAC Permission Middleware
 * 
 * Architecture:
 * - Admin always has full access (bypasses permission check)
 * - All other roles must have the specific permission in their `permissions` array
 * 
 * Usage:
 *   router.post('/create', protectRoute, checkPermission('projects.create'), createProject);
 */

export const checkPermission = (permission) => {
    return (req, res, next) => {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ success: false, message: 'Unauthorized.' });
        }

        // Admin bypasses all permission checks
        if (user.role === 'admin') {
            return next();
        }

        // Check if the user's permissions array includes the required permission
        const hasPermission = Array.isArray(user.permissions) && user.permissions.includes(permission);

        if (!hasPermission) {
            console.warn(`[RBAC] User ${user._id} (${user.role}) denied: missing permission '${permission}'`);
            return res.status(403).json({
                success: false,
                message: `Access denied. You do not have the required permission: ${permission}`
            });
        }

        next();
    };
};

/**
 * Default permissions granted to each role on creation if none are specified.
 * Admin gets all permissions at the controller level (not stored in DB).
 */
export const DEFAULT_ROLE_PERMISSIONS = {
    admin: [
        'users.create', 'users.update', 'users.delete',
        'projects.create', 'projects.update', 'projects.delete',
        'tasks.create', 'tasks.update', 'tasks.delete',
        'reports.view', 'trash.view'
    ],
    hr: [
        'users.create', 'users.update', 'reports.view'
    ],
    TL: [
        'tasks.create', 'tasks.update',
        'projects.update',
        'users.update'
    ],
    developer: [
        'tasks.update'
    ],
    qa: [
        'tasks.update'
    ]
};

/**
 * All permissions available in the system (used for UI checkbox list).
 */
export const ALL_PERMISSIONS = [
    { key: 'users.create',    label: 'Create Users',    group: 'Users' },
    { key: 'users.update',    label: 'Edit Users',      group: 'Users' },
    { key: 'users.delete',    label: 'Delete Users',    group: 'Users' },
    { key: 'projects.create', label: 'Create Projects', group: 'Projects' },
    { key: 'projects.update', label: 'Edit Projects',   group: 'Projects' },
    { key: 'projects.delete', label: 'Delete Projects', group: 'Projects' },
    { key: 'tasks.create',    label: 'Create Tasks',    group: 'Tasks' },
    { key: 'tasks.update',    label: 'Edit Tasks',      group: 'Tasks' },
    { key: 'tasks.delete',    label: 'Delete Tasks',    group: 'Tasks' },
    { key: 'reports.view',    label: 'View Reports',    group: 'Reports' },
    { key: 'trash.view',      label: 'View Trash',      group: 'Reports' },
];
