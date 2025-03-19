/* eslint-disable promise/catch-or-return */
/* eslint-disable no-magic-numbers */
/* eslint-disable unicorn/no-null */
/* eslint-disable max-statements */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SendStepOne } from './SendStepOne';
import { ReviewTransaction } from './ReviewTransaction';
import { PasswordInput } from './PasswordInput';
import { TransactionSuccess } from './TransactionSuccess';
import { TransactionFailed } from './TransactionFailed';
import { UnauthorizedTx } from './UnauthorizedTx';
import { useFetchCoinPrice, useRedirection, useWalletManager } from '@hooks';
import { useObservable } from '@lace/common';
import { BitcoinWallet } from '@lace/bitcoin';
import { Wallet as Cardano } from '@lace/cardano';
import { walletRoutePaths } from '@routes';
import { useDrawer } from '@src/views/browser-view/stores';
import { useWalletStore } from '@src/stores';
import { APP_MODE_POPUP } from '@src/utils/constants';

const SATS_IN_BTC = 100_000_000;

type Step = 'AMOUNT' | 'FEE' | 'REVIEW' | 'PASSWORD' | 'DONE' | 'UNAUTHORIZED' | 'SUCCESS' | 'FAILED';

const signTransaction = async (tx: BitcoinWallet.UnsignedTransaction, seed: string, password: Uint8Array) => {
  const encryptedSeed = Buffer.from(seed, 'hex');
  const rootPrivateKey = Buffer.from(await Cardano.KeyManagement.emip3decrypt(encryptedSeed, password));
  const signingKeys = tx.signers;
  const signers = [];

  for (const signingKey of signingKeys) {
    const rootKeyPair = BitcoinWallet.deriveAccountRootKeyPair(
      rootPrivateKey,
      signingKey.addressType,
      signingKey.network,
      signingKey.account
    );

    const keyPair = BitcoinWallet.deriveChildKeyPair(rootKeyPair.pair.privateKey, signingKey.chain, signingKey.index);

    let finalKeyPair = keyPair.pair;

    if (signingKey.addressType === BitcoinWallet.AddressType.Taproot) {
      // Extract the internal x‑only public key (remove first byte of compressed pubkey)
      const internalXOnlyPubKey = keyPair.pair.publicKey.slice(1);
      const tweakedPrivateKey = BitcoinWallet.tweakTaprootPrivateKey(keyPair.pair.privateKey, internalXOnlyPubKey);

      finalKeyPair = {
        publicKey: keyPair.pair.publicKey,
        privateKey: Buffer.from(tweakedPrivateKey)
      };
    }

    const signer = new BitcoinWallet.BitcoinSigner(finalKeyPair);
    signers.push(signer);
  }

  const signedTx = BitcoinWallet.signTx(tx, signers);

  for (const signer of signers) {
    signer.clearSecrets();
  }
  password.fill(0);
  rootPrivateKey.fill(0);

  return signedTx;
};

type BuildTxProps = {
  knownAddresses: BitcoinWallet.DerivedAddress[];
  changeAddress: string;
  recipientAddress: string;
  feeRate: number;
  amount: bigint;
  utxos: BitcoinWallet.UTxO[];
  network: BitcoinWallet.Network;
};

const buildTransaction = ({
  knownAddresses,
  changeAddress,
  recipientAddress,
  feeRate,
  amount,
  utxos,
  network
}: BuildTxProps): BitcoinWallet.UnsignedTransaction =>
  BitcoinWallet.buildTx(recipientAddress, changeAddress, amount, feeRate, utxos, network, knownAddresses);

const btcStringToSatoshisBigint = (btcString: string): bigint => {
  // Split the BTC string into integer and fractional parts.
  const [integerPart, fractionPart = ''] = btcString.split('.');
  // Ensure the fractional part has exactly 8 digits by padding with zeros (or trimming if too long).
  const paddedFraction = fractionPart.padEnd(8, '0').slice(0, 8);
  // Compute satoshis: integer part * 100,000,000 plus the fractional part interpreted as an integer.
  return BigInt(integerPart) * BigInt(SATS_IN_BTC) + BigInt(paddedFraction);
};

