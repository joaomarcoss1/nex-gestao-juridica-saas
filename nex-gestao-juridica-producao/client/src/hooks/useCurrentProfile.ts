import { useAuth } from "./useAuth";

export function useCurrentProfile() {
  return useAuth().profile;
}
