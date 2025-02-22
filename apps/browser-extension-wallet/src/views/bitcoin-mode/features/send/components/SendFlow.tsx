import React, { useState } from 'react';
import { SendStepOne } from "./SendStepOne";
import { FeeSelectionStep } from "./FeeSelectionStep";
import { ReviewTransaction } from "./ReviewTransaction";
import { PasswordInput } from "./PasswordInput"
import { TransactionSuccess } from "./TransactionSuccess"
import { TransactionFailed } from "./TransactionFailed";
import { UnauthorizedTx } from "./UnauthorizedTx";

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

export const  SendFlow: React.FC<SendFlowProps> = ({ updateSubtitle }) => {
  const [step, setStep] = useState<Step>('AMOUNT');

  const [amount, setAmount] = useState<string>('');
  const [address, setAddress] = useState<string>('');

  const [feeRate, setFeeRate] = useState<number>(1);
  const [estimatedTime, setEstimatedTime] = useState<string>('~30 min');

  const numericAmount = parseFloat(amount) || 0;
  const btcToUsdRate = 9550;
  const sendingUsd = numericAmount * btcToUsdRate;

  // Step 1 -> 2
  const goToFeeSelection = () => setStep('FEE');
  // Step 2 -> 3
  const goToReview = () => setStep('REVIEW');
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
        amount={numericAmount}
        usdValue={sendingUsd}
        address={address}
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
