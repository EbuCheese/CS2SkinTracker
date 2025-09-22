import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Report to error tracking service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default fallback UI
      return (
        <div className="min-h-[200px] bg-gradient-to-br from-red-900/20 to-red-800/20 border border-red-500/30 rounded-lg p-6 flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
          
          <h3 className="text-lg font-semibold text-red-400 mb-2">
            {this.props.title || 'Something went wrong'}
          </h3>
          
          <p className="text-gray-400 mb-4 max-w-md">
            {this.props.message || 'An unexpected error occurred. Please try refreshing or contact support if the problem continues.'}
          </p>
          
          <button
            onClick={this.handleRetry}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 text-xs text-gray-500 bg-gray-800/50 rounded p-3 max-w-full">
              <summary className="cursor-pointer text-red-400 mb-2">Error Details</summary>
              <pre className="text-left whitespace-pre-wrap break-all">
                {this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;