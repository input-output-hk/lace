import { useTranslation } from '@lace-contract/i18n';
import { openUrl } from '@lace-lib/ui-toolkit';
import { useMemo, useCallback } from 'react';

import type { ListOptionType } from '../common';

const FAQ_URL = process.env.EXPO_PUBLIC_FAQ_URL;
const GET_AI_SUPPORT_URL = process.env.EXPO_PUBLIC_ZENDESK_NEW_REQUEST_URL;

export const useSupportProps = () => {
  const { t } = useTranslation();

  const title = t('v2.pages.support.title');
  const subtitle = t('v2.pages.support.subtitle');
  const searchPlaceholder = t('v2.pages.support.search-placeholder');

  const handleAiSupport = useCallback(() => {
    if (!GET_AI_SUPPORT_URL) {
      return;
    }

    void openUrl({
      url: GET_AI_SUPPORT_URL,
      onError: () => {
        // Error handling is done in the openUrl utility
      },
    });
  }, [GET_AI_SUPPORT_URL]);

  const handleFAQ = useCallback(() => {
    if (!FAQ_URL) {
      return;
    }

    void openUrl({
      url: FAQ_URL,
      onError: () => {
        // Error handling is done in the openUrl utility
      },
    });
  }, [FAQ_URL]);

  const supportOptions: ListOptionType[] = useMemo(
    () => [
      {
        id: 'ai-support',
        titleKey: t('v2.pages.support.options.ai-support.title'),
        subtitleKey: t('v2.pages.support.options.ai-support.subtitle'),
        icon: 'Ticket',
        onPress: handleAiSupport,
      },
      {
        id: 'faq',
        titleKey: t('v2.pages.support.options.faq.title'),
        subtitleKey: t('v2.pages.support.options.faq.subtitle'),
        icon: 'MessageQuestion',
        onPress: handleFAQ,
      },
    ],
    [handleAiSupport, handleFAQ, t],
  );

  return {
    supportOptions,
    title,
    subtitle,
    searchPlaceholder,
  };
};
