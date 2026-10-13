// SuperAdmin/src/components/ErrorBoundary.jsx
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-slate-200 my-4 space-y-3">
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 font-bold">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
            <span>{this.props.title || 'Analytics Section Temporarily Unavailable'}</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A temporary display error occurred. You can click retry to re-render this component.
          </p>
          <button
            onClick={this.handleReset}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
