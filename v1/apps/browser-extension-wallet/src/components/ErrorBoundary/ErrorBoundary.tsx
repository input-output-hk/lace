import React, { Component, ErrorInfo, ReactElement } from 'react';
import { logger } from '@lace/common';
import { removePreloaderIfExists } from '@utils/remove-reloader-if-exists';
import { Crash } from './Crash';

type ErrorBoundaryProps = {
  children: ReactElement;
};
type ErrorBoundaryState = {
  error?: Error;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  state: ErrorBoundaryState = {};

  componentDidCatch(error: Error, info: ErrorInfo): void {
    removePreloaderIfExists();
    logger.error('Caught by Error Boundary:', error, info.componentStack);
  }

  render(): ReactElement {
    if (this.state.error) {
      return <Crash />;
    }
    return this.props.children;
  }
}
