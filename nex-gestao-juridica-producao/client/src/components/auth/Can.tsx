import type { ReactNode } from "react";
import type { PermissionKey } from "@/types/app";
import { usePermissions } from "@/hooks/usePermissions";

export function Can({ permission, children, fallback = null }: { permission: PermissionKey; children: ReactNode; fallback?: ReactNode }) {
  const { can } = usePermissions();
  return can(permission) ? <>{children}</> : <>{fallback}</>;
}
