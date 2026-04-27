import { createObservableHook } from '@lace-lib/util-store';

import type { SendFlowAnalyticsEnhancer } from '@lace-contract/send-flow';

const {
  trigger: getTransactionAnalyticsPayload,
  onRequest: onGetTransactionAnalyticsPayloadRequest,
} =
  createObservableHook<
    SendFlowAnalyticsEnhancer['getTransactionAnalyticsPayload']
  >();

export { onGetTransactionAnalyticsPayloadRequest };

export const createSendFlowAnalyticsEnhancers = () =>
  ({
    blockchainName: 'Midnight',
    getTransactionAnalyticsPayload,
  } satisfies SendFlowAnalyticsEnhancer);

export default createSendFlowAnalyticsEnhancers;
