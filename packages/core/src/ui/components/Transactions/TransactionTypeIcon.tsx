import React from 'react';
import { TransactionType, governanceTransactionTypes } from './TransactionType';
import { ReactComponent as OutgoingIcon } from '../../assets/icons/outgoing.component.svg';
import { ReactComponent as IncomingIcon } from '../../assets/icons/incoming.component.svg';
import { ReactComponent as SelfIcon } from '../../assets/icons/self-transaction.component.svg';
import { ReactComponent as DelegationIcon } from '../../assets/icons/delegation.component.svg';
import { ReactComponent as RegistrationIcon } from '../../assets/icons/registration.component.svg';
import { ReactComponent as DeregistrationIcon } from '../../assets/icons/deregistration.component.svg';
import { ReactComponent as RewardsIcon } from '../../assets/icons/rewards.component.svg';
import { ReactComponent as VoteIcon } from '../../assets/icons/ticket-icon.component.svg';
import Icon, { QuestionOutlined } from '@ant-design/icons';
import { txIconSize } from '@src/ui/utils/icon-size';

import styles from './TransactionTypeIcon.module.scss';

export interface TransactionTypeIconProps {
  type: TransactionType;
}

const transactionTypeIcon: Partial<Record<TransactionType, React.FC<React.SVGProps<SVGSVGElement>>>> = {
  outgoing: OutgoingIcon,
  incoming: IncomingIcon,
  self: SelfIcon,
  delegation: DelegationIcon,
  delegationRegistration: RegistrationIcon,
  delegationDeregistration: DeregistrationIcon,
  rewards: RewardsIcon,
  // conway certs
  drepRegistration: RegistrationIcon,
  drepRetirement: DeregistrationIcon,
  drepUpdate: RegistrationIcon,
  stakeVoteDelegation: DelegationIcon,
  stakeVoteRegistrationDelegation: DelegationIcon,
  voteDelegation: DelegationIcon,
  voteRegistrationDelegation: DelegationIcon,
  authCommitteeHot: DelegationIcon,
  resignComitteeCold: DelegationIcon,
  // governance actions
  vote: VoteIcon,
  submitProposal: DelegationIcon
};

export const TransactionTypeIcon = ({ type }: TransactionTypeIconProps): React.ReactElement => {
  const icon = type && transactionTypeIcon[type];
  const iconStyle = { fontSize: txIconSize() };

  // Override fill color for governance related transactions
  const className = governanceTransactionTypes.includes(type) && styles.governance;

  return icon ? (
    <Icon style={iconStyle} className={className} component={icon} />
  ) : (
    <QuestionOutlined style={iconStyle} />
  );
};
