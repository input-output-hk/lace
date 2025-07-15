/* eslint-disable camelcase */
/* eslint-disable react/no-multi-comp */
/* eslint-disable promise/catch-or-return */
/* eslint-disable no-magic-numbers */
/* eslint-disable unicorn/no-null */
/* eslint-disable max-statements */
/* eslint-disable consistent-return */
/* eslint-disable func-call-spacing */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SendStepOne } from './SendStepOne';
import { ReviewTransaction } from './ReviewTransaction';
import { PasswordInput } from './PasswordInput';
import { TransactionSuccess } from './TransactionSuccess';
import { TransactionFailed } from './TransactionFailed';
import { useFetchCoinPrice, useRedirection, useWalletManager } from '@hooks';
import { DrawerNavigation, PostHogAction, useKeyboardShortcut, useObservable } from '@lace/common';
import { Bitcoin } from '@lace/bitcoin';
import { Wallet as Cardano } from '@lace/cardano';
import { walletRoutePaths } from '@routes';
import { useDrawer } from '@src/views/browser-view/stores';
import { useWalletStore } from '@src/stores';
import { APP_MODE_POPUP } from '@src/utils/constants';
import { useAnalyticsContext } from '@providers';
import { DrawerContent } from '@src/views/browser-view/components/Drawer';
import { useTranslation } from 'react-i18next';
import { WarningModal } from '@views/browser/components';
import styles from './SendFlow.module.scss';
import { TxCreationType, TX_CREATION_TYPE_KEY } from '@providers/AnalyticsProvider/analyticsTracker';
import { AddressValue } from './types';

const SATS_IN_BTC = 100_000_000;

type Step = 'AMOUNT' | 'FEE' | 'REVIEW' | 'PASSWORD' | 'DONE' | 'UNAUTHORIZED' | 'SUCCESS' | 'FAILED';

const signTransaction = async (tx: Bitcoin.UnsignedTransaction, seed: string, password: Uint8Array) => {
  const encryptedSeed = Buffer.from(seed, 'hex');
  const rootPrivateKey = Buffer.from(await Cardano.KeyManagement.emip3decrypt(encryptedSeed, password));
  const signingKeys = tx.signers;
  const signers = [];

  for (const signingKey of signingKeys) {
    const rootKeyPair = Bitcoin.deriveAccountRootKeyPair(
      rootPrivateKey,
      signingKey.addressType,
      signingKey.network,
      signingKey.account
    );

    const keyPair = Bitcoin.deriveChildKeyPair(rootKeyPair.pair.privateKey, signingKey.chain, signingKey.index);

    let finalKeyPair = keyPair.pair;

    if (signingKey.addressType === Bitcoin.AddressType.Taproot) {
      // Extract the internal x‑only public key (remove first byte of compressed pubkey)
      const internalXOnlyPubKey = keyPair.pair.publicKey.slice(1);
      const tweakedPrivateKey = Bitcoin.tweakTaprootPrivateKey(keyPair.pair.privateKey, internalXOnlyPubKey);

      finalKeyPair = {
        publicKey: keyPair.pair.publicKey,
        privateKey: Buffer.from(tweakedPrivateKey)
      };
    }

    const signer = new Bitcoin.BitcoinSigner(finalKeyPair);
    signers.push(signer);
  }

  const signedTx = Bitcoin.signTx(tx, signers);

  for (const signer of signers) {
    signer.clearSecrets();
  }
  password.fill(0);
  rootPrivateKey.fill(0);

  return signedTx;
};

type BuildTxProps = {
  knownAddresses: Bitcoin.DerivedAddress[];
  changeAddress: string;
  recipientAddress: string;
  opReturnMessage: string;
  feeRate: number;
  amount: bigint;
  utxos: Bitcoin.UTxO[];
  network: Bitcoin.Network;
};

const buildTransaction = ({
  knownAddresses,
  changeAddress,
  recipientAddress,
  feeRate,
  amount,
  utxos,
  opReturnMessage,
  network
}: BuildTxProps): Bitcoin.UnsignedTransaction =>
  new Bitcoin.TransactionBuilder(network, feeRate, knownAddresses)
    .setChangeAddress(changeAddress)
    .setUtxoSet(utxos)
    .addOutput(recipientAddress, amount)
    .addOpReturnOutput(opReturnMessage)
    .build();

const btcStringToSatoshisBigint = (btcString: string): bigint => {
  // Split the BTC string into integer and fractional parts.
  const [integerPart, fractionPart = ''] = btcString.split('.');
  // Ensure the fractional part has exactly 8 digits by padding with zeros (or trimming if too long).
  const paddedFraction = fractionPart.padEnd(8, '0').slice(0, 8);
  // Compute satoshis: integer part * 100,000,000 plus the fractional part interpreted as an integer.
  return BigInt(integerPart) * BigInt(SATS_IN_BTC) + BigInt(paddedFraction);
};

