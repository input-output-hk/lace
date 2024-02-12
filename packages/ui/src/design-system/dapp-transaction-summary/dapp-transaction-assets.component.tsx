/* eslint-disable @typescript-eslint/prefer-optional-chain */
import React from 'react';

import * as RadixUIAvatar from '@radix-ui/react-avatar';

import DarkFallBack from '../../assets/images/dark-mode-fallback.png';
import LightFallBack from '../../assets/images/light-mode-fallback.png';
import { ThemeColorScheme } from '../../design-tokens';
import { useThemeVariant } from '../../design-tokens/theme/hooks/use-theme-variant';
import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import * as Typography from '../typography';

import * as cx from './dapp-transaction-summary.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'div'> & {
  imageSrc?: string | undefined;
  balance?: string;
  tokenName?: string;
  metadataHash?: string;
  coins?: string;
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
  ...props
}: Readonly<Props>): JSX.Element => {
  const { theme } = useThemeVariant();

  const setThemeFallbackImagine =
    theme === ThemeColorScheme.Dark ? DarkFallBack : LightFallBack;

  const getImageSource = (value: string | undefined): string =>
    value === '' || value === undefined || !isImageBase64Encoded(value)
      ? setThemeFallbackImagine
      : `data:image/png;base64,${value}`;

  return (
    <Grid {...props} columns="$2">
      <Cell>
        <RadixUIAvatar.Root className={cx.avatarRoot}>
          <RadixUIAvatar.Image
            className={cx.avatarImage}
            src={getImageSource(imageSrc)}
            alt={tokenName}
          />
        </RadixUIAvatar.Root>
      </Cell>
      <Cell>
        <Flex justifyContent="flex-end" alignItems="center">
          <Typography.Body.Normal className={cx.label}>
            {balance} {tokenName} {metadataHash}
          </Typography.Body.Normal>
        </Flex>
      </Cell>
    </Grid>
  );
};
