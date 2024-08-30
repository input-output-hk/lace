import React from 'react';
import 'react-modern-drawer/dist/index.css';
import { useTranslation } from 'react-i18next';
import Drawer from 'react-modern-drawer';
import { Tabs } from 'antd';
import { EDrawerAction, useDrawer } from './drawer';
import { ISectionCardItem } from '../../services/helpers/apis-formatter/types';
import { IogButtonIcon, IogButton } from '../Button';
import { EIconsName } from '../../components/Icon';
import { IogImage } from '../../components/Image';
import { IogText } from '../../components/Typography';
import { IogBox, IogRow } from '../../components/Grid';
import { AboutDapp } from './AboutDapp';
import { Contact } from './Contact';
import ExternalLink from '../../assets/icons/external-link.svg';
import Exclamation from '../../assets/icons/exclamation.svg';

import './styles.scss';
import { Button, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import Link from 'next/link';

const shortenURL = (url?: string) => {
  if (!url) return '';
  const maxLength = 60;
  return url?.length > maxLength ? `${url.slice(0, maxLength)}...` : url;
};

const ProjectDetail: React.FC = () => {
  const {
    state: { open, data },
    dispatch
  } = useDrawer<ISectionCardItem>();
  const reportDAppUrl =
    `${process.env.NEXT_PUBLIC_REPORT_DAPP_URL}?usp=pp_url&entry.2109698197=${data?.title}&entry.5231725=${data?.subject}` ||
    '';

  const { t } = useTranslation();

  const handleClose = () => dispatch({ type: EDrawerAction.CLOSE });

  const handleOpenUrl = () => {
    window.open(data?.companyWebsite, 'blank');
  };

  const tabItems = [
    { label: t('dappdiscovery.side_panel.more_details'), key: '1', children: <AboutDapp /> },
    { label: t('dappdiscovery.side_panel.contact'), key: '2', children: <Contact /> }
  ];

  return (
    <div className="iog-project-details__container" data-testid="app-drawer-container">
      <Drawer
        open={open}
        onClose={handleClose}
        direction="right"
        className="project-detail-container"
        size={664}
        overlayColor="#212121"
        overlayOpacity={0.8}
      >
        <IogRow className="iog-header-title" style={{ justifyContent: 'space-between' }}>
          <IogText as="span" xMedium bold className="iog-description-title" data-testid="app-details-header">
            {t('dappdiscovery.side_panel.about_this_dapp')}
          </IogText>
          <IogBox className="iog-close-button-modal" data-testid="modal-close">
            <IogButtonIcon
              circle
              name={EIconsName.CROSS}
              onClick={handleClose}
              solid
              iconProps={{
                size: 14
              }}
            />
          </IogBox>
        </IogRow>
        <hr className="iog-project-details__divider" />
        <div className="iog-project-details__content" data-testid="app-details-modal">
          <Flex justifyContent="space-between" alignItems="center">
            <div className="iog-project-details__header">
              {data?.image && (
                <div className="iog-project-details__avatar">
                  <IogImage
                    overflow
                    fit="contain"
                    src={data?.image?.src || ''}
                    alt={data?.image?.alt || 'Image'}
                    width={80}
                    height={80}
                    data-testid="dapp-info-modal-icon"
                  />
                </div>
              )}
              <Text.SubHeading className="header-title" data-testid="dapp-info-modal-title">
                {data?.title}
              </Text.SubHeading>
            </div>
            <Link href={reportDAppUrl} target="_blank">
              <Button.Secondary label="Report" icon={<Exclamation />} />
            </Link>
          </Flex>
          {open && <Tabs className="iog-tabs" items={tabItems} defaultActiveKey="1" />}
        </div>
        <hr className="iog-project-details__divider" />
        <IogRow className="iog-project-details__footer">
          <IogButton
            className="iog-button-nav-modal"
            primary
            onClick={handleOpenUrl}
            data-testid="app-details-website-btn"
          >
            <ExternalLink />
            {shortenURL(data?.link)}
          </IogButton>
        </IogRow>
      </Drawer>
    </div>
  );
};

export default ProjectDetail;
