import { useTranslation, type TranslationKey } from '@lace-contract/i18n';
import {
  Card,
  Column,
  Icon,
  Row,
  spacing,
  Text,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { STATUS_GLYPH_SIZE, StepStatusGlyph } from '../ProgressStep';

import type {
  AttestationCheckResult,
  AttestationProgressState,
} from '@lace-contract/midnight-context';

export type TeeAttestationChecklistProps = {
  providerLabel?: string;
  steps: AttestationProgressState['steps'];
  checks?: AttestationCheckResult[];
  status?: AttestationProgressState['status'];
};

const CHECK_GLYPH_SIZE = 14;

const CheckRow = ({ check }: { check: AttestationCheckResult }) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const hasFailed = check.status === 'failed';
  return (
    <Row
      alignItems="center"
      gap={spacing.S}
      testID={`tee-attestation-check-${check.id}`}>
      <Icon
        name={hasFailed ? 'Cancel' : 'Checkmark'}
        size={CHECK_GLYPH_SIZE}
        color={hasFailed ? theme.data.negative : theme.data.positive}
      />
      <Text.XS
        style={hasFailed ? { color: theme.data.negative } : undefined}
        variant={hasFailed ? undefined : 'secondary'}>
        {t(`midnight.tee-attestation.check.${check.id}` as TranslationKey)}
      </Text.XS>
    </Row>
  );
};

/**
 * Presentational checklist of the TEE attestation phases run before a
 * attested proof, with verification steps expandable into
 * its individual check results once they are available. Store-agnostic —
 * `TeeAttestationProgressList` connects it to redux.
 */
export const TeeAttestationChecklist = ({
  providerLabel,
  steps,
  checks,
  status,
}: TeeAttestationChecklistProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [areTechnicalDetailsVisible, setAreTechnicalDetailsVisible] =
    useState(false);
  const [isManuallyExpanded, setIsManuallyExpanded] = useState(false);
  const toggleExpanded = useCallback(() => {
    setIsManuallyExpanded(previous => !previous);
  }, []);

  const hasChecks = !!checks && checks.length > 0;
  const hasFailedCheck = !!checks?.some(check => check.status === 'failed');
  // A failed check is the answer to "what did not verify" — always visible.
  const isExpanded = hasChecks && (isManuallyExpanded || hasFailedCheck);

  if (steps.length === 0) return null;

  return (
    <Card cardStyle={styles.card} testID="tee-attestation-checklist">
      <Column gap={spacing.M}>
        <Text.S variant="secondary">
          {providerLabel ?? t('midnight.tee-attestation.title')}
        </Text.S>
        {steps.map(step => {
          const stepChecks =
            checks?.filter(
              check => (check.phase ?? 'verify-locally') === step.id,
            ) ?? [];
          const isExpandableStep = stepChecks.length > 0;
          const label = t(
            `midnight.tee-attestation.step.${step.id}` as TranslationKey,
          );
          const row = (
            <Row
              alignItems="center"
              gap={spacing.S}
              testID={`tee-attestation-step-${step.id}`}>
              <StepStatusGlyph status={step.status} />
              <Text.S
                style={[
                  styles.stepLabel,
                  step.status === 'failed'
                    ? { color: theme.data.negative }
                    : undefined,
                ]}
                variant={step.status === 'pending' ? 'secondary' : undefined}>
                {label}
              </Text.S>
              {areTechnicalDetailsVisible && step.detail ? (
                <Text.XS variant="secondary">{step.detail}</Text.XS>
              ) : null}
              {isExpandableStep ? (
                <Icon
                  name={isExpanded ? 'CaretUp' : 'CaretDown'}
                  size={CHECK_GLYPH_SIZE}
                  color={theme.text.secondary}
                />
              ) : null}
            </Row>
          );
          return (
            <Column key={step.id} gap={spacing.S}>
              {isExpandableStep ? (
                <Pressable
                  onPress={toggleExpanded}
                  testID="tee-attestation-checks-toggle">
                  {row}
                </Pressable>
              ) : (
                row
              )}
              {isExpandableStep && isExpanded ? (
                <Column gap={spacing.XS} style={styles.checks}>
                  {stepChecks.map(check => (
                    <CheckRow key={check.id} check={check} />
                  ))}
                </Column>
              ) : null}
            </Column>
          );
        })}
        {status === 'failed' ? (
          <Text.S testID="tee-attestation-failure-summary">
            {t(
              steps.some(
                step => step.status === 'failed' && step.id === 'proving',
              )
                ? 'midnight.tee-attestation.proving-failed'
                : 'midnight.tee-attestation.failure.recovery',
            )}
          </Text.S>
        ) : null}
        {steps.some(step => step.detail) ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: areTechnicalDetailsVisible }}
            onPress={() => {
              setAreTechnicalDetailsVisible(value => !value);
            }}
            testID="tee-attestation-details-toggle">
            <Text.XS>{t('midnight.tee-attestation.details')}</Text.XS>
          </Pressable>
        ) : null}
        {status === 'succeeded' ? (
          <Text.XS variant="secondary" testID="tee-attestation-succeeded-note">
            {t('midnight.tee-attestation.succeeded')}
          </Text.XS>
        ) : null}
      </Column>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.M,
    paddingHorizontal: spacing.L,
  },
  stepLabel: {
    flexShrink: 1,
  },
  checks: {
    paddingLeft: STATUS_GLYPH_SIZE + spacing.S,
  },
});
