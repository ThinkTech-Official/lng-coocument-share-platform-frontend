import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 md:p-8">
          <div className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
            {/* Header with Red Accent */}
            <div className="h-2 bg-lng-red" />
            
            <div className="p-8 md:p-12">
              <div className="mb-8 flex flex-col items-center text-center">
                <div className="mb-6 rounded-full bg-lng-red-20 p-4">
                  <AlertTriangle className="h-12 w-12 text-lng-red" />
                </div>
                <h1 className="mb-4 text-3xl font-bold text-lng-blue">Something went wrong</h1>
                <p className="max-w-md text-lg text-lng-grey">
                  An unexpected error occurred.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="mb-10 flex flex-col justify-center gap-4 sm:flex-row">
                <button
                  onClick={this.handleReload}
                  className="flex items-center justify-center gap-2 rounded-lg bg-lng-blue px-8 py-3 font-semibold text-white shadow-lg transition-all hover:bg-lng-blue-80 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-lng-blue focus:ring-offset-2"
                >
                  <RefreshCcw className="h-5 w-5" />
                  Reload Page
                </button>
                <button
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2 rounded-lg border-2 border-lng-blue-20 bg-white px-8 py-3 font-semibold text-lng-blue transition-all hover:bg-lng-blue-20 focus:outline-none focus:ring-2 focus:ring-lng-blue-20 focus:ring-offset-2"
                >
                  <Home className="h-5 w-5" />
                  Go to Homepage
                </button>
              </div>

              {/* Technical Details Toggle */}
              <div className="border-t border-gray-100 pt-6">
                <button
                  onClick={this.toggleDetails}
                  className="flex w-full items-center justify-between text-sm font-medium text-lng-blue-60 transition-colors hover:text-lng-blue"
                >
                  <span>Technical Details</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {this.state.showDetails && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                    <div className="rounded-lg bg-gray-900 p-4 font-mono text-xs text-red-400 overflow-x-auto shadow-inner">
                      <p className="mb-2 font-bold uppercase tracking-wider text-gray-500">Error Message:</p>
                      <pre className="whitespace-pre-wrap">{this.state.error?.message || 'Unknown error'}</pre>
                      
                      {this.state.errorInfo && (
                        <>
                          <p className="mb-2 mt-4 font-bold uppercase tracking-wider text-gray-500">Component Stack:</p>
                          <pre className="whitespace-pre-wrap opacity-80">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        </>
                      )}
                    </div>
                    <p className="mt-4 text-center text-xs text-lng-blue-40">
                      Please share these details with support if the problem persists.
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Footer Decorative Bar */}
            <div className="bg-lng-blue-20 py-3 text-center">
              <span className="text-xs font-medium text-lng-blue-60">
                LNG Document Share Platform &copy; {new Date().getFullYear()}
              </span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
