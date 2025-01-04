import * as React from 'react';
import classNames from 'classnames';
import { ILayoutProps } from './types';

import './styles.scss';

const Layout: React.FC<ILayoutProps> = ({ children }) => (
  <div
    id="dappLayout"
    className={classNames({
      'iog-layout': true,
      'iog-layout--light': true
    })}
  >
    <div
      className={classNames({
        'iog-layout-content': true
      })}
    >
      {children}
    </div>
  </div>
);

export default Layout;
