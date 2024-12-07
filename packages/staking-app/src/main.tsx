import React, { ReactNode } from 'react';
import App from './App.tsx';

type renderProps = {
  containerId: string;
  render: (el: ReactNode, container: Element) => void;
};

export const renderApp = ({ containerId, render }: renderProps) => {
  const container = document.querySelector(containerId);
  if (!container) {
    throw new Error(`Container with id "${containerId}" not found`);
  }

  render(<App />, container);
};
