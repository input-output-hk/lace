import { Box, Button, Text } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import * as styles from './NoPoolsSelected.css';
import SadSmiley from './sad-smiley.svg';

export const NoPoolsSelected = ({
  onBrowsePoolsButtonClick,
}: {
  onBrowsePoolsButtonClick: () => void;
}): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <Box className={styles.container}>
      <SadSmiley className={styles.icon} />
      <Text.Body.Normal className={styles.text} weight="$semibold">
        {t('drawer.preferences.noSelectedPools')}
      </Text.Body.Normal>
      <Box mt="$40">
        <Button.CallToAction label={t('drawer.preferences.browsePools')} onClick={onBrowsePoolsButtonClick} />
      </Box>
    </Box>
  );
};
