import { toPercentage } from '@lace-contract/cardano-stake-pools';
import { useTranslation } from '@lace-contract/i18n';
import {
  Card,
  Column,
  hexToRgba,
  Icon,
  poolShortLabel,
  radius,
  Row,
  spacing,
  Text,
  Toggle,
  useTheme,
} from '@lace-lib/ui-toolkit';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { isMigratableRow } from '../store/slice';

import { AdaRow } from './AdaRow';
import { AssetRows } from './AssetRows';
import { cardLayout } from './card-styles';
import { rewardsDelegationNoteKey } from './delegation-disclosure';
import { FactRow } from './FactRow';
import { formatAda, formatAdaSigned, netReceived } from './format-amounts';
import { IconBadge } from './IconBadge';
import { NoteItem } from './NoteItem';
import { SectionHeader } from './SectionHeader';
import { SectionRule } from './SectionRule';
import { wizardText } from './wizard-styles';

import type {
  AccountMapping,
  AttestedRoles,
  ChosenPool,
  DiscoverySummary,
  MigrationMode,
} from '../store/slice';
import type { IconName } from '@lace-lib/ui-toolkit';

const BADGE_SIZE = 32;
const ARROW_SIZE = 16;
/** Behind the hazard tint: enough to read as a plate, not as a filled block. */
const WARNING_TINT = 0.08;

/**
 * One wallet in the hand-off: which end it is, what it is called, and where it
 * is. The field names ("Wallet", "Type", "Address") are carried as
 * accessibility labels instead of printed captions — on screen the name, tag
 * and elided address already say which is which, and printing all three
 * captions is what turned this block into a table of two-word rows.
 */
const IdentityBlock = ({
  icon,
  eyebrow,
  name,
  type,
  account,
  accountTestID,
}: {
  icon: IconName;
  eyebrow: string;
  name?: string;
  type?: string;
  /** Which account of the wallet this endpoint is — the wallet name alone is
   * ambiguous now that funds move between specific accounts. */
  account?: string;
  accountTestID?: string;
}) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  return (
    <Row gap={spacing.M} alignItems="flex-start">
      <IconBadge name={icon} />
      <Column gap={spacing.XS} style={cardLayout.body}>
        <SectionHeader label={eyebrow} />
        {name !== undefined && (
          <Row gap={spacing.S} alignItems="center" style={styles.identityName}>
            <Text.M
              accessibilityLabel={`${t(
                'migrate-wallet.review.wallet-name',
              )}: ${name}`}>
              {name}
            </Text.M>
            {type !== undefined && (
              <View style={[styles.tag, { borderColor: theme.border.top }]}>
                <Text.XS
                  variant="tertiary"
                  accessibilityLabel={`${t(
                    'migrate-wallet.review.wallet-type',
                  )}: ${type}`}>
                  {type}
                </Text.XS>
              </View>
            )}
          </Row>
        )}
        {account !== undefined && (
          <Text.S
            variant="tertiary"
            style={wizardText.smallLine}
            testID={accountTestID}>
            {account}
          </Text.S>
        )}
      </Column>
    </Row>
  );
};

/**
 * The roles a wallet can hold that a migration cannot move, in the order the
 * toggles read. Data rather than three near-identical blocks: the only thing
 * that varies is the glyph and which flag the switch owns, and the i18n key and
 * testID both derive from the role name.
 */
const ATTESTED_ROLES: readonly { role: keyof AttestedRoles; icon: IconName }[] =
  [
    { role: 'pool', icon: 'Analytics' },
    { role: 'drep', icon: 'User' },
    { role: 'proposer', icon: 'Brochure' },
  ];

/** What the sweep leaves behind that is a sentence rather than a figure. */
const REMAINING_NOTES = [
  { icon: 'PlugSocket', key: 'migrate-wallet.review.remaining-defi' },
  { icon: 'Clock', key: 'migrate-wallet.review.remaining-future' },
  { icon: 'Calendar03', key: 'migrate-wallet.review.disclosure.byron' },
] as const;

/**
 * The delegation outcome the review must disclose, mirroring delegationPlan:
 * register-and-delegate (deposit charged), vote-only (condition of use — the
 * voting power moves, the pool does not), or nothing to do.
 */
