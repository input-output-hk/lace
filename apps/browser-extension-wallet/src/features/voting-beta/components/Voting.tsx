import React from 'react';
import { ContentLayout } from '@src/components/Layout';
import { useWalletStore } from '@src/stores';
import styles from './Voting.module.scss';
import { VotingCenterBanner } from '@src/views/browser-view/features/voting-beta/components/VotingCenterBanner';
import { config } from '@src/config';
import { useExternalLinkOpener } from '@providers';

export const Voting = (): React.ReactElement => {
  const openExternalLink = useExternalLinkOpener();
  const { environmentName } = useWalletStore();
  const { GOV_TOOLS_URLS } = config();
  // const analytics = useAnalyticsContext();

  // const sendAnalytics = useCallback(() => {
  //   analytics.sendEventToPostHog(PostHogAction.ActivityActivityActivityRowClick);
  // }, [analytics]);

  return (
    <ContentLayout>
      <div className={styles.activitiesContainer}>
        <div className={styles.emptyState}>
          <VotingCenterBanner
            openExternalLink={openExternalLink}
            govToolUrl={GOV_TOOLS_URLS[environmentName]}
            popupView
          />
        </div>
      </div>
    </ContentLayout>
  );
};
