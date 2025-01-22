/* eslint-disable react/no-multi-comp */
import React from 'react';
import { Switch } from '@lace/common';
import { useTranslation } from 'react-i18next';
import styles from '../DropdownMenuOverlay.module.scss';
import { useTheme } from '@providers/ThemeProvider/context';
import SunIcon from '../../../../../../assets/icons/sun.component.svg';
import MoonIcon from '../../../../../../assets/icons/moon.component.svg';
import { useBackgroundServiceAPIContext } from '@providers/BackgroundServiceAPI';
import { themes, useAnalyticsContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import type { TranslationKey } from '@lace/translation';

type ThemeAnalyticsEvents<T> = Record<themes, T>;

const settingsThemeEvent: ThemeAnalyticsEvents<
  PostHogAction.SettingsThemeDarkModeClick | PostHogAction.SettingsThemeLightModeClick
> = {
  dark: PostHogAction.SettingsThemeDarkModeClick,
  light: PostHogAction.SettingsThemeLightModeClick
};

const userWalletProfileThemeEvent: ThemeAnalyticsEvents<
  PostHogAction.UserWalletProfileDarkModeClick | PostHogAction.UserWalletProfileLightModeClick
> = {
  dark: PostHogAction.UserWalletProfileDarkModeClick,
  light: PostHogAction.UserWalletProfileLightModeClick
};

const modeTranslate: Record<string, TranslationKey> = {
  light: 'browserView.sideMenu.mode.light',
  dark: 'browserView.sideMenu.mode.dark'
};

interface Props {
  isPopup?: boolean;
  section?: 'settings' | 'user_profile';
}

export const ThemeSwitch = ({ isPopup, section = 'user_profile' }: Props): React.ReactElement => {
  const { theme, setTheme } = useTheme();
  const backgroundServices = useBackgroundServiceAPIContext();
  const analytics = useAnalyticsContext();

  const handleCurrentTheme = () => {
    const pickedTheme = theme.name === 'light' ? 'dark' : 'light';
    setTheme(pickedTheme);

    if (isPopup) {
      backgroundServices.handleChangeTheme({ theme: pickedTheme });
    }
    const posthogEvent = section === 'settings' ? settingsThemeEvent : userWalletProfileThemeEvent;
    analytics.sendEventToPostHog(posthogEvent[pickedTheme]);
  };

  return (
    <Switch
      className={styles.switch}
      checkedChildren={<SunIcon className={styles.switchIcon} />}
      unCheckedChildren={<MoonIcon className={styles.switchIcon} />}
      checked={theme.name === 'light'}
      onChange={handleCurrentTheme}
    />
  );
};

export const ThemeSwitcher = ({ isPopup }: Props): React.ReactElement => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <div className={styles.menuItemTheme} data-testid="header-menu-theme-switcher">
      {t(modeTranslate[theme.name])}
      <ThemeSwitch isPopup={isPopup} />
    </div>
  );
};
