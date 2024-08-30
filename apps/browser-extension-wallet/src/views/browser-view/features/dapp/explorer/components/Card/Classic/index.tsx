import React from 'react';
import { IogImage } from '../../Image';
import { IogText } from '../../Typography';
import { IogCardProps } from './types';
import { IogRow } from '../../Grid';
import './styles.scss';
import { Divider, Text } from '@input-output-hk/lace-ui-toolkit';

export const IogCardClassic: React.FC<IogCardProps> = ({ onClick, ...props }) => {
  const { title, categories, image, description } = props;

  return (
    <article
      onClick={() => onClick && onClick(props)}
      className="iog-card-container"
      data-testid={`dapp-grid-app-card-${title}`}
      role="card"
    >
      <div className="iog-card-header">
        {image && (
          <div className="iog-card-box iog-card-box__image" data-testid="dappImage">
            <IogImage src={image.src} alt={image.alt} size={48} overflow fit="contain" />
          </div>
        )}
        <IogRow className="iog-card-box">
          <Text.Body.Normal className="iog-card-title" weight="$medium" data-testid="dappTitle">
            {title}
          </Text.Body.Normal>
          <div className="iog-card-categories-box" data-testid="dappCategory">
            {categories?.map((category) => (
              <IogText key={category}>{category}</IogText>
            ))}
          </div>
        </IogRow>
      </div>

      {description && (
        <div className="iog-card-content">
          <Divider w="$fill" my="$16" />
          <Text.Body.Normal className="iog-card-description" weight="$medium">
            {description}
          </Text.Body.Normal>
        </div>
      )}
    </article>
  );
};
