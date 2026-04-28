import {
  connectRecoveryPhraseChannel,
  RecoveryPhraseRequestError,
} from '@lace-contract/recovery-phrase';
import { createStateMachine } from '@lace-lib/util-store';
import { useEffect, useMemo, useReducer, useRef } from 'react';

import { mnemonicToByteArrayWords } from '../utils';

import { useContextualLoadModules } from './lace-context';

import type {
  RecoveryPhraseRequestErrorReason,
  RequestRecoveryPhraseParams,
} from '@lace-contract/recovery-phrase';
import type { WalletId } from '@lace-contract/wallet-repo';
import type { StateObject } from '@lace-lib/util-store';
import type { ByteArray } from '@lace-sdk/util';

type RecoveryPhraseState =
  | StateObject<'Failed', { reason: RecoveryPhraseRequestErrorReason }>
  | StateObject<'Idle' | 'Requested'>
  | StateObject<'Ready', { mnemonicWords: ByteArray[] }>;

const initialRecoveryPhraseState = { status: 'Idle' } as RecoveryPhraseState;

const recoveryPhraseStateMachine = createStateMachine(
  'recoveryPhraseRequesting',
  initialRecoveryPhraseState,
  {
    Idle: {
      requested: () => ({ status: 'Requested' }),
    },
    Requested: {
      parsed: (_, { mnemonicWords }: { mnemonicWords: ByteArray[] }) => ({
        status: 'Ready',
        mnemonicWords,
      }),
      failed: (
        _,
        { reason }: { reason: RecoveryPhraseRequestErrorReason },
      ) => ({
        status: 'Failed',
        reason,
      }),
    },
    Ready: {},
    Failed: {},
  },
);

const eraseByteArrays = (data: ByteArray[]) => {
  data.forEach(word => {
    word.fill(0);
  });
};

export type UseRequestMnemonicParams = Omit<
  RequestRecoveryPhraseParams,
  'walletId'
> & {
  walletId: WalletId | undefined;
  onFailure: (reason: RecoveryPhraseRequestErrorReason) => void;
};

export const useRequestMnemonic = ({
  authenticationPromptConfig,
  onFailure,
  walletId,
}: UseRequestMnemonicParams) => {
  const recoveryPhraseChannelExtensions = useContextualLoadModules(
    'addons.loadRecoveryPhraseChannelExtension',
  );
  const unmountedRef = useRef(false);
  const { events, initialState, transition } = recoveryPhraseStateMachine;
  const [state, dispatchEvent] = useReducer(transition, initialState);

  const recoveryPhraseChannel = useMemo(() => {
    if (!recoveryPhraseChannelExtensions) return null;
    return connectRecoveryPhraseChannel({
      consumeChannel:
        recoveryPhraseChannelExtensions[0]?.consumeRecoveryPhraseChannel,
    });
  }, [recoveryPhraseChannelExtensions]);

  useEffect(
    () => () => {
      unmountedRef.current = true;
    },
    [],
  );

  // Erase mnemonic on unmount
  useEffect(
    () => () => {
      if (!unmountedRef.current) return;
      if (state.status === 'Ready') {
        eraseByteArrays(state.mnemonicWords);
        return;
      }
    },
    [state],
  );

  // Side effects
  useEffect(() => {
    if (!walletId || !recoveryPhraseChannel) return;

    switch (state.status) {
      case 'Idle': {
        void (async () => {
          try {
            const rawMnemonic =
              await recoveryPhraseChannel.requestRecoveryPhrase({
                authenticationPromptConfig,
                walletId,
              });
            if (!unmountedRef.current) {
              const mnemonicWords = mnemonicToByteArrayWords(rawMnemonic);
              dispatchEvent(events.parsed({ mnemonicWords }));
            }
            eraseByteArrays([rawMnemonic]);
            return;
          } catch (error) {
            if (unmountedRef.current) return;

            const reason =
              RecoveryPhraseRequestError.isRecoveryPhraseRequestError(error)
                ? error.reason
                : 'failed';
            dispatchEvent(events.failed({ reason }));
          }
        })();
        dispatchEvent(events.requested());
        return;
      }
      case 'Failed': {
        onFailure(state.reason);
        return;
      }
      case 'Requested':
      case 'Ready':
    }
  }, [
    authenticationPromptConfig,
    onFailure,
    recoveryPhraseChannel,
    state,
    walletId,
  ]);

  return state;
};
