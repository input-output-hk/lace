import * as React from 'react';
import { render } from '@testing-library/react';
import { StakingConfirmationInfo, StakingConfirmationInfoProps } from '../StakingConfirmationInfo';
import '@testing-library/jest-dom';

describe('Testing StakingConfirmation component', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const props: StakingConfirmationInfoProps = {
    poolId: 'pool1frevxe70aqw2ce58c0muyesnahl88nfjjsp25h85jwakzgd2g2l',
    transactionFee: '0.16 ₳',
    translations: {
      delegateTo: 'Delegate to',
      poolId: 'Pool ID',
      deposit: 'Deposit',
      transactionFee: 'Transaction fee'
    }
  };

  test('should display the stake id, deposit and transaction fee', async () => {
    const { findByTestId } = render(<StakingConfirmationInfo {...props} deposit="10 ₳" />);

    const title = await findByTestId('staking-confirmation-title');
    const poolidContainer = await findByTestId('pool-id');
    const depositContainer = await findByTestId('deposit');
    const txFeeContainer = await findByTestId('tx-fee');

    expect(title).toHaveTextContent('Delegate to');
    expect(poolidContainer).toHaveTextContent(/pool id/i);
    expect(poolidContainer).toHaveTextContent(/pool1frevxe70aqw2ce58c0muyesnahl88nfjjsp25h85jwakzgd2g2l/i);
    expect(depositContainer).toHaveTextContent(/deposit/i);
    expect(depositContainer).toHaveTextContent(/10 ₳/i);
    expect(txFeeContainer).toHaveTextContent(/transaction fee/i);
    expect(txFeeContainer).toHaveTextContent(/0.16 ₳/i);
  });

  test('should not display deposit', async () => {
    const { queryByTestId } = render(<StakingConfirmationInfo {...props} />);

    expect(queryByTestId('deposit')).not.toBeInTheDocument();
  });
});
