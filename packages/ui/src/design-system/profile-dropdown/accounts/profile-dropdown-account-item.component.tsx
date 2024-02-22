import type { ReactNode } from 'react';
import React from 'react';

import { ReactComponent as PencilIcon } from '@lace/icons/dist/PencilOutlineComponent';
import { ReactComponent as TrashIcon } from '@lace/icons/dist/TrashOutlineComponent';
import { Tooltip } from 'antd';

import * as ControlButtons from '../../control-buttons';
import { Flex } from '../../flex';
import * as ProfilePicture from '../../profile-picture';
import * as Text from '../../typography';

import * as cx from './profile-dropdown-account-item.css';

export interface Props {
  accountNumber: number;
  label: string;
  unlockLabel: string;
  disableUnlock?: { reason: string };
  isUnlocked: boolean;
  isDeletable: boolean;
  onActivateClick?: (accountNumber: number) => void;
  onEditClick?: (accountNumber: number) => void;
  onDeleteClick?: (accountNumber: number) => void;
  onUnlockClick?: (accountNumber: number) => void;
}

const MaybeWithDisableUnlockTooltip = ({
  disableUnlock,
  children,
}: Readonly<{
  disableUnlock: Readonly<Props['disableUnlock']>;
  children: ReactNode;
}>): JSX.Element => {
  if (disableUnlock) {
    return (
      <Tooltip title={disableUnlock.reason}>
        <span>{children}</span>
      </Tooltip>
    );
  }

  return <>{children}</>;
};

// eslint-disable-next-line react/no-multi-comp
export const AccountItem = ({
  accountNumber,
  disableUnlock,
  label,
  unlockLabel,
  isUnlocked,
  isDeletable,
  onActivateClick,
  onEditClick,
  onDeleteClick,
  onUnlockClick,
}: Readonly<Props>): JSX.Element => (
  <Flex
    alignItems="center"
    justifyContent="space-between"
    gap="$8"
    className={cx.root}
    data-testid="wallet-account-item"
  >
    <div
      style={{ display: 'contents' }}
      role="button"
      onClick={(): void => {
        onActivateClick?.(accountNumber);
      }}
    >
      <Flex alignItems="center" gap="$8">
        <ProfilePicture.UserProfile
          imageSrc=""
          fallback={accountNumber.toString()}
          delayMs={0}
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
            m/1852&apos;/1815&apos;/{accountNumber}&apos;
          </Text.Body.Small>
        </Flex>
      </Flex>
    </div>
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
          disabled={!isDeletable}
          onClick={(): void => {
            onDeleteClick?.(accountNumber);
          }}
        />
      </Flex>
    ) : (
      <MaybeWithDisableUnlockTooltip disableUnlock={disableUnlock}>
        <ControlButtons.ExtraSmall
          label={unlockLabel}
          data-testid="wallet-account-item-unlock-btn"
          disabled={!!disableUnlock}
          onClick={(): void => {
            onUnlockClick?.(accountNumber);
          }}
        />
      </MaybeWithDisableUnlockTooltip>
    )}
  </Flex>
);
