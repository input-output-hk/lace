/* eslint-disable sonarjs/cognitive-complexity */
import React from 'react';
import * as ReactDOM from 'react-dom';
import '@lib/i18n';
import 'antd/dist/antd.css';
import './styles/index.scss';
import 'normalize.css';
// Disabling import/no-unresolved as it is not aware of the "exports" entry
// https://github.com/import-js/eslint-plugin-import/issues/1810
// eslint-disable-next-line import/no-unresolved
import '@lace/staking/index.css';
import { TRACK_POPUP_CHANNEL } from './utils/constants';
import { runtime } from 'webextension-polyfill';
import { createNonBackgroundMessenger } from '@cardano-sdk/web-extension';
import { logger } from '@lace/common';
import { Popup } from '@src/poc/Popup';

const mountNode = document.querySelector('#lace-popup');
ReactDOM.render(<Popup />, mountNode);

// not exposing any API; used to keep track of connection with SW to determine whether popup is open
createNonBackgroundMessenger({ baseChannel: TRACK_POPUP_CHANNEL }, { logger, runtime });
