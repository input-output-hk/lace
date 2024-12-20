import * as React from 'react';
import { IScreenshot } from '../../../services/helpers/apis-formatter/types';
import { IogImage } from '../../../components/Image';
import './styles.scss';

const FeaturesCarousel: React.FC<Partial<IScreenshot>> = ({ url }) => (
  <div className="iog-feature-carousel-container">
    <div className="iog-feature-carousel-border-container" data-testid="carousel-image">
      <IogImage src={url || ''} fit="cover" fluid alt="logo" />
    </div>
  </div>
);

export default FeaturesCarousel;
