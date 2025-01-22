import React from 'react';
import cn from 'classnames';
import styles from './Loader.module.scss';
import LoaderIcon from '../../assets/icons/loader.png';

export interface LoaderProps {
  className?: string;
}

// LW-11964 reuse unbundled image and css
export const Loader = ({ className }: LoaderProps): React.ReactElement => (
  <img
    src={LoaderIcon}
    className={cn(styles.loader, className && { [className]: className })}
    data-testid="loader-image"
  />
);
