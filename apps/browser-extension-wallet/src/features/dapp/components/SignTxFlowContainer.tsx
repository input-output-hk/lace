/* eslint-disable react/no-multi-comp */
import React from 'react';
import { sendViewsFlowState } from '../config';
import { useViewsFlowContext, ViewFlowProvider } from '../../../providers';

const DappView = (): React.ReactElement => {
  const { utils } = useViewsFlowContext();
  const { renderCurrentView } = utils;
  const CurrentViewComponent = renderCurrentView();

  return <CurrentViewComponent />;
};

export const SignTxFlowContainer = (): React.ReactElement => (
  <ViewFlowProvider viewStates={sendViewsFlowState}>
    <DappView />
  </ViewFlowProvider>
);
