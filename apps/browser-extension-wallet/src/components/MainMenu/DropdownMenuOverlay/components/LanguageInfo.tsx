/* eslint-disable unicorn/no-null */
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavigationButton, PostHogAction } from '@lace/common';
import styles from './NetworkInfo.module.scss';
import { useBackgroundServiceAPIContext } from '@providers';
import { Radio, RadioChangeEvent } from 'antd';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { storage as webStorage } from 'webextension-polyfill';
import type { Language } from '@lace/translation';

type LanguageChoiceProps = {
  onBack: () => void;
};

const LANG_CHOICES = ['en', 'es']; // hardcoding for v1 only

export const LanguageInfo = ({ onBack }: LanguageChoiceProps): React.ReactElement => {
  const { t } = useTranslation();
  const [language, setLanguage] = useState<Language | null>(null);
  const posthog = usePostHogClientContext();

  const { getBackgroundStorage, handleChangeLanguage } = useBackgroundServiceAPIContext();

  useEffect(() => {
    const getLanguage = async () => {
      const { languageChoice } = await getBackgroundStorage();
      if (languageChoice) setLanguage(languageChoice);
    };
    webStorage.onChanged.addListener(getLanguage);
    getLanguage();
  }, [getBackgroundStorage]);

  const handleLanguageChangeRequest = useCallback(
    (e: RadioChangeEvent) => {
      handleChangeLanguage(e.target.value);
      posthog.sendEvent(PostHogAction.UserWalletProfileLanguageSelectClick, { language: e.target.value });
    },
    [handleChangeLanguage, posthog]
  );

  return (
    <div data-testid="user-dropdown-language-info-section" className={styles.container}>
      <div className={styles.navigation} data-testid="drawer-navigation">
        <NavigationButton iconClassName={styles.iconClassName} icon="arrow" onClick={onBack} />
      </div>
      <div className={styles.titleSection}>
        <div data-testid="user-dropdown-language-title" className={styles.title}>
          {t('browserView.settings.wallet.language.title')}
        </div>
        <div data-testid="user-dropdown-language-description" className={styles.subTitle}>
          {t('browserView.settings.wallet.language.drawerDescription')}
        </div>
      </div>
      <div className={styles.content} data-testid="user-dropdown-language-choice">
        <Radio.Group
          className={styles.radioGroup}
          onChange={handleLanguageChangeRequest}
          value={language}
          data-testid={'language-choice-radio-group'}
        >
          {LANG_CHOICES.map((choice) => (
            <Radio key={`language-choice-${choice}`} value={choice} className={styles.radioLabel}>
              {choice}
            </Radio>
          ))}
        </Radio.Group>
      </div>
    </div>
  );
};
