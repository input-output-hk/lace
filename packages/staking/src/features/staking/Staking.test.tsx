import { render } from '@testing-library/react';
import { Staking } from './Staking';

describe('test prop', () => {
  it('renders properly', () => {
    const { container } = render(<Staking theme={'light'} />);

    expect(container.textContent).toMatchInlineSnapshot('"StakingOverviewBrowse pools"');
  });
});
