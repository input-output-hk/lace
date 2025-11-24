import * as React from 'react';
import { Grid } from 'antd';
import { mixins } from '../../../global/styles/Themes';

import './styles.scss';

export const IogGrid: React.FC<Partial<typeof Grid> & React.HTMLAttributes<HTMLDivElement> & { spacer?: number }> = ({
  children,
  className = '',
  spacer,
  style,
  ...rest
}) => (
  <div className={`iog-grid ${className}`} style={{ ...mixins.setSpacer(spacer, true), ...style }} {...rest}>
    {children}
  </div>
);
