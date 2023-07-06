import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button, useObservable } from '@lace/common';
import { useTranslation } from 'react-i18next';
import { DappTransaction } from '@lace/core';
import { Layout } from './Layout';
import { useViewsFlowContext } from '@providers/ViewFlowProvider';
import { sectionTitle, DAPP_VIEWS } from '../config';
import styles from './ConfirmTransaction.module.scss';
import { Wallet } from '@lace/cardano';
import { useAddressBookContext, withAddressBookContext } from '@src/features/address-book/context';
import { useWalletStore } from '@stores';
import { AddressListType } from '@views/browser/features/activity';
import { consumeRemoteApi, exposeApi, RemoteApiPropertyType } from '@cardano-sdk/web-extension';
import { DappDataService } from '@lib/scripts/types';
import { DAPP_CHANNELS } from '@src/utils/constants';
import { runtime } from 'webextension-polyfill';
import { useRedirection } from '@hooks';
import { assetsBurnedInspector, assetsMintedInspector, createTxInspector } from '@cardano-sdk/core';
import { Skeleton } from 'antd';
import { dAppRoutePaths } from '@routes';
import { UserPromptService } from '@lib/scripts/background/services';
import { of } from 'rxjs';
import { CardanoTxOut } from '@src/types';
import { getAssetsInformation, TokenInfo } from '@src/utils/get-assets-information';
const DAPP_TOAST_DURATION = 50;

const dappDataApi = consumeRemoteApi<Pick<DappDataService, 'getSignTxData'>>(
  {
    baseChannel: DAPP_CHANNELS.dappData,
    properties: {
      getSignTxData: RemoteApiPropertyType.MethodReturningPromise
    }
  },
  { logger: console, runtime }
);

// eslint-disable-next-line sonarjs/cognitive-complexity
export const ConfirmTransaction = withAddressBookContext((): React.ReactElement => {
  const {
    utils: { setNextView }
  } = useViewsFlowContext();
  const { t } = useTranslation();
  const {
    walletInfo,
    inMemoryWallet,
    getKeyAgentType,
    blockchainProvider: { assetProvider }
  } = useWalletStore();
  const { list: addressList } = useAddressBookContext();

  const [hasInsufficientFunds, setInsufficientFunds] = useState(false);
  const [tx, setTx] = useState<Wallet.Cardano.Tx>();
  const assets = useObservable<TokenInfo | null>(inMemoryWallet.assetInfo$);
  const availableBalance = useObservable(inMemoryWallet.balance.utxo.available$);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [redirectToSignFailure] = useRedirection(dAppRoutePaths.dappTxSignFailure);
  const [isConfirmingTx, setIsConfirmingTx] = useState<boolean>();
  const keyAgentType = getKeyAgentType();
  const isUsingHardwareWallet = useMemo(
    () => keyAgentType !== Wallet.KeyManagement.KeyAgentType.InMemory,
    [keyAgentType]
  );
  const [assetsInfo, setAssetsInfo] = useState<TokenInfo | null>();
  const [dappInfo, setDappInfo] = useState<Wallet.DappInfo>();

  const getTransactionAssetsId = (outputs: CardanoTxOut[]) => {
    const assetIds: Wallet.Cardano.AssetId[] = [];
    const assetMaps = outputs.map((output) => output.value.assets);
    for (const asset of assetMaps) {
      if (asset) {
        for (const id of asset.keys()) {
          !assetIds.includes(id) && assetIds.push(id);
        }
      }
    }
    return assetIds;
  };

  const assetIds = useMemo(() => tx?.body?.outputs && getTransactionAssetsId(tx.body.outputs), [tx?.body?.outputs]);

  useEffect(() => {
    if (assetIds?.length > 0) {
      getAssetsInformation(assetIds, assets, {
        assetProvider,
        extraData: { nftMetadata: true, tokenMetadata: true }
      })
        .then((result) => setAssetsInfo(result))
        .catch((error) => {
          console.log(error);
        });
    }
  }, [assetIds, assetProvider, assets]);

  const cancelTransaction = useCallback(() => {
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
    setTimeout(() => window.close(), DAPP_TOAST_DURATION);
  }, []);

  const signWithHardwareWallet = useCallback(async () => {
    setIsConfirmingTx(true);
    try {
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
    } catch (error) {
      console.log('error', error);
      redirectToSignFailure();
    }
  }, [setIsConfirmingTx, redirectToSignFailure]);

  useEffect(() => {
    dappDataApi
      .getSignTxData()
      .then(({ dappInfo: backgroundDappInfo, tx: backgroundTx }) => {
        setDappInfo(backgroundDappInfo);
        setTx(backgroundTx);
      })
      .catch((error) => setErrorMessage(error));
  }, []);

  const createAssetList = useCallback(
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
    [assets, assetsInfo, t]
  );

  const addressToNameMap = useMemo(
    () => new Map<string, string>(addressList?.map((item: AddressListType) => [item.address, item.name])),
    [addressList]
  );

  const txSummary: Wallet.Cip30SignTxSummary | undefined = useMemo(() => {
    if (!tx) return;
    const inspector = createTxInspector({
      minted: assetsMintedInspector,
      burned: assetsBurnedInspector
    });

    const { minted, burned } = inspector(tx as Wallet.Cardano.HydratedTx);
    const isMintTransaction = minted.length > 0;
    const isBurnTransaction = burned.length > 0;

    let txType: 'Send' | 'Mint' | 'Burn';
    if (isMintTransaction) {
      txType = 'Mint';
    } else if (isBurnTransaction) {
      txType = 'Burn';
    } else {
      txType = 'Send';
    }

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
  }, [tx, availableBalance, walletInfo.addresses, createAssetList, addressToNameMap]);

  const translations = {
    transaction: t('core.dappTransaction.transaction'),
    amount: t('core.dappTransaction.amount'),
    recipient: t('core.dappTransaction.recipient'),
    fee: t('core.dappTransaction.fee'),
    insufficientFunds: t('core.dappTransaction.insufficientFunds'),
    adaFollowingNumericValue: t('general.adaFollowingNumericValue')
  };

  return (
    <Layout pageClassname={styles.spaceBetween} title={t(sectionTitle[DAPP_VIEWS.CONFIRM_TX])}>
      {tx && txSummary ? (
        <DappTransaction
          transaction={txSummary}
          dappInfo={dappInfo}
          errorMessage={errorMessage}
          translations={translations}
          hasInsufficientFunds={hasInsufficientFunds}
        />
      ) : (
        <Skeleton loading />
      )}
      <div className={styles.actions}>
        <Button
          onClick={async () => {
            isUsingHardwareWallet ? await signWithHardwareWallet() : setNextView();
          }}
          disabled={!!errorMessage || hasInsufficientFunds}
          loading={isUsingHardwareWallet && isConfirmingTx}
          data-testid="dapp-transaction-confirm"
          className={styles.actionBtn}
        >
          {isUsingHardwareWallet
            ? t('browserView.transaction.send.footer.confirmWithDevice', { hardwareWallet: keyAgentType })
            : t('dapp.confirm.btn.confirm')}
        </Button>
        <Button
          color="secondary"
          data-testid="dapp-transaction-cancel"
          onClick={cancelTransaction}
          className={styles.actionBtn}
        >
          {t('dapp.confirm.btn.cancel')}
        </Button>
      </div>
    </Layout>
  );
});
