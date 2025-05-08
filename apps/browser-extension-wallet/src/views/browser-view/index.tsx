import React from 'react';
import { createRoot } from 'react-dom/client';
import 'antd/dist/antd.css';
import 'normalize.css';
import '../../lib/scripts/keep-alive-ui';
import { Tab } from '@src/poc/Tab';

const mountNode = document.querySelector('#lace-app');
createRoot(mountNode).render(<Tab />);
