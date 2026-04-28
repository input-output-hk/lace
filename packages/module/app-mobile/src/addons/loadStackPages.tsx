import React from 'react';

import type { AvailableAddons } from '..';
import type { ContextualLaceInit } from '@lace-contract/module';

const loadStackPages = ((_props, _dependencies) => (
  <React.Fragment key="app-mobile-stack-pages-addons"></React.Fragment>
)) as ContextualLaceInit<React.ReactNode, AvailableAddons>;

export default loadStackPages;
