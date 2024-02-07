/* eslint-disable @typescript-eslint/prefer-optional-chain */
import React from 'react';

import { ReactComponent as AdaComponent } from '@lace/icons/dist/AdaComponent';
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
  transactionAmount: string;
  title?: string;
  items?: {
    imageSrc?: string;
    balance?: string;
    tokenName?: string;
    metadataHash?: string;
    coins?: string;
    recipient: string;
  }[];
  assets?: Map<string, bigint>;
  cardanoSymbol: string;
};

export const TransactionSummary = ({
  transactionAmount,
  items,
  title,
  cardanoSymbol,
  ...props
}: Readonly<Props>): JSX.Element => {
  const { theme } = useThemeVariant();

  const setThemeFallbackImagine =
    theme === ThemeColorScheme.Dark ? DarkFallBack : LightFallBack;

  const getImageSource = (value: string | undefined): string =>
    value === '' || value === undefined ? setThemeFallbackImagine : value;
  console.log('ui package', transactionAmount);
  return (
    <>
      {title !== undefined && (
        <Flex justifyContent="flex-start">
          <Typography.Body.Large className={cx.boldLabel}>
            {title}
          </Typography.Body.Large>
        </Flex>
      )}
      <Grid {...props} columns="$2">
        <Cell>
          <AdaComponent className={cx.adaIcon} />
        </Cell>
        <Cell>
          <Flex justifyContent="flex-end">
            <Typography.Body.Normal className={cx.label}>
              {transactionAmount} {cardanoSymbol}
            </Typography.Body.Normal>
          </Flex>
        </Cell>
      </Grid>
      <Grid {...props} columns="$2">
        {items &&
          items.map(value => (
            <>
              <Cell>
                <RadixUIAvatar.Root className={cx.avatarRoot}>
                  <RadixUIAvatar.Image
                    className={cx.avatarImage}
                    src={getImageSource(value.imageSrc)}
                    alt={value.tokenName}
                  />
                </RadixUIAvatar.Root>
              </Cell>
              <Cell>
                <Flex justifyContent="flex-end" alignItems="center">
                  <Typography.Body.Normal className={cx.label}>
                    {value.balance} {value.tokenName} {value.metadataHash}
                  </Typography.Body.Normal>
                </Flex>
              </Cell>
            </>
          ))}
      </Grid>
    </>
  );
};
