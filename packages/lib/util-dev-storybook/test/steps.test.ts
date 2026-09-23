import { within } from 'storybook/test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { click, inputText } from '../src/steps';

const renderHtml = (html: string) => {
  document.body.innerHTML = html;
  return within(document.body);
};

/** Short, so the disabled/dismissing cases fail fast instead of waiting a second. */
const SHORT_TIMEOUT = 80;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('click', () => {
  it('presses an enabled control', async () => {
    const canvas = renderHtml('<button data-testid="go">Go</button>');
    const pressed = vi.fn();
    canvas.getByTestId('go').addEventListener('click', pressed);

    await click(canvas, 'go');

    expect(pressed).toHaveBeenCalledTimes(1);
  });

  it('refuses a disabled control rather than pressing it', async () => {
    const canvas = renderHtml(
      '<div data-testid="go" role="button" aria-disabled="true">Go</div>',
    );
    const pressed = vi.fn();
    canvas.getByTestId('go').addEventListener('click', pressed);

    await expect(click(canvas, 'go', SHORT_TIMEOUT)).rejects.toThrow(
      /disabled/,
    );
    expect(pressed).not.toHaveBeenCalled();
  });

  it('reads the disabled state off the owning control, not the queried node', async () => {
    const canvas = renderHtml(
      '<div role="button" aria-disabled="true"><div data-testid="inner"></div></div>',
    );
    const pressed = vi.fn();
    canvas.getByTestId('inner').addEventListener('click', pressed);

    await expect(click(canvas, 'inner', SHORT_TIMEOUT)).rejects.toThrow(
      /disabled/,
    );
    expect(pressed).not.toHaveBeenCalled();
  });

  it('presses through an inner node when the owning control is enabled', async () => {
    const canvas = renderHtml(
      '<div role="button"><div data-testid="inner"></div></div>',
    );
    const pressed = vi.fn();
    canvas.getByTestId('inner').addEventListener('click', pressed);

    await click(canvas, 'inner');

    expect(pressed).toHaveBeenCalledTimes(1);
  });
});

describe('inputText', () => {
  it('types into a settled input', async () => {
    const canvas = renderHtml('<input data-testid="field" />');

    await inputText({ canvas, testId: 'field', text: 'hello' });

    expect(canvas.getByTestId<HTMLInputElement>('field').value).toBe('hello');
  });

  it('replaces the existing value when clearing', async () => {
    const canvas = renderHtml('<input data-testid="field" value="old" />');

    await inputText({ canvas, testId: 'field', text: 'new', clear: true });

    expect(canvas.getByTestId<HTMLInputElement>('field').value).toBe('new');
  });

  it('refuses an input inside a dismissing sheet', async () => {
    const canvas = renderHtml(
      '<div data-vaul-drawer data-state="closed"><input data-testid="field" /></div>',
    );

    await expect(
      inputText({
        canvas,
        testId: 'field',
        text: 'hello',
        timeout: SHORT_TIMEOUT,
      }),
    ).rejects.toThrow(/dismissing sheet/);
    expect(canvas.getByTestId<HTMLInputElement>('field').value).toBe('');
  });

  it('accepts an input inside a presented sheet', async () => {
    const canvas = renderHtml(
      '<div data-vaul-drawer data-state="open"><input data-testid="field" /></div>',
    );

    await inputText({ canvas, testId: 'field', text: 'hello' });

    expect(canvas.getByTestId<HTMLInputElement>('field').value).toBe('hello');
  });

  it('names the element when clear targets one with no value', async () => {
    const canvas = renderHtml('<div data-testid="not-an-input"></div>');

    await expect(
      inputText({ canvas, testId: 'not-an-input', text: 'x', clear: true }),
    ).rejects.toThrow(TypeError);
    await expect(
      inputText({ canvas, testId: 'not-an-input', text: 'x', clear: true }),
    ).rejects.toThrow(/not-an-input/);
  });
});
