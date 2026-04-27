import { useTranslation } from '@lace-contract/i18n';
import { Column, Divider, spacing, Text } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';

import { truncateHash } from '../../../utils';
import { InfoRow } from '../InfoRow';

import { GovernanceActionIdSection } from './GovernanceActionIdSection';
import { ProposalProcedureHeader } from './ProposalProcedureHeader';

import type { Cardano } from '@cardano-sdk/core';
import type { TranslationKey } from '@lace-contract/i18n';
import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

const PROTOCOL_PARAM_UPDATE_LABEL_PREFIX =
  'v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate';

/**
 * Constructs a full translation key for a protocol parameter label.
 * These keys exist in the shared i18n contract (en.json) under the
 * `v2.activity-details.sheet.ProposalProcedure.governanceAction.protocolParamUpdate.*`
 * namespace. The assertion is safe because the keys are validated at the i18n
 * contract level and verified by storybook integration tests.
 */
const ppKey = (suffix: string): TranslationKey =>
  `${PROTOCOL_PARAM_UPDATE_LABEL_PREFIX}.${suffix}` as TranslationKey;

/**
 * Format a protocol parameter value for display.
 */
const formatProtocolParameterValue = (value: unknown): string | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'string') return value;
  if (
    typeof value === 'object' &&
    'memory' in value &&
    'steps' in value &&
    typeof (value as { memory: unknown }).memory === 'number' &&
    typeof (value as { steps: unknown }).steps === 'number'
  ) {
    // ExUnits are rendered as separate memory/step rows — skip the object itself
    return undefined;
  }
  if (
    typeof value === 'object' &&
    'numerator' in value &&
    'denominator' in value
  ) {
    const { numerator, denominator } = value as {
      numerator: number;
      denominator: number;
    };
    return `${numerator} / ${denominator}`;
  }
  // Any remaining object type (CostModels, etc.) is too complex to render as a string
  if (typeof value === 'object') return undefined;
  // boolean / bigint — convert to string
  return typeof value === 'boolean' || typeof value === 'bigint'
    ? String(value)
    : undefined;
};

export interface ProtocolParameterRow {
  testIdSuffix: string;
  label: string;
  value: string;
}

/**
 * Build InfoRow data from protocolParameterUpdate for display (using InfoRow, not ActivityDetailItem).
 * Follows the same structure as blockchain-cardano-ui ParameterChangeAction: ExUnits as Memory/Step rows,
 * then other params as label-value rows.
 */
