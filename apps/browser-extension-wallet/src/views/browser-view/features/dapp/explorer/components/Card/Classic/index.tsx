import React from 'react';
import { IogImage } from '../../Image';
import { IogCardProps } from './types';
import './styles.scss';
import { Box, Card, Flex, Text } from '@input-output-hk/lace-ui-toolkit';

export const IogCardClassic: React.FC<IogCardProps> = ({ onClick, ...props }) => {
  const { title, categories, image } = props;

  return (
    <Card.Outlined
      onClick={() => onClick && onClick()}
      className="iog-card-container"
      data-testid={`dapp-grid-app-card-${title}`}
      role="card"
    >
      <Box w="$fill">
        <Flex gap="$12">
          <Flex
            alignItems="center"
            justifyContent="center"
            className="iog-card-box iog-card-box__image"
            data-testid="dappImage"
          >
            <IogImage src={image.src} alt={image.alt} size={48} fit="cover" />
          </Flex>
          <Flex className="iog-card-box__body" flexDirection="column">
            <Text.Body.Normal weight="$semibold" data-testid="dappTitle">
              {title}
            </Text.Body.Normal>
            <Box w="$fill">
              <Text.Body.Small weight="$semibold" color="secondary" data-testid="dappCategory">
                {categories?.map((category, index) => (categories.length !== index + 1 ? `${category} ` : category))}
              </Text.Body.Small>
            </Box>
          </Flex>
        </Flex>
      </Box>
    </Card.Outlined>
  );
};
