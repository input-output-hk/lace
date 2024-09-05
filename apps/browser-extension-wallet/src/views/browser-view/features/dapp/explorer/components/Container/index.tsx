import * as React from 'react';
import classNames from 'classnames';
import './styles.scss';

export const IogContainer: React.FC<{
  children?: React.ReactNode;
  className?: HTMLElement['className'];
  small?: boolean;
}> = ({ children, className, small }) => (
  <section className={classNames([{ 'iog-container': true, 'iog-container--small': small }, className])}>
    {children}
  </section>
);
