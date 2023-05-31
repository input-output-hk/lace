import React from 'react';
import { TransactionType } from './TransactionType';
import { ReactComponent as OutgoingIcon } from '../../assets/icons/outgoing.component.svg';
import { ReactComponent as IncomingIcon } from '../../assets/icons/incoming.component.svg';
import { ReactComponent as SelfIcon } from '../../assets/icons/self-transaction.component.svg';
import { ReactComponent as DelegationIcon } from '../../assets/icons/delegation.component.svg';
import { ReactComponent as RegistrationIcon } from '../../assets/icons/registration.component.svg';
import { ReactComponent as DeregistrationIcon } from '../../assets/icons/deregistration.component.svg';
import { ReactComponent as RewardsIcon } from '../../assets/icons/rewards.component.svg';
import Icon, { QuestionOutlined } from '@ant-design/icons';
import { txIconSize } from '@src/ui/utils/icon-size';

export interface TransactionTypeIconProps {
  type: TransactionType;
}

const transactionTypeIcon: Record<TransactionType, React.FC<React.SVGProps<SVGSVGElement>>> = {
  outgoing: OutgoingIcon,
  incoming: IncomingIcon,
  self: SelfIcon,
  delegation: DelegationIcon,
  delegationRegistration: RegistrationIcon,
  delegationDeregistration: DeregistrationIcon,
  rewards: RewardsIcon
};

export const TransactionTypeIcon = ({ type }: TransactionTypeIconProps): React.ReactElement => {
  const icon = type && transactionTypeIcon[type];
  const iconStyle = { fontSize: txIconSize() };

  return icon ? <Icon style={iconStyle} component={icon} /> : <QuestionOutlined style={iconStyle} />;
};
