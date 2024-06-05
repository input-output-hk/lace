import type { ReactNode } from 'react';
import React from 'react';

import { Tooltip } from 'antd';

import * as ControlButtons from '../../control-buttons';
import { Flex } from '../../flex';
import * as ProfilePicture from '../../profile-picture';
import { Text } from '../../text';

import * as cx from './profile-dropdown-account-item.css';

export interface Props {
  accountNumber: number;
  label: {
    name: string;
    unlock: string;
    lock: string;
  };
  disableUnlock?: { reason: ReactNode | string };
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
      <Tooltip
        title={disableUnlock.reason}
        overlayClassName={cx.tooltipStyle}
        placement="topRight"
      >
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
  isUnlocked,
  isDeletable,
  onActivateClick,
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
          fallbackText={accountNumber.toString()}
          delayMs={0}
          data-testid="wallet-account-item-icon"
          testId="wallet-account-item-icon"
        />
        <Flex flexDirection="column">
          <Text.Label
            color="secondary"
            weight="$medium"
            className={cx.accountLabel}
            data-testid="wallet-account-item-label"
          >
            {label.name}
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
      isDeletable ? (
        <ControlButtons.ExtraSmall
          colorScheme={ControlButtons.Scheme.Outlined}
          label={label.lock}
          data-testid="wallet-account-item-lock-btn"
          onClick={(): void => {
            onDeleteClick?.(accountNumber);
          }}
        />
      ) : undefined
    ) : (
      <MaybeWithDisableUnlockTooltip disableUnlock={disableUnlock}>
        <ControlButtons.ExtraSmall
          label={label.unlock}
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
