import React from 'react';

import { Button, ControlButton, Flex, ProfilePicture, Text } from '../..';
import { ReactComponent as PencilIcon } from '../../../assets/icons/pencil-outline.component.svg';
import { ReactComponent as TrashIcon } from '../../../assets/icons/trash-outline.component.svg';

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
  >
    <Flex alignItems="center" gap="$12">
      <ProfilePicture.UserProfile
        imageSrc=""
        fallback={accountNumber.toString()}
      />
      <Flex flexDirection="column">
        <Text.Label weight="$medium" className={cx.accountLabel}>
          {label}
        </Text.Label>
        <Text.Body.Small weight="$semibold" className={cx.derivationPath}>
          m/1842`/1841/{accountNumber}
        </Text.Body.Small>
      </Flex>
    </Flex>
    {isUnlocked ? (
      <Flex gap="$8">
        <ControlButton.Icon
          icon={<PencilIcon className={cx.editIcon} />}
          size="extraSmall"
          onClick={(): void => {
            onEditClick?.(accountNumber);
          }}
        />
        <ControlButton.Icon
          icon={<TrashIcon className={cx.deleteIcon} />}
          size="extraSmall"
          onClick={(): void => {
            onDeleteClick?.(accountNumber);
          }}
        />
      </Flex>
    ) : (
      <Button.CallToAction
        label={unlockLabel}
        onClick={(): void => {
          onUnlockClick?.(accountNumber);
        }}
        size="extraSmall"
      />
    )}
  </Flex>
);