export type DelegationDisclosure =
  | {
      kind: 'register';
      deposit: string;
      accountCount?: number;
      /** Present when the pool is the USER'S choice (no promoted pool was
       * configured): the card then names it instead of crediting Lace. */
      chosenPool?: ChosenPool;
      /** Landing accounts keeping the pool their source account was delegated
       * to. The card names it so preservation is stated, not assumed. */
      preservedPoolCount?: number;
      /** Landing accounts the run leaves with NO set-up — the fresh accounts
       * of a mixed preserve run after the user declined the pool choice. */
      unsetAccountCount?: number;
    }
  | { kind: 'already-delegated' }
  /** The user declined the pool choice: nothing will be set up (LW-15293). */
  | { kind: 'declined' }
  | { kind: 'vote-only' };

interface ReviewSummaryProps {
  discovery?: DiscoverySummary;
  ticker: string;
  /** Suppresses the attestation block: there is nothing to attest about. */
  hasNothingToSweep: boolean;
  sourceWalletName?: string;
  /** e.g. "Account 0" — which account of the source wallet moves. */
  sourceAccountLabel?: string;
  /** The landing account's name (the mapping's first row). */
  destinationAccountLabel?: string;
  destinationWalletName?: string;
  /** Already presentable — the raw enum member never reaches here. */
  destinationWalletType?: string;
  /**
   * What the post-sweep delegation will do to this destination. Absent when
   * no target exists at all (no delegation will run and none was offered).
   */
  delegationDisclosure?: DelegationDisclosure;
  /** The target carries a DRep leg, so the disclosure must state the voting
   * power's movement; without one that claim would be false (LW-15293). */
  delegatesVote?: boolean;
  /**
   * The planned source→destination account rows, rendered when the user chose
   * to preserve the account structure: the plan is exactly what will run, so
   * the review states it row by row.
   */
  accountMapping?: (AccountMapping[number] & {
    /** The destination account's name — existing name, or the name it will be
     * created with — so the row promises what the picker will later show. */
    destinationName: string;
  })[];
  migrationMode?: MigrationMode;
  attestedRoles: AttestedRoles;
  onAttestRole: (patch: Partial<AttestedRoles>) => void;
  hasAttestedRole: boolean;
}

/**
 * The last screen before an irreversible sweep, so every figure and caveat the
 * discovery produced is on it.
 *
 * Grouped into cards rather than a single column of label/value rows: the
 * screen has to answer three separate questions — what arrives, where it goes,
 * and what is left behind — and a flat column made the reader parse thirteen
 * lines to find out which line answered which. The glyphs carry that same
 * grouping down to the row: they mark what each row is about before it is
 * read, which is what lets the caveats stay in full without reading as a wall.
 */
/**
 * Preserve mode pays one fee per transaction, so its own estimate replaces
 * the consolidated one everywhere a fee participates. Falls back when the
 * per-account estimate was unavailable — the sweep's build stays authoritative.
 */
const modeFee = (
  discovery: DiscoverySummary | undefined,
  migrationMode: MigrationMode | undefined,
): string | undefined =>
  migrationMode === 'preserve' && discovery?.preserveEstimatedFee !== undefined
    ? discovery.preserveEstimatedFee
    : discovery?.estimatedFee;

/**
 * Rewards that actually arrive. Preserve mode refuses a rewards-only account,
 * so its rewards stay on the source and must not be counted as arriving.
 */
const modeRewards = (
  discovery: DiscoverySummary | undefined,
  migrationMode: MigrationMode | undefined,
): string | undefined =>
  migrationMode === 'preserve' &&
  discovery?.preserveWithdrawableRewards !== undefined
    ? discovery.preserveWithdrawableRewards
    : discovery?.withdrawableRewards;

