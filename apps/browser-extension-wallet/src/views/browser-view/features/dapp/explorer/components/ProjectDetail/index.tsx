import React from 'react';
import { useTranslation } from 'react-i18next';
import { Drawer, DrawerNavigation, Button, PostHogAction } from '@lace/common';
import { Tabs } from 'antd';
import { EDrawerAction, useDrawer } from './drawer';
import { ISectionCardItem } from '../../services/helpers/apis-formatter/types';
import { IogImage } from '../../components/Image';
import { AboutDapp } from './AboutDapp';
import { Contact } from './Contact';
import LinkIcon from '../../assets/icons/link.component.svg';

import './styles.scss';
import { Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { useAnalyticsContext, useExternalLinkOpener } from '@providers';
import capitalize from 'lodash/fp/capitalize';

const shortenURL = (url?: string) => {
  if (!url) return '';
  const maxLength = 60;
  return url?.length > maxLength ? `${url.slice(0, maxLength)}...` : url;
};

type ProjectDetailProps = {
  selectedCategory: string;
};

const ProjectDetail: React.FC<ProjectDetailProps> = ({ selectedCategory }) => {
  const {
    state: { open, data },
    dispatch
  } = useDrawer<ISectionCardItem>();
  const analytics = useAnalyticsContext();

  const openExternalLink = useExternalLinkOpener();
  const { t } = useTranslation();

  const handleClose = () => dispatch({ type: EDrawerAction.CLOSE });

  const handleOpenUrl = () => {
    openExternalLink(data?.link);
    void analytics.sendEventToPostHog(PostHogAction.DappExplorerDetailDrawerRedirectClick, {
      // eslint-disable-next-line camelcase
      dapp_explorer_selected_category_name: selectedCategory,
      // eslint-disable-next-line camelcase
      dapp_explorer_selected_dapp_name: data?.title,
      // eslint-disable-next-line camelcase
      dapp_explorer_selected_dapp_url: data?.link
    });
  };

  const tabItems = [
    { label: t('dappdiscovery.side_panel.more_details'), key: '1', children: <AboutDapp /> },
    { label: t('dappdiscovery.side_panel.contact'), key: '2', children: <Contact /> }
  ];

  // eslint-disable-next-line unicorn/no-null
  if (!open || !data) return null;

  return (
    <Drawer
      open
      onClose={handleClose}
      navigation={
        <DrawerNavigation onCloseIconClick={handleClose} title={t('dappdiscovery.side_panel.about_this_dapp')} />
      }
      footer={
        <div>
          <Button style={{ width: '100%' }} onClick={handleOpenUrl}>
            <Flex gap="$8" alignItems="center">
              <LinkIcon className="link-icon" />
              <div>{shortenURL(data?.link)}</div>
            </Flex>
          </Button>
        </div>
      }
    >
      <div data-testid="app-details-modal">
        <Flex justifyContent="space-between" alignItems="center">
          <div className="iog-project-details__header">
            {data?.image && (
              <IogImage
                overflow
                fit="contain"
                src={data?.image?.src || ''}
                alt={data?.image?.alt || 'Image'}
                width={50}
                height={50}
                data-testid="dapp-info-modal-icon"
              />
            )}
            <Flex flexDirection="column" gap="$4">
              <Text.Body.Normal data-testid="dapp-info-modal-title" weight="$bold">
                {data?.title}
              </Text.Body.Normal>
              <Text.Body.Small color="secondary" weight="$semibold">
                {data.categories.map((c) => capitalize(c)).join(', ')}
              </Text.Body.Small>
            </Flex>
          </div>
        </Flex>
        {open && <Tabs className="iog-tabs" items={tabItems} defaultActiveKey="1" />}
      </div>
    </Drawer>
  );
};

export default ProjectDetail;
