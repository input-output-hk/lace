/* eslint-disable no-console */
import React from 'react';
import cn from 'classnames';
import Icon, { QuestionOutlined } from '@ant-design/icons';
import { txIconSize } from '@src/ui/utils/icon-size';
import { ReactComponent as OutgoingIcon } from '../../assets/icons/outgoing.component.svg';
import { ReactComponent as IncomingIcon } from '../../assets/icons/incoming.component.svg';
import { ReactComponent as SelfIcon } from '../../assets/icons/self-transaction.component.svg';
import { ReactComponent as DelegationIcon } from '../../assets/icons/delegation.component.svg';
import { ReactComponent as RegistrationIcon } from '../../assets/icons/registration.component.svg';
import { ReactComponent as DeregistrationIcon } from '../../assets/icons/deregistration.component.svg';
import { ReactComponent as RewardsIcon } from '../../assets/icons/rewards.component.svg';
import { ReactComponent as VoteIcon } from '../../assets/icons/ticket-icon.component.svg';
import {
  ActivityType,
  ConwayEraCertificatesTypes,
  ConwayEraGovernanceActions,
  DelegationTransactionType,
  TransactionActivityType
} from './types';

import styles from './ActivityTypeIcon.module.scss';

export interface ActivityTypeIconProps {
  type: ActivityType;
}

const activityTypeIcon: Record<ActivityType, React.FC<React.SVGProps<SVGSVGElement>>> = {
  [TransactionActivityType.rewards]: RewardsIcon,
  [TransactionActivityType.incoming]: IncomingIcon,
  [TransactionActivityType.outgoing]: OutgoingIcon,
  [TransactionActivityType.self]: SelfIcon,
  [DelegationTransactionType.delegation]: DelegationIcon,
  [ConwayEraGovernanceActions.vote]: VoteIcon,
  [ConwayEraGovernanceActions.submitProposal]: DelegationIcon,
  [DelegationTransactionType.delegationDeregistration]: DeregistrationIcon,
  [DelegationTransactionType.delegationRegistration]: RegistrationIcon,
  [ConwayEraCertificatesTypes.RegisterDelegateRepresentative]: RegistrationIcon,
  [ConwayEraCertificatesTypes.UnregisterDelegateRepresentative]: DeregistrationIcon,
  [ConwayEraCertificatesTypes.StakeRegistrationDelegation]: RegistrationIcon,
  [ConwayEraCertificatesTypes.StakeVoteRegistrationDelegation]: DelegationIcon,
  [ConwayEraCertificatesTypes.VoteRegistrationDelegation]: DelegationIcon,
  [ConwayEraCertificatesTypes.UpdateDelegateRepresentative]: RegistrationIcon,
  [ConwayEraCertificatesTypes.StakeVoteDelegation]: DelegationIcon,
  [ConwayEraCertificatesTypes.VoteDelegation]: DelegationIcon,
  [ConwayEraCertificatesTypes.ResignCommitteeCold]: DelegationIcon,
  [ConwayEraCertificatesTypes.AuthorizeCommitteeHot]: DelegationIcon
};

export const ActivityTypeIcon = ({ type }: ActivityTypeIconProps): React.ReactElement => {
  const icon = type && activityTypeIcon[type];
  const iconStyle = { fontSize: txIconSize() };

  const isGovernanceTx =
    Object.values(ConwayEraCertificatesTypes).includes(type as unknown as ConwayEraCertificatesTypes) ||
    type in ConwayEraGovernanceActions;

  // TODO: set fill color for every icon using currentColor, replace icon not to contain surrounding circle (LW-9566)
  return icon ? (
    <Icon
      style={iconStyle}
      // Override fill color for governance related transactions
      className={cn({
        [styles.governance]: isGovernanceTx
      })}
      component={icon}
    />
  ) : (
    <QuestionOutlined style={iconStyle} />
  );
};
