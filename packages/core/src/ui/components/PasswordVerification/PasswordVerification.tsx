import React from 'react';
import classnames from 'classnames';
import { Password, PasswordProps } from '../Password';
import styles from './PasswordVerification.module.scss';

export const complexityLevels = {
  low: 1,
  mid: 2,
  high: 3,
  veryHigh: 4
};

export type PasswordVerificationProps = {
  level?: number;
  feedbacks?: string[];
  complexityBarList: Array<{
    isActive?: boolean;
  }>;
  hasValue: boolean;
} & PasswordProps;

export const PasswordVerification = ({
  level,
  feedbacks,
  complexityBarList,
  hasValue,
  ...rest
}: PasswordVerificationProps): React.ReactElement => {
  const isLowLevelSecurity = level <= complexityLevels.low;
  const isMidLevelSecurity = level === complexityLevels.mid;
  const isHighLevelSecurity = level >= complexityLevels.high;

  const levelBarBgColor = classnames({
    [styles.low]: isLowLevelSecurity,
    [styles.mid]: isMidLevelSecurity,
    [styles.high]: isHighLevelSecurity
  });
  return (
    <div className={styles.container}>
      <Password {...rest} />
      {hasValue && (
        <>
          <div className={styles.complexityLevel}>
            {complexityBarList.map(({ isActive }, idx) => (
              <div
                key={`bar-level-${idx}`}
                data-testid={isActive ? 'bar-level-active' : 'bar-level-inactive'}
                className={classnames(styles.complexityLevelBar, { [levelBarBgColor]: isActive })}
              />
            ))}
          </div>
          {feedbacks && (
            <div className={styles.feedbackList} data-testid="password-feedback">
              {feedbacks.map((feedback, idx) => (
                <p key={`feedback-${idx}`} className={styles.feedbackMessage}>
                  {feedback}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