export const ReviewSummary = ({
  discovery,
  ticker,
  hasNothingToSweep,
  sourceWalletName,
  sourceAccountLabel,
  destinationAccountLabel,
  destinationWalletName,
  destinationWalletType,
  delegationDisclosure,
  delegatesVote,
  accountMapping,
  migrationMode,
  attestedRoles,
  onAttestRole,
  hasAttestedRole,
}: ReviewSummaryProps) => {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const scriptUtxoCount = discovery?.scriptUtxoCount ?? 0;
  // The per-account plan gets its own card only when it says something the
  // from-to card cannot: more than one account, each to its own destination.
  // Shown for ANY multi-account source, in either mode. Consolidation rendered
  // nothing here, so a two-account source read as "FROM ... Account 0" while
  // both accounts were swept: the plan named one account and moved two.
  const hasMappingCard =
    accountMapping !== undefined && accountMapping.length > 1;
  const isPreserving = migrationMode === 'preserve';
  // Which preservation sentence is true of this run, if either. 'all' needs
  // every landing account covered — a declined mix registers only the kept
  // accounts, so comparing against registrations alone called a run that
  // leaves accounts with nothing "your accounts keep their pools". 'partial'
  // is that mix; a mix where a pool WAS picked for the rest keeps the chosen
  // or promoted sentence and names the kept accounts in their own row.
  const preservation =
    delegationDisclosure?.kind === 'register' &&
    (delegationDisclosure.preservedPoolCount ?? 0) > 0
      ? (delegationDisclosure.unsetAccountCount ?? 0) > 0
        ? ('partial' as const)
        : delegationDisclosure.preservedPoolCount ===
          delegationDisclosure.accountCount
        ? ('all' as const)
        : undefined
      : undefined;
  const unfundedSetupAccounts = discovery?.preserveUnfundedSetupAccounts ?? [];
  const hasSourceIdentity = Boolean(sourceWalletName);
  const hasDestinationIdentity = Boolean(destinationWalletName);
  // The figures above the caveats, which decide whether the two are separated.
  const retainedStakeDeposit = discovery?.retainedStakeDeposit ?? '0';
  const hasRetainedDeposit = retainedStakeDeposit !== '0';
  const hasRemainingFigures = hasRetainedDeposit || scriptUtxoCount > 0;
  // Only a reward that exists is worth colouring: green on zero reads as a
  // gain that isn't there. Read through the same mode-aware figure the total
  // uses — preserve refuses rewards-only accounts, so a source whose rewards
  // all belong to those accounts arrives with none, and colouring the
  // consolidated figure painted a gain the row itself reported as zero.
  const hasRewards = BigInt(modeRewards(discovery, migrationMode) || '0') > 0n;

  // Nothing to sweep is a different screen, not this one with a line added.
  // Every block below asserts a migration: the From → To arrow, "Arrives in
  // your new wallet" over the figures, "Stays behind" listing exclusions from
  // a move with no inclusions, and — the dangerous one — "treat the old phrase
  // as compromised", which is advice that only holds after a successful sweep.
  // Here nothing moved, and the gate reads the active network only (ADR-11), so
  // the cause may be a wrong-network mismatch: that warning would be telling
  // the user to walk away from a wallet still holding their funds.
  if (hasNothingToSweep) {
    return (
      <Column gap={spacing.L} style={cardLayout.content}>
        <Card cardStyle={cardLayout.card}>
          <Text.S
            variant="negative"
            style={wizardText.smallLine}
            testID="migrate-wallet-empty-warning">
            {t('migrate-wallet.review.nothing-to-sweep')}
          </Text.S>
        </Card>
      </Column>
    );
  }

  return (
    <Column gap={spacing.L} style={cardLayout.content}>
      {/* Whether the per-account plan is stated in its own card below. When it
          is, the from-to card stays at wallet level: repeating the routing in
          both places says the same thing twice, and the mapping card says it
          per account rather than only for the first. */}
      {/* ── The plan, account by account ──
          Preserve mode only: each source account moves in its own transaction
          to its own fresh destination account, and this card is that plan —
          the user confirms a mapping, not a mystery. */}
      {hasMappingCard && (
        <Column gap={spacing.S}>
          <SectionHeader label={t('migrate-wallet.review.section.mapping')} />
          <Card cardStyle={cardLayout.card}>
            <Text.S variant="tertiary" style={wizardText.smallLine}>
              {isPreserving
                ? t('migrate-wallet.review.mapping-tx-count', {
                    // Migratable rows only: a row that cannot fund its own
                    // transaction sends none, so counting it overstates the
                    // plan the user is about to confirm.
                    count: accountMapping.filter(isMigratableRow).length,
                  })
                : t('migrate-wallet.review.mapping-combined', {
                    count: accountMapping.length,
                    destinationName: accountMapping[0].destinationName,
                  })}
            </Text.S>
            {accountMapping.map(entry => {
              // Order matters: a shortfall account IS funded, so testing
              // "funded" first hid it behind the normal row and the user only
              // found out when the delegation skipped it. Refused and shortfall
              // are preserve-mode facts — consolidation spends every account in
              // one transaction, so each row is just a source of the total.
              const variant = !isPreserving
                ? 'migrated'
                : !isMigratableRow(entry)
                ? 'retained'
                : unfundedSetupAccounts.includes(entry.sourceAccountIndex)
                ? 'no-setup'
                : 'migrated';
              if (variant === 'retained') {
                // No spendable UTxOs, which is all the mapping knows: what is
                // left may be rewards, a registered stake key's deposit, or
                // both, so the copy must not assert rewards. Migrating it would
                // put its stake witness in another account's transaction,
                // linking them on-chain — the one thing this mode promises
                // never happens.
                return (
                  <FactRow
                    key={entry.sourceAccountIndex}
                    icon="LockKey"
                    label={t('migrate-wallet.review.mapping-row-retained', {
                      source: entry.sourceAccountIndex,
                    })}
                    note={t('migrate-wallet.review.mapping-row-retained-note')}
                    testID={`migrate-wallet-review-mapping-retained-${entry.sourceAccountIndex}`}
                  />
                );
              }
              return (
                <FactRow
                  key={entry.sourceAccountIndex}
                  icon="Account"
                  label={t('migrate-wallet.review.mapping-row', {
                    source: entry.sourceAccountIndex,
                    destinationName: entry.destinationName,
                  })}
                  note={
                    variant === 'no-setup'
                      ? // Arrives, but with too little ADA to cover its own
                        // deposit and delegation fee, so it is migrated without
                        // rewards set up.
                        t('migrate-wallet.review.mapping-row-no-setup', {
                          amount: formatAda(entry.coin, ticker),
                        })
                      : t('migrate-wallet.review.mapping-row-note', {
                          amount: formatAda(entry.coin, ticker),
                          count: entry.assetCount,
                        })
                  }
                  testID={
                    variant === 'no-setup'
                      ? `migrate-wallet-review-mapping-no-setup-${entry.sourceAccountIndex}`
                      : `migrate-wallet-review-mapping-${entry.sourceAccountIndex}`
                  }
                />
              );
            })}
          </Card>
        </Column>
      )}

      {/* ── What you get ──
          The fee sits in this card, not a section of its own: it is a term in
          the sum the headline states. */}
      <Column gap={spacing.S}>
        <SectionHeader label={t('migrate-wallet.review.section.receive')} />
        <Card cardStyle={cardLayout.card}>
          <Text.S variant="tertiary" style={wizardText.smallLine}>
            {t('migrate-wallet.review.net-received')}
          </Text.S>

          {/* One list of what arrives, ADA first. The terms behind the ADA
              figure hang off its own row: they are how that number was reached,
              and as siblings of the asset rows they read as more things
              arriving — a count in a column that sums to the line above it. */}
          <AdaRow
            amount={formatAda(
              netReceived(
                discovery?.totalCoin,
                modeRewards(discovery, migrationMode),
                modeFee(discovery, migrationMode),
              ),
              ticker,
            )}
            valueTestID="migrate-wallet-review-net-value"
            testID="migrate-wallet-review-breakdown">
            <FactRow
              label={t('migrate-wallet.review.total-ada', { ticker })}
              value={formatAda(discovery?.totalCoin, ticker)}
              valueTestID="migrate-wallet-review-total-ada-value"
            />
            <FactRow
              label={t('migrate-wallet.review.rewards')}
              value={formatAdaSigned(
                modeRewards(discovery, migrationMode),
                ticker,
                '+',
              )}
              valuePositive={hasRewards}
            />
          </AdaRow>

          {/* The fee is stated unconditionally, outside the caret. Of the terms
              behind the headline figure it is the only one that is a charge:
              the total and the rewards are the user's own money and roughly
              knowable to them, while the fee is neither theirs nor inferable,
              and it is the only term that reduces what arrives. Collapsing all
              three loses provenance; collapsing this one means a consent screen
              for a fee-charging transaction never says a fee is charged. */}
          <FactRow
            label={t('migrate-wallet.review.estimated-fee')}
            value={formatAdaSigned(
              modeFee(discovery, migrationMode),
              ticker,
              '−',
            )}
            note={
              migrationMode === 'preserve' &&
              discovery?.preserveTxCount !== undefined
                ? t('migrate-wallet.review.fee-per-transaction', {
                    count: discovery.preserveTxCount,
                  })
                : undefined
            }
            testID="migrate-wallet-review-fee"
          />

          <AssetRows
            assets={discovery?.assets}
            testID="migrate-wallet-review-assets"
          />
        </Card>
      </Column>

      {/* ── Rewards set-up ──
          Its own row rather than a term inside the figure above. The sweep
          total is exact; the delegation's fee cannot be priced until the sweep
          lands, so folding an estimate in would make a currently-exact number
          inexact. Two honest figures beat one approximate one, and stating the
          deposit as refundable stops it reading as a charge. State-aware: an
          already-staking destination pays no deposit — what it must know is
          the condition of use, that its VOTING power moves to the promoted
          DRep (the pool never moves); a destination that already has a DRep
          is left untouched and told so. */}
      {delegationDisclosure?.kind === 'register' && (
        <Column gap={spacing.S}>
          {/* One heading for every ending of this section: what the user is
              deciding about is earning rewards, and the cost is a term of it,
              not the subject. */}
          <SectionHeader
            label={t('migrate-wallet.review.section.delegation')}
          />
          <Card cardStyle={cardLayout.card}>
            {/* States both delegations before the deposit: the deposit is
                meaningless until the user knows what it buys, and a consent
                screen that charges for staking must say where the stake and
                the voting power go. */}
            <FactRow
              icon="Analytics"
              label={
                delegatesVote
                  ? t('migrate-wallet.review.rewards-delegation')
                  : t('migrate-wallet.review.rewards-delegation-stake-only')
              }
              note={t(
                rewardsDelegationNoteKey({
                  hasChosenPool: delegationDisclosure.chosenPool !== undefined,
                  delegatesVote: delegatesVote === true,
                  preservation,
                }),
              )}
              testID="migrate-wallet-review-rewards-delegation"
            />
            {/* Only when a pool was PICKED for the rest of a mix. Both
                preservation sentences above already state the kept accounts;
                the two rows would open on the same clause. */}
            {(delegationDisclosure.preservedPoolCount ?? 0) > 0 &&
              preservation === undefined && (
                <FactRow
                  icon="Analytics"
                  label={t('migrate-wallet.review.pools-kept')}
                  note={t(
                    delegatesVote
                      ? 'migrate-wallet.review.pools-kept-note'
                      : 'migrate-wallet.review.pools-kept-note-stake-only',
                    { count: delegationDisclosure.preservedPoolCount },
                  )}
                  testID="migrate-wallet-review-pools-kept"
                />
              )}
            {delegationDisclosure.chosenPool !== undefined && (
              <FactRow
                icon="Analytics"
                label={t('migrate-wallet.review.chosen-pool')}
                value={poolShortLabel(
                  delegationDisclosure.chosenPool.ticker,
                  delegationDisclosure.chosenPool.poolId,
                )}
                note={
                  delegationDisclosure.chosenPool.ros === undefined
                    ? undefined
                    : t('migrate-wallet.review.chosen-pool-rate', {
                        rate: `${toPercentage(
                          delegationDisclosure.chosenPool.ros,
                        )}`,
                      })
                }
                testID="migrate-wallet-review-chosen-pool"
              />
            )}
            <FactRow
              icon="LockKey"
              label={t('migrate-wallet.review.stake-key-deposit')}
              value={formatAda(delegationDisclosure.deposit, ticker)}
              note={
                (delegationDisclosure.accountCount ?? 1) > 1
                  ? t(
                      'migrate-wallet.review.stake-key-deposit-note-per-account',
                      {
                        count: delegationDisclosure.accountCount,
                      },
                    )
                  : t('migrate-wallet.review.stake-key-deposit-note')
              }
              testID="migrate-wallet-review-delegation-deposit"
            />
          </Card>
        </Column>
      )}
      {delegationDisclosure?.kind === 'vote-only' && (
        <Column gap={spacing.S}>
          <SectionHeader
            label={t('migrate-wallet.review.section.delegation')}
          />
          <Card cardStyle={cardLayout.card}>
            <FactRow
              icon="LockKey"
              label={t('migrate-wallet.review.vote-delegation')}
              note={t('migrate-wallet.review.vote-delegation-note')}
              testID="migrate-wallet-review-vote-delegation"
            />
          </Card>
        </Column>
      )}
      {delegationDisclosure?.kind === 'declined' && (
        <Column gap={spacing.S}>
          <SectionHeader
            label={t('migrate-wallet.review.section.delegation')}
          />
          <Card cardStyle={cardLayout.card}>
            <FactRow
              icon="LockKey"
              label={t('migrate-wallet.review.delegation-declined')}
              note={t('migrate-wallet.review.delegation-declined-note')}
              testID="migrate-wallet-review-delegation-declined"
            />
          </Card>
        </Column>
      )}
      {delegationDisclosure?.kind === 'already-delegated' && (
        <Column gap={spacing.S}>
          <SectionHeader
            label={t('migrate-wallet.review.section.delegation')}
          />
          <Card cardStyle={cardLayout.card}>
            <FactRow
              icon="LockKey"
              label={t('migrate-wallet.review.delegation-unchanged')}
              note={t('migrate-wallet.review.delegation-unchanged-note')}
              testID="migrate-wallet-review-delegation-unchanged"
            />
          </Card>
        </Column>
      )}

      {/* ── From → To ──
          Each half is suppressed when empty. A heading over blank space reads
          as "we could not identify the wallet", not "loading". */}
      {(hasSourceIdentity || hasDestinationIdentity) && (
        <Card cardStyle={cardLayout.card}>
          {hasSourceIdentity && (
            <IdentityBlock
              icon="Wallet"
              eyebrow={t('migrate-wallet.review.section.source')}
              name={sourceWalletName}
              account={hasMappingCard ? undefined : sourceAccountLabel}
              accountTestID="migrate-wallet-review-source-account"
            />
          )}
          {hasSourceIdentity && hasDestinationIdentity && (
            <View style={styles.arrowRail}>
              <Icon
                name="ArrowDown"
                size={ARROW_SIZE}
                color={theme.text.tertiary}
              />
            </View>
          )}
          {hasDestinationIdentity && (
            <IdentityBlock
              icon="WalletCheck"
              eyebrow={t('migrate-wallet.review.section.destination')}
              name={destinationWalletName}
              type={destinationWalletType}
              account={hasMappingCard ? undefined : destinationAccountLabel}
              accountTestID="migrate-wallet-review-destination-account"
            />
          )}
        </Card>
      )}

      {/* ── Stays behind ──
          The warning shares this block: it is the consequence of the list, so
          a rule between them would split the argument. */}
      <Column gap={spacing.L}>
        <Column gap={spacing.S}>
          <SectionHeader label={t('migrate-wallet.review.section.remaining')} />
          <Card cardStyle={cardLayout.card}>
            {/* Figure and reason in one row: as a figure here and a bullet
                further down, the two read as unrelated caveats. */}
            {hasRetainedDeposit && (
              <FactRow
                icon="LockKey"
                label={t('migrate-wallet.review.stake-deposit')}
                value={t('migrate-wallet.review.stake-deposit-note', {
                  amount: formatAda(retainedStakeDeposit, ticker),
                })}
                note={t('migrate-wallet.review.stake-deposit-explainer', {
                  amount: formatAda(retainedStakeDeposit, ticker),
                })}
                testID="migrate-wallet-review-stake-deposit"
              />
            )}
            {scriptUtxoCount > 0 && (
              <FactRow
                icon="BinaryCode"
                label={t('migrate-wallet.review.script-locked')}
                value={`${scriptUtxoCount}`}
                // The count is a floor, not a total, and carries no ownership
                // claim — the type's own two disclaimers. Stating that here is
                // what the sibling stake-deposit row already does with `note`;
                // leaving the higher-stakes row bare let a bare integer imply
                // a completeness it cannot support.
                note={t('migrate-wallet.review.script-locked-note')}
                testID="migrate-wallet-script-locked"
              />
            )}
            {hasRemainingFigures && <SectionRule />}
            <Column gap={spacing.S}>
              {REMAINING_NOTES.map(({ icon, key }) => (
                <NoteItem key={key} icon={icon} text={t(key)} />
              ))}
              {/* The scan's reach, stated before the irreversible action
                  rather than after it. Discovery walks accounts to a gap and
                  addresses to the platform's, so anything past either boundary
                  is not in the figures above — and a UTxO dropped that way is
                  logged once and reaches no other surface. The account range
                  was already disclosed, but only on the done screen. */}
              <NoteItem
                icon="Search"
                text={t('migrate-wallet.review.disclosure.scan-reach', {
                  index: discovery?.scannedThroughAccountIndex ?? 0,
                })}
              />
            </Column>
          </Card>
        </Column>

        {/* The highest-stakes sentence in the flow. It used to sit last and
            smallest, under rows set larger than it. */}
        <View
          style={[
            styles.warningBox,
            {
              borderColor: theme.data.negative,
              backgroundColor: hexToRgba(theme.data.negative, WARNING_TINT),
            },
          ]}
          testID="migrate-wallet-review-warning">
          <Row gap={spacing.M} alignItems="flex-start">
            <IconBadge name="AlertTriangle" tone="negative" />
            <Column gap={spacing.XS} style={cardLayout.body}>
              <Text.XS
                style={[styles.warningLabel, { color: theme.data.negative }]}>
                {t('migrate-wallet.review.section.warnings')}
              </Text.XS>
              <Text.M style={wizardText.bodyLine}>
                {t('migrate-wallet.review.warning-old-keys')}
              </Text.M>
            </Column>
          </Row>
        </View>
      </Column>

      {/* ── Attestation ──
          Last, because it is the only thing here that changes what the button
          does. The question states that consequence up front. */}
      <Column gap={spacing.S}>
        <Text.M style={wizardText.bodyLine}>
          {t('migrate-wallet.review.attestation-question')}
        </Text.M>
        <Text.S variant="tertiary" style={wizardText.smallLine}>
          {t('migrate-wallet.review.attestation-explainer')}
        </Text.S>
        <Card cardStyle={cardLayout.card}>
          {ATTESTED_ROLES.map(({ role, icon }, index) => (
            <React.Fragment key={role}>
              {index > 0 && <SectionRule />}
              <Row gap={spacing.M} alignItems="center">
                <IconBadge name={icon} />
                <View style={cardLayout.body}>
                  <Toggle
                    reverse
                    label={t(`migrate-wallet.review.attestation-role-${role}`)}
                    value={attestedRoles[role]}
                    onValueChange={value => {
                      onAttestRole({ [role]: value });
                    }}
                    testID={`migrate-wallet-attest-${role}`}
                  />
                </View>
              </Row>
            </React.Fragment>
          ))}
        </Card>
        {hasAttestedRole && (
          <Text.S
            variant="negative"
            style={wizardText.smallLine}
            testID="migrate-wallet-attest-notice">
            {t('migrate-wallet.review.attestation-notice')}
          </Text.S>
        )}
      </Column>
    </Column>
  );
};

const styles = StyleSheet.create({
  // Wraps rather than squeezing the tag when a wallet name is long.
  identityName: {
    flexWrap: 'wrap',
  },
  tag: {
    borderWidth: 1,
    borderRadius: radius.rounded,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  // Sits in the badge column, so the arrow lines up with the two glyphs it
  // connects rather than with the text.
  arrowRail: {
    width: BADGE_SIZE,
    alignItems: 'center',
  },
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
