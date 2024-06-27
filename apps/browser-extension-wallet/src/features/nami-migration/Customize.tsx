import React, { useEffect } from 'react';

import { Customize as View } from '@lace/core';
import nami from '@assets/videos/nami.mp4';
import lace from '@assets/videos/lace.mp4';
import { useHistory } from 'react-router-dom';
import { walletRoutePaths } from '@routes';
import { setBackgroundStorage } from '@lib/scripts/background/storage';
import { useAnalyticsContext } from '@providers';
import { postHogNamiMigrationActions } from '@providers/AnalyticsProvider/analyticsTracker';

export const Customize = (): JSX.Element => {
  const history = useHistory();
  const analytics = useAnalyticsContext();

  useEffect(() => {
    analytics.sendEventToPostHog(postHogNamiMigrationActions.onboarding.CUSTOMIZE_STEP);
  }, [analytics]);

  const completeMigrationAndRedirect = async (mode: 'lace' | 'nami') => {
    await (mode === 'lace'
      ? analytics.sendEventToPostHog(postHogNamiMigrationActions.onboarding.CUSTOMIZE_STEP_LACE_MODE_CLICK)
      : analytics.sendEventToPostHog(postHogNamiMigrationActions.onboarding.CUSTOMIZE_STEP_NAMI_MODE_CLICK));
    await analytics.sendEventToPostHog(postHogNamiMigrationActions.onboarding.MIGRATION_COMPLETE);

    // Actually complete migration
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

  const onModeChange = (mode: 'lace' | 'nami') => {
    if (mode === 'lace') {
      analytics.sendEventToPostHog(postHogNamiMigrationActions.onboarding.CUSTOMIZE_STEP_LACE_TAB_CLICK);
    } else {
      analytics.sendEventToPostHog(postHogNamiMigrationActions.onboarding.CUSTOMIZE_STEP_NAMI_TAB_CLICK);
    }
  };

  return (
    <View
      onChange={onModeChange}
      onBack={() => history.goBack()}
      onDone={completeMigrationAndRedirect}
      videosURL={{
        lace,
        nami
      }}
    />
  );
};
