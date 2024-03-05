import React from 'react';

import classNames from 'classnames';

import DarkFallBack from '../../assets/images/dark-mode-fallback.png';
import LightFallBack from '../../assets/images/light-mode-fallback.png';
import { ThemeColorScheme } from '../../design-tokens';
import { useThemeVariant } from '../../design-tokens/theme/hooks/use-theme-variant';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import { UserProfile } from '../profile-picture';
import * as Typography from '../typography';

import * as styles from './dapp-transaction-summary.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'div'> & {
  imageSrc: string | undefined;
  balance: string;
  tokenName?: string;
  coins?: string;
  testId?: string;
  showImageBackground?: boolean;
};

const isImageBase64Encoded = (image: string): boolean => {
  try {
    atob(image);

    return true;
  } catch {
    return false;
  }
};

export const TransactionAssets = ({
  imageSrc,
  balance,
  tokenName,
  testId,
  showImageBackground = true,
  ...props
}: Readonly<Props>): JSX.Element => {
  const { theme } = useThemeVariant();
  const isNegativeBalance = balance.includes('-');

  const setThemeFallbackImagine =
    theme === ThemeColorScheme.Dark ? DarkFallBack : LightFallBack;

  const getImageSource = (value: string | undefined): string => {
    if (value === '' || value === undefined) {
      return setThemeFallbackImagine;
    } else if (value.startsWith('ipfs')) {
      return value.replace('ipfs://', 'https://ipfs.io/ipfs/');
    } else if (isImageBase64Encoded(value)) {
      return `data:image/png;base64,${value}`;
    } else {
      return value;
    }
  };

  return (
    <div className={styles.assetsContainer}>
      <Grid {...props} columns="$fitContent">
        <Cell>
          <UserProfile
            fallback={setThemeFallbackImagine}
            imageSrc={getImageSource(imageSrc)}
            alt={tokenName}
            radius="rounded"
            background={showImageBackground ? undefined : 'none'}
          />
        </Cell>
        <Cell>
          <Flex
            justifyContent="flex-end"
            alignItems="center"
            className={styles.balanceDetailContainer}
          >
            <Typography.Body.Normal
              className={classNames(styles.label, {
                [styles.positiveBalance]: !isNegativeBalance,
                [styles.negativeBalance]: isNegativeBalance,
              })}
            >
              <span data-testid={testId}>
                {balance} {tokenName}
              </span>
            </Typography.Body.Normal>
          </Flex>
        </Cell>
      </Grid>
    </div>
  );
};
