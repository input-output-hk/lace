import { useBrowsePoolsPersistence } from 'features/BrowsePools';
import { initI18n } from 'features/i18n';
import { useOutsideHandles } from 'features/outside-handles-provider';
import '../reset.css';
import { useSyncDelegationPortfolioStore } from 'features/store/delegationPortfolioStore/useSyncDelegationPortfolioStore';
import { SetupBase, SetupBaseProps } from './SetupBase';

initI18n();

type SetupProps = Omit<SetupBaseProps, 'loading'> & {
  view: 'popup' | 'expanded';
};

export const Setup = ({ children, view, ...rest }: SetupProps) => {
  const { balancesBalance } = useOutsideHandles();
  useSyncDelegationPortfolioStore();
  useBrowsePoolsPersistence(view);

  return (
    <SetupBase {...rest} loading={!balancesBalance?.total?.coinBalance}>
      {children}
    </SetupBase>
  );
};
