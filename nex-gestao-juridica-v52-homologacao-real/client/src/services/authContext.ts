import type { AuthProfile } from "@/types/app";
import { databaseMode, demoModeEnabled } from "@/services/supabase";

const DEMO_ORG_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_PROFILE_ID = "00000000-0000-0000-0000-0000000000ad";

let runtimeProfile: AuthProfile | null = null;

export const demoProfile: AuthProfile = {
  id: DEMO_PROFILE_ID,
  organizationId: DEMO_ORG_ID,
  authUserId: "demo-user",
  name: "Administrador NexLabs",
  email: "admin@nexlabs.app",
  role: "admin_master",
  sector: "Diretoria",
  active: true,
  permissions: {},
};

export function setRuntimeAuthProfile(profile: AuthProfile | null) {
  runtimeProfile = profile;
}

export function getRuntimeAuthProfile() {
  if (runtimeProfile) return runtimeProfile;
  if (databaseMode === "demo" && demoModeEnabled) return demoProfile;
  return null;
}

export function getCurrentOrganizationId() {
  return getRuntimeAuthProfile()?.organizationId ?? "";
}

export function getCurrentProfileId() {
  return getRuntimeAuthProfile()?.id ?? "";
}

export function getCurrentProfileRole() {
  return getRuntimeAuthProfile()?.role ?? "";
}

export function getCurrentClientId() {
  return getRuntimeAuthProfile()?.clientId;
}

export function isProductionProfileLoaded() {
  return Boolean(runtimeProfile);
}
