import { GlobalProvider, ThemeState } from '@ladle/react';
import { ThemeColorScheme, ThemeProvider } from '@lace/ui';
import React from 'react';
import 'antd/dist/antd.css';
import 'normalize.css';
import '../../../apps/browser-extension-wallet/src/styles/index.scss';

export const Provider: GlobalProvider = ({ children, globalState }) => {
  return (
    <ThemeProvider
      colorScheme={globalState.theme === ThemeState.Light ? ThemeColorScheme.Light : ThemeColorScheme.Dark}
    >
      <div id={'lace-app'}>{children}</div>
    </ThemeProvider>
  );
};
