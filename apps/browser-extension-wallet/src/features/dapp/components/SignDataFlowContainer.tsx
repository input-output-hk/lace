/* eslint-disable react/no-multi-comp */
import React from 'react';
import { signDataViewsFlowState } from '../config';
import { useViewsFlowContext, ViewFlowProvider } from '../../../providers';

const DappView = (): React.ReactElement => {
  const { utils } = useViewsFlowContext();
  const { renderCurrentView } = utils;
  const CurrentViewComponent = renderCurrentView();

  return <CurrentViewComponent />;
};

export const SignDataFlowContainer = (): React.ReactElement => (
  <ViewFlowProvider viewStates={signDataViewsFlowState}>
    <DappView />
  </ViewFlowProvider>
);
