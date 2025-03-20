/* eslint-disable react/prop-types */
import React, { forwardRef } from 'react';
import cn from 'classnames';
import Icon from '@ant-design/icons';
import { ReactComponent as Loader } from '../../assets/icons/loader.component.svg';
import styles from './styles.module.scss';
import { ButtonProps } from './types';

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'contained',
      htmlType = 'button',
      size = 'medium',
      loading,
      block = false,
      color = 'primary',
      className,
      icon,
      ...rest
    },
    ref
  ) => (
    <button
      ref={ref}
      data-color={color}
      type={htmlType}
      disabled={loading}
      className={cn(
        styles.btn,
        styles[variant],
        styles[size],
        {
          [styles.loading]: loading,
          [styles.block]: block,
          [styles.icon]: !!icon
        },
        className
      )}
      {...rest}
    >
      {loading && <div className={styles.dimm} />}
      <span className={cn(styles.content, { [styles.loadingContent]: loading })}>
        {icon ? icon : children}
        {loading && (
          <span data-testid="btn-loader-container" className={styles.loaderContainer}>
            <Icon className={styles.loader} component={Loader} />
          </span>
        )}
      </span>
    </button>
  )
);
