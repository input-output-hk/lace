import { Box } from '@lace/ui';
import * as styles from './StakePoolPlaceholderCellRenderer.css';

const fadeScale = 10;

export const stakePoolCellPlaceholderRenderer = (index: number) => (
  <Box
    h="$16"
    w="$fill"
    className={styles.cellPlaceholder({ fade: (index % fadeScale) as styles.fadeVariants['fade'] })}
  />
);
