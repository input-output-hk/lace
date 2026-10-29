import { useTranslation, type TranslationKey } from '@lace-contract/i18n';
import { Card, Column, spacing, Text } from '@lace-lib/ui-toolkit';
import { useRoute } from '@react-navigation/native';
import React from 'react';

import { useLaceSelector } from '../../hooks';
import { ProgressStep } from '../ProgressStep';

import { TeeAttestationChecklist } from './TeeAttestationChecklist';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

/** Shared send stages; provider attestation is detail within proof generation. */
export const TeeAttestationProgressList = () => {
  const { params } =
    useRoute<SheetScreenProps<SheetRoutes.SendResult>['route']>();
  const { t } = useTranslation();
  const progress = useLaceSelector(
    'midnightContext.selectTeeAttestationProgress',
  );
  const network = useLaceSelector('midnightContext.selectCurrentNetwork');
  if (progress.accountId !== params.accountId) return null;
  const attestation =
    network.config.proofServer.kind === 'tee-delegated' &&
    progress.status !== 'idle' ? (
      <TeeAttestationChecklist
        providerLabel={network.config.proofServer.label}
        steps={progress.steps}
        checks={progress.checks}
        status={progress.status}
      />
    ) : null;
  // Older hosts still report only attestation. Keep their existing display.
  if (!progress.transactionSteps) return attestation;
  return (
    <Card testID="midnight-transaction-progress">
      <Column gap={spacing.M} style={{ padding: spacing.M }}>
        {progress.transactionSteps.map(step => (
          <Column key={step.id} gap={spacing.S}>
            <ProgressStep
              status={step.status}
              label={t(`midnight.send-flow.stage.${step.id}` as TranslationKey)}
              testID={`midnight-transaction-step-${step.id}`}
            />
            {step.id === 'proving' && step.status !== 'pending' ? (
              <Column style={{ paddingLeft: spacing.L }} gap={spacing.S}>
                {attestation}
                {step.status === 'running' &&
                (progress.proofMaterialRequests ?? 0) > 0 ? (
                  <Text.XS variant="secondary">
                    {t('midnight.send-flow.proof-material')}
                  </Text.XS>
                ) : null}
              </Column>
            ) : null}
          </Column>
        ))}
      </Column>
    </Card>
  );
};
