import { describe, expect, it } from 'vitest';

import {
  composerFlowActions,
  composerFlowReducers,
  composerFlowSelectors,
} from '../../../src/store/composer-flow';

import type {
  ComposerFlowSliceState,
  ComposerRequest,
} from '../../../src/store/composer-flow';
import type { CardanoPaymentAddress } from '../../../src/types';
import type { AccountId } from '@lace-contract/wallet-repo';

const accountId = 'test-account' as AccountId;
const request: ComposerRequest = {
  outputs: [
    {
      address: 'addr_test1recipient' as unknown as CardanoPaymentAddress,
      lovelace: '2000000',
    },
  ],
};

const reducer = composerFlowReducers.composerFlow;

describe('composerFlow slice', () => {
  it('reduces composeRequested onto the Building state', () => {
    const state = reducer(
      undefined,
      composerFlowActions.composerFlow.composeRequested({
        accountId,
        request,
      }),
    );

    expect(state).toEqual({ status: 'Building', accountId, request });
  });

  it('exposes the flow state through selectState', () => {
    const sliceState = { status: 'Idle' } as ComposerFlowSliceState;

    expect(
      composerFlowSelectors.composerFlow.selectState({
        composerFlow: sliceState,
      }),
    ).toBe(sliceState);
  });
});
