import { useTranslation } from 'react-i18next';
import * as React from 'react';
import { ISectionCardItem } from '../../../services/helpers/apis-formatter/types';
import { useDrawer } from '../drawer';
import { EIconsName, Icon } from '../../../components/Icon';
import { ContactItem } from './ContactItem';
import './styles.scss';

export const Contact: React.FC = () => {
  const {
    state: { data }
  } = useDrawer<ISectionCardItem>();

  const { t } = useTranslation();

  const mailIcon = <Icon name={EIconsName.MAIL} size={24} strokeColor="#6F7786" />;
  const websiteIcon = <Icon name={EIconsName.WEBSITE} size={24} strokeColor="#6F7786" />;

  if (!data) return null;

  return (
    <>
      <div className="iog-project-details__description-container">
        <div className="iog-contact" data-testid="contact-items">
          <ContactItem itemIcon={mailIcon} itemTitle={t('dappdiscovery.side_panel.email')} itemData={data.email} />
          <ContactItem
            itemIcon={websiteIcon}
            itemTitle={t('dappdiscovery.side_panel.company_website')}
            itemData={data.companyWebsite}
          />
        </div>
      </div>

      {/* TODO: uncomment when backend is ready to serve social links & change to use data from drawer/backend */}
      {/* {socialLinkData?.length && (*/}
      {/*  <IogRow className="iog-project-details__provider" justify="space-between" align="bottom">*/}
      {/*    <IogBox>*/}
      {/*      <IogTitle as="h3" xMedium className="iog-social-links" data-e2e="dapp-info-social-links">*/}
      {/*        {t('dappdiscovery.side_panel.social_links')}*/}
      {/*      </IogTitle>*/}
      {/*      <SocialLinks links={socialLinkData}/>*/}
      {/*    </IogBox>*/}
      {/*  </IogRow>*/}
      {/* )}*/}
    </>
  );
};
