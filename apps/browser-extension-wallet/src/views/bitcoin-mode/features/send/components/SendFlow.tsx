import React, { useEffect, useMemo, useState } from 'react';
import { SendStepOne } from "./SendStepOne";
import { FeeSelectionStep } from "./FeeSelectionStep";
import { ReviewTransaction } from "./ReviewTransaction";
import { PasswordInput } from "./PasswordInput"
import { TransactionSuccess } from "./TransactionSuccess"
import { TransactionFailed } from "./TransactionFailed";
import { UnauthorizedTx } from "./UnauthorizedTx";
import { useFetchCoinPrice, useWalletManager } from "@hooks";
import { useObservable } from "@lace/common";
import { BitcoinWallet } from "@lace/bitcoin";
import { Wallet as Cardano } from "@lace/cardano";

const SATS_IN_BTC = 100000000;

interface SendFlowProps {
  updateSubtitle: (value: string) => void;
}

type Step =
  | 'AMOUNT'
  | 'FEE'
  | 'REVIEW'
  | 'PASSWORD'
  | 'DONE'
  | 'UNAUTHORIZED'
  | 'SUCCESS'
  | 'FAILED';

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

    const keyPair = BitcoinWallet.deriveChildKeyPair(
      rootKeyPair.pair.privateKey,
      signingKey.chain,
      signingKey.index
    );

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
}

const buildTransaction = (knownAddresses: BitcoinWallet.DerivedAddress[], changeAddress: string, recipientAddress: string, feeRate: number, amount: bigint, utxos: BitcoinWallet.UTxO[], network: BitcoinWallet.Network): BitcoinWallet.UnsignedTransaction => {
  return BitcoinWallet.buildTx(recipientAddress, changeAddress, amount, feeRate, utxos, network, knownAddresses);
};

const btcStringToSatoshisBigint = (btcString: string): bigint => {
  // Split the BTC string into integer and fractional parts.
  const [integerPart, fractionPart = ""] = btcString.split(".");
  // Ensure the fractional part has exactly 8 digits by padding with zeros (or trimming if too long).
  const paddedFraction = fractionPart.padEnd(8, "0").slice(0, 8);
  // Compute satoshis: integer part * 100,000,000 plus the fractional part interpreted as an integer.
  return (BigInt(integerPart) * BigInt(SATS_IN_BTC)) + BigInt(paddedFraction);
}

export const  SendFlow: React.FC<SendFlowProps> = ({ updateSubtitle }) => {
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

  const { priceResult } = useFetchCoinPrice();
  const { bitcoinWallet } = useWalletManager();

  const btcToUsdRate = useMemo(() => priceResult.bitcoin?.price ?? 0, [priceResult.bitcoin]);
  const balance = useObservable(bitcoinWallet.balance$, BigInt(0));

  useEffect( () => {
    // TODO: Make into an observable
    bitcoinWallet.getNetwork().then((network) => {
      setWalletNetwork(network);
    });
  }, [bitcoinWallet]);

  useEffect( () => {
    // TODO: Make into an observable
    bitcoinWallet.getCurrentFeeMarket().then((markets) => {
      setFreeMarkets(markets);
    });
  }, [bitcoinWallet]);


  useEffect( () => {
    bitcoinWallet.addresses$.subscribe((addresses) => {
      setKnownAddresses(addresses);
    });
  }, [bitcoinWallet]);

  useEffect( () => {
    bitcoinWallet.utxos$.subscribe((utxos) => {
      setUtxos(utxos);
    });
  }, [bitcoinWallet]);

  useEffect( () => {
    bitcoinWallet.getInfo().then((info) => {
      setWalletInfo(info);
    });
  }, [bitcoinWallet]);

  // Step 1 -> 2
  const goToFeeSelection = () => setStep('FEE');
  // Step 2 -> 3
  const goToReview = () => {
    const unsignedTransaction = buildTransaction(knownAddresses, address, address, feeRate, btcStringToSatoshisBigint(amount), utxos, network!);
    setUnsignedTransaction(unsignedTransaction);
    setStep('REVIEW')
  };
  // Step 3 -> 4
  const goToPassword = () => setStep('PASSWORD');

  const handlePasswordSubmit = (password: string) => {
    signTransaction(
      unsignedTransaction!,
      walletInfo!.encryptedSecrets.seed,
      Buffer.from(password))
    .then((signedTx) => {
      console.log('Signed transaction:', signedTx.hex);
      bitcoinWallet.submitTransaction(signedTx.hex).then((hash) => {
        setConfirmationHash(hash);
        setStep('DONE');
      }).catch((e) => {
        console.error(e);
        setStep('FAILED');
      });
    }).catch((e) => {
      console.error(e);
      setStep('UNAUTHORIZED');
    })
  };

  const backToAmount = () => setStep('AMOUNT');
  const backToFee = () => setStep('FEE');
  const backToReview = () => setStep('REVIEW');

  if (step === 'AMOUNT') {
    updateSubtitle('Step 1: Enter amount and recipient address');
    return (
      <SendStepOne
        amount={amount}
        onAmountChange={setAmount}
        address={address}
        availableBalance={Number(balance)}
        onAddressChange={setAddress}
        onContinue={goToFeeSelection}
      />
    );
  }

  if (step === 'FEE') {
    updateSubtitle('Step 2: Select fee rate');
    return (
      <FeeSelectionStep
        feeRate={feeRate}
        feeMarkets={feeMarkets}
        onFeeRateChange={setFeeRate}
        estimatedTime={estimatedTime}
        onEstimatedTimeChange={setEstimatedTime}
        onContinue={goToReview}
        onBack={backToAmount}
      />
    );
  }

  if (step === 'REVIEW') {
    updateSubtitle('Step 3: Review transaction');
    return (
      <ReviewTransaction
        unsignedTransaction={unsignedTransaction}
        btcToUsdRate={btcToUsdRate}
        feeRate={feeRate}
        estimatedTime={estimatedTime}
        onConfirm={goToPassword}
        onBack={backToFee}
      />
    );
  }

  if (step === 'PASSWORD') {
    updateSubtitle('');
    return (
      <PasswordInput
        onSubmit={handlePasswordSubmit}
        onBack={backToReview}
      />
    );
  }

  if (step === 'DONE') {
    updateSubtitle('');
    return (
      <TransactionSuccess
        hash={confirmationHash}
      />
    );
  }

  if (step === 'FAILED') {
    updateSubtitle('');
    return (
      <TransactionFailed />
    );
  }

  if (step === 'UNAUTHORIZED') {
    updateSubtitle('');
    return (
      <UnauthorizedTx />
    );
  }

  return null;
};