export const SendFlow: React.FC = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>('AMOUNT');

  const [amount, setAmount] = useState<string>('');
  const [address, setAddress] = useState<AddressValue | undefined>();

  const [unsignedTransaction, setUnsignedTransaction] = useState<
    (Bitcoin.UnsignedTransaction & { isHandle: boolean; handle: string }) | null
  >(null);
  const [feeRate, setFeeRate] = useState<number>(1);
  const [estimatedTime, setEstimatedTime] = useState<string>('~30 min');

  const [feeMarkets, setFreeMarkets] = useState<Bitcoin.EstimatedFees | null>(null);
  const [utxos, setUtxos] = useState<Bitcoin.UTxO[] | null>(null);
  const [pendingTxs, setPendingTxs] = useState<Bitcoin.TransactionHistoryEntry[] | null>(null);
  const [knownAddresses, setKnownAddresses] = useState<Bitcoin.DerivedAddress[] | null>(null);
  const [walletInfo, setWalletInfo] = useState<Bitcoin.BitcoinWalletInfo | null>(null);
  const [network, setWalletNetwork] = useState<Bitcoin.Network | null>(null);
  const [confirmationHash, setConfirmationHash] = useState<string>('');
  const [txError, setTxError] = useState<Error | undefined>();
  const [isWarningModalVisible, setIsWarningModalVisible] = useState(false);
  const [opReturnMessage, setOpReturnMessage] = useState<string>('');
  const { priceResult } = useFetchCoinPrice();
  const { bitcoinWallet } = useWalletManager();

  const btcToUsdRate = useMemo(() => priceResult.bitcoin?.price ?? 0, [priceResult.bitcoin]);
  const balance = useObservable(bitcoinWallet.balance$, BigInt(0));

  const [config, setDrawerConfig] = useDrawer();

  const redirectToTransactions = useRedirection(walletRoutePaths.activity);
  const redirectToOverview = useRedirection(walletRoutePaths.assets);
  const analytics = useAnalyticsContext();
  const hasUtxosInMempool = useMemo(() => {
    if (!pendingTxs || pendingTxs?.length === 0) return false;
    if (!utxos || utxos?.length === 0) return false;

    for (const tx of pendingTxs) {
      const { inputs } = tx;

      for (const utxo of utxos) {
        const isUtxoInMempool = inputs.some((input) => input.index === utxo.index && input.txId === utxo.txId);

        if (isUtxoInMempool) {
          return true;
        }
      }
    }

    return false;
  }, [pendingTxs, utxos]);

  useEffect(() => {
    setDrawerConfig({
      ...config,
      onClose: () => {
        // eslint-disable-next-line sonarjs/no-small-switch
        switch (step) {
          case 'DONE':
            analytics.sendEventToPostHog(PostHogAction.SendAllDoneCloseClick);
            break;
          case 'FAILED':
          case 'UNAUTHORIZED':
            analytics.sendEventToPostHog(PostHogAction.SendSomethingWentWrongXClick);
            break;
          default:
            break;
        }
        config?.onClose ? config?.onClose() : setDrawerConfig();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analytics, setDrawerConfig, step]);

  const {
    walletUI: { appMode }
  } = useWalletStore();
  const isPopupView = appMode === APP_MODE_POPUP;

  useEffect(() => {
    switch (step) {
      case 'DONE':
        analytics.sendEventToPostHog(PostHogAction.SendAllDoneView);
        break;
      case 'FAILED':
      case 'UNAUTHORIZED':
        analytics.sendEventToPostHog(PostHogAction.SendSomethingWentWrongView);
        break;
      default:
        break;
    }
  }, [step, analytics]);

  useEffect(() => {
    // TODO: Make into an observable
    bitcoinWallet.getNetwork().then(setWalletNetwork);
  }, [bitcoinWallet]);

  useEffect(() => {
    // TODO: Make into an observable
    bitcoinWallet.getCurrentFeeMarket().then(setFreeMarkets);
  }, [bitcoinWallet]);

  useEffect(() => {
    bitcoinWallet.addresses$.subscribe((addresses) => {
      setKnownAddresses(addresses);
    });
  }, [bitcoinWallet]);

  useEffect(() => {
    bitcoinWallet.utxos$.subscribe(setUtxos);
  }, [bitcoinWallet]);

  useEffect(() => {
    bitcoinWallet.pendingTransactions$.subscribe(setPendingTxs);
  }, [bitcoinWallet]);

  useEffect(() => {
    bitcoinWallet.getInfo().then((info) => {
      setWalletInfo(info);
    });
  }, [bitcoinWallet]);

  const onClose = useCallback(() => setIsWarningModalVisible(true), []);

  const confirmOnClose = useCallback(() => {
    if (isPopupView) redirectToOverview();
    else {
      config?.onClose ? config?.onClose() : setDrawerConfig();
    }
  }, [isPopupView, redirectToOverview, config, setDrawerConfig]);

  useKeyboardShortcut(['Escape'], () => (step === 'AMOUNT' ? confirmOnClose() : onClose()));

  const backToAmount = () => {
    setStep('AMOUNT');
    setDrawerConfig({
      ...config,
      content: DrawerContent.SEND_BITCOIN_TRANSACTION,
      renderHeader: () => (
        <DrawerNavigation title={<div>{t('browserView.transaction.send.title')}</div>} onCloseIconClick={onClose} />
      )
    });
  };

  // Step 1 -> 2
  const goToReview = (newFeeRate: number) => {
    analytics.sendEventToPostHog(PostHogAction.SendTransactionDataReviewTransactionClick);
    setFeeRate(newFeeRate);
    setUnsignedTransaction({
      ...buildTransaction({
        knownAddresses,
        changeAddress: knownAddresses[0].address,
        recipientAddress: address.isHandle ? address.resolvedAddress : address.address,
        feeRate: newFeeRate,
        amount: btcStringToSatoshisBigint(amount),
        utxos,
        network,
        opReturnMessage
      }),
      isHandle: address.isHandle,
      handle: address.isHandle ? address.address : ''
    });
    setStep('REVIEW');
    setDrawerConfig({
      ...config,
      content: DrawerContent.SEND_BITCOIN_TRANSACTION,
      renderHeader: () => (
        <DrawerNavigation
          title={<div>{t('browserView.transaction.send.title')}</div>}
          onCloseIconClick={onClose}
          onArrowIconClick={backToAmount}
        />
      )
    });
  };
  // Step 2 -> 3
  const goToPassword = () => {
    analytics.sendEventToPostHog(PostHogAction.SendTransactionSummaryConfirmClick, {
      trigger_point: 'send button',
      [TX_CREATION_TYPE_KEY]: TxCreationType.Internal
    });
    setStep('PASSWORD');
  };

  const handleSignTransaction = useCallback(
    async (password: Buffer): Promise<Bitcoin.SignedTransaction> | undefined => {
      if (!unsignedTransaction || !walletInfo?.encryptedSecrets.seed) return;
      return await signTransaction(unsignedTransaction, walletInfo.encryptedSecrets.seed, password);
    },
    [unsignedTransaction, walletInfo]
  );

  const handleSubmitTx = async (signedTx: Bitcoin.SignedTransaction) => {
    try {
      analytics.sendEventToPostHog(PostHogAction.SendTransactionConfirmationConfirmClick);
      const hash = await bitcoinWallet.submitTransaction(signedTx.hex);
      setConfirmationHash(hash);
      setStep('DONE');
    } catch (error) {
      setTxError(error);
      setStep('FAILED');
    }
  };

  const backToReview = () => setStep('REVIEW');

  const getSendComponent = () => {
    if (step === 'AMOUNT') {
      return (
        <SendStepOne
          onClose={onClose}
          isPopupView={isPopupView}
          amount={amount}
          onAmountChange={setAmount}
          address={address}
          availableBalance={Number(balance)}
          onAddressChange={setAddress}
          feeMarkets={feeMarkets}
          onEstimatedTimeChange={setEstimatedTime}
          onContinue={goToReview}
          network={network}
          hasUtxosInMempool={hasUtxosInMempool}
          onOpReturnMessageChange={setOpReturnMessage}
          opReturnMessage={opReturnMessage}
        />
      );
    }

    if (step === 'REVIEW') {
      return (
        <>
          <ReviewTransaction
            onClose={onClose}
            isPopupView={isPopupView}
            unsignedTransaction={unsignedTransaction}
            btcToUsdRate={btcToUsdRate}
            feeRate={feeRate}
            estimatedTime={estimatedTime}
            onConfirm={goToPassword}
            opReturnMessage={opReturnMessage}
          />
        </>
      );
    }

    if (step === 'PASSWORD') {
      return (
        <PasswordInput
          onClose={onClose}
          isPopupView={isPopupView}
          onSubmit={handleSubmitTx}
          signTransaction={handleSignTransaction}
        />
      );
    }

    if (step === 'DONE') {
      return (
        <TransactionSuccess
          onClose={() => {
            analytics.sendEventToPostHog(PostHogAction.SendAllDoneCloseClick);
            onClose();
          }}
          isPopupView={isPopupView}
          onViewTransaction={() => {
            analytics.sendEventToPostHog(PostHogAction.SendAllDoneViewTransactionClick);
            setDrawerConfig();
            redirectToTransactions();
          }}
          hash={confirmationHash}
        />
      );
    }

    if (step === 'FAILED') {
      return (
        <TransactionFailed
          onClose={() => {
            analytics.sendEventToPostHog(PostHogAction.SendSomethingWentWrongCancelClick);
            onClose();
          }}
          isPopupView={isPopupView}
          onBack={() => {
            analytics.sendEventToPostHog(PostHogAction.SendSomethingWentWrongBackClick);
            backToReview();
          }}
          txError={txError}
        />
      );
    }

    return <></>;
  };

  return (
    <>
      {getSendComponent()}
      <WarningModal
        header={t('general.warnings.youHaveToStartAgain')}
        content={
          <div className={styles.modalContent}>
            {t('general.warnings.areYouSureYouWantToExit')}
            <br />
            {t('general.warnings.thisWillNotBeSaved')}
          </div>
        }
        onConfirm={confirmOnClose}
        onCancel={() => setIsWarningModalVisible(false)}
        visible={isWarningModalVisible}
        isPopupView={isPopupView}
        dataTestId="send-warning-modal"
      />
    </>
  );
};
