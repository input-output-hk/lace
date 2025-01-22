/* eslint-disable unicorn/no-null */
import React, { useState } from 'react';
import { PgpPublicKeyEntry } from '@lace/core';
import { Flex } from '@input-output-hk/lace-ui-toolkit';
import { pgpPublicKeyVerification } from '@src/utils/pgp';
import type { PublicPgpKeyData } from '@src/types';
import { Validation } from './types';
import styles from './SecureStage.module.scss';

export const SecureStage = ({
  setPgpInfo,
  pgpInfo
}: {
  setPgpInfo: React.Dispatch<React.SetStateAction<PublicPgpKeyData>>;
  pgpInfo: PublicPgpKeyData;
}): JSX.Element => {
  const [validation, setValidation] = useState<Validation>({ error: null, success: null });

  const handlePgpPublicKeyBlockChange = pgpPublicKeyVerification(setPgpInfo, setValidation);

  const handlePgpReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPgpInfo({ ...pgpInfo, pgpKeyReference: e.target.value });
  };

  return (
    <Flex my="$16" h="$fill">
      <PgpPublicKeyEntry
        handlePgpPublicKeyBlockChange={handlePgpPublicKeyBlockChange}
        handlePgpReferenceChange={handlePgpReferenceChange}
        validation={validation}
        pgpInfo={pgpInfo}
        textareaWrapperClassName={styles.fullHeight}
      />
    </Flex>
  );
};
