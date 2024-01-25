import { Card } from '@lace/ui';
import cn from 'classnames';
import * as styles from './StakePoolCard.css';

interface Props {
  index?: number;
}

export const StakePoolCardSkeleton = ({ index = 0 }: Props) => (
  <Card.Greyed
    className={cn(styles.card, styles.skeleton)}
    style={{
      // eslint-disable-next-line no-magic-numbers
      animationDelay: `${index * 0.05}s`,
    }}
  />
);
