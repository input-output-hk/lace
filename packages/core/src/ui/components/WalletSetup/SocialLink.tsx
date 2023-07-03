import React from 'react';
import styles from './SocialLink.module.scss';
import { ReactComponent as ArrowRight } from '../../assets/icons/chevron-right.component.svg';

export interface SocialLinkProps {
  icon?: React.ReactNode;
  text: string;
  to: string;
  testId: string;
}

// eslint-disable-next-line unicorn/no-null
export const SocialLink = ({ icon = null, text, to, testId }: SocialLinkProps): React.ReactElement => (
  <a target="_blank" rel="noopener noreferrer" href={to} className={styles.socialLink} data-tesid={`${testId}-link`}>
    <div className={styles.content}>
      <div className={styles.logo} data-testid={`${testId}-link-icon`}>
        {icon}
      </div>
      <p data-testid={`${testId}-link-text`}>{text}</p>
    </div>
    <ArrowRight className={styles.arrow} height="12px" />
  </a>
);
