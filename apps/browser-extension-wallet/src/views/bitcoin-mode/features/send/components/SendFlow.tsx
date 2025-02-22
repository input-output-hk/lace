import React, {useEffect, useMemo, useState} from 'react';
import {SendStepOne} from "./SendStepOne";
import {FeeSelectionStep} from "./FeeSelectionStep";
import {ReviewTransaction} from "./ReviewTransaction";
import {PasswordInput} from "./PasswordInput"
import {TransactionSuccess} from "./TransactionSuccess"
import {TransactionFailed} from "./TransactionFailed";
import {UnauthorizedTx} from "./UnauthorizedTx";
import {useFetchCoinPrice, useWalletManager} from "@hooks";
import {useObservable} from "@lace/common";
import {BitcoinWallet} from "@lace/bitcoin";

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

/*
const signTransaction = async (tx: BitcoinWallet.UnsignedTransaction, publicKey: Uint8Array, encryptedPrivateKey: Uint8Array, password: Uint8Array) => {
  const privateKey = Buffer.from(emip3decrypt(encryptedPrivateKey, password));

  const keyPair = { publicKey, privateKey };
  const signer = new BitcoinWallet.BitcoinSigner(keyPair);

  const signedTx = BitcoinWallet.signTx(tx, signer);

  signer.clearSecrets();

  return signedTx;
}*/

const buildTransaction = (publicKey: Uint8Array, changeAddress: string, recipientAddress: string, feeRate: number, amount: bigint, utxos: BitcoinWallet.UTxO[], network: BitcoinWallet.Network): BitcoinWallet.UnsignedTransaction => {
  return BitcoinWallet.buildTx(recipientAddress, changeAddress, amount, feeRate, utxos, network, publicKey);
};

export const  SendFlow: React.FC<SendFlowProps> = ({ updateSubtitle }) => {
  const [step, setStep] = useState<Step>('AMOUNT');

  const [amount, setAmount] = useState<string>('');
  const [address, setAddress] = useState<string>('');

  const [unsignedTransaction, setUnsignedTransaction] = useState<BitcoinWallet.UnsignedTransaction | null>(null);
  const [feeRate, setFeeRate] = useState<number>(1);
  const [estimatedTime, setEstimatedTime] = useState<string>('~30 min');

  const [feeMarkets, setFreeMarkets] = useState<BitcoinWallet.EstimatedFees | null>(null);

  const { priceResult } = useFetchCoinPrice();
  const { bitcoinWallet } = useWalletManager();

  const btcToUsdRate = useMemo(() => priceResult.bitcoin?.price ?? 0, [priceResult.bitcoin]);
  const balance = useObservable(bitcoinWallet.balance$, BigInt(0));

  // bitcoinWallet.addresses$
  // bitcoinWallet.utxos$
  /*
  const totalBalance = useMemo(() => {
      return (Number(balance) / SATS_IN_BTC) * btcToUsdRate;
    }
    , [balance, btcToUsdRate]);*/

  useEffect( () => {
    // TODO: Make into an observable
    bitcoinWallet.getCurrentFeeMarket().then((markets) => {
      setFreeMarkets(markets);
    });
  }, [bitcoinWallet]);

  // Step 1 -> 2
  const goToFeeSelection = () => setStep('FEE');
  // Step 2 -> 3
  const goToReview = () => {
    const unsignedTransaction = buildTransaction([], address, address, feeRate, BigInt(amount), [], BitcoinWallet.Network.Testnet;
    setUnsignedTransaction(unsignedTransaction);
    setStep('REVIEW')
  };
  // Step 3 -> 4
  const goToPassword = () => setStep('PASSWORD');

  const handlePasswordSubmit = (password: string) => {
    console.log('Password submitted:', password);
    if (password === '1234') {
      setStep('DONE');
    } else {
      setStep('UNAUTHORIZED');
    }
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
        hash='ASD#@Q$EAFDASF@Q#R$QADSASDASDAS'
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
