import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/Primitives";

export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) return <div className="empty-state"><strong>Algo deu errado</strong><p>{this.state.error.message}</p><Button onClick={() => location.reload()}>Recarregar</Button></div>;
    return this.props.children;
  }
}
