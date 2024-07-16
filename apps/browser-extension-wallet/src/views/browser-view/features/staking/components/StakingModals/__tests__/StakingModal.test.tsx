/* eslint-disable sonarjs/no-duplicate-string */
import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { StakingModal, StakingModalProps } from '../StakingModal';
import '@testing-library/jest-dom';

import { I18nextProvider } from 'react-i18next';
import { i18n } from '../../../../../../../lib/i18n';

jest.mock('react-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('react-router'),
  useLocation: jest.fn().mockReturnValue({ pathname: '/wallet/delegate' })
}));

const title = 'title';
const description = 'description';
const action = {
  body: 'actionBody',
  dataTestId: 'actioinDataTestId',
  onClick: jest.fn()
};

describe('Testing StakingModal component', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const props: StakingModalProps = {
    visible: true,
    title,
    description,
    actions: [action]
  };

  test('should not render modal', async () => {
    const { queryByTestId } = render(
      <I18nextProvider i18n={i18n}>
        <StakingModal {...props} visible={false} />
      </I18nextProvider>
    );

    expect(queryByTestId('stake-modal-title')).not.toBeInTheDocument();
  });

  test('should render modal and fire events', async () => {
    const { findByText, findByTestId } = render(
      <I18nextProvider i18n={i18n}>
        <StakingModal {...props} />
      </I18nextProvider>
    );

    expect(await findByText(title)).toBeVisible();
    expect(await findByText(description)).toBeVisible();
    expect(await findByText(action.body)).toBeVisible();

    fireEvent.click(await findByTestId(action.dataTestId));
    expect(action.onClick).toHaveBeenCalled();
  });
});
