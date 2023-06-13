import React from 'react';
import cn from 'classnames';
import { Drawer, DrawerHeader, DrawerNavigation } from '@lace/common';
import { LegalTranslations, useTranslate } from '@lace/core';
import styles from './SettingsLayout.module.scss';

interface GeneralSettingsDrawerProps {
  visible: boolean;
  onClose: () => void;
  popupView?: boolean;
}

// TODO: add translation once the final text was delivered by legals https://input-output.atlassian.net/browse/LW-5297
export const TermsDrawer = ({
  visible,
  onClose,
  popupView = false
}: GeneralSettingsDrawerProps): React.ReactElement => {
  const { t } = useTranslate();

  return (
    <Drawer
      visible={visible}
      onClose={onClose}
      title={<DrawerHeader popupView={popupView} title={t('browserView.settings.legal.tnc.title')} />}
      navigation={
        <DrawerNavigation
          title={t('browserView.settings.heading')}
          onCloseIconClick={popupView ? undefined : onClose}
          onArrowIconClick={popupView ? onClose : undefined}
        />
      }
      popupView={popupView}
    >
      <div
        data-testid="terms-and-conditions-content"
        className={cn(popupView ? styles.popupContainer : styles.drawerContainer, styles.termsDrawer)}
      >
        <br />
        <LegalTranslations />
      </div>
    </Drawer>
  );
};
