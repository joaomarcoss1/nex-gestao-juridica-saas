import { describe, expect, it } from "vitest";
import { can, isMasterAdmin, permissionsForRole } from "@/lib/permissions";
import type { AuthProfile } from "@/types/app";

function profile(role: string, active = true, permissions: Record<string, boolean> = {}): AuthProfile {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    organizationId: "00000000-0000-4000-8000-000000000010",
    name: "Usuário de teste",
    email: "teste@nex.local",
    role,
    sector: "Testes",
    active,
    permissions,
  } as AuthProfile;
}

describe("permissões por perfil", () => {
  it("nega tudo para perfil inativo", () => {
    expect(can(profile("admin_master_global", false), "companies.create")).toBe(false);
  });

  it("mantém ações globais restritas ao master", () => {
    expect(isMasterAdmin(profile("admin_master_global"))).toBe(true);
    expect(permissionsForRole("admin_empresa").has("companies.create")).toBe(false);
  });

  it("permite sobrescrever uma permissão explicitamente", () => {
    expect(can(profile("advogado", true, { "financial.view": true }), "financial.view")).toBe(true);
    expect(can(profile("admin", true, { "financial.view": false }), "financial.view")).toBe(false);
  });

  it("limita o cliente ao portal e ações expressamente liberadas", () => {
    const client = permissionsForRole("cliente");
    expect(client.has("portal.view")).toBe(true);
    expect(client.has("financial.view")).toBe(false);
    expect(client.has("companies.view")).toBe(false);
  });
});
