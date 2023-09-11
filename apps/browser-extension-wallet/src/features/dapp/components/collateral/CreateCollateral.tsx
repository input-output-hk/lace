/* eslint-disable react/no-multi-comp */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DappCreateCollateralProps } from './types';
import { DappInfo, RowContainer, renderAmountInfo, renderLabel } from '@lace/core';
import { APIErrorCode, ApiError } from '@cardano-sdk/dapp-connector';
import { Wallet } from '@lace/cardano';
import { useTranslation } from 'react-i18next';
import { useWalletStore } from '@src/stores';
import { useFetchCoinPrice, useWalletManager } from '@hooks';
import { Layout } from '../Layout';
import { Banner, Button, Password, inputProps, useObservable } from '@lace/common';
import { firstValueFrom } from 'rxjs';
import { map, take, filter } from 'rxjs/operators';
import { isNotNil } from '@cardano-sdk/util';
import { useCurrencyStore } from '@providers';
import { cardanoCoin } from '@src/utils/constants';
import { Spin, Typography } from 'antd';
import styles from './styles.module.scss';

const { Text } = Typography;

export const CreateCollateral = ({
  dappInfo,
  collateralInfo,
  confirm,
  reject
}: DappCreateCollateralProps): React.ReactElement => {
  const { t } = useTranslation();

  const { executeWithPassword } = useWalletManager();
  const { inMemoryWallet, getKeyAgentType } = useWalletStore();
  const addresses = useObservable(inMemoryWallet.addresses$);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(true);
  const { unlockWallet: validatePassword } = useWalletManager();

  const handleChange: inputProps['onChange'] = ({ target: { value } }) => {
    setIsPasswordValid(true);
    setPassword(value);
  };
  const { priceResult } = useFetchCoinPrice();
  const { fiatCurrency } = useCurrencyStore();
  const keyAgentType = getKeyAgentType();
  const isInMemory = useMemo(() => keyAgentType === Wallet.KeyManagement.KeyAgentType.InMemory, [keyAgentType]);
  const [collateralTx, setCollateralTx] = useState<{ fee: bigint; tx: Wallet.UnsignedTx }>();

  useEffect(() => {
    const getTx = async () => {
      const output: Wallet.Cardano.TxOut = {
        address: !!addresses && Wallet.Cardano.PaymentAddress(addresses[0].address),
        value: {
          coins: collateralInfo.amount
        }
      };

      const builtTx = inMemoryWallet.createTxBuilder().addOutput(output).build();
      const inspectedTx = await builtTx.inspect();
      setCollateralTx({ fee: inspectedTx.body.fee, tx: builtTx });
    };

    getTx();
  }, [collateralInfo.amount, inMemoryWallet, addresses]);

  const createCollateralTx = useCallback(async () => {
    setIsSubmitting(true);
    const submitTx = async () => {
      const { tx } = await collateralTx.tx.sign();
      await inMemoryWallet.submitTx(tx);
      const utxo = await firstValueFrom(
        inMemoryWallet.utxo.available$.pipe(
          map((utxos) => utxos.find((o) => o[0].txId === tx.id && o[1].value.coins === collateralInfo.amount)),
          filter(isNotNil),
          take(1)
        )
      );
      await inMemoryWallet.utxo.setUnspendable([utxo]);
      confirm([utxo]);
    };
    if (isInMemory) {
      try {
        await validatePassword(password);
        await executeWithPassword(password, submitTx, true);
      } catch {
        setPassword('');
        setIsPasswordValid(false);
        setIsSubmitting(false);
      }
    } else {
      // submit HW transaction
      await submitTx();
    }
  }, [collateralTx, collateralInfo.amount, isInMemory, inMemoryWallet, password, executeWithPassword, confirm]);

  const confirmButtonLabel = useMemo(() => {
    if (isInMemory) {
      return t('browserView.settings.wallet.collateral.confirm');
    }
    return t('browserView.settings.wallet.collateral.confirmWithDevice', { hardwareWallet: keyAgentType });
  }, [isInMemory, keyAgentType, t]);

  return (
    <Layout
      pageClassname={styles.spaceBetween}
      title={t('dapp.collateral.create.header')}
      data-testid="dapp-create-collateral-layout"
    >
      <div className={styles.container}>
        <DappInfo {...dappInfo} />
        <div data-testid="collateral-send" className={styles.collateralSend}>
          <Text className={styles.collateralDescription} data-testid="collateral-description">
            {t('browserView.settings.wallet.collateral.amountDescription')}
          </Text>
          {isInMemory && (
            <div data-testid="collateral-password">
              <Spin spinning={false}>
                <Password
                  onChange={handleChange}
                  value={password}
                  error={isPasswordValid === false}
                  errorMessage={t('browserView.transaction.send.error.invalidPassword')}
                  label={t('browserView.transaction.send.password.placeholder')}
                  autoFocus
                />
              </Spin>
            </div>
          )}
          <Banner className={styles.noTopMargin} withIcon message={t('dapp.collateral.amountSeparated')} />
          {collateralTx?.fee && (
            <RowContainer>
              {renderLabel({
                label: t('staking.confirmation.transactionFee'),
                dataTestId: 'sp-confirmation-staking-fee',
                tooltipContent: t('send.theAmountYoullBeChargedToProcessYourTransaction')
              })}
              <div>
                {renderAmountInfo(
                  `${Wallet.util.lovelacesToAdaString(collateralTx.fee.toString())} ${cardanoCoin.symbol}`,
                  `${Wallet.util.convertAdaToFiat({
                    ada: Wallet.util.lovelacesToAdaString(collateralTx.fee.toString()),
                    fiat: priceResult?.cardano?.price || 0
                  })} ${fiatCurrency?.code}`
                )}
              </div>
            </RowContainer>
          )}
        </div>
      </div>
      <div className={styles.footer} style={{ zIndex: 1000 }}>
        <Button
          block
          data-testid="collateral-confirmation-btn"
          disabled={isSubmitting}
          loading={isSubmitting}
          className={styles.footerBtn}
          size="large"
          onClick={createCollateralTx}
        >
          {confirmButtonLabel}
        </Button>
        <Button
          block
          className={styles.footerBtn}
          color="secondary"
          onClick={() => reject(new ApiError(APIErrorCode.Refused, 'user declined to set collateral'))}
        >
          {t('general.button.cancel')}
        </Button>
      </div>
    </Layout>
  );
};
