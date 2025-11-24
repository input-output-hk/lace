import React from 'react';
import { useViewsFlowContext } from '../../../providers';

export const DappSignTx = (): React.ReactElement => {
  const { utils } = useViewsFlowContext();
  const { renderCurrentView } = utils;
  const CurrentViewComponent = renderCurrentView();

  return <CurrentViewComponent />;
};
