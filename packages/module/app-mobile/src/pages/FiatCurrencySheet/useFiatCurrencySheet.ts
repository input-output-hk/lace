import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation, type I18nMessages } from '@lace-contract/i18n';
import { DEFAULT_CURRENCY_PREFERENCE } from '@lace-contract/token-pricing';
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

  // Authoritative, already-filtered list (CoinGecko support + hide-list applied
  // in the selector) — do not re-filter here.
  const supportedCurrencies = useLaceSelector(
    'tokenPricing.selectSupportedCurrencyPreferences',
  );

  const resolvedSelectedCurrency = useMemo(() => {
    if (
      supportedCurrencies.some(c => c.name === selectedCurrencyFromState?.name)
    ) {
      return selectedCurrencyFromState;
    }
    return (
      supportedCurrencies.find(
        c => c.name === DEFAULT_CURRENCY_PREFERENCE.name,
      ) ??
      supportedCurrencies[0] ??
      DEFAULT_CURRENCY_PREFERENCE
    );
  }, [selectedCurrencyFromState, supportedCurrencies]);

  const [temporarySelectedCurrency, setTemporarySelectedCurrency] = useState(
    resolvedSelectedCurrency,
  );

  const initialCurrencyRef = useRef(resolvedSelectedCurrency);

  useEffect(() => {
    setTemporarySelectedCurrency(currentValue => {
      const isTemporaryStillSupported = supportedCurrencies.some(
        c => c.name === currentValue?.name,
      );
      if (isTemporaryStillSupported) return currentValue;
      return resolvedSelectedCurrency;
    });
    initialCurrencyRef.current = resolvedSelectedCurrency;
  }, [resolvedSelectedCurrency, supportedCurrencies]);

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
    NavigationControls.closeSheet();
  }, [trackEvent]);

  const onConfirm = useCallback(() => {
    trackEvent('currency sheet | confirm | press', {
      currency: temporarySelectedCurrency?.name,
    });
    if (temporarySelectedCurrency?.name !== selectedCurrencyFromState?.name) {
      setCurrency(temporarySelectedCurrency);
    }
    NavigationControls.closeSheet();
  }, [
    selectedCurrencyFromState,
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
      supportedCurrencies.map(currency => {
        const translationKey =
          `v2.sheets.fiatCurrency.currencyFullName.${currency.name}` as keyof I18nMessages;
        const fullName = t(translationKey);
        return {
          label: currency.name,
          value: currency.name,
          description:
            fullName !== (translationKey as string) ? fullName : undefined,
        };
      }),
    [supportedCurrencies, t],
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
