import * as React from 'react';
import './styles.scss';
import { mixins } from '../../../global/styles/Themes';

type IogRowProps = {
  children: React.ReactNode;
  className?: string;
  spacer?: number;
  style?: React.CSSProperties;
};

export const IogRow: React.FC<IogRowProps> = ({ children, className = '', spacer, style }) => (
  <div className={`iog-row ${className}`} style={{ ...mixins.setSpacer(spacer, true), ...style }}>
    {children}
  </div>
);
