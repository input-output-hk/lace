import { PortfolioBar } from './PortfolioBar';
import { StakePoolsTable } from './stake-pools-table';

const LACE_APP_ID = 'lace-app';

export const BrowsePools = () => (
  <>
    <PortfolioBar />
    <StakePoolsTable scrollableTargetId={LACE_APP_ID} />
  </>
);
