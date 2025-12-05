/* eslint-disable @typescript-eslint/no-empty-function */
import * as React from 'react';
import { render, within, queryByText, fireEvent } from '@testing-library/react';
import { ContentLayout } from '../ContentLayout';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { ReactElement } from 'react';

jest.mock('react-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...jest.requireActual<any>('react-router'),
  useLocation: jest.fn().mockReturnValue({ pathname: '/wallet/delegate' })
}));

const testTitle = 'content title';

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('Testing ContentLayout component', () => {
  window.ResizeObserver = ResizeObserver;
  beforeEach(() => {
    jest.resetAllMocks();
  });

  const WrappedContentLayout = ({ children }: { children: ReactElement }) => (
    <MemoryRouter initialEntries={['/']}>{children}</MemoryRouter>
  );

  const mockBackAction = jest.fn();

  test('should render content layout', async () => {
    const { findByTestId } = render(
      <WrappedContentLayout>
        <ContentLayout>
          <div>content</div>
        </ContentLayout>
      </WrappedContentLayout>
    );

    await findByTestId('content-layout');
  });

  test('should render title', async () => {
    const { findByTestId } = render(
      <WrappedContentLayout>
        <ContentLayout title={testTitle}>
          <div>content</div>
        </ContentLayout>
      </WrappedContentLayout>
    );

    const content = await findByTestId('content-layout');
    const title = await within(content).findByTestId('section-title');

    expect(title).toHaveTextContent(testTitle);
  });

  test('should render title and back button', async () => {
    const { findByTestId } = render(
      <WrappedContentLayout>
        <ContentLayout title={testTitle} withIcon>
          <div>content</div>
        </ContentLayout>
      </WrappedContentLayout>
    );

    const content = await findByTestId('content-layout');
    const icon = await within(content).findByTestId('section-title-btn-icon');

    expect(icon).toBeInTheDocument();
  });

  test('should not render content', async () => {
    const { findByTestId } = render(
      <WrappedContentLayout>
        <ContentLayout isLoading>
          <div>content</div>
        </ContentLayout>
      </WrappedContentLayout>
    );

    const content = await findByTestId('content-layout');

    expect(queryByText(content, 'content')).not.toBeInTheDocument();
  });

  test('should fire action on icon click', async () => {
    const { findByTestId } = render(
      <WrappedContentLayout>
        <ContentLayout title={testTitle} withIcon handleIconClick={mockBackAction}>
          <div>content</div>
        </ContentLayout>
      </WrappedContentLayout>
    );

    const content = await findByTestId('content-layout');
    const btn = await within(content).findByTestId('section-title-btn-icon');
    fireEvent.click(btn);

    expect(mockBackAction).toHaveBeenCalled();
  });
});