const buildProtocolParameterRows = (
  protocolParameterUpdate: Cardano.ProtocolParametersUpdateConway,
  t: (key: TranslationKey) => string,
): ProtocolParameterRow[] => {
  const rows: ProtocolParameterRow[] = [];
  const update = protocolParameterUpdate as Record<string, unknown>;

  const prices = update.prices as { memory: number; steps: number } | undefined;
  if (prices) {
    rows.push(
      {
        testIdSuffix: 'protocol-param-prices',
        label: t(ppKey('economicGroup.prices')),
        value: '',
      },
      {
        testIdSuffix: 'protocol-param-prices-memory',
        label: t(ppKey('memory')),
        value: prices.memory.toLocaleString(),
      },
      {
        testIdSuffix: 'protocol-param-prices-step',
        label: t(ppKey('step')),
        value: prices.steps.toLocaleString(),
      },
    );
  }

  const maxTxExUnits = update.maxExecutionUnitsPerTransaction as
    | { memory: number; steps: number }
    | undefined;
  if (maxTxExUnits) {
    rows.push(
      {
        testIdSuffix: 'protocol-param-max-tx-ex-units',
        label: t(ppKey('networkGroup.maxTxExUnits')),
        value: '',
      },
      {
        testIdSuffix: 'protocol-param-max-tx-ex-units-memory',
        label: t(ppKey('memory')),
        value: maxTxExUnits.memory.toLocaleString(),
      },
      {
        testIdSuffix: 'protocol-param-max-tx-ex-units-step',
        label: t(ppKey('step')),
        value: maxTxExUnits.steps.toLocaleString(),
      },
    );
  }

  const maxBlockExUnits = update.maxExecutionUnitsPerBlock as
    | { memory: number; steps: number }
    | undefined;
  if (maxBlockExUnits) {
    rows.push(
      {
        testIdSuffix: 'protocol-param-max-block-ex-units',
        label: t(ppKey('networkGroup.maxBlockExUnits')),
        value: '',
      },
      {
        testIdSuffix: 'protocol-param-max-block-ex-units-memory',
        label: t(ppKey('memory')),
        value: maxBlockExUnits.memory.toLocaleString(),
      },
      {
        testIdSuffix: 'protocol-param-max-block-ex-units-step',
        label: t(ppKey('step')),
        value: maxBlockExUnits.steps.toLocaleString(),
      },
    );
  }

  const scalarKeys: Array<{
    key: string;
    testIdSuffix: string;
    labelKey: TranslationKey;
  }> = [
    {
      key: 'governanceActionDeposit',
      testIdSuffix: 'protocol-param-governance-action-deposit',
      labelKey: ppKey('governanceGroup.govActionDeposit'),
    },
    {
      key: 'dRepDeposit',
      testIdSuffix: 'protocol-param-drep-deposit',
      labelKey: ppKey('governanceGroup.drepDeposit'),
    },
    {
      key: 'minCommitteeSize',
      testIdSuffix: 'protocol-param-min-committee-size',
      labelKey: ppKey('governanceGroup.ccMinSize'),
    },
    {
      key: 'committeeTermLimit',
      testIdSuffix: 'protocol-param-committee-term-limit',
      labelKey: ppKey('governanceGroup.ccMaxTermLength'),
    },
    {
      key: 'governanceActionValidityPeriod',
      testIdSuffix: 'protocol-param-gov-action-validity-period',
      labelKey: ppKey('governanceGroup.govActionLifetime'),
    },
    {
      key: 'dRepInactivityPeriod',
      testIdSuffix: 'protocol-param-drep-inactivity-period',
      labelKey: ppKey('governanceGroup.drepActivity'),
    },
    {
      key: 'maxBlockBodySize',
      testIdSuffix: 'protocol-param-max-block-body-size',
      labelKey: ppKey('networkGroup.maxBBSize'),
    },
    {
      key: 'maxTxSize',
      testIdSuffix: 'protocol-param-max-tx-size',
      labelKey: ppKey('networkGroup.maxTxSize'),
    },
    {
      key: 'maxBlockHeaderSize',
      testIdSuffix: 'protocol-param-max-block-header-size',
      labelKey: ppKey('networkGroup.maxBHSize'),
    },
    {
      key: 'maxValueSize',
      testIdSuffix: 'protocol-param-max-value-size',
      labelKey: ppKey('networkGroup.maxValSize'),
    },
    {
      key: 'maxCollateralInputs',
      testIdSuffix: 'protocol-param-max-collateral-inputs',
      labelKey: ppKey('networkGroup.maxCollateralInputs'),
    },
    {
      key: 'minFeeCoefficient',
      testIdSuffix: 'protocol-param-min-fee-a',
      labelKey: ppKey('economicGroup.minFeeA'),
    },
    {
      key: 'minFeeConstant',
      testIdSuffix: 'protocol-param-min-fee-b',
      labelKey: ppKey('economicGroup.minFeeB'),
    },
    {
      key: 'stakeKeyDeposit',
      testIdSuffix: 'protocol-param-key-deposit',
      labelKey: ppKey('economicGroup.keyDeposit'),
    },
    {
      key: 'poolDeposit',
      testIdSuffix: 'protocol-param-pool-deposit',
      labelKey: ppKey('economicGroup.poolDeposit'),
    },
    {
      key: 'poolInfluence',
      testIdSuffix: 'protocol-param-a0',
      labelKey: ppKey('technicalGroup.a0'),
    },
    {
      key: 'monetaryExpansion',
      testIdSuffix: 'protocol-param-rho',
      labelKey: ppKey('economicGroup.rho'),
    },
    {
      key: 'minPoolCost',
      testIdSuffix: 'protocol-param-min-pool-cost',
      labelKey: ppKey('economicGroup.minPoolCost'),
    },
    {
      key: 'coinsPerUtxoByte',
      testIdSuffix: 'protocol-param-coins-per-utxo-byte',
      labelKey: ppKey('economicGroup.coinsPerUTxOByte'),
    },
    {
      key: 'desiredNumberOfPools',
      testIdSuffix: 'protocol-param-n-opt',
      labelKey: ppKey('technicalGroup.nOpt'),
    },
    {
      key: 'poolRetirementEpochBound',
      testIdSuffix: 'protocol-param-e-max',
      labelKey: ppKey('technicalGroup.eMax'),
    },
    {
      key: 'collateralPercentage',
      testIdSuffix: 'protocol-param-collateral-percentage',
      labelKey: ppKey('technicalGroup.collateralPercentage'),
    },
    {
      key: 'treasuryExpansion',
      testIdSuffix: 'protocol-param-tau',
      labelKey: ppKey('economicGroup.tau'),
    },
    {
      key: 'minFeeRefScriptCostPerByte',
      testIdSuffix: 'protocol-param-min-fee-ref-script-cost-per-byte',
      labelKey: ppKey('economicGroup.minFeeRefScriptCostPerByte'),
    },
  ];

  for (const { key, testIdSuffix, labelKey } of scalarKeys) {
    const value = update[key];
    const formatted = formatProtocolParameterValue(value);
    if (formatted !== undefined) {
      rows.push({
        testIdSuffix,
        label: t(labelKey),
        value: formatted,
      });
    }
  }

  for (const [groupKey, groupTestIdPrefix, groupLabelKey] of [
    [
      'poolVotingThresholds',
      'protocol-param-pool-voting',
      ppKey('governanceGroup.poolVotingThresholds'),
    ],
    [
      'dRepVotingThresholds',
      'protocol-param-drep-voting',
      ppKey('governanceGroup.dRepVotingThresholds'),
    ],
  ] as const) {
    const thresholds = update[groupKey] as
      | Record<string, { numerator: number; denominator: number }>
      | undefined;
    if (!thresholds) continue;

    rows.push({
      testIdSuffix: groupTestIdPrefix,
      label: t(groupLabelKey),
      value: '',
    });

    for (const [subKey, fraction] of Object.entries(thresholds)) {
      if (
        fraction &&
        typeof fraction.numerator === 'number' &&
        typeof fraction.denominator === 'number'
      ) {
        rows.push({
          testIdSuffix: `${groupTestIdPrefix}-${subKey}`,
          label: t(ppKey(`governanceGroup.${groupKey}.${subKey}`)),
          value: `${fraction.numerator} / ${fraction.denominator}`,
        });
      }
    }
  }

  return rows;
};

