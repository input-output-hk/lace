import { useTranslation } from '@lace-contract/i18n';
import {
  Button,
  Card,
  Column,
  hexToRgba,
  radius,
  Row,
  spacing,
  Text,
  useCopyToClipboard,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { AdaRow } from './AdaRow';
import { AssetRows } from './AssetRows';
import { cardLayout } from './card-styles';
import { FactRow } from './FactRow';
import { formatAda, netReceived } from './format-amounts';
import { IconBadge } from './IconBadge';
import { NoteItem } from './NoteItem';
import { SectionHeader } from './SectionHeader';
import { SectionRule } from './SectionRule';
import { truncateMiddle } from './truncate-middle';
import { wizardText } from './wizard-styles';

import type { DelegationOutcome, DiscoverySummary } from '../store/slice';

/** Behind the hazard tint: enough to read as a plate, not as a filled block. */
const WARNING_TINT = 0.08;

export interface DoneSummaryProps {
  discovery?: DiscoverySummary;
  ticker: string;
  destinationWalletName?: string;
  sweepTxId?: string;
  /**
   * What the transaction actually paid and withdrew. Present once the sweep
   * has been submitted; the discovery forecast is the fallback for a resume
   * that emitted success without a body to read.
   */
  sweptFee?: string;
  sweptRewards?: string;
  /**
   * Every transaction a chunked sweep (FR-6) submitted, in submission order.
   * One receipt row per chunk, because a single id would name only the last
   * of several transactions the user's funds actually moved in. Empty or
   * single-entry falls back to `sweepTxId`.
   */
  sweepTxIds?: string[];
  /**
   * How the destination's delegation ended. Absent only for a summary rendered
   * outside the wizard's own flow (stories, and the pre-delegation history).
   */
  delegationOutcome?: DelegationOutcome;
  /**
   * Network-matched explorer base URL. When absent (no config entry for the
   * active network) the receipt rows fall back to plain text.
   */
  explorerBaseUrl?: string;
  /** Recovery for an undelegated finish — opens the earn-rewards flow. */
  onSetUpStaking?: () => void;
  /**
   * The migration report, ready to paste. Offered because the screen can only
   * summarise: verifying that the accounts really did stay unlinked needs the
   * per-transaction mapping against an explorer, which is too much to render
   * and exactly what a bug report should carry.
   */
  reportText?: string;
}

/**
 * What the migration actually did, in the same cards the review screen used to
 * promise it — the two screens are read minutes apart, and a success screen
 * shaped differently from the confirmation reads as a different transaction.
 */
export const DoneSummary = ({
  discovery,
  ticker,
  destinationWalletName,
  sweepTxId,
  sweepTxIds,
  sweptFee,
  sweptRewards,
  delegationOutcome,
  explorerBaseUrl,
  onSetUpStaking,
  reportText,
}: DoneSummaryProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [hasCopiedReport, setHasCopiedReport] = React.useState(false);
  const { copyToClipboard } = useCopyToClipboard({
    onSuccess: () => {
      setHasCopiedReport(true);
    },
  });
  const receiptTxIds =
    sweepTxIds && sweepTxIds.length > 1
      ? sweepTxIds
      : sweepTxId === undefined
      ? []
      : [sweepTxId];
  // Both endings leave the destination earning, which is what the row states —
  // with no promoted DRep the set-up is stake-only, so the row's copy stays
  // mechanism-neutral ("Set up"). `unavailable` does not qualify: there was no
  // target, so there is nothing to report and nothing the user could do.
  const isDelegated =
    delegationOutcome?.status === 'delegated' ||
    delegationOutcome?.status === 'already-delegated';

  return (
    <Column gap={spacing.L} style={cardLayout.content}>
      {/* ── Transferred ──
          The net figure the review screen promised; the pre-fee total under a
          past-tense heading would overstate what arrived. The transaction id
          closes the card: it is the receipt for exactly these figures. */}
      <Column gap={spacing.S}>
        <SectionHeader label={t('migrate-wallet.done.section.transferred')} />
        <Card cardStyle={cardLayout.card}>
          <Text.S variant="tertiary" style={wizardText.smallLine}>
            {t('migrate-wallet.done.amount-received')}
          </Text.S>

          {/* Same list as the review screen promised, ADA first, with the
              rewards that were folded into it hanging off its row. */}
          {/* Past tense, so these are what the transaction did rather than
              what the review forecast. The rewards balance can be withdrawn
              elsewhere on the same seed inside the review window, in which case
              the forecast overstates by the whole balance — and the txId below
              is a receipt for whichever figure is printed here. */}
          <AdaRow
            amount={formatAda(
              netReceived(
                discovery?.totalCoin,
                sweptRewards ?? discovery?.withdrawableRewards,
                sweptFee ?? discovery?.estimatedFee,
              ),
              ticker,
            )}
            valueTestID="migrate-wallet-done-net-value"
            testID="migrate-wallet-done-breakdown">
            <FactRow
              label={t('migrate-wallet.review.rewards')}
              value={formatAda(
                sweptRewards ?? discovery?.withdrawableRewards,
                ticker,
              )}
            />
          </AdaRow>

          <AssetRows
            assets={discovery?.assets}
            testID="migrate-wallet-done-assets"
          />

          {receiptTxIds.length > 0 && (
            <>
              <SectionRule />
              {receiptTxIds.map((txId, index) => (
                <FactRow
                  key={txId}
                  label={
                    receiptTxIds.length > 1
                      ? `${t('migrate-wallet.done.transaction')} ${index + 1}`
                      : t('migrate-wallet.done.transaction')
                  }
                  value={truncateMiddle(txId)}
                  onValuePress={
                    explorerBaseUrl === undefined
                      ? undefined
                      : () => {
                          void Linking.openURL(`${explorerBaseUrl}/tx/${txId}`);
                        }
                  }
                  testID={
                    index === 0
                      ? 'migrate-wallet-done-tx'
                      : `migrate-wallet-done-tx-${index}`
                  }
                  valueTestID={
                    index === 0
                      ? 'migrate-wallet-done-tx-link'
                      : `migrate-wallet-done-tx-link-${index}`
                  }
                />
              ))}
            </>
          )}
        </Card>
      </Column>

      {/* Suppressed when unresolved: a lone heading over blank space on the
          success screen reads as something having gone wrong. */}
      {(destinationWalletName !== undefined || isDelegated) && (
        <Column gap={spacing.S}>
          <SectionHeader label={t('migrate-wallet.done.section.destination')} />
          <Card cardStyle={cardLayout.card}>
            {destinationWalletName !== undefined && (
              <FactRow
                icon="WalletCheck"
                label={t('migrate-wallet.done.wallet-name')}
                value={destinationWalletName}
              />
            )}
            {/* Stated as the outcome, not the mechanics: which pool and DRep
                the wallet points at belongs to the staking and governance
                centers, and naming them here would make a condition of use
                read as a recommendation. */}
            {isDelegated && (
              <FactRow
                icon="Analytics"
                label={t('migrate-wallet.done.rewards-setup')}
                value={t('migrate-wallet.done.rewards-setup-active')}
                testID="migrate-wallet-done-delegation"
              />
            )}
          </Card>
        </Column>
      )}

      {/* An otherwise successful migration that did not meet its stated
          condition of use. A warning with a way out, not a summary row: the
          row is too easy to miss, and the destination is by now exactly the
          audience the earn-rewards flow serves, so recovery is one tap. */}
      {delegationOutcome?.status === 'undelegated' && (
        <View
          style={[
            styles.warningBox,
            {
              borderColor: theme.data.negative,
              backgroundColor: hexToRgba(theme.data.negative, WARNING_TINT),
            },
          ]}
          testID="migrate-wallet-done-undelegated">
          <Column gap={spacing.M}>
            <Row gap={spacing.M} alignItems="flex-start">
              <IconBadge name="AlertTriangle" tone="negative" />
              <Column gap={spacing.XS} style={cardLayout.body}>
                <Text.XS
                  style={[styles.warningLabel, { color: theme.data.negative }]}>
                  {t('migrate-wallet.done.not-delegated-label')}
                </Text.XS>
                <Text.M style={wizardText.bodyLine}>
                  {t('migrate-wallet.done.not-delegated')}
                </Text.M>
              </Column>
            </Row>
            {onSetUpStaking !== undefined && (
              <Button.Secondary
                label={t('migrate-wallet.done.set-up-staking')}
                onPress={onSetUpStaking}
                size="small"
                testID="migrate-wallet-done-set-up-staking"
              />
            )}
          </Column>
        </View>
      )}

      {/* ── Source wallet ──
          What stayed, and how to reach it. Same glyphs as the review screen's
          "stays behind" card, because it is the same claim after the fact. */}
      <Column gap={spacing.S}>
        <SectionHeader label={t('migrate-wallet.done.section.source')} />
        <Card cardStyle={cardLayout.card}>
          {discovery !== undefined &&
            discovery.retainedStakeDeposit !== '0' && (
              <FactRow
                icon="LockKey"
                label={t('migrate-wallet.review.stake-deposit')}
                value={t('migrate-wallet.done.stake-deposit-retained', {
                  amount: formatAda(discovery.retainedStakeDeposit, ticker),
                })}
                testID="migrate-wallet-done-stake-deposit"
              />
            )}
          {discovery !== undefined && discovery.sweptAccountCount > 1 && (
            <NoteItem
              icon="Account"
              text={t('migrate-wallet.done.swept-summary', {
                accounts: discovery.sweptAccountCount,
                index: discovery.scannedThroughAccountIndex,
              })}
              testID="migrate-wallet-done-swept-summary"
            />
          )}
          {/* Source-agnostic deliberately. Hardware sources became eligible
              with this feature and have no recovery phrase to fall back on, so
              naming one was a false claim on the success screen. */}
          <NoteItem
            icon="LockKey"
            text={t('migrate-wallet.done.remaining-accessible')}
          />
        </Card>
      </Column>

      {reportText !== undefined && (
        <Button.Secondary
          label={
            hasCopiedReport
              ? t('migrate-wallet.done.report-copied')
              : t('migrate-wallet.done.copy-report')
          }
          onPress={() => {
            copyToClipboard(reportText);
          }}
          size="small"
          testID="migrate-wallet-done-copy-report"
        />
      )}
    </Column>
  );
};

const styles = StyleSheet.create({
  // Same radius as the cards it sits between: the tint and the red border are
  // what mark this as the hazard, not a corner of its own.
  warningBox: {
    borderWidth: 1,
    borderRadius: radius.M,
    padding: spacing.M,
  },
  warningLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});
