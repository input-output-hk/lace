import {
  laceStackSlideFromBottomInterpolator,
  Stack,
  StackRoutes,
} from '@lace-lib/navigation';
import React from 'react';

import { DappExternalWebView } from '../pages';

/**
 * Stack page addon providing navigation routes for dApp connector screens.
 *
 * @returns React fragment containing Stack.Screen components for each route
 */
const stackPages = () => {
  return (
    <React.Fragment key="dapp-connector-cardano-stack-pages-addons">
      <Stack.Screen
        name={StackRoutes.DappExternalWebView}
        component={DappExternalWebView}
        options={{
          cardStyleInterpolator: laceStackSlideFromBottomInterpolator,
        }}
      />
    </React.Fragment>
  );
};

export default stackPages;
