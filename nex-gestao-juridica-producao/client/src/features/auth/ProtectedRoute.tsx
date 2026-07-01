import type { ReactNode } from "react";
import { LoginPage } from "./pages/LoginPage";
import { useAuth } from "@/hooks/useAuth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, profile, isDemo, error } = useAuth();
  if (loading) return <div className="loading-screen"><div className="brand-mark big">NX</div><strong>Validando sessão...</strong><span>Carregando autenticação, perfil e permissões.</span></div>;
  if (error && !isDemo) return <LoginPage initialError={error} />;
  if (!profile && !isDemo) return <LoginPage />;
  return <>{children}</>;
}
