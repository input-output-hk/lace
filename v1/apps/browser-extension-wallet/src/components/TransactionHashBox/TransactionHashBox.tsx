import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import Copy from '../../assets/icons/copy.component.svg';
import Check from '../../assets/icons/check-success.component.svg';
import styles from './TransactionHashBox.module.scss';

export interface TransactionHashBoxProps {
  hash: string;
}

const { Text, Paragraph } = Typography;

export const TransactionHashBox = ({ hash }: TransactionHashBoxProps): React.ReactElement => {
  const { t } = useTranslation();
  const [hasMouseEnter, setHasMouseEnter] = useState(false);
  const [hasBeenCopied, setHasBeenCopied] = useState(false);

  const handleMouseEnter = () => {
    setHasMouseEnter(true);
  };
  const hadnelMouseLeave = () => {
    setHasMouseEnter(false);
    setHasBeenCopied(false);
  };

  const handleCopy = (_text: string, result: boolean) => {
    setHasBeenCopied(result);
  };

  const copyText = hasBeenCopied ? 'general.button.copied' : 'general.button.copy';

  return (
    <CopyToClipboard onCopy={handleCopy} text={hash}>
      <div className={styles.container} onMouseEnter={handleMouseEnter} onMouseLeave={hadnelMouseLeave}>
        <Paragraph className={styles.hash} data-testid="transaction-hash">
          {hash}
        </Paragraph>
        {hasMouseEnter && (
          <div className={styles.copyContainer} data-testid="transaction-hash-copy-container">
            {hasBeenCopied ? <Check className={styles.checkIcon} /> : <Copy className={styles.copyIcon} />}
            <Text className={styles.copy} data-testid="transaction-hash-copy-text">
              {t(copyText)}{' '}
            </Text>
          </div>
        )}
      </div>
    </CopyToClipboard>
  );
};
