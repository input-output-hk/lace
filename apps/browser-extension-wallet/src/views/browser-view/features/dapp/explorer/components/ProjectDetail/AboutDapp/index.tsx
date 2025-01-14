import * as React from 'react';
import IogSlider from '../../Slider';
import { ISectionCardItem } from '../../../services/helpers/apis-formatter/types';
import { useTranslation } from 'react-i18next';
import { useDrawer } from '../drawer';
import FeaturesCarousel from '../FeaturesCarousel';
import { Box, Text } from '@input-output-hk/lace-ui-toolkit';

export const AboutDapp: React.FC = () => {
  const {
    state: { data }
  } = useDrawer<ISectionCardItem>();
  const { t } = useTranslation();

  return (
    <>
      <Box my="$24">
        <Text.Body.Normal>{data?.longDescription}</Text.Body.Normal>
      </Box>
      {data?.screenshots && (
        <Box mb="$24">
          <Box mb="$24">
            <Text.Body.Large weight="$bold">{t('dappdiscovery.side_panel.gallery')}</Text.Body.Large>
          </Box>
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
            showSliderNavigation={data.screenshots?.length > 1}
          >
            <FeaturesCarousel />
          </IogSlider>
        </Box>
      )}
    </>
  );
};
