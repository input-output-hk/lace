import { SubNavigation } from '@lace/ui';
import { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Page, useStakePoolDetails } from '../store';

type NavigationProps = {
  children: (activePage: Page) => ReactNode;
};

const isValueAValidSubPage = (value: string): value is Page => Object.values<string>(Page).includes(value);

export const Navigation = ({ children }: NavigationProps) => {
  const { activePage, setActivePage } = useStakePoolDetails((store) => ({
    activePage: store.activePage,
    setActivePage: store.setActivePage,
  }));
  const { t } = useTranslation();
  const onValueChange = (value: string) => {
    console.log(value);
    if (isValueAValidSubPage(value)) setActivePage(value);
  };

  return (
    <>
      <SubNavigation.Root
        aria-label={t('root.nav.title')}
        value={activePage}
        onValueChange={onValueChange}
        tabIndex={-1}
      >
        <SubNavigation.Item
          name={t('root.nav.overviewTitle')}
          value={Page.overview}
          data-testid="overview-tab"
          tabIndex={0}
        />
        <SubNavigation.Item
          name={t('root.nav.browsePoolsTitle')}
          value={Page.browsePools}
          data-testid="browse-tab"
          tabIndex={0}
        />
      </SubNavigation.Root>
      {children(activePage)}
    </>
  );
};
