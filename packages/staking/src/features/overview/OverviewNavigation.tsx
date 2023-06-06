import { SubNavigation } from '@lace/ui';

type OverviewNavigationProps = Omit<SubNavigation.SubNavigationRootProps, 'children'>;

export const OverviewNavigation = ({ onValueChange, defaultValue = 'overview' }: OverviewNavigationProps) => (
  <SubNavigation.Root
    aria-label="Staking Overview Navigation"
    defaultValue={defaultValue}
    onValueChange={onValueChange}
  >
    <SubNavigation.Item name="Overview" value="overview" />
    <SubNavigation.Item name="Browse pools" value="browse" />
  </SubNavigation.Root>
);
