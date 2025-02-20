import React, { useState } from 'react';
import { SendStepOne } from "./SendStepOne";
import { FeeSelectionStep } from "./FeeSelectionStep";
import { ReviewTransaction } from "./ReviewTransaction";
import { PasswordInput } from "./PasswordInput"
import { AllDone } from "./AllDone"
import { TransactionFailed } from "./TransactionFailed";

interface SendFlowProps {
  updateSubtitle: (value: string) => void;
}


type Step =
  | 'AMOUNT'
  | 'FEE'
  | 'REVIEW'
  | 'PASSWORD'
  | 'DONE'
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
      setStep('FAILED');
    }
  };

  const backToAmount = () => setStep('AMOUNT');
  const backToFee = () => setStep('FEE');
  const backToReview = () => setStep('REVIEW');

  const handleClose = () => {
    setStep('AMOUNT');
    setAmount('');
    setAddress('');
    setFeeRate(1);
    setEstimatedTime('~30 min');
  };

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
      <AllDone
        amount={numericAmount}
        address={address}
        feeRate={feeRate}
        onClose={handleClose}
      />
    );
  }

  if (step === 'FAILED') {
    updateSubtitle('');
    return (
      <TransactionFailed onClose={handleClose} />
    );
  }

  return null;
};
