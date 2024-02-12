import React from 'react';

import * as RadixUIAvatar from '@radix-ui/react-avatar';
import cn from 'classnames';

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
  imageSrc: string | undefined;
  balance?: string;
  tokenName?: string;
  metadataHash?: string;
  coins?: string;
  index: number;
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
  index,
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
    <div className={cn({ [cx.greyBackground]: index % 2 === 0 })}>
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
