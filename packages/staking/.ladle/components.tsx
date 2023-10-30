import { GlobalProvider, ThemeState } from '@ladle/react';
import React from 'react';
import 'antd/dist/antd.css';
import 'normalize.css';
// eslint-disable-next-line import/no-extraneous-dependencies
import '@lace/browser-extension-wallet/src/styles/index.scss';
import { SetupBase } from '../src/features/staking/Setup/SetupBase';

export const Provider: GlobalProvider = ({ children, globalState }) => (
  <div id={'lace-app'}>
    <SetupBase theme={globalState.theme === ThemeState.Light ? 'light' : 'dark'}>{children}</SetupBase>
  </div>
);
