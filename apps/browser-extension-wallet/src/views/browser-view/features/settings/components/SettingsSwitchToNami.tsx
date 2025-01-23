import React, { useEffect, useState } from 'react';
import { SettingsCard, SettingsLink } from './';
import { useTranslation } from 'react-i18next';
import { Typography } from 'antd';
import { WarningModal } from '@views/browser/components/WarningModal';
import { Switch } from '@lace/common';
import styles from './SettingsLayout.module.scss';
import { getBackgroundStorage, setBackgroundStorage } from '@lib/scripts/background/storage';
import { BackgroundStorage } from '@lib/scripts/types';
import { useAnalyticsContext, useBackgroundServiceAPIContext } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';
import { WarningIconTriangleSolidComponent } from '@input-output-hk/lace-ui-toolkit';

const { Title } = Typography;

export const SettingsSwitchToNami = ({ popupView }: { popupView?: boolean }): React.ReactElement => {
  const { t } = useTranslation();
  const analytics = useAnalyticsContext();
  const backgroundServices = useBackgroundServiceAPIContext();
  const [namiMigration, setNamiMigration] = useState<BackgroundStorage['namiMigration']>();
  const [modalOpen, setModalOpen] = useState(false);


  useEffect(() => {
    getBackgroundStorage()
      .then((storage) => setNamiMigration(storage.namiMigration))
      .catch(console.error);
  }, []);

  const handleNamiModeChange = async (activated: boolean) => {
    const mode = activated ? 'nami' : 'lace';
    const migration: BackgroundStorage['namiMigration'] = {
      ...namiMigration,
      mode
    };

    setNamiMigration(migration);

    backgroundServices.handleChangeMode({ mode });
    await setBackgroundStorage({
      namiMigration: migration
    });
    setModalOpen(false);
    if (activated) {
      await analytics.sendEventToPostHog(PostHogAction.SettingsSwitchToNamiClick);
      try {
        await backgroundServices.handleOpenPopup();
      } catch (error) {
        // improve logging
        console.warn(error);
      }
    } else {
      window.location.reload();
    }
  };

  return (
    <>
      <WarningModal
        header={
          <div className={styles.switchToNamiModalTitle}>{t('browserView.settings.legacyMode.confirmation.title')}</div>
        }
        content={t('browserView.settings.legacyMode.confirmation.description')}
        visible={modalOpen}
        onCancel={() => setModalOpen(false)}
        onConfirm={() => handleNamiModeChange(true)}
        cancelLabel={t('browserView.settings.legacyMode.confirmation.cancel')}
        confirmLabel={t('browserView.settings.legacyMode.confirmation.confirm')}
        confirmCustomClassName={styles.settingsConfirmButton}
        isPopupView={popupView}
      />
      <SettingsCard>
        <Title level={5} className={styles.heading5} data-testid={'nami-mode-heading'}>
          {t('browserView.settings.legacyMode.section')}
        </Title>
        <SettingsLink
          description={
            <>
              {t('browserView.settings.legacyMode.interface.description1')}
              <br />
              <WarningIconTriangleSolidComponent className={styles.warningIcon} />{' '}
              {t('browserView.settings.legacyMode.interface.description2')}
            </>
          }
          addon={
            <Switch
              testId="settings-nami-mode-switch"
              checked={namiMigration?.mode === 'nami'}
              onChange={(checked) => (checked ? setModalOpen(true) : handleNamiModeChange(false))}
              className={styles.analyticsSwitch}
            />
          }
          data-testid="settings-nami-mode-section"
        >
          <></>
        </SettingsLink>
      </SettingsCard>
    </>
  );
};
