/* eslint-disable no-magic-numbers */
import { Card } from '@lace/ui';
import cn from 'classnames';
import * as styles from './StakePoolCard.css';
import { FadeVariant } from './StakePoolCard.css';

interface Props {
  index?: number;
  fadeScale?: 2 | 3 | 4;
}

const defaultFadeScale = 4;

export const StakePoolCardSkeleton = ({ index = 0, fadeScale = defaultFadeScale }: Props) => {
  // this is necessary because computed key in `styles.skeleton({ [`fade${fadeScale}`]: 0 })` isn't type-safe for some reason
  const skeletonVariant: FadeVariant = `fade${fadeScale}`;

  return (
    <Card.Greyed
      className={cn(styles.card, styles.skeleton({ [skeletonVariant]: index % fadeScale }))}
      data-testid="stake-pool-card-skeleton"
    />
  );
};
