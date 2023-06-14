import { ThemeColorScheme, ThemeProvider } from '@lace/ui';
import { GlobalProvider, ThemeState } from '@ladle/react';
import React from 'react';
import 'antd/dist/antd.css';
import 'normalize.css';
import '@lace/browser-extension-wallet/src/styles/index.scss';

export const Provider: GlobalProvider = ({ children, globalState }) => (
  <ThemeProvider colorScheme={globalState.theme === ThemeState.Light ? ThemeColorScheme.Light : ThemeColorScheme.Dark}>
    <div id={'lace-app'}>{children}</div>
  </ThemeProvider>
);
