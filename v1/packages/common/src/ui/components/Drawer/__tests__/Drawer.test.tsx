/* eslint-disable @typescript-eslint/no-empty-function */
import * as React from 'react';
import { render, queryByText, queryByTestId } from '@testing-library/react';
import { Drawer } from '../Drawer';

import '@testing-library/jest-dom';

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('Testing Drawer component', () => {
  window.ResizeObserver = ResizeObserver;
  test('should render drawer with content', async () => {
    const { findByTestId } = render(
      <div data-testid="container">
        <Drawer open>
          <>
            container
            <div>content</div>
          </>
        </Drawer>
      </div>
    );

    const drawerContent = await findByTestId('drawer-content');
    expect(drawerContent).toBeInTheDocument();
    expect(queryByText(drawerContent, 'content')).toBeInTheDocument();
  });

  test('should have hiden drawer', async () => {
    const { findByTestId } = render(
      <div data-testid="container">
        <Drawer open={false}>
          <>
            container
            <div>content</div>
          </>
        </Drawer>
      </div>
    );

    const container = await findByTestId('container');
    expect(queryByTestId(container, 'custom-drawer')).not.toBeInTheDocument();
  });
});
