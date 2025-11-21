import { DataOfKeyWithLockedRewards } from '@cardano-sdk/tx-construction';
import { Flex } from '@input-output-hk/lace-ui-toolkit';
import { Ellipsis } from '@lace/common';
import styles from './LockedStakeKeysList.module.scss';

type LockedStakeKeysListProps = {
  items: DataOfKeyWithLockedRewards[];
};

export const LockedStakeKeysList = ({ items }: LockedStakeKeysListProps) => (
  <ul className={styles.lockedStakeKeysList}>
    {items.map(({ cbor, key }) => (
      <li key={key}>
        <Flex>
          <Ellipsis text={key} beforeEllipsis={16} afterEllipsis={10} textClassName={styles.content} />
          {!!cbor && (
            <>
              &nbsp;(
              <Ellipsis text={cbor} beforeEllipsis={10} afterEllipsis={10} textClassName={styles.content} />)
            </>
          )}
        </Flex>
      </li>
    ))}
  </ul>
);
