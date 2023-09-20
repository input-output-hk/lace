import { AssetProvider } from '@cardano-sdk/core';
import { RemoteApiPropertyType, exposeApi } from '@cardano-sdk/web-extension';
import { useRedirection } from '@hooks';
import { Wallet } from '@lace/cardano';
import { UserPromptService } from '@lib/scripts/background/services';
import { DappDataService } from '@lib/scripts/types';
import { dAppRoutePaths } from '@routes';
import { CardanoTxOut, WalletInfo } from '@src/types';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { TokenInfo, getAssetsInformation } from '@src/utils/get-assets-information';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { of } from 'rxjs';
import { runtime } from 'webextension-polyfill';
import * as HardwareLedger from '@cardano-sdk/hardware-ledger';
import { getTransactionAssetsId, getTxType } from './utils';
import { AddressListType } from '@src/views/browser-view/features/activity';

const DAPP_TOAST_DURATION = 50;

export const useCreateAssetList = ({
  assets,
  outputs,
  assetProvider
}: {
  assets?: TokenInfo;
  outputs?: CardanoTxOut[];
  assetProvider: AssetProvider;
}): ((txAssets: Wallet.Cardano.TokenMap) => Wallet.Cip30SignTxAssetItem[]) => {
  const [assetsInfo, setAssetsInfo] = useState<TokenInfo | undefined>();
  const assetIds = useMemo(() => outputs && getTransactionAssetsId(outputs), [outputs]);

  useEffect(() => {
    if (assetIds?.length > 0) {
      getAssetsInformation(assetIds, assets, {
        assetProvider,
        extraData: { nftMetadata: true, tokenMetadata: true }
      })
        .then((result) => setAssetsInfo(result))
        .catch((error) => {
          console.error(error);
        });
    }
  }, [assetIds, assetProvider, assets]);

  return useCallback(
    (txAssets: Wallet.Cardano.TokenMap) => {
      if (!assetsInfo) return [];
      const assetList: Wallet.Cip30SignTxAssetItem[] = [];
      // eslint-disable-next-line unicorn/no-array-for-each
      txAssets.forEach(async (value, key) => {
        const walletAsset = assets.get(key) || assetsInfo?.get(key);
        assetList.push({
          name: walletAsset.name.toString() || key.toString(),
          ticker: walletAsset.tokenMetadata?.ticker || walletAsset.nftMetadata?.name,
          amount: Wallet.util.calculateAssetBalance(value, walletAsset)
        });
      });
      return assetList;
    },
    [assets, assetsInfo]
  );
};

type GetSignTxData = DappDataService['getSignTxData'];
type SignTxData = { dappInfo: Wallet.DappInfo; tx: Wallet.Cardano.Tx };

export const useSignTxData = (getSignTxData: GetSignTxData): { signTxData?: SignTxData; errorMessage?: string } => {
  const [signTxData, setSignTxData] = useState<{ dappInfo: Wallet.DappInfo; tx: Wallet.Cardano.Tx }>();
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  useEffect(() => {
    getSignTxData()
      .then((result) => {
        setSignTxData(result);
      })
      .catch((error) => {
        setErrorMessage(error);
        console.error(error);
      });
  }, [getSignTxData, setSignTxData, setErrorMessage]);

  return { signTxData, errorMessage };
};

export const useCancelTx = (): ((close?: boolean) => void) =>
  useCallback((close = false) => {
    exposeApi<Pick<UserPromptService, 'allowSignTx'>>(
      {
        api$: of({
          async allowSignTx(): Promise<boolean> {
            return Promise.reject();
          }
        }),
        baseChannel: DAPP_CHANNELS.userPrompt,
        properties: { allowSignTx: RemoteApiPropertyType.MethodReturningPromise }
      },
      { logger: console, runtime }
    );
    close && setTimeout(() => window.close(), DAPP_TOAST_DURATION);
  }, []);

export const useSignWithHardwareWallet = (
  cancelTransaction: (close?: boolean) => void
): {
  signWithHardwareWallet: () => Promise<void>;
  isConfirmingTx: boolean;
} => {
  const redirectToSignFailure = useRedirection(dAppRoutePaths.dappTxSignFailure);
  const [isConfirmingTx, setIsConfirmingTx] = useState<boolean>();
  const signWithHardwareWallet = async () => {
    setIsConfirmingTx(true);
    try {
      HardwareLedger.LedgerKeyAgent.establishDeviceConnection(Wallet.KeyManagement.CommunicationType.Web)
        .then(() => {
          exposeApi<Pick<UserPromptService, 'allowSignTx'>>(
            {
              api$: of({
                async allowSignTx(): Promise<boolean> {
                  return Promise.resolve(true);
                }
              }),
              baseChannel: DAPP_CHANNELS.userPrompt,
              properties: { allowSignTx: RemoteApiPropertyType.MethodReturningPromise }
            },
            { logger: console, runtime }
          );
        })
        .catch((error) => {
          throw error;
        });
    } catch (error) {
      console.error('error', error);
      cancelTransaction(false);
      redirectToSignFailure();
    }
  };

  return { isConfirmingTx, signWithHardwareWallet };
};

export const useTxSummary = ({
  tx,
  addressList,
  availableBalance,
  walletInfo,
  createAssetList
}: {
  addressList: AddressListType[];
  availableBalance: Wallet.Cardano.Value;
  walletInfo: WalletInfo;
  tx: Wallet.Cardano.Tx;
  createAssetList: (txAssets: Wallet.Cardano.TokenMap) => Wallet.Cip30SignTxAssetItem[];
}): { txSummary?: Wallet.Cip30SignTxSummary; hasInsufficientFunds: boolean } => {
  const [hasInsufficientFunds, setInsufficientFunds] = useState(false);
  const txSummary = useMemo((): Wallet.Cip30SignTxSummary | undefined => {
    if (!tx) return undefined;
    const txType = getTxType(tx);

    const addressToNameMap = new Map<string, string>(
      addressList?.map((item: AddressListType) => [item.address, item.name])
    );

    const externalOutputs = tx.body.outputs.filter((output) => {
      if (txType === 'Send') {
        return walletInfo.addresses.every((addr) => output.address !== addr.address);
      }
      return true;
    });
    let totalCoins = BigInt(0);

    // eslint-disable-next-line unicorn/no-array-reduce
    const txSummaryOutputs: Wallet.Cip30SignTxSummary['outputs'] = externalOutputs.reduce((acc, txOut) => {
      // Don't show withdrawl tx's etc
      if (txOut.address.toString() === walletInfo.addresses[0].address.toString()) return acc;
      totalCoins += txOut.value.coins;
      if (totalCoins >= availableBalance?.coins) {
        setInsufficientFunds(true);
      }

      return [
        ...acc,
        {
          coins: Wallet.util.lovelacesToAdaString(txOut.value.coins.toString()),
          recipient: addressToNameMap?.get(txOut.address.toString()) || txOut.address.toString(),
          ...(txOut.value.assets?.size > 0 && { assets: createAssetList(txOut.value.assets) })
        }
      ];
    }, []);

    // eslint-disable-next-line consistent-return
    return {
      fee: Wallet.util.lovelacesToAdaString(tx.body.fee.toString()),
      outputs: txSummaryOutputs,
      type: txType
    };
  }, [tx, availableBalance, walletInfo.addresses, createAssetList, addressList]);

  return { txSummary, hasInsufficientFunds };
};
