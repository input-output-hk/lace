import React from 'react';

import { Customize as View } from '@lace/core';
import nami from '@assets/videos/nami.mp4';
import lace from '@assets/videos/lace.mp4';
import { useHistory } from 'react-router-dom';
import { walletRoutePaths } from '@routes';
import { setBackgroundStorage } from '@lib/scripts/background/storage';

export const Customize = (): JSX.Element => {
  const history = useHistory();

  const completeMigrationAndRedirect = async (mode: 'lace' | 'nami') => {
    await setBackgroundStorage({
      namiMigration: {
        completed: true,
        mode
      }
    });

    if (mode === 'lace') {
      history.push(walletRoutePaths.assets);
    } else {
      history.push(walletRoutePaths.namiMigration.allDone);
    }
  };

  return (
    <View
      onBack={() => history.goBack()}
      onDone={completeMigrationAndRedirect}
      videosURL={{
        lace,
        nami
      }}
    />
  );
};
