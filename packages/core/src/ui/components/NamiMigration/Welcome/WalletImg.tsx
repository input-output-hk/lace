import React from 'react';
import { sx, Flex, Card } from '@lace/ui';
import cx from 'classnames';
import styles from './WalletImg.module.scss';

interface Props {
  img: string;
  icon: React.ReactNode;
  color: 'error' | 'success';
}

export const WalletImg = ({ img, icon, color }: Props): JSX.Element => (
  <Card.Img
    className={cx(
      styles.container,
      sx({
        w: '$fill',
        h: '$fill',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      })
    )}
  >
    <img src={img} />
    <Flex
      alignItems="center"
      justifyContent="center"
      className={cx(
        styles.icon,
        sx({
          w: '$20',
          h: '$20',
          backgroundColor: color === 'error' ? '$data_pink' : '$data_green',
          borderRadius: '$full',
          fontSize: '$14',
          color: '$white'
        })
      )}
    >
      {icon}
    </Flex>
  </Card.Img>
);
