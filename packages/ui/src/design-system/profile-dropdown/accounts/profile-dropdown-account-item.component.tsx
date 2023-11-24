import React from 'react';

import { ReactComponent as PencilIcon } from '../../../assets/icons/pencil-outline.component.svg';
import { ReactComponent as TrashIcon } from '../../../assets/icons/trash-outline.component.svg';
import * as ControlButtons from '../../control-buttons';
import { Flex } from '../../flex';
import * as ProfilePicture from '../../profile-picture';
import * as Text from '../../typography';

import * as cx from './profile-dropdown-account-item.css';

export interface Props {
  accountNumber: number;
  label: string;
  unlockLabel: string;
  isUnlocked: boolean;
  onEditClick?: (accountNumber: number) => void;
  onDeleteClick?: (accountNumber: number) => void;
  onUnlockClick?: (accountNumber: number) => void;
}

export const AccountItem = ({
  accountNumber,
  label,
  unlockLabel,
  isUnlocked,
  onEditClick,
  onDeleteClick,
  onUnlockClick,
}: Readonly<Props>): JSX.Element => (
  <Flex
    alignItems="center"
    justifyContent="space-between"
    gap="$12"
    className={cx.root}
    data-testid="wallet-account-item"
  >
    <Flex alignItems="center" gap="$12">
      <ProfilePicture.UserProfile
        imageSrc=""
        fallback={accountNumber.toString()}
        data-testid="wallet-account-item-icon"
      />
      <Flex flexDirection="column">
        <Text.Label
          weight="$medium"
          className={cx.accountLabel}
          data-testid="wallet-account-item-label"
        >
          {label}
        </Text.Label>
        <Text.Body.Small
          weight="$semibold"
          className={cx.derivationPath}
          data-testid="wallet-account-item-path"
        >
          m/1842`/1841/{accountNumber}
        </Text.Body.Small>
      </Flex>
    </Flex>
    {isUnlocked ? (
      <Flex gap="$8">
        <ControlButtons.Icon
          icon={<PencilIcon className={cx.editIcon} />}
          size="extraSmall"
          onClick={(): void => {
            onEditClick?.(accountNumber);
          }}
          data-testid="wallet-account-item-edit-btn"
        />
        <ControlButtons.Icon
          icon={<TrashIcon className={cx.deleteIcon} />}
          size="extraSmall"
          data-testid="wallet-account-item-delete-btn"
          onClick={(): void => {
            onDeleteClick?.(accountNumber);
          }}
        />
      </Flex>
    ) : (
      <ControlButtons.ExtraSmall
        label={unlockLabel}
        data-testid="wallet-account-item-unlock-btn"
        onClick={(): void => {
          onUnlockClick?.(accountNumber);
        }}
      />
    )}
  </Flex>
);
