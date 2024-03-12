/* eslint-disable no-magic-numbers */
import { Card } from '@lace/ui';
import cn from 'classnames';
import * as styles from './StakePoolCard.css';

interface Props {
  index?: number;
  fadeScale?: 3 | 4 | 5;
}

const defaultFadeScale = 5;

export const StakePoolCardSkeleton = ({ index = 0, fadeScale = defaultFadeScale }: Props) => (
  <Card.Greyed
    className={cn(styles.card, styles.skeleton({ [`fade${fadeScale}`]: index % (fadeScale + 1) }))}
    data-testid="stake-pool-card-skeleton"
  />
);
