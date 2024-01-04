import { PostHogAction } from '@lace/common';
import { SubNavigation } from '@lace/ui';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { USE_MULTI_DELEGATION_STAKING_ACTIVITY } from '../../featureFlags';
import { useOutsideHandles } from '../outside-handles-provider';
import { DelegationFlow, useDelegationPortfolioStore } from '../store';

export enum Page {
  activity = 'activity',
  overview = 'overview',
  browsePools = 'browsePools',
}

type NavigationProps = {
  children: (activePage: Page) => ReactNode;
};

const isValueAValidSubPage = (value: string): value is Page => Object.values<string>(Page).includes(value);

export const Navigation = ({ children }: NavigationProps) => {
  const { analytics } = useOutsideHandles();
  const { activePage, portfolioMutators } = useDelegationPortfolioStore((store) => ({
    activePage: (() => {
      const flowToPage: Record<DelegationFlow, Page> = {
        [DelegationFlow.Activity]: Page.activity,
        [DelegationFlow.Overview]: Page.overview,
        [DelegationFlow.CurrentPoolDetails]: Page.overview,
        [DelegationFlow.PortfolioManagement]: Page.overview,
        [DelegationFlow.ChangingPreferences]: Page.browsePools,
        [DelegationFlow.BrowsePools]: Page.browsePools,
        [DelegationFlow.NewPortfolio]: Page.browsePools,
        [DelegationFlow.PoolDetails]: Page.browsePools,
      };
      return flowToPage[store.activeDelegationFlow];
    })(),
    portfolioMutators: store.mutators,
  }));
  const { t } = useTranslation();
  const onValueChange = (value: string) => {
    if (!isValueAValidSubPage(value)) return;
    const pageToEventParams = {
      [Page.activity]: ['GoToActivity', PostHogAction.StakingActivityClick] as const,
      [Page.overview]: ['GoToOverview', PostHogAction.StakingOverviewClick] as const,
      [Page.browsePools]: ['GoToBrowsePools', PostHogAction.StakingBrowsePoolsClick] as const,
    };
    const [command, posthogEvent] = pageToEventParams[value];
    analytics.sendEventToPostHog(posthogEvent);
    portfolioMutators.executeCommand({
      type: command,
    });
  };

  return (
    <>
      <SubNavigation.Root
        aria-label={t('root.nav.title')}
        value={activePage}
        onValueChange={onValueChange}
        tabIndex={-1}
        style={{ display: 'flex', gap: '20px' }}
      >
        <SubNavigation.Item
          name={t('root.nav.overviewTitle')}
          value={Page.overview}
          data-testid="overview-tab"
          tabIndex={0}
          highlightWidth="half"
        />
        <SubNavigation.Item
          name={t('root.nav.browsePoolsTitle')}
          value={Page.browsePools}
          data-testid="browse-tab"
          tabIndex={0}
          highlightWidth="half"
        />
        {USE_MULTI_DELEGATION_STAKING_ACTIVITY ? (
          <SubNavigation.Item
            name={t('root.nav.activityTitle')}
            value={Page.activity}
            data-testid="activity-tab"
            tabIndex={0}
            highlightWidth="half"
          />
        ) : (
          <></>
        )}
      </SubNavigation.Root>
      {children(activePage)}
    </>
  );
};
