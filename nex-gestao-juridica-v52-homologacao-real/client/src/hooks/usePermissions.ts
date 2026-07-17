import type { PermissionKey } from "@/types/app";
import { can as canPermission, canAny as canAnyPermission } from "@/lib/permissions";
import { useAuth } from "./useAuth";

export function usePermissions() {
  const { profile } = useAuth();
  return {
    profile,
    can: (permission: PermissionKey) => canPermission(profile, permission),
    canAny: (permissions: PermissionKey[]) => canAnyPermission(profile, permissions),
  };
}
