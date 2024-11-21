import React from 'react';
import { UncontrolledPasswordBox } from '@input-output-hk/lace-ui-toolkit';
import type { UncontrolledPasswordBoxProps } from '@input-output-hk/lace-ui-toolkit';
import styles from './namiPassword.module.scss';

type NamiPasswordProps = Omit<
  UncontrolledPasswordBoxProps,
  'containerClassName'
>;

export const NamiPassword = (props: NamiPasswordProps) => {
  return (
    <UncontrolledPasswordBox
      containerClassName={styles.passwordContainer}
      {...props}
    />
  );
};
