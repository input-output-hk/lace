import React from 'react';
import illustrations from '../../../../assets/images/educational-illustration.png';
import styles from './EducationalListRow.module.scss';
import cn from 'classnames';
import { isValidURL } from '@utils/is-valid-url';
import { useExternalLinkOpener } from '@providers/ExternalLinkOpenerProvider';
import { isInternalLink } from '@src/utils/is-internal-link';
import { useHistory } from 'react-router-dom';

export interface EducationalListRowProps {
  subtitle: string;
  title: string;
  link: string;
  src?: string;
}

export const EducationalListRow = ({
  subtitle,
  title,
  link,
  src = illustrations
}: EducationalListRowProps): React.ReactElement => {
  const openExternalLink = useExternalLinkOpener();
  const { push } = useHistory();

  const onLinkClicked = () => {
    const validURL = isValidURL(link);
    const validInternalLink = isInternalLink(link);

    if (validURL && !validInternalLink) openExternalLink(link);
    if (validInternalLink && !validURL) push(link);
  };

  return (
    <div className={styles.rowContainer} data-testid="educational-list-row" onClick={onLinkClicked}>
      <div className={styles.imageContainer}>
        <img src={src} alt="educational-illustration" className={styles.image} data-testid="educational-list-row-img" />
      </div>
      <div className={cn(styles.contentContainer, { [styles.validLink]: isValidURL(link) })}>
        <h1 className={styles.title} data-testid="educational-list-row-title">
          {title}
        </h1>
        <p className={styles.subtitle} data-testid="educational-list-row-subtitle">
          {subtitle}
        </p>
      </div>
    </div>
  );
};
