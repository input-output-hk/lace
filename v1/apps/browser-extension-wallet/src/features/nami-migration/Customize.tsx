import React, { useEffect } from 'react';

import { Customize as View } from '@lace/core';
import nami from '@assets/videos/nami.mp4';
import lace from '@assets/videos/lace.mp4';
import { useHistory } from 'react-router-dom';
import { walletRoutePaths } from '@routes';
import { setBackgroundStorage } from '@lib/scripts/background/storage';
import { useAnalyticsContext } from '@providers';
import { postHogNamiMigrationActions } from '@providers/AnalyticsProvider/analyticsTracker';
import * as laceMigrationClient from '@src/features/nami-migration/migration-tool/cross-extension-messaging/lace-migration-client.extension';

export const Customize = (): JSX.Element => {
  const history = useHistory();
  const analytics = useAnalyticsContext();

  useEffect(() => {
    analytics.sendEventToPostHog(postHogNamiMigrationActions.onboarding.CUSTOMIZE_STEP);
  }, [analytics]);

  const completeMigrationAndRedirect = async () => {
    await analytics.sendEventToPostHog(postHogNamiMigrationActions.onboarding.CUSTOMIZE_STEP_LACE_MODE_CLICK);

    await analytics.sendEventToPostHog(postHogNamiMigrationActions.onboarding.MIGRATION_COMPLETE);

    // Actually complete migration
    await setBackgroundStorage({
      namiMigration: {
        completed: true
      }
    });

    laceMigrationClient.completeMigration();

    history.push(walletRoutePaths.assets);
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
