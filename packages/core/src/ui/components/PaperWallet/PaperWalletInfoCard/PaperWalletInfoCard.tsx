import React from 'react';
import {
  Flex,
  Text,
  DocumentComponent as DocumentIcon,
  QrcodeComponent as QrCodeIcon
} from '@input-output-hk/lace-ui-toolkit';
import { i18n } from '@lace/translation';
import styles from './PaperWalletInfoCard.module.scss';

interface Props {
  walletName: string;
}

export const PaperWalletInfoCard = ({ walletName }: Props): JSX.Element => (
  <Flex className={styles.paperWalletInfoCard} h="$fill" gap="$16" flexDirection="column" px="$20" py="$16" pb="$32">
    <Flex gap="$8" alignItems="center">
      <DocumentIcon height={40} width={40} />
      <Flex flexDirection="column">
        <Text.Body.Normal weight="$semibold" data-testid={'paper-wallet-name'}>
          {walletName}
        </Text.Body.Normal>
      </Flex>
    </Flex>
    <Flex flexDirection="column" gap="$16" pt="$16" className={styles.infoSection}>
      <Flex>
        <Text.Label color="secondary" data-testid={'contains-label'}>
          {i18n.t('core.paperWallet.savePaperWallet.contains')}
        </Text.Label>
      </Flex>
      <Flex flexDirection="column" gap="$24">
        <Flex gap="$16">
          <QrCodeIcon width={24} height={24} data-testid="private-qr-code-icon" />
          <Flex flexDirection="column" w="$fill">
            <Text.Body.Normal weight="$medium" data-testid="private-qr-code-title">
              {i18n.t('core.paperWallet.savePaperWallet.privateQrTitle')}
            </Text.Body.Normal>
            <Text.Body.Small weight="$medium" color="secondary" data-testid="private-qr-code-description">
              {i18n.t('core.paperWallet.savePaperWallet.privateQrDescription')}
            </Text.Body.Small>
          </Flex>
        </Flex>
        <Flex gap={'$16'}>
          <QrCodeIcon width={24} height={24} data-testid="public-qr-code-icon" />
          <Flex flexDirection="column" w="$fill">
            <Text.Body.Normal weight="$medium" data-testid="public-qr-code-title">
              {i18n.t('core.paperWallet.savePaperWallet.publicQrTitle')}
            </Text.Body.Normal>
            <Text.Body.Small weight="$medium" color="secondary" data-testid="public-qr-code-description">
              {i18n.t('core.paperWallet.savePaperWallet.publicQrDescription')}
            </Text.Body.Small>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  </Flex>
);