/**
 * Props for the ParameterChangeAction component.
 */
export interface ParameterChangeActionProps {
  /** The deposit amount in lovelace */
  deposit: Cardano.Lovelace;
  /** The reward account to return the deposit to */
  rewardAccount: Cardano.RewardAccount;
  /** The anchor containing URL and data hash */
  anchor: Cardano.Anchor;
  /** The coin symbol for display (e.g., "ADA", "tADA") */
  coinSymbol: string;
  /** Token prices for fiat conversion (optional) */
  tokenPrices?: Record<TokenPriceId, TokenPrice>;
  /** Fiat currency ticker (e.g. "USD") */
  currencyTicker?: string;
  /** Base URL for the block explorer */
  explorerBaseUrl: string;
  /** The parameter change governance action */
  governanceAction: Cardano.ParameterChangeAction;
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Displays a parameter change governance action proposal.
 *
 * Shows the protocol parameters being changed (protocolParamUpdate) using InfoRow,
 * and optional governance action reference. Mirrors blockchain-cardano-ui
 * ParameterChangeAction structure but with InfoRow instead of ActivityDetailItem.
 *
 * @param props - Component props
 * @returns React element displaying parameter change action details
 */
export const ParameterChangeAction = ({
  deposit,
  rewardAccount,
  anchor,
  coinSymbol,
  tokenPrices,
  currencyTicker,
  explorerBaseUrl,
  governanceAction,
  testID,
}: ParameterChangeActionProps) => {
  const { t } = useTranslation();

  const protocolParameterRows = useMemo(
    () =>
      buildProtocolParameterRows(governanceAction.protocolParamUpdate ?? {}, t),
    [governanceAction.protocolParamUpdate, t],
  );

  return (
    <Column gap={spacing.L} testID={testID}>
      <ProposalProcedureHeader
        actionType={t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.parameter-change',
        )}
        deposit={deposit}
        rewardAccount={rewardAccount}
        anchor={anchor}
        coinSymbol={coinSymbol}
        tokenPrices={tokenPrices}
        currencyTicker={currencyTicker}
        testID={testID ? `${testID}-header` : undefined}
      />

      <Divider />
      <Text.XS>
        {t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.protocol-param-updates',
        )}
      </Text.XS>
      <Text.XS variant="secondary">
        {t(
          'dapp-connector.cardano.sign-tx.proposal-procedures.param-change-notice',
        )}
      </Text.XS>

      {protocolParameterRows.length > 0 && (
        <>
          <Divider />
          {protocolParameterRows.map(row => (
            <InfoRow
              key={row.testIdSuffix}
              label={row.label}
              value={row.value}
              testID={testID ? `${testID}-${row.testIdSuffix}` : undefined}
            />
          ))}
        </>
      )}

      {governanceAction.policyHash && (
        <Column gap={spacing.L}>
          <Divider />
          <InfoRow
            label={t(
              'dapp-connector.cardano.sign-tx.proposal-procedures.policy-hash',
            )}
            value={truncateHash(governanceAction.policyHash)}
            testID={testID ? `${testID}-policy-hash` : undefined}
          />
        </Column>
      )}

      {governanceAction.governanceActionId && (
        <GovernanceActionIdSection
          governanceActionId={governanceAction.governanceActionId}
          explorerBaseUrl={explorerBaseUrl}
          testID={testID ? `${testID}-action-id` : undefined}
        />
      )}
    </Column>
  );
};