export const SendFlow: React.FC = () => {
  const [step, setStep] = useState<Step>('AMOUNT');

  const [amount, setAmount] = useState<string>('');
  const [address, setAddress] = useState<string>('');

  const [unsignedTransaction, setUnsignedTransaction] = useState<BitcoinWallet.UnsignedTransaction | null>(null);
  const [feeRate, setFeeRate] = useState<number>(1);
  const [estimatedTime, setEstimatedTime] = useState<string>('~30 min');

  const [feeMarkets, setFreeMarkets] = useState<BitcoinWallet.EstimatedFees | null>(null);
  const [utxos, setUtxos] = useState<BitcoinWallet.UTxO[] | null>(null);
  const [knownAddresses, setKnownAddresses] = useState<BitcoinWallet.DerivedAddress[] | null>(null);
  const [walletInfo, setWalletInfo] = useState<BitcoinWallet.BitcoinWalletInfo | null>(null);
  const [network, setWalletNetwork] = useState<BitcoinWallet.Network | null>(null);
  const [confirmationHash, setConfirmationHash] = useState<string>('');
  const [txError, setTxError] = useState<Error | undefined>();

  const { priceResult } = useFetchCoinPrice();
  const { bitcoinWallet } = useWalletManager();

  const btcToUsdRate = useMemo(() => priceResult.bitcoin?.price ?? 0, [priceResult.bitcoin]);
  const balance = useObservable(bitcoinWallet.balance$, BigInt(0));

  const [config, clearContent] = useDrawer();

  const redirectToTransactions = useRedirection(walletRoutePaths.activity);
  const redirectToOverview = useRedirection(walletRoutePaths.assets);

  const {
    walletUI: { appMode }
  } = useWalletStore();
  const isPopupView = appMode === APP_MODE_POPUP;

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
    bitcoinWallet.getInfo().then((info) => {
      setWalletInfo(info);
    });
  }, [bitcoinWallet]);

  // Step 1 -> 2
  const goToReview = () => {
    setUnsignedTransaction(
      buildTransaction({
        knownAddresses,
        changeAddress: knownAddresses[0].address,
        recipientAddress: address,
        feeRate,
        amount: btcStringToSatoshisBigint(amount),
        utxos,
        network
      })
    );
    setStep('REVIEW');
  };
  // Step 2 -> 3
  const goToPassword = () => setStep('PASSWORD');

  const handleSignTransaction = useCallback(
    async (password: Buffer): Promise<BitcoinWallet.SignedTransaction> | undefined => {
      if (!unsignedTransaction || !walletInfo?.encryptedSecrets.seed) return;
      // eslint-disable-next-line consistent-return
      return await signTransaction(unsignedTransaction, walletInfo.encryptedSecrets.seed, password);
    },
    [unsignedTransaction, walletInfo]
  );

  const handleSubmitTx = async (signedTx: BitcoinWallet.SignedTransaction) => {
    console.error('Signed transaction:', signedTx.hex);
    try {
      const hash = await bitcoinWallet.submitTransaction(signedTx.hex);
      setConfirmationHash(hash);
      setStep('DONE');
    } catch (error) {
      setTxError(error);
      setStep('FAILED');
    }
  };

  const onClose = useCallback(() => {
    if (isPopupView) redirectToOverview();
    else {
      config?.onClose ? config?.onClose() : clearContent();
    }
  }, [clearContent, config, isPopupView, redirectToOverview]);

  const backToReview = () => setStep('REVIEW');

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
        feeRate={feeRate}
        feeMarkets={feeMarkets}
        onFeeRateChange={setFeeRate}
        onEstimatedTimeChange={setEstimatedTime}
        onContinue={goToReview}
        network={network}
      />
    );
  }

  if (step === 'REVIEW') {
    return (
      <ReviewTransaction
        onClose={onClose}
        isPopupView={isPopupView}
        unsignedTransaction={unsignedTransaction}
        btcToUsdRate={btcToUsdRate}
        feeRate={feeRate}
        estimatedTime={estimatedTime}
        onConfirm={goToPassword}
      />
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
        onClose={onClose}
        isPopupView={isPopupView}
        onViewTransaction={() => {
          clearContent();
          redirectToTransactions();
        }}
        hash={confirmationHash}
      />
    );
  }

  if (step === 'FAILED') {
    return <TransactionFailed onClose={onClose} isPopupView={isPopupView} onBack={backToReview} txError={txError} />;
  }

  if (step === 'UNAUTHORIZED') {
    return <UnauthorizedTx />;
  }

  return <></>;
};
