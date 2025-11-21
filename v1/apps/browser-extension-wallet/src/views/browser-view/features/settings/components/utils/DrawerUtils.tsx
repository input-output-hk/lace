/* eslint-disable react/no-multi-comp */
import React, { ReactElement } from 'react';
import classnames from 'classnames';
import styles from '../SettingsLayout.module.scss';
import { Typography } from 'antd';

const { Text, Title: AntdTitle } = Typography;

export const Title = ({ children }: { children: React.ReactNode }): React.ReactElement => (
  <AntdTitle level={5} className={classnames(styles.heading6, styles.privacyPolicyTitleMargin)}>
    {children}
  </AntdTitle>
);
export const Subtitle = ({
  children,
  semiBold = false
}: {
  children: React.ReactNode;
  semiBold?: boolean;
}): React.ReactElement => (
  <AntdTitle level={5} className={classnames(styles.subtitle, { [styles.semiBold]: semiBold })}>
    {children}
  </AntdTitle>
);
export const Paragraph = ({ children }: { children: React.ReactNode }): ReactElement => (
  <Text className={styles.settingsText}>{children}</Text>
);
