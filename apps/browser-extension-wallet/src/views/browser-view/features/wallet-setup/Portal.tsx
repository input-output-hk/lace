import React from 'react';
import portal from '@assets/images/portal.png';
import portal2 from '@assets/images/portal2.png';
import styles from './Portal.module.scss';
import { walletRoutePaths } from '@routes/wallet-paths';
import { useLocation } from 'react-router-dom';

type PathKeys = keyof typeof walletRoutePaths.setup;
type PathValues = typeof walletRoutePaths.setup[PathKeys];

const portalPerRouteMap: Record<Partial<PathValues>, string> = {
  [walletRoutePaths.setup.home]: portal
};

type PortalProps = {
  children: React.ReactNode;
};

export const Portal = ({ children }: PortalProps): React.ReactElement => {
  const { pathname } = useLocation<{ pathname: string }>();

  return (
    <>
      <img className={styles.portal} src={portalPerRouteMap[pathname] || portal2} />
      {children}
    </>
  );
};
