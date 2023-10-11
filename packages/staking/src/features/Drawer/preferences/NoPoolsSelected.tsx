import { Button, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import Empty from './empty.svg';
import * as styles from './NoPoolsSelected.css';

export const NoPoolsSelected = ({
  onBrowsePoolsButtonClick,
}: {
  onBrowsePoolsButtonClick: () => void;
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <div className={styles.container}>
      <Empty className={styles.icon} />
      <Text.Body.Normal className={styles.text} weight="$semibold">
        {t('drawer.preferences.noSelectedPools')}
      </Text.Body.Normal>
      <div className={styles.button}>
        <Button.CallToAction label={t('drawer.preferences.browsePools')} onClick={onBrowsePoolsButtonClick} />
      </div>
    </div>
  );
};
