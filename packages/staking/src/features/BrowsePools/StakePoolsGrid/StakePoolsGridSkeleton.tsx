/* eslint-disable no-magic-numbers */
import { StakePoolCardSkeleton } from '../StakePoolCard';
import * as styles from './StakePoolsGrid.css';
import { StakePoolsGridColumnCount } from './types';

type StakePoolGridSkeletonProps = {
  columnCount: StakePoolsGridColumnCount;
  rowCount: number;
};
export const StakePoolsGridSkeleton = ({ columnCount, rowCount }: StakePoolGridSkeletonProps) => (
  <div className={styles.grid}>
    {Array.from({ length: columnCount * rowCount }).map((_, index) => (
      <StakePoolCardSkeleton key={index} fadeScale={columnCount} index={index} />
    ))}
  </div>
);
