/* eslint-disable sonarjs/cognitive-complexity */
import React from 'react';
import { createRoot } from 'react-dom/client';
import 'antd/dist/antd.css';
import 'normalize.css';
import { TRACK_POPUP_CHANNEL } from './utils/constants';
import { runtime } from 'webextension-polyfill';
import { createNonBackgroundMessenger } from '@cardano-sdk/web-extension';
import { logger } from '@lace/common';
import { Popup } from '@src/poc/Popup';

const mountNode = document.querySelector('#lace-popup');
createRoot(mountNode).render(<Popup />);

// not exposing any API; used to keep track of connection with SW to determine whether popup is open
createNonBackgroundMessenger({ baseChannel: TRACK_POPUP_CHANNEL }, { logger, runtime });
