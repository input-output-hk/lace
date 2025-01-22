import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render } from '@testing-library/react';
import { CollapsablePanel } from '../CollapsablePanel';

describe('CollapsablePanel', () => {
  test('starts collapsed and displays a title', () => {
    const { queryByTestId, queryByText } = render(
      <CollapsablePanel title="Collapsable Title">
        <div data-testid="test-content" />
      </CollapsablePanel>
    );
    expect(queryByText('Collapsable Title')).toBeInTheDocument;
    expect(queryByTestId('test-content')).not.toBeInTheDocument();
  });

  test('expands and displays content on click', () => {
    const { queryByTestId, queryByRole } = render(
      <CollapsablePanel title="Collapsable Title">
        <div data-testid="test-content" />
      </CollapsablePanel>
    );
    const clickable = queryByRole('button');
    act(() => {
      clickable && fireEvent.click(clickable);
    });
    expect(queryByTestId('test-content')).toBeInTheDocument();
  });
});
