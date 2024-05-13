import React from 'react';
import { Button, Card } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import styles from './MidnightPreLaunchSettingsBanner.module.scss';

export const MidnightPreLaunchSettingsBanner = ({
  bannerImageUrl,
  onCtaButtonClick
}: {
  bannerImageUrl: string;
  onCtaButtonClick?: () => void;
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <Card.Outlined
      className={styles.card}
      style={{ '--midnight-pre-launch-banner-image': `url(${bannerImageUrl})` } as React.CSSProperties}
    >
      <div className={styles.heading}>{t('core.MidnightPreLaunchSettingsBanner.heading')}</div>
      <div className={styles.description}>{t('core.MidnightPreLaunchSettingsBanner.description')}</div>
      <Button.CallToAction
        label={t('core.MidnightPreLaunchSettingsBanner.ctaButtonLabel')}
        onClick={onCtaButtonClick}
        w="$fill"
      />
    </Card.Outlined>
  );
};
