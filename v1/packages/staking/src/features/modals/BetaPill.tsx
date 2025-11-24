import { useTranslation } from 'react-i18next';
import * as styles from './BetaPill.css';

export const BetaPill = () => {
  const { t } = useTranslation();
  return <span className={styles.root}>{t('modals.beta.pill')}</span>;
};
