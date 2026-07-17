import type { AuthProfile, PermissionKey } from "@/types/app";

export type RoleKey = "admin_master_global" | "admin_master" | "admin_empresa" | "admin" | "socio" | "advogado" | "estagiario" | "financeiro" | "rh" | "atendimento" | "controladoria" | "funcionario" | "cliente";

const allPermissions: PermissionKey[] = [
  "dashboard.view",
  "clients.view", "clients.create", "clients.update", "clients.archive", "clients.delete",
  "leads.view", "leads.create", "leads.update", "leads.convert",
  "processes.view", "processes.create", "processes.update", "processes.archive", "processes.delete",
  "deadlines.view", "deadlines.create", "deadlines.update", "deadlines.complete",
  "tasks.view", "tasks.create", "tasks.update", "tasks.complete",
  "financial.view", "financial.create", "financial.update", "financial.pay", "financial.delete",
  "pricing.view", "pricing.create", "pricing.update", "pricing.approve",
  "documents.view", "documents.upload", "documents.download", "documents.approve", "documents.delete",
  "portal.view", "portal.manage",
  "chat.view", "chat.reply",
  "users.view", "users.invite", "users.promote_master",
  "companies.view", "companies.create", "companies.update", "companies.block", "companies.support",
  "time.view", "time.punch", "time.adjust", "time.approve",
  "payroll.view", "payroll.generate", "payroll.export",
  "reports.view", "reports.export",
  "automations.view", "automations.create", "automations.update", "automations.run",
  "integrations.view", "integrations.manage",
  "settings.view", "settings.manage", "audit.view",
];

const adminPermissions = allPermissions.filter((permission) => String(permission) !== "users.promote_master");

const rolePermissions: Record<RoleKey, PermissionKey[]> = {
  admin_master_global: allPermissions,
  admin_master: allPermissions,
  admin_empresa: adminPermissions.filter((permission) => !String(permission).startsWith("companies.")),
  admin: adminPermissions.filter((permission) => !String(permission).startsWith("companies.")),
  socio: adminPermissions,
  advogado: [
    "dashboard.view", "clients.view", "processes.view", "processes.create", "processes.update",
    "deadlines.view", "deadlines.create", "deadlines.update", "deadlines.complete",
    "tasks.view", "tasks.create", "tasks.update", "tasks.complete",
    "documents.view", "documents.upload", "documents.download",
    "chat.view", "chat.reply", "portal.manage", "pricing.view", "reports.view", "reports.export",
  ],
  estagiario: ["dashboard.view", "clients.view", "processes.view", "deadlines.view", "tasks.view", "tasks.update", "documents.view", "documents.upload", "time.view", "time.punch"],
  financeiro: ["dashboard.view", "clients.view", "financial.view", "financial.create", "financial.update", "financial.pay", "pricing.view", "pricing.create", "pricing.update", "reports.view", "reports.export"],
  rh: ["dashboard.view", "time.view", "time.adjust", "time.approve", "payroll.view", "payroll.generate", "payroll.export", "reports.view"],
  atendimento: ["dashboard.view", "clients.view", "clients.create", "clients.update", "leads.view", "leads.create", "leads.update", "leads.convert", "tasks.view", "tasks.create"],
  controladoria: ["dashboard.view", "clients.view", "processes.view", "processes.update", "deadlines.view", "deadlines.create", "deadlines.update", "deadlines.complete", "tasks.view", "tasks.create", "tasks.update", "tasks.complete", "documents.view", "documents.approve", "automations.view", "automations.run", "reports.view"],
  funcionario: ["dashboard.view", "processes.view", "time.view", "time.punch", "tasks.view", "tasks.create", "tasks.update", "tasks.complete"],
  cliente: ["portal.view", "chat.view", "tasks.create", "documents.upload", "documents.download", "pricing.approve"],
};

export function permissionsForRole(role?: string): Set<PermissionKey> {
  const normalized = (role ?? "funcionario").toLowerCase() as RoleKey;
  return new Set(rolePermissions[normalized] ?? rolePermissions.funcionario);
}

export function can(profile: AuthProfile | null | undefined, permission: PermissionKey) {
  if (!profile || !profile.active) return false;
  const explicit = profile.permissions?.[permission];
  if (typeof explicit === "boolean") return explicit;
  return permissionsForRole(profile.role).has(permission);
}

export function canAny(profile: AuthProfile | null | undefined, permissions: PermissionKey[]) {
  return permissions.some((permission) => can(profile, permission));
}

export function isMasterAdmin(profile: AuthProfile | null | undefined) {
  return profile?.active === true && ["admin_master", "admin_master_global"].includes(String(profile.role).toLowerCase());
}
