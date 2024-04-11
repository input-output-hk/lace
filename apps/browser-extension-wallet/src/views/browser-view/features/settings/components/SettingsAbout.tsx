import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from './SettingsLayout.module.scss';
import { Typography } from 'antd';
import { useWalletStore } from '@src/stores';
import { addEllipsis } from '@lace/common';
import { SocialNetwork, SocialNetworkIcon } from '@views/browser/components/SocialNetworks/SocialNetworkIcon';
const { Title } = Typography;
const COMMIT_HASH_START_LENGTH = 8;
const COMMIT_HASH_END_LENGTH = 4;

const socialNetworks = [
  { name: SocialNetwork.WEBSITE, href: process.env.WEBSITE_URL },
  { name: SocialNetwork.TWITTER, href: process.env.TWITTER_URL },
  { name: SocialNetwork.YOUTUBE, href: process.env.YOUTUBE_URL },
  { name: SocialNetwork.DISCORD, href: process.env.DISCORD_URL },
  { name: SocialNetwork.GITHUB, href: process.env.GITHUB_URL }
];

interface SettingsAboutProps {
  'data-testid'?: string;
}

export const SettingsAbout = ({ ...props }: SettingsAboutProps): React.ReactElement => {
  const { t } = useTranslation();
  const commitHashWithEllipsis = process.env.COMMIT_HASH
    ? addEllipsis(process.env.COMMIT_HASH, COMMIT_HASH_START_LENGTH, COMMIT_HASH_END_LENGTH)
    : undefined;
  const { environmentName } = useWalletStore();

  const dataTestId = `${props['data-testid'] || ''}`;
  return (
    <div className={styles.listContainer} data-testid={dataTestId}>
      <Title className={styles.title} level={2} data-testid="settings-about-title">
        {t('browserView.settings.wallet.about.content.title', { name: 'Lace' })}
      </Title>
      <div className={styles.aboutGrid}>
        <div className={styles.aboutGridLabel} data-testid="about-network-label">
          {t('browserView.settings.wallet.about.content.network')}
        </div>
        <div className={styles.aboutGridValue} data-testid="about-network-value">
          {environmentName}
        </div>
        <div className={styles.aboutGridLabel} data-testid="about-version-label">
          {t('browserView.settings.wallet.about.content.currentVersion')}
        </div>
        <div className={styles.aboutGridValue} data-testid="about-version-value">
          {process.env.APP_VERSION}
        </div>

        {commitHashWithEllipsis && (
          <>
            <div className={styles.aboutGridLabel} data-testid="about-commit-label">
              {t('browserView.settings.wallet.about.content.commit')}
            </div>
            <div className={styles.aboutGridValue} data-testid="about-commit-value">
              {commitHashWithEllipsis}
            </div>
          </>
        )}
      </div>
      <div className={styles.social}>
        {socialNetworks.map((el) => (
          <SocialNetworkIcon key={el.name} {...el} />
        ))}
      </div>
    </div>
  );
};
