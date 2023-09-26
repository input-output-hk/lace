import React from 'react';
import { Ellipsis, ErrorPane } from '@lace/common';
import { DappInfo, DappInfoProps } from '../DappInfo';
import styles from './DappTransaction.module.scss';
import { TranslationsFor } from '@ui/utils/types';

type TransactionDetails = {
  fee: string;
  outputs: {
    coins: string;
    recipient: string;
    assets?: {
      name: string;
      amount: string;
      ticker?: string;
    }[];
  }[];
  type: 'Send' | 'Mint' | 'Burn';
};

export interface DappTransactionProps {
  /** Transaction details such as type, amount, fee and address */
  transaction: TransactionDetails;
  /** dApp information such as logo, name and url */
  dappInfo: Omit<DappInfoProps, 'className'>;
  /** Optional error message */
  errorMessage?: string;
  translations: TranslationsFor<'transaction' | 'amount' | 'recipient' | 'fee' | 'adaFollowingNumericValue'>;
}

export const DappTransaction = ({
  transaction: { type, outputs, fee },
  dappInfo,
  errorMessage,
  translations
}: DappTransactionProps): React.ReactElement => (
  <div>
    <DappInfo {...dappInfo} className={styles.dappInfo} />
    {errorMessage && <ErrorPane error={errorMessage} className={styles.error} />}
    <div data-testid="dapp-transaction-container" className={styles.details}>
      <div className={styles.header}>
        <div data-testid="dapp-transaction-title" className={styles.title}>
          {translations.transaction}
        </div>
        <div data-testid="dapp-transaction-type" className={styles.type}>
          {type}
        </div>
      </div>
      {outputs.map((output) => (
        <div className={styles.body} key={output.recipient}>
          <div className={styles.detail}>
            <div data-testid="dapp-transaction-amount-title" className={styles.title}>
              {translations.amount}
            </div>
            <div className={styles.value}>
              <div data-testid="dapp-transaction-amount-value" className={styles.bold}>
                {output.coins.toString()} ADA
              </div>
              {outputs.length === 1 && (
                <div data-testid="dapp-transaction-amount-fee" className={styles.sub}>
                  {translations.fee}: {fee.toString()} ADA
                </div>
              )}
              {output.assets &&
                output.assets.map((asset) => (
                  <div data-testid="dapp-transaction-asset" className={styles.bold} key={asset.name.toString()}>
                    {asset.amount} {asset.ticker || asset.name}
                  </div>
                ))}
            </div>
          </div>
          <div className={styles.detail}>
            <div data-testid="dapp-transaction-recipient-title" className={styles.title}>
              {translations.recipient}
            </div>
            <div data-testid="dapp-transaction-recipient-address" className={styles.value}>
              <Ellipsis className={styles.rightAligned} text={output.recipient} ellipsisInTheMiddle />
            </div>
          </div>
        </div>
      ))}
      {outputs.length > 1 && (
        <div className={styles.value}>
          <div className={styles.sub}>
            {translations.fee}: {fee.toString()} ADA
          </div>
        </div>
      )}
    </div>
  </div>
);
