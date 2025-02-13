import React, { useCallback } from 'react';
import { ContentLayout } from '@src/components/Layout';
import { useWalletStore } from '@src/stores';
import styles from './Voting.module.scss';
import { VotingCenterBanner } from '@src/views/browser-view/features/voting-beta/components/VotingCenterBanner';
import { config } from '@src/config';
import { useAnalyticsContext, useExternalLinkOpener } from '@providers';
import { PostHogAction } from '@providers/AnalyticsProvider/analyticsTracker';

export const Voting = (): React.ReactElement => {
  const openExternalLink = useExternalLinkOpener();
  const { environmentName } = useWalletStore();
  const { GOV_TOOLS_URLS } = config();
  const analytics = useAnalyticsContext();

  const openLink = useCallback(
    async (url: string) => {
      await analytics.sendEventToPostHog(PostHogAction.VotingBannerButtonClick);

      openExternalLink(url);
    },
    [analytics, openExternalLink]
  );

  return (
    <ContentLayout>
      <div className={styles.activitiesContainer}>
        <div className={styles.emptyState}>
          <VotingCenterBanner openExternalLink={openLink} govToolUrl={GOV_TOOLS_URLS[environmentName]} popupView />
        </div>
      </div>
    </ContentLayout>
  );
};
