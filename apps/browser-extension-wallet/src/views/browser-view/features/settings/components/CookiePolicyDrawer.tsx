/* eslint-disable react/no-multi-comp */
import React from 'react';
import { Drawer, DrawerHeader, DrawerNavigation } from '@lace/common';
import styles from './SettingsLayout.module.scss';
import { useTranslation, Trans } from 'react-i18next';
import cn from 'classnames';

interface GeneralSettingsDrawerProps {
  visible: boolean;
  onClose: () => void;
  popupView?: boolean;
}

const CookiePolicyTranslations = ({ popupView }: { popupView: boolean }) => (
  <Trans
    i18nKey="cookiePolicy"
    components={{
      br: <br />,
      strong: <strong style={{ fontWeight: 600 }} />,
      i: <i />,
      b: <b style={{ fontWeight: 600 }} />,
      div: <div />,
      u: <u />,
      a: <a target="_blank" />,
      p: <p />,
      em: <em />,
      ul: <ul />,
      li: <li />,
      address: <address />,
      heading: <h6 className={`${popupView ? 'mt-1 mb-3' : 'mt-5 mb-2'} line-height-3 font-body-large`} />,
      subtitle: <h6 className={cn(styles.subtitle, 'font-weight-600')} />
    }}
  />
);

export const CookiePolicyDrawer = ({
  visible,
  onClose,
  popupView = false
}: GeneralSettingsDrawerProps): React.ReactElement => {
  const { t } = useTranslation();

  return (
    <Drawer
      visible={visible}
      onClose={onClose}
      title={<DrawerHeader popupView={popupView} title={t('browserView.settings.legal.cookiePolicy.title')} />}
      navigation={
        <DrawerNavigation
          title={t('browserView.settings.heading')}
          onCloseIconClick={!popupView ? onClose : undefined}
          onArrowIconClick={popupView ? onClose : undefined}
        />
      }
      popupView={popupView}
    >
      <div
        data-testid="cookie-policy-content"
        className={cn(popupView ? styles.popupContainer : styles.drawerContainer, styles.cookiePolicy)}
      >
        <CookiePolicyTranslations popupView={popupView} />
      </div>
    </Drawer>
  );
};
