/* eslint-disable unicorn/no-null */
import { WalletSetupStepLayoutRevamp, WalletTimelineSteps, PgpPublicKeyEntry } from '@lace/core';
import React, { VFC, useEffect } from 'react';
import { useCreateWallet } from '../context';
import { pgpPublicKeyVerification } from '@src/utils/pgp';
import { i18n } from '@lace/translation';
import { useWalletOnboarding } from '../../walletOnboardingContext';
import { useAnalyticsContext } from '@providers';

export const SecurePaperWallet: VFC = () => {
  const { back, next, pgpInfo, setPgpInfo, setPgpValidation, pgpValidation } = useCreateWallet();

  const { postHogActions } = useWalletOnboarding();
  const analytics = useAnalyticsContext();

  const handlePgpPublicKeyBlockChange = pgpPublicKeyVerification(setPgpInfo, setPgpValidation);

  const handlePgpReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPgpInfo((prevState) => ({ ...prevState, pgpKeyReference: e.target.value }));
  };

  const handleNext = () => {
    void analytics.sendEventToPostHog(postHogActions.create.PGP_PUBLIC_KEY_NEXT_CLICK);
    next();
  };

  useEffect(() => {
    void analytics.sendEventToPostHog(postHogActions.create.PGP_PUBLIC_KEY_PAGE_VIEW);
  }, [analytics, postHogActions.create.PGP_PUBLIC_KEY_PAGE_VIEW]);

  return (
    <>
      <WalletSetupStepLayoutRevamp
        title={i18n.t('paperWallet.securePaperWallet.title')}
        description={i18n.t('paperWallet.securePaperWallet.description')}
        onBack={back}
        onNext={handleNext}
        isNextEnabled={!!pgpInfo.pgpPublicKey && !pgpValidation.error}
        currentTimelineStep={WalletTimelineSteps.RECOVERY_DETAILS}
      >
        <PgpPublicKeyEntry
          handlePgpPublicKeyBlockChange={handlePgpPublicKeyBlockChange}
          handlePgpReferenceChange={handlePgpReferenceChange}
          validation={pgpValidation}
          pgpInfo={pgpInfo}
        />
      </WalletSetupStepLayoutRevamp>
    </>
  );
};
