import { type AppRole } from "@/hooks/useUserRole";

/**
 * Role-based access control permission map.
 * Each key is a route path prefix, and the value is the list of roles allowed to access it.
 * Routes not listed here are accessible to all authenticated users.
 */
export const ROUTE_PERMISSIONS: Record<string, AppRole[]> = {
  "/dashboard/trucking":    ["admin", "ops_manager"],
  "/dashboard/warehouses":  ["admin", "ops_manager"],
  "/dashboard/crm":         ["admin", "sales"],
  "/dashboard/partners":    ["admin", "ops_manager", "sales"],
  "/dashboard/quotes":      ["admin", "ops_manager", "sales"],
  "/dashboard/accounting":  ["admin", "ops_manager", "sales"],
  "/dashboard/team":        ["admin"],
  "/admin":                 ["admin"],
  "/driver":                ["driver"],
  "/warehouse":             ["warehouse"],
};

/**
 * Check if a user with the given roles can access a specific path.
 * Returns true if no restriction is defined for the path (open to all authenticated users).
 */
export function canAccessRoute(path: string, userRoles: AppRole[]): boolean {
  // If user has no roles assigned, they're treated as having full access
  // (handles the case where roles haven't been set up yet)
  if (userRoles.length === 0) return true;

  for (const [routePrefix, allowedRoles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (path.startsWith(routePrefix)) {
      return userRoles.some((role) => allowedRoles.includes(role));
    }
  }
  // No restriction found — allow access
  return true;
}
