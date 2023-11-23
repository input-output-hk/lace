import { useCallback, useEffect, useMemo, useState } from 'react';
import { AssetProvider } from '@cardano-sdk/core';
import * as HardwareLedger from '@cardano-sdk/hardware-ledger';
import { dAppRoutePaths } from '@routes';
import { Wallet } from '@lace/cardano';
import { useRedirection } from '@hooks';
import { CardanoTxOut, WalletInfo } from '@src/types';
import { TokenInfo, getAssetsInformation } from '@src/utils/get-assets-information';
import { getTransactionAssetsId } from '@src/stores/slices';
import { AddressListType } from '@src/views/browser-view/features/activity';
import { TxType, allowSignTx, pubDRepKeyToHash, disallowSignTx, getTxType } from './utils';
import { GetSignTxData, SignTxData } from './types';

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

export const useDisallowSignTx = (): ((close?: boolean) => void) => useCallback(disallowSignTx, []);

export const useAllowSignTx = (): (() => void) => useCallback(allowSignTx, []);

export const useSignWithHardwareWallet = (): {
  signWithHardwareWallet: () => Promise<void>;
  isConfirmingTx: boolean;
} => {
  const allow = useAllowSignTx();
  const disallow = useDisallowSignTx();
  const redirectToSignFailure = useRedirection<Record<string, never>>(dAppRoutePaths.dappTxSignFailure);
  const [isConfirmingTx, setIsConfirmingTx] = useState<boolean>();
  const signWithHardwareWallet = useCallback(async () => {
    setIsConfirmingTx(true);
    try {
      await HardwareLedger.LedgerKeyAgent.establishDeviceConnection(Wallet.KeyManagement.CommunicationType.Web);
      allow();
    } catch (error) {
      console.error('error', error);
      disallow(false);
      redirectToSignFailure({});
    }
  }, [allow, disallow, redirectToSignFailure]);

  return { isConfirmingTx, signWithHardwareWallet };
};

export const useTxSummary = ({
  tx,
  addressList,
  walletInfo,
  createAssetList
}: {
  addressList: AddressListType[];
  walletInfo: WalletInfo;
  tx: Wallet.Cardano.Tx;
  createAssetList: (txAssets: Wallet.Cardano.TokenMap) => Wallet.Cip30SignTxAssetItem[];
}): Wallet.Cip30SignTxSummary | undefined =>
  useMemo((): Wallet.Cip30SignTxSummary | undefined => {
    const txType = getTxType(tx);

    const addressToNameMap = new Map<string, string>(
      addressList?.map((item: AddressListType) => [item.address, item.name])
    );

    const externalOutputs = tx.body.outputs.filter((output) => {
      if (txType === TxType.Send) {
        return walletInfo.addresses.every((addr) => output.address !== addr.address);
      }
      // Don't show withdrawl tx's etc
      return output.address.toString() !== walletInfo.addresses[0].address.toString();
    });

    // eslint-disable-next-line unicorn/no-array-reduce
    const txSummaryOutputs: Wallet.Cip30SignTxSummary['outputs'] = externalOutputs.reduce(
      (acc, txOut) => [
        ...acc,
        {
          coins: Wallet.util.lovelacesToAdaString(txOut.value.coins.toString()),
          recipient: addressToNameMap?.get(txOut.address.toString()) || txOut.address.toString(),
          ...(txOut.value.assets?.size > 0 && { assets: createAssetList(txOut.value.assets) })
        }
      ],
      []
    );

    return {
      fee: Wallet.util.lovelacesToAdaString(tx.body.fee.toString()),
      outputs: txSummaryOutputs,
      type: txType.toString() as 'Send' | 'Mint' | 'Burn'
    };
  }, [tx, walletInfo.addresses, createAssetList, addressList]);

export const useOnBeforeUnload = (callBack: () => void): void => {
  useEffect(() => {
    window.addEventListener('beforeunload', callBack);
    return () => {
      window.removeEventListener('beforeunload', callBack);
    };
  }, [callBack]);
};

export const useIsOwnPubDRepKey = (
  getOwnPubDRepKey: () => Promise<Wallet.Crypto.Ed25519PublicKeyHex>,
  drepHash: Wallet.Crypto.Hash28ByteBase16
): boolean => {
  const [isOwnDRepKey, setIsOwnDRepKey] = useState<boolean>();

  useEffect(() => {
    const get = async () => {
      const ownPubDRepKey = await getOwnPubDRepKey();
      const ownDRepKeyHash = await pubDRepKeyToHash(ownPubDRepKey);

      setIsOwnDRepKey(drepHash === ownDRepKeyHash);
    };

    get();
  }, [getOwnPubDRepKey, drepHash]);

  return isOwnDRepKey;
};
