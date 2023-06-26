import { SubNavigation } from '@lace/ui';
import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';

export enum Page {
  overview = 'overview',
  browsePools = 'browsePools',
}

type NavigationProps = {
  children: (activePage: Page) => ReactNode;
};

const isValueAValidSubPage = (value: string): value is Page => Object.values<string>(Page).includes(value);

export const Navigation = ({ children }: NavigationProps) => {
  const startPage = Page.overview;
  const { t } = useTranslation();
  const [activePage, setActivePage] = useState(startPage);
  const onValueChange = (value: string) => {
    if (isValueAValidSubPage(value)) setActivePage(value);
  };

  return (
    <>
      <SubNavigation.Root aria-label={t('root.nav.title')} defaultValue={startPage} onValueChange={onValueChange}>
        <SubNavigation.Item name={t('root.nav.overviewTitle')} value={Page.overview} />
        <SubNavigation.Item name={t('root.nav.browsePoolsTitle')} value={Page.browsePools} />
      </SubNavigation.Root>
      {children(activePage)}
    </>
  );
};
