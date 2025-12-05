import { useBackgroundServiceAPIContext } from '@providers';
import React, { useEffect } from 'react';

export const AppVersionGuard = ({ children }: { children: React.ReactNode }): React.ReactElement => {
  const backgroundServices = useBackgroundServiceAPIContext();

  useEffect(() => {
    const getAppVersion = async () => {
      const appVersionSW = await backgroundServices.getAppVersion();
      const appVersionUI = `${process.env.APP_VERSION}`;

      if (appVersionSW !== appVersionUI) {
        throw new Error(`App version mismatch: SW: ${appVersionSW}, UI: ${appVersionUI}`);
      }
    };

    getAppVersion();
  }, [backgroundServices]);

  return <>{children}</>;
};
