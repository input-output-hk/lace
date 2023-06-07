import { GlobalProvider } from '@ladle/react';
import React from 'react';
import 'antd/dist/antd.css';
import 'normalize.css';
import '../../../apps/browser-extension-wallet/src/styles/index.scss';

export const Provider: GlobalProvider = ({ children }) => <div id={'lace-app'}>{children}</div>;
