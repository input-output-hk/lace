import * as React from 'react';
import { render, fireEvent, queryByAttribute } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CustomTooltip } from '../CustomTooltip';

describe('Testing CustomTooltip component', () => {
  const tooltipText = 'tooltip text';
  test('should display a tooltip when hovering over the children', async () => {
    const { findByText } = render(
      <CustomTooltip text={tooltipText} id="test">
        <div>children</div>
      </CustomTooltip>
    );
    const children = await findByText('children');
    const tooltip = queryByAttribute('id', document.body, 'test');

    fireEvent.mouseEnter(children);
    expect(children).toBeVisible();
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toBeVisible();
    expect(tooltip).toHaveTextContent(tooltipText);
  });
  test('should not display the tooltip if not hovering over the children', async () => {
    const { findByText } = render(
      <CustomTooltip text={tooltipText} id="test">
        <div>children</div>
      </CustomTooltip>
    );
    const children = await findByText('children');
    const tooltip = queryByAttribute('id', document.body, 'test');

    expect(children).toBeVisible();
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).not.toBeVisible();
  });
  test('should not display the tooltip if it is disabled', async () => {
    const { findByText } = render(
      <CustomTooltip text={tooltipText} id="test" disable>
        <div>children</div>
      </CustomTooltip>
    );
    const children = await findByText('children');
    const tooltip = queryByAttribute('id', document.body, 'test');

    fireEvent.mouseEnter(children);
    expect(children).toBeVisible();
    expect(tooltip).toBeInTheDocument();
    fireEvent.mouseLeave(children);
    expect(tooltip).not.toBeVisible();
  });
});
