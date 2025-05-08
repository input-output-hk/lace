import React from 'react';
import ReactDOM from 'react-dom';
import 'antd/dist/antd.css';
import '../../styles/index.scss';
import 'normalize.css';
// Disabling import/no-unresolved as it is not aware of the "exports" entry
// https://github.com/import-js/eslint-plugin-import/issues/1810
// eslint-disable-next-line import/no-unresolved
import '@lace/staking/index.css';
import '../../lib/scripts/keep-alive-ui';
import { Tab } from '@src/poc/Tab';

const mountNode = document.querySelector('#lace-app');
ReactDOM.render(<Tab />, mountNode);
