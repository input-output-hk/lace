import React from 'react';
import { PasswordBox } from '@input-output-hk/lace-ui-toolkit';
import type { PasswordBoxProps } from '@input-output-hk/lace-ui-toolkit';
import styles from './namiPassword.module.scss';

type NamiPasswordProps = Omit<
  PasswordBoxProps,
  'containerClassName'
>;

export const NamiPassword = (props: NamiPasswordProps) => {
  return (
    <PasswordBox
      containerClassName={styles.namiPasswordContainer}
      {...props}
    />
  );
};
