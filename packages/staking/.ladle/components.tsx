import { GlobalProvider, ThemeState } from '@ladle/react';
import React from 'react';
import 'antd/dist/antd.css';
import 'normalize.css';
// eslint-disable-next-line import/no-extraneous-dependencies
import '@lace/browser-extension-wallet/src/styles/index.scss';
import { General } from '../src/features/staking/setup/General';

export const Provider: GlobalProvider = ({ children, globalState }) => (
  <div id={'lace-app'}>
    <General theme={globalState.theme === ThemeState.Light ? 'light' : 'dark'}>{children}</General>
  </div>
);
