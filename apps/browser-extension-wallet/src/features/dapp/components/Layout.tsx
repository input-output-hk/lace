import classnames from 'classnames';
import React from 'react';
import styles from './Layout.module.scss';

type layoutProps = {
  title?: string | React.ReactElement;
  children?: React.ReactElement | React.ReactNode;
  layoutClassname?: string;
  pageClassname?: string;
};

export const Layout = ({ title, children, layoutClassname, pageClassname }: layoutProps): React.ReactElement => (
  <div className={classnames([styles.layout, layoutClassname])}>
    <div data-testid="layout-title" className={styles.title}>
      {title}
    </div>
    <div className={classnames([styles.page, pageClassname])}>{children}</div>
  </div>
);
