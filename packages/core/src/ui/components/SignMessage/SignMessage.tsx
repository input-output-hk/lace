import React, { useState } from 'react';
import styles from './SignMessage.module.scss';
import { useTranslation } from 'react-i18next';
import { WalletOwnAddressDropdown, AddressSchema } from '../WalletOwnAddressesDropdown';
import { Drawer, DrawerNavigation, TextArea, Button } from '@lace/common';
import { Text } from '@input-output-hk/lace-ui-toolkit';

export type SignMessageProps = {
  addresses: AddressSchema[];
  visible?: boolean;
  onClose: () => void;
  onSign: (address: string, message: string) => void;
};

export const SignMessage = ({
  addresses = [],
  visible = true,
  onClose,
  onSign
}: SignMessageProps): React.ReactElement => {
  const { t } = useTranslation();
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [message, setMessage] = useState('');

  const handleSign = () => {
    if (selectedAddress && message) {
      onSign(selectedAddress, message);
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const footerButtons = (
    <div className={styles.buttonContainer}>
      <Button
        className={styles.nextButton}
        variant="contained"
        onClick={handleSign}
        disabled={!selectedAddress || !message}
      >
        {t('core.signMessage.nextButton')}
      </Button>
      <Button className={styles.cancelButton} variant="outlined" onClick={onClose}>
        {t('core.signMessage.cancelButton')}
      </Button>
    </div>
  );

  return (
    <Drawer
      open={visible}
      onClose={onClose}
      popupView={false}
      navigation={
        <DrawerNavigation title={t('core.signMessage.title')} onCloseIconClick={onClose} onArrowIconClick={onClose} />
      }
      footer={footerButtons}
    >
      <div data-testid="sign-message" className={styles.container}>
        <Text.Body.Large weight="$bold">{t('core.signMessage.instructions')}</Text.Body.Large>
        <Text.Body.Normal className={styles.subtitle}>{t('core.signMessage.subtitle')}</Text.Body.Normal>

        <div className={styles.inputGroup}>
          <Text.Body.Normal weight="$bold">{t('core.signMessage.addressLabel')}</Text.Body.Normal>
          <WalletOwnAddressDropdown
            addresses={addresses}
            onSelect={(address: string) => setSelectedAddress(address)}
            placeholder={t('core.signMessage.selectAddress')}
          />
        </div>
        <div className={styles.inputGroup}>
          <Text.Body.Normal weight="$bold">{t('core.signMessage.messageLabel')}</Text.Body.Normal>
          <TextArea
            placeholder={t('core.signMessage.messagePlaceholder')}
            value={message}
            onChange={handleMessageChange}
            dataTestId="sign-message-input"
            isResizable
            wrapperClassName={styles.textAreaWrapper}
          />
        </div>
      </div>
    </Drawer>
  );
};
