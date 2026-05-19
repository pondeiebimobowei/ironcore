import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { captureGlitchTipException } from "./glitchtip";

type GlitchTipErrorBoundaryProps = {
  children: ReactNode;
};

type GlitchTipErrorBoundaryState = {
  hasError: boolean;
};

export class GlitchTipErrorBoundary extends Component<
  GlitchTipErrorBoundaryProps,
  GlitchTipErrorBoundaryState
> {
  state: GlitchTipErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureGlitchTipException(error, {
      mechanism: "react_error_boundary",
      extra: {
        componentStack: info.componentStack,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="page">
          <section className="dashboard-state dashboard-state-error">
            <strong>Something went wrong</strong>
            <span>Refresh the page or try again in a moment.</span>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
