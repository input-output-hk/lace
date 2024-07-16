import { Box } from '@input-output-hk/lace-ui-toolkit';
import * as styles from './StakePoolSkeletonCellRenderer.css';

const fadeScale = 10;

export const stakePoolCellPlaceholderRenderer = (index: number) => (
  <Box
    h="$16"
    w="$fill"
    className={styles.cellPlaceholder({ fade: (index % fadeScale) as styles.fadeVariants['fade'] })}
  />
);
