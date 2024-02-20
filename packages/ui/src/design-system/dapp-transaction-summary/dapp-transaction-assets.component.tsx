import React from 'react';

import DarkFallBack from '../../assets/images/dark-mode-fallback.png';
import LightFallBack from '../../assets/images/light-mode-fallback.png';
import { ThemeColorScheme } from '../../design-tokens';
import { useThemeVariant } from '../../design-tokens/theme/hooks/use-theme-variant';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import { UserProfile } from '../profile-picture';
import * as Typography from '../typography';

import * as cx from './dapp-transaction-summary.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'div'> & {
  imageSrc: string | undefined;
  balance?: string;
  tokenName?: string;
  metadataHash?: string;
  coins?: string;
  testId?: string;
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
  metadataHash,
  testId,
  ...props
}: Readonly<Props>): JSX.Element => {
  const { theme } = useThemeVariant();

  const setThemeFallbackImagine =
    theme === ThemeColorScheme.Dark ? DarkFallBack : LightFallBack;

  const getImageSource = (value: string | undefined): string => {
    if (value === '' || value === undefined) {
      return setThemeFallbackImagine;
    } else if (isImageBase64Encoded(value)) {
      return `data:image/png;base64,${value}`;
    } else {
      return value;
    }
  };

  return (
    <div data-testid={testId} className={cx.assetsContainer}>
      <Grid {...props} columns="$fitContent">
        <Cell>
          <UserProfile
            fallback="L"
            imageSrc={getImageSource(imageSrc)}
            alt={tokenName}
            radius="rounded"
          />
        </Cell>
        <Cell>
          <Flex
            justifyContent="flex-end"
            alignItems="center"
            className={cx.balanceDetailContainer}
          >
            <Typography.Body.Normal className={cx.label}>
              {balance} {tokenName} {metadataHash}
            </Typography.Body.Normal>
          </Flex>
        </Cell>
      </Grid>
    </div>
  );
};
