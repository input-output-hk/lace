import { viewsSelectors } from '@lace-contract/views';
import { MOBILE_VIEW_ID } from '@lace-contract/views';
import { Loader } from '@lace-lib/ui-toolkit';
import { LaceView } from '@lace-lib/util-render';
import React from 'react';
import { useSelector } from 'react-redux';

import { logger } from './util';

import type { Init } from './load-app';
import type { State } from '@lace-contract/module';
import type { ViewsStoreState } from '@lace-contract/views';

const dependencies = { logger };

export const MobileView = ({
  moduleInitProps,
}: {
  moduleInitProps: Init['moduleInitProps'];
}) => {
  const view = useSelector<State, ViewsStoreState['views']['open']>(
    viewsSelectors.views.selectOpenViewsMap,
  )[MOBILE_VIEW_ID];
  if (!view) return <Loader />;

  return (
    <LaceView
      moduleInitProps={moduleInitProps}
      dependencies={dependencies}
      view={view}
    />
  );
};

export default MobileView;
