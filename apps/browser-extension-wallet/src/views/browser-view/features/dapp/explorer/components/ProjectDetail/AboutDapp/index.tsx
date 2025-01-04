import * as React from 'react';
import IogSlider from '../../Slider';
import { IogText, IogTitle } from '../../../components/Typography';
import { ISectionCardItem } from '../../../services/helpers/apis-formatter/types';
import { useTranslation } from 'react-i18next';
import { useDrawer } from '../drawer';
import FeaturesCarousel from '../FeaturesCarousel';

export const AboutDapp: React.FC = () => {
  const {
    state: { data }
  } = useDrawer<ISectionCardItem>();

  const { t } = useTranslation();

  return (
    <>
      <div className="iog-project-details__description-container">
        <IogText xMedium spacer={24} normal className="iog-description" data-testid="dapp-info-modal-description-text">
          {data?.longDescription}
        </IogText>
      </div>

      {data?.screenshots && (
        <div className="iog-project-details__features-container">
          <IogTitle as="h3" xMedium className="iog-features" data-testid="dapp-info-modal-preview-title">
            {t('dappdiscovery.side_panel.gallery')}
          </IogTitle>
          <IogSlider
            data={data.screenshots}
            navigation={{
              nextEl: '.swiper-button-next1',
              prevEl: '.swiper-button-prev1'
            }}
            watchOverflow
            buttonSolid
            threshold={100}
            slidesPerView={1}
            edgeSwipeThreshold={20}
            slidesPerGroup={1}
            speed={650}
            spaceBetween={20}
          >
            <FeaturesCarousel />
          </IogSlider>
        </div>
      )}
    </>
  );
};
