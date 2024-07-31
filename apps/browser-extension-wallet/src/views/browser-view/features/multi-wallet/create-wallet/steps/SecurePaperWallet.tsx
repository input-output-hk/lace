/* eslint-disable unicorn/no-null */
import { WalletSetupStepLayoutRevamp, WalletTimelineSteps, PgpPublicKeyEntry } from '@lace/core';
import React, { VFC, useState } from 'react';
import { useCreateWallet } from '../context';
import { pgpPublicKeyVerification } from '@src/utils/pgp';
import { i18n } from '@lace/translation';

interface Validation {
  error?: string;
  success?: string;
}

export const SecurePaperWallet: VFC = () => {
  const { back, next, pgpInfo, setPgpInfo } = useCreateWallet();
  const [validation, setValidation] = useState<Validation>({ error: null, success: null });

  const handlePgpPublicKeyBlockChange = pgpPublicKeyVerification(setPgpInfo, setValidation);

  const handlePgpReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPgpInfo((prevState) => ({ ...prevState, pgpKeyReference: e.target.value }));
  };

  const handleBack = () => {
    // TODO: analytics
    back();
  };

  const handleNext = () => {
    // TODO: analytics
    next();
  };

  return (
    <>
      <WalletSetupStepLayoutRevamp
        title={i18n.t('paperWallet.securePaperWallet.title')}
        description={i18n.t('paperWallet.securePaperWallet.description')}
        onBack={handleBack}
        onNext={handleNext}
        isNextEnabled={!!pgpInfo.pgpPublicKey && !validation.error}
        currentTimelineStep={WalletTimelineSteps.RECOVERY_DETAILS}
        paperWalletEnabled
      >
        <PgpPublicKeyEntry
          handlePgpPublicKeyBlockChange={handlePgpPublicKeyBlockChange}
          handlePgpReferenceChange={handlePgpReferenceChange}
          validation={validation}
          pgpInfo={pgpInfo}
        />
      </WalletSetupStepLayoutRevamp>
    </>
  );
};
