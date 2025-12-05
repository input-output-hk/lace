import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import styles from '../DropdownMenuOverlay.module.scss';
import { useBackgroundServiceAPIContext } from '@providers';
import { storage as webStorage } from 'webextension-polyfill';

type LanguageChoiceProps = {
  onClick: () => void;
};

export const LanguageChoice = ({ onClick }: LanguageChoiceProps): React.ReactElement => {
  const { t } = useTranslation();
  const { getBackgroundStorage } = useBackgroundServiceAPIContext();
  const [language, setLanguage] = useState<string>('en');
  const [loadingLanguage, setLoadingLanguage] = useState(true);

  useEffect(() => {
    const getLanguage = async () => {
      const { languageChoice } = await getBackgroundStorage();
      if (languageChoice) setLanguage(languageChoice);
      setLoadingLanguage(false);
    };
    getLanguage();
    webStorage.onChanged.addListener(getLanguage);
  }, [getBackgroundStorage, setLoadingLanguage]);

  return (
    <div
      data-testid="header-menu-language-choice-container"
      className={cn(styles.menuItem, styles.cta)}
      onClick={() => onClick()}
    >
      <div className={styles.networkChoise}>
        <span data-testid="header-menu-language-choice-label">{t('browserView.topNavigationBar.links.language')}</span>
        {!loadingLanguage && (
          <span data-testid="header-menu-language-choice-value" className={styles.value}>
            {language || 'en'}
          </span>
        )}
      </div>
    </div>
  );
};
