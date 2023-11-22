import { Spin, Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Banner, inputProps, Password } from '@lace/common';
import { renderAmountInfo, renderLabel, RowContainer } from '@lace/core';
import { Wallet } from '@lace/cardano';
import styles from '../../SettingsLayout.module.scss';
import { useFetchCoinPrice } from '@hooks';
import { cardanoCoin } from '@src/utils/constants';
import collateralStyles from '../Collateral.module.scss';
import SadFaceIcon from '@lace/core/src/ui/assets/icons/sad-face.component.svg';
import { useCurrencyStore } from '@providers';
import { Cardano } from '@cardano-sdk/core';

const { Text } = Typography;

interface CollateralStepSendProps {
  txFee: Cardano.Lovelace;
  popupView?: boolean;
  password: string;
  setPassword: (password: string) => void;
  isInMemory: boolean;
  isPasswordValid: boolean;
  setIsPasswordValid: (isPasswordValid: boolean) => void;
  hasEnoughAda: boolean;
}

export const CollateralStepSend = ({
  popupView = false,
  password,
  setPassword,
  isInMemory,
  isPasswordValid,
  setIsPasswordValid,
  txFee,
  hasEnoughAda
}: CollateralStepSendProps): JSX.Element => {
  const { t } = useTranslation();
  const handlePasswordChange: inputProps['onChange'] = ({ target: { value } }) => {
    setIsPasswordValid(true);
    return setPassword(value);
  };
  const { priceResult } = useFetchCoinPrice();
  const { fiatCurrency } = useCurrencyStore();

  return (
    <div
      data-testid="collateral-send"
      className={popupView ? styles.popupContainer : undefined}
      style={{ height: '100%' }}
    >
      <div className={collateralStyles.collateralContainer}>
        <div className={collateralStyles.contentContainer}>
          <Text className={styles.drawerDescription} data-testid="collateral-description">
            {t('browserView.settings.wallet.collateral.amountDescription')}
          </Text>
          {hasEnoughAda && (
            <div className={styles.bannerContainer}>
              <Banner withIcon message={t('browserView.settings.wallet.collateral.reclaimBanner')} />
            </div>
          )}
          {isInMemory && hasEnoughAda && (
            <div data-testid="collateral-password" className={styles.passwordContainerCollateral}>
              <Spin spinning={false}>
                <Password
                  onChange={handlePasswordChange}
                  value={password}
                  error={isPasswordValid === false}
                  errorMessage={t('browserView.transaction.send.error.invalidPassword')}
                  label={t('browserView.transaction.send.password.placeholder')}
                  autoFocus
                />
              </Spin>
            </div>
          )}
          {!hasEnoughAda && (
            <div className={collateralStyles.notEnoughContainer}>
              <SadFaceIcon className={collateralStyles.sadFace} data-testid="collateral-sad-face-icon" />
              <Text className={collateralStyles.sadFaceText} data-testid="collateral-not-enough-ada-error">
                {t('browserView.settings.wallet.collateral.notEnoughAda')}
              </Text>
            </div>
          )}
        </div>
        {hasEnoughAda && txFee && (
          <RowContainer>
            {renderLabel({
              label: t('staking.confirmation.transactionFee'),
              dataTestId: 'sp-confirmation-staking-fee',
              tooltipContent: t('send.theAmountYoullBeChargedToProcessYourTransaction')
            })}
            <div>
              {renderAmountInfo(
                `${Wallet.util.lovelacesToAdaString(txFee.toString())} ${cardanoCoin.symbol}`,
                `${Wallet.util.convertAdaToFiat({
                  ada: Wallet.util.lovelacesToAdaString(txFee.toString()),
                  fiat: priceResult?.cardano?.price || 0
                })} ${fiatCurrency?.code}`
              )}
            </div>
          </RowContainer>
        )}
      </div>
    </div>
  );
};
