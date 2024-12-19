import { DataOfKeyWithLockedRewards } from '@cardano-sdk/tx-construction';
import { Ellipsis } from '@lace/common';
import styles from './LockedStakeKeysList.module.scss';

type LockedStakeKeysListProps = {
  items: DataOfKeyWithLockedRewards[];
};

export const LockedStakeKeysList = ({ items }: LockedStakeKeysListProps) => (
  <ul className={styles.lockedStakeKeysList}>
    {items.map(({ credential, key }) => (
      <li key={key}>
        <div className={styles.item}>
          <Ellipsis text={key} beforeEllipsis={16} afterEllipsis={10} textClassName={styles.content} />
          &nbsp;(
          <Ellipsis text={credential} beforeEllipsis={10} afterEllipsis={10} textClassName={styles.content} />)
        </div>
      </li>
    ))}
  </ul>
);
