/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable no-magic-numbers */
import * as React from 'react';
import { render, fireEvent, within, queryByAttribute, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Ellipsis } from '../Ellipsis';
import { addEllipsis } from '../../../lib';

const ELLIPSIS_CONTAINER = 'ellipsis-container';
const ELLIPSIS_TEXT = 'ellipsis-text';

describe('Testing Ellipsis component', () => {
  const testString = 'this_is_a_long_string';

  test('should render the shortened text with the default values and the tooltip hidden', async () => {
    const { findByTestId } = render(<Ellipsis tooltipId="tooltip-id" text={testString} />);
    const div = await findByTestId(ELLIPSIS_CONTAINER);
    const text = await within(div).findByTestId(ELLIPSIS_TEXT);
    const tooltip = queryByAttribute('id', document.body, 'tooltip-id');

    expect(text).toBeVisible();
    expect(text).toHaveTextContent(addEllipsis(testString, 5, 5));
    expect(tooltip).not.toBeInTheDocument();
  });

  test('should render the tooltip with the full text on hover', async () => {
    const { findByTestId } = render(<Ellipsis tooltipId="tooltip-id" text={testString} />);
    const div = await findByTestId(ELLIPSIS_CONTAINER);
    const text = await within(div).findByTestId(ELLIPSIS_TEXT);

    fireEvent.mouseEnter(text);
    expect(text).toBeVisible();

    const tooltip = queryByAttribute('id', document.body, 'tooltip-id');

    waitFor(() => {
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toBeVisible();
      expect(tooltip).toHaveTextContent(testString);
    });
  });

  test('should not render the tooltip when withTooltip prop is false', async () => {
    const { findByTestId, container } = render(
      <Ellipsis tooltipId="tooltip-id" text={testString} withTooltip={false} />
    );
    const div = await findByTestId(ELLIPSIS_CONTAINER);
    const text = await within(div).findByTestId(ELLIPSIS_TEXT);

    fireEvent.mouseEnter(div);
    expect(text).toBeVisible();
    expect(queryByAttribute('id', container, 'tooltip-id')).not.toBeInTheDocument();
  });

  test('should be able to change the amount of characters before and after the ellipsis', async () => {
    const { findByTestId } = render(
      <Ellipsis tooltipId="tooltip-id" text={testString} beforeEllipsis={7} afterEllipsis={9} />
    );
    const div = await findByTestId(ELLIPSIS_CONTAINER);
    const text = await within(div).findByTestId(ELLIPSIS_TEXT);

    expect(text).toBeVisible();
    expect(text).toHaveTextContent(addEllipsis(testString, 7, 9));
  });

  test('should be leave text as is if it fits the container', async () => {
    const elWidth = 100;
    // const originalOffsetWidth = window.HTMLElement.prototype.offsetWidth;
    Object.defineProperties(window.HTMLElement.prototype, {
      offsetWidth: {
        get: () => elWidth
      }
    });

    const string = 'string_to_test_long_string_to_test';
    const { findByTestId } = render(<Ellipsis tooltipId="tooltip-id" text={string} ellipsisInTheMiddle />);
    const div = await findByTestId(ELLIPSIS_CONTAINER);
    const text = await within(div).findByTestId(ELLIPSIS_TEXT);

    expect(text).toBeVisible();
    expect(text).toHaveTextContent(string);
  });

  test('should add ellipsis in the middle', async () => {
    const elWidth = 20;
    Object.defineProperties(window.HTMLElement.prototype, {
      offsetWidth: {
        get: () => elWidth
      }
    });

    const string = 'string_to_test_long_string_to_test';
    const { findByTestId } = render(<Ellipsis tooltipId="tooltip-id" text={string} ellipsisInTheMiddle />);
    const div = await findByTestId(ELLIPSIS_CONTAINER);
    const text = await within(div).findByTestId(ELLIPSIS_TEXT);

    waitFor(() => {
      expect(text).toBeVisible();
      expect(text).toHaveTextContent('strin...o_test');
    });
  });
});
