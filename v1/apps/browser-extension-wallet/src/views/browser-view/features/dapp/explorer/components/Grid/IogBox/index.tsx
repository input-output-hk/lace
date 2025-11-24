import * as React from 'react';

import { Col, ColProps } from 'antd';
import { mixins } from '../../../global/styles/Themes';
import './styles.scss';

export const IogBox: React.FC<
  Partial<typeof Col & Omit<ColProps, 'span'> & { spacer?: number; size: number | string }>
> = ({ children, spacer, className = '', size, style, ...props }) => (
  <Col
    className={`iog-box ${className}`}
    {...props}
    span={size}
    style={{ ...style, ...mixins.setSpacer(spacer, true) }}
  >
    {children}
  </Col>
);
