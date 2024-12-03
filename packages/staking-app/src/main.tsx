import React from 'react';
import * as ReactDOM from 'react-dom';
import App from './App.tsx';

export const render = (containerId: string) => {
  const container = document.querySelector(containerId);
  if (!container) {
    throw new Error(`Container with id "${containerId}" not found`);
  }

  ReactDOM.render(<App />, container);
};
