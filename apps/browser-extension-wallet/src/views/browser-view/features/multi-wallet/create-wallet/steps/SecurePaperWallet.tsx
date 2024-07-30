/* eslint-disable unicorn/no-null */
import { WalletSetupStepLayoutRevamp, WalletTimelineSteps, PgpPublicKeyEntry } from '@lace/core';
import React, { VFC, useState } from 'react';
import { useCreateWallet } from '../context';
import { getFingerprintFromPublicPgpKey } from '@src/utils/pgp';
import { i18n } from '@lace/translation';

interface Validation {
  error?: string;
  success?: string;
}
const WEAK_KEY_REGEX = new RegExp(/RSA keys shorter than 2047 bits are considered too weak./);

export const SecurePaperWallet: VFC = () => {
  const { back, next, pgpInfo, setPgpInfo } = useCreateWallet();
  const [validation, setValidation] = useState<Validation>({ error: null, success: null });

  const handlePgpPublicKeyBlockChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValidation({ error: null, success: null });
    if (!e.target.value) return;
    try {
      const fingerPrint = await getFingerprintFromPublicPgpKey({ publicKeyArmored: e.target.value });

      setPgpInfo({
        ...pgpInfo,
        pgpPublicKey: e.target.value
      });
      setValidation({
        error: null,
        success: fingerPrint
          .toUpperCase()
          .match(/.{1,4}/g)
          .join(' ')
      });
    } catch (error) {
      if (error.message === 'Misformed armored text') {
        setValidation({ error: i18n.t('pgp.error.misformedArmoredText') });
      } else if (error.message === 'no valid encryption key packet in key.') {
        setValidation({ error: i18n.t('pgp.error.noValidEncryptionKeyPacket') });
      } else if (WEAK_KEY_REGEX.test(error.message)) {
        setValidation({ error: error.message });
      } else if (error.message === 'PGP key is not public') {
        setValidation({ error: i18n.t('pgp.error.privateKeySuppliedInsteadOfPublic') });
      }
    }
  };

  const handlePgpReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPgpInfo({ ...pgpInfo, pgpKeyReference: e.target.value });
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
        />
      </WalletSetupStepLayoutRevamp>
    </>
  );
};
