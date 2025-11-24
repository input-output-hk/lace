import React from 'react';
import classnames from 'classnames';
import styles from './SectionTitle.module.scss';
import { Button, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface SectionTitleProps {
  title: string | React.ReactElement;
  withIcon?: boolean;
  sideText?: string | React.ReactElement;
  handleIconClick?: () => void;
  isPopup?: boolean;
  classname?: string;
  'data-testid'?: string;
}

export const SectionTitle = ({
  title,
  withIcon,
  handleIconClick,
  sideText,
  isPopup,
  classname,
  ...rest
}: SectionTitleProps): React.ReactElement => (
  <div
    className={classnames(classname, styles.sectionTitleContainer, { [styles.sectionTitleContainerPopup]: isPopup })}
  >
    {withIcon && (
      <Button
        data-testid="section-title-btn-icon"
        onClick={handleIconClick}
        shape="circle"
        icon={<ArrowLeftOutlined />}
      />
    )}
    <div className={styles.sectionTitle} data-testid="section-title-container">
      <Text data-testid={rest['data-testid'] || 'section-title'} className={styles.title}>
        {title}
      </Text>
      {sideText && (
        <Text data-testid="section-title-counter" className={styles.sideText}>
          {' '}
          {sideText}
        </Text>
      )}
    </div>
  </div>
);
