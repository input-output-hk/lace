import { useAnalytics } from '@lace-contract/analytics';
import { FeatureFlagKey, type FeatureFlag } from '@lace-contract/feature';
import { useTranslation } from '@lace-contract/i18n';
import {
  DEFAULT_CURRENCY_PREFERENCE,
  type CurrencyPreference,
} from '@lace-contract/token-pricing';
import { NavigationControls } from '@lace-lib/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

export const useFiatCurrencySheet = () => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const selectedCurrencyFromState = useLaceSelector(
    'tokenPricing.selectCurrencyPreference',
  );
  const setCurrency = useDispatchLaceAction(
    'tokenPricing.setCurrencyPreference',
  );

  // Read supported currencies from feature flags
  const loadedFeatures = useLaceSelector('features.selectLoadedFeatures');
  const supportedCurrencies = useMemo<CurrencyPreference[]>(() => {
    const featureFlags = loadedFeatures?.featureFlags || [];
    const currencyFlag = featureFlags.find(
      (flag: FeatureFlag) =>
        flag.key === FeatureFlagKey('SUPPORTED_CURRENCIES'),
    ) as FeatureFlag<{ currencies: CurrencyPreference[] }> | undefined;

    const currencies = currencyFlag?.payload?.currencies;

    return Array.isArray(currencies)
      ? currencies
      : [DEFAULT_CURRENCY_PREFERENCE];
  }, [loadedFeatures]);

  const resolvedSelectedCurrency = useMemo(() => {
    const isSupported = supportedCurrencies.some(
      c => c.name === selectedCurrencyFromState?.name,
    );

    return isSupported
      ? selectedCurrencyFromState
      : DEFAULT_CURRENCY_PREFERENCE;
  }, [selectedCurrencyFromState, supportedCurrencies]);

  const [temporarySelectedCurrency, setTemporarySelectedCurrency] = useState(
    resolvedSelectedCurrency,
  );

  const initialCurrencyRef = useRef(resolvedSelectedCurrency);

  useEffect(() => {
    setTemporarySelectedCurrency(currentValue => {
      if (currentValue?.name === resolvedSelectedCurrency?.name) {
        return currentValue;
      }
      return resolvedSelectedCurrency;
    });
    initialCurrencyRef.current = resolvedSelectedCurrency;
  }, [resolvedSelectedCurrency]);

  const handleCurrencySelect = useCallback(
    (currencyCode: string) => {
      const currency = supportedCurrencies.find(c => c.name === currencyCode);
      trackEvent('currency sheet | select currency | press', {
        currency: currencyCode,
      });
      if (currency) {
        setTemporarySelectedCurrency(currency);
      }
    },
    [supportedCurrencies, trackEvent],
  );

  const handleCancel = useCallback(() => {
    trackEvent('currency sheet | cancel | press');
    const fallbackCurrency = initialCurrencyRef.current;
    setTemporarySelectedCurrency(fallbackCurrency);
    NavigationControls.sheets.close();
  }, [trackEvent]);

  const onConfirm = useCallback(() => {
    trackEvent('currency sheet | confirm | press', {
      currency: temporarySelectedCurrency?.name,
    });
    if (temporarySelectedCurrency?.name !== resolvedSelectedCurrency?.name) {
      setCurrency(temporarySelectedCurrency);
    }
    NavigationControls.sheets.close();
  }, [
    resolvedSelectedCurrency,
    setCurrency,
    temporarySelectedCurrency,
    trackEvent,
  ]);

  const title = t('v2.pages.settings.options.currency');
  const description = t('v2.pages.settings.options.currency.description');
  const cancelLabel = t('v2.sheets.fiatCurrency.cancel');
  const confirmLabel = t('v2.sheets.fiatCurrency.confirm');

  const radioOptions = useMemo(
    () =>
      supportedCurrencies.map(currency => ({
        label: currency.name,
        value: currency.name,
      })),
    [supportedCurrencies],
  );

  return {
    title,
    description,
    radioOptions,
    value: temporarySelectedCurrency?.name || DEFAULT_CURRENCY_PREFERENCE.name,
    onChange: handleCurrencySelect,
    onClose: handleCancel,
    onConfirm,
    cancelLabel,
    confirmLabel,
  };
};
