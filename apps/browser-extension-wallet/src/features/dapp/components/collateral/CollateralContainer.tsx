/* eslint-disable no-magic-numbers, promise/catch-or-return */
import React, { useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { of } from 'rxjs';
import { runtime } from 'webextension-polyfill';
import { RemoteApiPropertyType, consumeRemoteApi, exposeApi } from '@cardano-sdk/web-extension';

import { Wallet } from '@lace/cardano';
import { MainLoader } from '@src/components/MainLoader';
import { InsufficientFunds } from './InsufficientFunds';
import { DappDataService } from '@lib/scripts/types';
import { DAPP_CHANNELS } from '@utils/constants';
import type { UserPromptService } from '@lib/scripts/background/services';
import { useWalletStore } from '@src/stores';
import { DappSetCollateral } from './SetCollateral';
import { CollateralAmount, CollateralAmountWithCollateralAmount } from './types';
import { CreateCollateral } from './CreateCollateral';
import { APIErrorCode, ApiError } from '@cardano-sdk/dapp-connector';
import { useRedirection } from '@hooks';
import { dAppRoutePaths } from '@routes';
import { useObservable } from '@lace/common';

enum ReturnResponse {
  resolve = 'resolve',
  reject = 'reject'
}

interface RejectResponse {
  response: ReturnResponse.reject;
  reason: ApiError;
}

interface ResolveResponse {
  response: ReturnResponse.resolve;
  utxos: Wallet.Cardano.Utxo[];
}

const collateralRequestResponse = (action: RejectResponse | ResolveResponse) => {
  try {
    exposeApi<Pick<UserPromptService, 'getCollateralRequest'>>(
      {
        api$: of({
          getCollateralRequest() {
            if (action.response === ReturnResponse.reject) {
              return Promise.reject(action.reason);
            }
            return Promise.resolve(action.utxos);
          }
        }),
        baseChannel: DAPP_CHANNELS.userPrompt,
        properties: { getCollateralRequest: RemoteApiPropertyType.MethodReturningPromise }
      },
      {
        logger: console,
        runtime
      }
    );
  } catch (error) {
    console.error(error);
  }
};

const isInstanceOfCollateralInfoWithCollateralAmount = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  object: any
): object is CollateralAmountWithCollateralAmount => 'amount' in object;

const reject = (reason: ApiError, close = true) => {
  collateralRequestResponse({
    response: ReturnResponse.reject,
    reason
  });
  !!close && setTimeout(() => window.close(), 500);
};

window.addEventListener('beforeunload', () =>
  reject(new ApiError(APIErrorCode.Refused, 'user declined to set collateral'))
);

export const DappCollateralContainer = (): React.ReactElement => {
  const { t } = useTranslation();
  const { inMemoryWallet } = useWalletStore();
  const [isCalculatingCollateral, setIsCalculatingCollateral] = useState(true);
  const [insufficientBalance, setInsufficientBalance] = useState(false);
  const [dappInfo, setDappInfo] = useState<Wallet.DappInfo>();
  const [collateralInfo, setCollateralInfo] = useState<CollateralAmount | CollateralAmountWithCollateralAmount>();
  const [lockableUtxos, setLockableUtxos] = useState<Wallet.Cardano.Utxo[]>([]);
  const redirectToCreateSuccess = useRedirection(dAppRoutePaths.dappTxSignSuccess);
  const redirectToCreateFailure = useRedirection(dAppRoutePaths.dappTxSignFailure);

  const balance = useObservable(inMemoryWallet.balance.utxo.total$);
  const availableRewards = useObservable(inMemoryWallet.balance.rewardAccounts.rewards$);

  const confirmCollateral = useCallback(
    async (utxos: Wallet.Cardano.Utxo[]) => {
      try {
        await inMemoryWallet.utxo.setUnspendable(utxos);
        collateralRequestResponse({ response: ReturnResponse.resolve, utxos });
        redirectToCreateSuccess();
      } catch (error) {
        console.error(error);
        redirectToCreateFailure();
      }
    },
    [inMemoryWallet, redirectToCreateFailure, redirectToCreateSuccess]
  );

  /* eslint-disable-next-line sonarjs/cognitive-complexity */
  useEffect(() => {
    try {
      consumeRemoteApi<Pick<DappDataService, 'getCollateralRequest'>>(
        {
          baseChannel: DAPP_CHANNELS.dappData,
          properties: {
            getCollateralRequest: RemoteApiPropertyType.MethodReturningPromise
          }
        },
        { logger: console, runtime }
      )
        .getCollateralRequest()
        .then(({ dappInfo: requestDappInfo, collateralRequest }) => {
          if (balance === undefined) return; // Balance not loaded yet.

          // Set the summary information needed to display
          setDappInfo(requestDappInfo);
          const coinBalance = balance.coins + availableRewards;
          // Determine if collateral can be set without further fragmentation of wallet UTxOs
          let totalCoins = BigInt(0);
          const usableUtxos: Wallet.Cardano.Utxo[] = [];
          for (const utxo of collateralRequest?.utxos) {
            const { coins } = utxo[1].value;
            totalCoins += coins;
            usableUtxos.push(utxo);
            if (totalCoins >= collateralRequest.amount) {
              // If total is 100% higher than requested amount, require new tx to create collateral
              if (totalCoins > collateralRequest.amount * BigInt(2)) {
                setCollateralInfo(collateralRequest);
                break;
              } else {
                setCollateralInfo({ amount: collateralRequest.amount, lockableAmount: totalCoins });
                setLockableUtxos(usableUtxos);
                break;
              }
            }
          }

          if (totalCoins < collateralRequest.amount) {
            if (coinBalance > collateralRequest.amount) {
              setCollateralInfo(collateralRequest);
            } else {
              // Not enough ADA available to set collateral
              reject(new ApiError(APIErrorCode.Refused, 'wallet does not have enough ADA to set collateral'), false);
              setInsufficientBalance(true);
            }
          }

          setIsCalculatingCollateral(false);
        });
    } catch (error) {
      console.error(error);
      redirectToCreateFailure();
    }
  }, [redirectToCreateFailure, balance, availableRewards]);

  if (isCalculatingCollateral || !inMemoryWallet) {
    return <MainLoader text={t('dapp.collateral.calculating')} />;
  }

  if (insufficientBalance) {
    return <InsufficientFunds />;
  } else if (lockableUtxos.length > 0 && isInstanceOfCollateralInfoWithCollateralAmount(collateralInfo)) {
    return (
      <DappSetCollateral
        dappInfo={dappInfo}
        collateralInfo={collateralInfo}
        reject={reject}
        confirm={() => confirmCollateral(lockableUtxos)}
      />
    );
  }

  // Allow user to create tx to set collateral
  return (
    <CreateCollateral
      dappInfo={dappInfo}
      collateralInfo={collateralInfo}
      confirm={(utxos: Wallet.Cardano.Utxo[]) => confirmCollateral(utxos)}
      reject={reject}
    />
  );
};
