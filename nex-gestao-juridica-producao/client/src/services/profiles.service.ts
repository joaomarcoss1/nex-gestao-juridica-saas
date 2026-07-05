import { createDomainService } from "@/services/domainCrud.service";
export const profilesService = createDomainService("users_profiles", "profiles");
