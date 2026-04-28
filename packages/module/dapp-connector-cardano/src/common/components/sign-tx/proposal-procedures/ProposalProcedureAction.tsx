import { Cardano } from '@cardano-sdk/core';
import { Text } from '@lace-lib/ui-toolkit';
import React from 'react';

import { HardForkInitiationAction } from './HardForkInitiationAction';
import { InfoAction } from './InfoAction';
import { NewConstitutionAction } from './NewConstitutionAction';
import { NoConfidenceAction } from './NoConfidenceAction';
import { ParameterChangeAction } from './ParameterChangeAction';
import { TreasuryWithdrawalsAction } from './TreasuryWithdrawalsAction';
import { UpdateCommitteeAction } from './UpdateCommitteeAction';

import type { TokenPrice, TokenPriceId } from '@lace-contract/token-pricing';

/**
 * Converts governance action __typename to a stable kebab-case slug for testIDs.
 *
 * @example "info_action" -> "info-action"
 */
const getProposalProcedureTypeSlug = (typename: string): string =>
  typename.replaceAll('_', '-');

/**
 * Props for the ProposalProcedureAction component.
 */
export interface ProposalProcedureActionProps {
  /** The proposal procedure to display */
  proposalProcedure: Cardano.ProposalProcedure;
  /** The coin symbol for display (e.g., "ADA", "tADA") */
  coinSymbol: string;
  /** Token prices for fiat conversion (optional) */
  tokenPrices?: Record<TokenPriceId, TokenPrice>;
  /** Fiat currency ticker (e.g. "USD") */
  currencyTicker?: string;
  /** Base URL for the block explorer */
  explorerBaseUrl: string;
  /** Test identifier prefix */
  testID?: string;
}

/**
 * Router component that renders the appropriate governance action component
 * based on the governance action type.
 *
 * @param props - Component props including proposal procedure and display options
 * @returns React element for the specific governance action type
 */
export const ProposalProcedureAction = ({
  proposalProcedure: { deposit, rewardAccount, anchor, governanceAction },
  coinSymbol,
  tokenPrices,
  currencyTicker,
  explorerBaseUrl,
  testID,
}: ProposalProcedureActionProps): React.ReactElement => {
  const contentTestID = testID
    ? `${testID}-content-${getProposalProcedureTypeSlug(
        governanceAction.__typename,
      )}`
    : undefined;

  const commonProps = {
    deposit,
    rewardAccount,
    anchor,
    coinSymbol,
    tokenPrices,
    currencyTicker,
    explorerBaseUrl,
    testID: contentTestID,
  };

  let content: React.ReactElement;
  switch (governanceAction.__typename) {
    case Cardano.GovernanceActionType.parameter_change_action:
      content = (
        <ParameterChangeAction
          {...commonProps}
          governanceAction={governanceAction}
        />
      );
      break;

    case Cardano.GovernanceActionType.hard_fork_initiation_action:
      content = (
        <HardForkInitiationAction
          {...commonProps}
          governanceAction={governanceAction}
        />
      );
      break;

    case Cardano.GovernanceActionType.info_action:
      content = <InfoAction {...commonProps} />;
      break;

    case Cardano.GovernanceActionType.new_constitution:
      content = (
        <NewConstitutionAction
          {...commonProps}
          governanceAction={governanceAction}
        />
      );
      break;

    case Cardano.GovernanceActionType.no_confidence:
      content = (
        <NoConfidenceAction
          {...commonProps}
          governanceAction={governanceAction}
        />
      );
      break;

    case Cardano.GovernanceActionType.treasury_withdrawals_action:
      content = (
        <TreasuryWithdrawalsAction
          {...commonProps}
          governanceAction={governanceAction}
        />
      );
      break;

    case Cardano.GovernanceActionType.update_committee:
      content = (
        <UpdateCommitteeAction
          {...commonProps}
          governanceAction={governanceAction}
        />
      );
      break;

    default: {
      // Compile-time exhaustiveness check — all known union members must be handled above.
      const exhaustiveCheck: never = governanceAction;
      const unknownTypename = (
        exhaustiveCheck as unknown as Cardano.GovernanceAction
      ).__typename;
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.warn(
          '[ProposalProcedureAction] Unsupported governance action type:',
          unknownTypename,
        );
      }
      content = (
        <Text.S variant="secondary">{`Unsupported governance action: ${unknownTypename}`}</Text.S>
      );
    }
  }

  return content;
};
