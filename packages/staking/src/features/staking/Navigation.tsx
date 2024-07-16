import { SubNavigation } from '@input-output-hk/lace-ui-toolkit';
import { PostHogAction } from '@lace/common';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { USE_MULTI_DELEGATION_STAKING_ACTIVITY } from '../../featureFlags';
import { useOutsideHandles } from '../outside-handles-provider';
import { useDelegationPortfolioStore } from '../store';
import { activePageSelector } from '../store/delegationPortfolioStore/selectors';
import { StakingPage } from './types';

type NavigationProps = {
  children: (activePage: StakingPage) => ReactNode;
};

const isValueAValidSubPage = (value: string): value is StakingPage =>
  Object.values<string>(StakingPage).includes(value);

export const Navigation = ({ children }: NavigationProps) => {
  const { analytics } = useOutsideHandles();
  const { activePage, portfolioMutators } = useDelegationPortfolioStore((store) => ({
    activePage: activePageSelector(store),
    portfolioMutators: store.mutators,
  }));
  const { t } = useTranslation();
  const onValueChange = (value: string) => {
    if (!isValueAValidSubPage(value)) return;
    const pageToEventParams = {
      [StakingPage.activity]: ['GoToActivity', PostHogAction.StakingActivityClick] as const,
      [StakingPage.overview]: ['GoToOverview', PostHogAction.StakingOverviewClick] as const,
      [StakingPage.browsePools]: ['GoToBrowsePools', PostHogAction.StakingBrowsePoolsClick] as const,
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
          value={StakingPage.overview}
          data-testid="overview-tab"
          tabIndex={0}
          highlightWidth="half"
        />
        <SubNavigation.Item
          name={t('root.nav.browsePoolsTitle')}
          value={StakingPage.browsePools}
          data-testid="browse-tab"
          tabIndex={0}
          highlightWidth="half"
        />
        {USE_MULTI_DELEGATION_STAKING_ACTIVITY ? (
          <SubNavigation.Item
            name={t('root.nav.activityTitle')}
            value={StakingPage.activity}
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
