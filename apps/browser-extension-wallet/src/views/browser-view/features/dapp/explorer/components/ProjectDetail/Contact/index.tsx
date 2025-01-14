import { useTranslation } from 'react-i18next';
import * as React from 'react';
import { ISectionCardItem } from '../../../services/helpers/apis-formatter/types';
import { useDrawer } from '../drawer';
import { EIconsName, Icon } from '../../../components/Icon';
import { ContactItem } from './ContactItem';
import './styles.scss';
import { Flex } from '@input-output-hk/lace-ui-toolkit';

export const Contact: React.FC = () => {
  const {
    state: { data }
  } = useDrawer<ISectionCardItem>();

  const { t } = useTranslation();

  const mailIcon = <Icon name={EIconsName.MAIL} size={24} strokeColor="#6F7786" />;
  const websiteIcon = <Icon name={EIconsName.WEBSITE} size={24} strokeColor="#6F7786" />;

  if (!data) return <></>;

  return (
    <Flex flexDirection="column" gap="$24" pt="$24" data-testid="contact-items">
      {!!data.email && (
        <ContactItem itemIcon={mailIcon} itemTitle={t('dappdiscovery.side_panel.email')} itemData={data.email} />
      )}
      {!!data.companyWebsite && (
        <ContactItem
          itemIcon={websiteIcon}
          itemTitle={t('dappdiscovery.side_panel.company_website')}
          itemData={data.companyWebsite}
        />
      )}
    </Flex>
  );
};
