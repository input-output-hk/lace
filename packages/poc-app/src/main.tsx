import * as ReactDOM from 'react-dom';
import App from './App.tsx';

export function render(containerId: string) {
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container with id "${containerId}" not found`);
  }

  ReactDOM.render(<App />, container);
}
