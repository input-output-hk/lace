import React from 'react';
import { Radio, RadioChangeEvent, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { Wallet } from '@lace/cardano';
import { Drawer, DrawerHeader, DrawerNavigation, toast } from '@lace/common';
import SwithIcon from '@src/assets/icons/edit.component.svg';
import ErrorIcon from '@src/assets/icons/address-error-icon.component.svg';
import styles from '../SettingsLayout.module.scss';
import { useCurrencyStore } from '@providers';
import { CARDANO_COIN_SYMBOL } from '@src/utils/constants';

const { Text } = Typography;

interface CurrencyDrawerProps {
  visible: boolean;
  onClose: () => void;
  popupView?: boolean;
}

export const CurrencyDrawer = ({ visible, onClose, popupView = false }: CurrencyDrawerProps): React.ReactElement => {
  const { t } = useTranslation();
  const { fiatCurrency, supportedCurrencies, setFiatCurrency } = useCurrencyStore();

  const handleCurrencyChange = (event: RadioChangeEvent) => {
    try {
      setFiatCurrency(event.target.value);
      toast.notify({
        text: t('browserView.settings.preferences.currency.toast'),
        withProgressBar: true,
        icon: SwithIcon
      });
    } catch (error) {
      console.log('Error updating currency', error);
      toast.notify({ text: t('general.errors.somethingWentWrong'), icon: ErrorIcon });
    }
    return event;
  };

  const cardanoCurrency = { code: CARDANO_COIN_SYMBOL[Wallet.Cardano.NetworkId.Mainnet] };
  const currenciesList = [cardanoCurrency, ...supportedCurrencies];

  return (
    <Drawer
      open={visible}
      onClose={onClose}
      title={
        <DrawerHeader
          title={t('browserView.settings.preferences.currency.title')}
          subtitle={!popupView ? t('browserView.settings.preferences.currency.description') : undefined}
          popupView={popupView}
        />
      }
      navigation={
        <DrawerNavigation
          title={t('browserView.settings.heading')}
          onCloseIconClick={!popupView ? onClose : undefined}
          onArrowIconClick={popupView ? onClose : undefined}
        />
      }
      popupView={popupView}
    >
      <div className={popupView ? styles.popupContainer : undefined}>
        {popupView && (
          <Text className={styles.drawerDescription}>{t('browserView.settings.preferences.currency.description')}</Text>
        )}
        <div className={styles.radios}>
          <Radio.Group
            className={styles.radioGroup}
            onChange={handleCurrencyChange}
            value={fiatCurrency?.code}
            data-testid={'network-choice-radio-group'}
          >
            {currenciesList.map(({ code }) => (
              <a className={styles.radio} key={code}>
                <Radio
                  value={code}
                  className={styles.radioLabel}
                  data-testid={`currency-${code.toLowerCase()}-radio-button`}
                >
                  <span className={styles.currencyWrapper}>
                    <span>{code.toUpperCase()}</span>
                    <span className={styles.currency}>
                      {t(`browserView.settings.preferences.currency.list.${code.toUpperCase()}`)}
                    </span>
                  </span>
                </Radio>
              </a>
            ))}
          </Radio.Group>
        </div>
      </div>
    </Drawer>
  );
};
