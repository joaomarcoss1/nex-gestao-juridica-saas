import type { ReactNode } from "react";
import { LoginPage } from "./pages/LoginPage";
import { useAuth } from "@/hooks/useAuth";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { loading, profile, isDemo, error } = useAuth();
  if (loading) return <div className="loading-screen"><div className="brand-mark big">NX</div><strong>Validando sessão...</strong><span>Preparando seu ambiente de trabalho.</span></div>;
  if (error && !isDemo) return <LoginPage initialError={error} />;
  if (!profile) return <LoginPage />;
  return <>{children}</>;
}
