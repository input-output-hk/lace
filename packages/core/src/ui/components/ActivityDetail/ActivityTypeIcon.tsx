import React from 'react';
import cn from 'classnames';
import Icon, { QuestionOutlined } from '@ant-design/icons';
import { txIconSize } from '@src/ui/utils/icon-size';
import { ReactComponent as OutgoingIcon } from '../../assets/icons/arrow-diagonal-up-outline.component.svg';
import { ReactComponent as IncomingIcon } from '../../assets/icons/arrow-diagonal-down-outline.component.svg';
import { ReactComponent as RefreshOutlinedIcon } from '../../assets/icons/refresh-outline.component.svg';
import { ReactComponent as DelegationIcon } from '../../assets/icons/receipt-right-outline.component.svg';
import { ReactComponent as ClipboardCheckOutlineIcon } from '../../assets/icons/clipboard-check-outline.component.svg';
import { ReactComponent as ClipboardXOutlineComponentIcon } from '../../assets/icons/clipboard-x-outline.component.svg';
import { ReactComponent as RewardsIcon } from '../../assets/icons/gift-outline.component.svg';
import { ReactComponent as VoteIcon } from '../../assets/icons/ticket-outline-icon.component.svg';
import { ReactComponent as HardForkInitiationActionIcon } from '../../assets/icons/terminal-outile.component.svg';
import { ReactComponent as ParameterChangeActionIcon } from '../../assets/icons/clipboard-list-outline.component.svg';
import { ReactComponent as TreasuryWithdrawalsActionIcon } from '../../assets/icons/clipboard-copy-outline.component.svg';
import { ReactComponent as UpdateCommitteeIcon } from '../../assets/icons/document-add-outline.component.svg';
import { ReactComponent as InfoActionIcon } from '../../assets/icons/info-outline.component.svg';
import { ReactComponent as StakeVoteDelegationIcon } from '../../assets/icons/document-report-outline.component.svg';
import { ReactComponent as StakeRegistrationDelegationIcon } from '../../assets/icons/badge-check-outline.component.svg';
import { ReactComponent as VoteRegistrationDelegationIcon } from '../../assets/icons/identification-outline.component.svg';
import { ReactComponent as StakeVoteRegistrationDelegationIcon } from '../../assets/icons/document-text-outline.component.svg';
import { ReactComponent as ResignCommitteeColdIcon } from '../../assets/icons/ban-outline.component.svg';
import { ReactComponent as AuthorizeCommitteeHotIcon } from '../../assets/icons/feather-outline.component.svg';
import { ReactComponent as RegisterDelegateRepresentativeIcon } from '../../assets/icons/briefcase-outline.component.svg';
import { ReactComponent as UnregisterDelegateRepresentativeIcon } from '../../assets/icons/briefcase-back-icon.component.svg';
import { ReactComponent as VoteDelegationIcon } from '../../assets/icons/ticket-arrow-right-outline.component.svg';

import {
  ActivityType,
  ConwayEraCertificatesTypes,
  ConwayEraGovernanceActions,
  DelegationActivityType,
  TransactionActivityType,
  Cip1694GovernanceActivityType
} from './types';

import styles from './ActivityTypeIcon.module.scss';
import { Flex } from '@input-output-hk/lace-ui-toolkit';

export interface ActivityTypeIconProps {
  type: ActivityType;
}

const activityTypeIcon: Record<ActivityType, React.FC<React.SVGProps<SVGSVGElement>>> = {
  [ConwayEraGovernanceActions.vote]: VoteIcon,
  [Cip1694GovernanceActivityType.HardForkInitiationAction]: HardForkInitiationActionIcon,
  [Cip1694GovernanceActivityType.NewConstitution]: ClipboardCheckOutlineIcon,
  [Cip1694GovernanceActivityType.NoConfidence]: ClipboardXOutlineComponentIcon,
  [Cip1694GovernanceActivityType.ParameterChangeAction]: ParameterChangeActionIcon,
  [Cip1694GovernanceActivityType.TreasuryWithdrawalsAction]: TreasuryWithdrawalsActionIcon,
  [Cip1694GovernanceActivityType.UpdateCommittee]: UpdateCommitteeIcon,
  [Cip1694GovernanceActivityType.InfoAction]: InfoActionIcon,
  [ConwayEraCertificatesTypes.UpdateDelegateRepresentative]: RefreshOutlinedIcon,
  [ConwayEraCertificatesTypes.StakeVoteDelegation]: StakeVoteDelegationIcon,
  [ConwayEraCertificatesTypes.StakeRegistrationDelegation]: StakeRegistrationDelegationIcon,
  [ConwayEraCertificatesTypes.VoteRegistrationDelegation]: VoteRegistrationDelegationIcon,
  [ConwayEraCertificatesTypes.StakeVoteRegistrationDelegation]: StakeVoteRegistrationDelegationIcon,
  [ConwayEraCertificatesTypes.ResignCommitteeCold]: ResignCommitteeColdIcon,
  [ConwayEraCertificatesTypes.AuthorizeCommitteeHot]: AuthorizeCommitteeHotIcon,
  [ConwayEraCertificatesTypes.RegisterDelegateRepresentative]: RegisterDelegateRepresentativeIcon,
  [ConwayEraCertificatesTypes.UnregisterDelegateRepresentative]: UnregisterDelegateRepresentativeIcon,
  [ConwayEraCertificatesTypes.VoteDelegation]: VoteDelegationIcon,
  [ConwayEraCertificatesTypes.Registration]: ClipboardCheckOutlineIcon,
  [ConwayEraCertificatesTypes.Unregistration]: ClipboardXOutlineComponentIcon,
  [TransactionActivityType.rewards]: RewardsIcon,
  [TransactionActivityType.incoming]: IncomingIcon,
  [TransactionActivityType.outgoing]: OutgoingIcon,
  [TransactionActivityType.self]: RefreshOutlinedIcon,
  [DelegationActivityType.delegation]: DelegationIcon,
  [DelegationActivityType.delegationDeregistration]: ClipboardXOutlineComponentIcon,
  [DelegationActivityType.delegationRegistration]: ClipboardCheckOutlineIcon
};

export const ActivityTypeIcon = ({ type }: ActivityTypeIconProps): React.ReactElement => {
  const icon = (type && activityTypeIcon[type]) || RefreshOutlinedIcon;
  const iconStyle = { fontSize: txIconSize() };

  const isDelegationActivity =
    type === ConwayEraCertificatesTypes.Unregistration || type === ConwayEraCertificatesTypes.Registration;

  const isGovernanceTx =
    !isDelegationActivity &&
    (Object.values(ConwayEraCertificatesTypes).includes(type as unknown as ConwayEraCertificatesTypes) ||
      type in ConwayEraGovernanceActions ||
      type in Cip1694GovernanceActivityType);

  return (
    <Flex
      className={cn(styles.iconWrapper, { [styles.governance]: isGovernanceTx })}
      justifyContent="center"
      alignItems="center"
    >
      {icon ? (
        <Icon
          // Override fill color for governance related transactions
          className={cn(styles.icon, {
            [styles.governance]: isGovernanceTx
          })}
          component={icon}
        />
      ) : (
        <QuestionOutlined style={iconStyle} />
      )}
    </Flex>
  );
};
