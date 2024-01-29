import styles from './PoolSkeleton.module.scss';

export const PoolSkeleton = () => (
  <div className={styles.skeleton} data-testid="stake-pool-skeleton">
    <div className={styles.skeletonAvatar} />
    <div className={styles.skeletonTitle} />
  </div>
);
