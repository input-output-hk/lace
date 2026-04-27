import { Accordion } from '@lace-lib/ui-toolkit';
import React from 'react';

import { CertificateDetails } from './CertificateDetails';

import type { Cardano } from '@cardano-sdk/core';

export const ActivityDetailsCertificate = ({
  certificates,
  coinSymbol = 'ADA',
}: {
  certificates?: Cardano.HydratedCertificate[];
  coinSymbol?: string;
}) => {
  if (!certificates || certificates.length === 0) return null;

  return (
    <Accordion.Root title="Certificates" testID="activity-details-certificates">
      {certificates.map((certificate, index) => (
        <Accordion.AccordionContent key={index}>
          <CertificateDetails
            testID={`activity-details-certificate-${index}`}
            certificate={certificate}
            coinSymbol={coinSymbol}
            shouldShowDivider={index !== certificates.length - 1}
          />
        </Accordion.AccordionContent>
      ))}
    </Accordion.Root>
  );
};
