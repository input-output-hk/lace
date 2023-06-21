import { GlobalProvider, ThemeState } from '@ladle/react';
import React from 'react';
import 'antd/dist/antd.css';
import 'normalize.css';
import '@lace/browser-extension-wallet/src/styles/index.scss';
import { Setup } from '../src/features/staking/setup';

export const Provider: GlobalProvider = ({ children, globalState }) => (
  <div id={'lace-app'}>
    <Setup theme={globalState.theme === ThemeState.Light ? 'light' : 'dark'}>{children}</Setup>
  </div>
);
