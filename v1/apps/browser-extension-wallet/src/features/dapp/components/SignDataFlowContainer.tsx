/* eslint-disable react/no-multi-comp */
import React from 'react';
import { useViewsFlowContext } from '../../../providers';

export const DappSignData = (): React.ReactElement => {
  const { utils } = useViewsFlowContext();
  const { renderCurrentView } = utils;
  const CurrentViewComponent = renderCurrentView();

  return <CurrentViewComponent />;
};
