import { SubNavigation } from '@lace/ui';
import { ReactNode, useState } from 'react';

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
  const [activePage, setActivePage] = useState(startPage);
  const onValueChange = (value: string) => {
    if (isValueAValidSubPage(value)) setActivePage(value);
  };

  return (
    <>
      <SubNavigation.Root aria-label="Staking Navigation" defaultValue={startPage} onValueChange={onValueChange}>
        <SubNavigation.Item name="Overview" value={Page.overview} />
        <SubNavigation.Item name="Browse pools" value={Page.browsePools} />
      </SubNavigation.Root>
      {children(activePage)}
    </>
  );
};
