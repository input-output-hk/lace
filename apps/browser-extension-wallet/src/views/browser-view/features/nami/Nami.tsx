import React, { useEffect } from 'react';
import { useHistory } from 'react-router-dom';

import { useSearchParams } from '@lace/common';
import { useCurrencyStore } from '@providers';
import { walletRoutePaths } from '@routes';
import { MainLoader } from '@components/MainLoader';
import { useWalletStore } from '@src/stores';

export const Nami = (): JSX.Element => {
  const history = useHistory();
  const { data } = useSearchParams(['data']);
  const { setFiatCurrency } = useCurrencyStore();

  const { initialHdDiscoveryCompleted } = useWalletStore();

  useEffect(() => {
    const updateSettings = async () => {
      const json = Buffer.from(data, 'base64').toString();
      const { currency } = JSON.parse(json);

      setFiatCurrency(currency);
    };

    updateSettings();
  }, [data, setFiatCurrency]);

  useEffect(() => {
    if (initialHdDiscoveryCompleted) {
      history.push(walletRoutePaths.assets);
    }
  }, [initialHdDiscoveryCompleted, history]);

  return <MainLoader text="Migration in progress" />;
};
