import React from 'react';

import { ReactComponent as AdaComponent } from '@lace/icons/dist/AdaComponent';
import * as RadixUIAvatar from '@radix-ui/react-avatar';

import { Flex } from '../flex';
import { Grid, Cell } from '../grid';
import * as Typography from '../typography';

import * as cx from './dapp-transaction-summary.css';

import type { OmitClassName } from '../../types';

type Props = OmitClassName<'div'> & {
  transactionAmount: string;
  title: string;
  items: {
    imageSrc?: string;
    balance: string;
    tokenName: string;
    metadataHash: string;
  }[];
};

export const TransactionSummary = ({
  transactionAmount,
  title,
  items,
  ...props
}: Readonly<Props>): JSX.Element => {
  console.log('items', items);
  return (
    <>
      <Flex justifyContent="flex-start">
        <Typography.Body.Large className={cx.boldLabel}>
          {title}
        </Typography.Body.Large>
      </Flex>
      <Grid {...props} columns="$2">
        <Cell>
          <div className={cx.adaIcon}>
            <AdaComponent />
          </div>
        </Cell>
        <Cell>
          <Flex justifyContent="flex-end">
            <Typography.Body.Normal className={cx.label}>
              {transactionAmount} ADA
            </Typography.Body.Normal>
          </Flex>
        </Cell>
      </Grid>
      <Grid {...props} columns="$2">
        {items.map(value => (
          <>
            <Cell>
              {value.imageSrc !== undefined && (
                <RadixUIAvatar.Root className={cx.avatarRoot}>
                  <RadixUIAvatar.Image
                    className={cx.avatarImage}
                    src={value.imageSrc}
                    alt={value.tokenName}
                  />
                  {/* <RadixUIAvatar.Fallback>{fallback}</RadixUIAvatar.Fallback> */}
                </RadixUIAvatar.Root>
              )}
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
