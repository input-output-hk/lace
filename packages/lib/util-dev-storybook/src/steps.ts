// user-event MUST come from `storybook/test`, which bundles its own copy. A
// direct '@testing-library/user-event' import puts a SECOND instance on the
// shared page: both install a `value` interceptor and prepare the document, and
// the chained interceptor updates React's _valueTracker on write, so
// updateValueIfChanged() sees no change and React silently drops every keystroke
// in the next story that types.
import { fireEvent, userEvent, waitFor, within } from 'storybook/test';

import type { BoundFunctions, queries } from '@testing-library/dom';

/**
 * `PointerEventsCheckLevel.Never`, inlined: `storybook/test` does not re-export
 * the enum, and importing it from user-event would reintroduce the second
 * instance the import above exists to avoid.
 */
const POINTER_EVENTS_CHECK_NEVER = 0;

// some elements seem to be initially loaded with 'pointer-events: none',
// which results in flaky test
const NO_POINTER_EVENTS_CHECK = {
  pointerEventsCheck: POINTER_EVENTS_CHECK_NEVER,
};

type Canvas = BoundFunctions<typeof queries>;

const waitForNotDisabled = async (element: Element, timeout: number) =>
  waitFor(
    () => {
      // `IconButton.Static` hangs `testID` on a childless inner <View>; the
      // Pressable holding the state is its parent, and RN-web marks a non-form
      // element with `aria-disabled` only, so the queried node always reads enabled.
      //
      // First match wins, so a nearer `aria-disabled="false"` would shadow a
      // disabled ancestor. Safe only while RN-web writes the attribute for
      // `disabled === true` alone; a raw `aria-disabled={false}` reopens it.
      const target =
        element.closest('[aria-disabled],[role="button"],button') ?? element;

      const disabledAttribute = target.getAttribute('disabled');
      // React Native's TouchableOpacity and Pressable don't expose a real disabled attribute when
      // disabled={true}
      // Instead they mark the element with accessibility props such as aria-disabled
      // See https://callstack.github.io/react-native-testing-library/docs/api/jest-matchers#tobeenabled
      const ariaDisabledAttribute = target.getAttribute('aria-disabled');
      const isDisabled =
        (disabledAttribute !== null && disabledAttribute !== 'false') ||
        ariaDisabledAttribute === 'true';

      // Throw, don't return false: waitFor resolves as soon as the callback
      // does not throw, so returning a boolean made this resolve on the first
      // tick and never wait. click() then pressed a still-disabled control,
      // which RN-web ignores — a silent no-op that stranded the flow later.
      if (isDisabled) throw new Error('element is disabled');
    },
    {
      timeout,
      onTimeout: () =>
        new Error(
          `Timeout: element '${
            element.getAttribute('data-testid') || element.tagName
          }' is disabled`,
        ),
    },
  );

const getClickableElement = async (
  canvasOrElement: Canvas | Element,
  testIdOrElement?: Element | string,
  timeout: number = 500,
): Promise<HTMLElement> => {
  // If testIdOrElement is already an Element, return it
  if (testIdOrElement instanceof Element) {
    await waitForNotDisabled(testIdOrElement, timeout);
    return testIdOrElement as HTMLElement;
  }

  // If we have a Canvas and a test ID string
  if (
    'findByTestId' in canvasOrElement &&
    typeof testIdOrElement === 'string'
  ) {
    // Pass timeout only if provided, otherwise use Storybook's default
    const options = timeout !== undefined ? { timeout } : {};
    const element = await canvasOrElement.findByTestId(
      testIdOrElement,
      {},
      options,
    );
    await waitForNotDisabled(element, timeout);
    return element;
  }

  // Handle other cases as needed
  throw new Error('Invalid parameters provided to getClickableElement');
};

export const click = async (
  canvasOrElement: Canvas | Element,
  testIdOrElement?: Element | string,
  timeout?: number,
) => {
  const element = await getClickableElement(
    canvasOrElement,
    testIdOrElement,
    timeout,
  );
  await userEvent.click(element, NO_POINTER_EVENTS_CHECK);
};

/**
 * Resolves a node only once its identity has survived two consecutive polls.
 *
 * A screen that is still settling replaces the node between the query and
 * `userEvent.type`'s own click: the keystrokes then land on a detached element,
 * focus falls back to <body>, and the field is left EMPTY rather than partly
 * typed — measured at 4 failures in 20 runs on the governance search. Settling
 * the identity first is what lets a caller type once instead of retyping until
 * the text happens to stick.
 */
const findSettledElement = async (
  canvas: Canvas,
  testId: string,
  options: { timeout?: number },
): Promise<HTMLElement> => {
  let previous: HTMLElement | undefined;

  return waitFor(() => {
    const current = canvas.getByTestId<HTMLElement>(testId);
    // A dismissing sheet stays mounted carrying the same testIDs and values as
    // the replacement that follows it, and React discards it mid-typing. The
    // identity check below cannot separate the two; the drawer's state can.
    if (current.closest('[data-vaul-drawer][data-state="closed"]')) {
      throw new Error(`element '${testId}' is inside a dismissing sheet`);
    }
    if (current !== previous || !current.isConnected) {
      previous = current;
      throw new Error(`element '${testId}' has not settled`);
    }
    return current;
  }, options);
};

/**
 * Types text into an input field with optional configuration.
 * @param params - Configuration object
 * @param params.canvas - The testing canvas context
 * @param params.testId - The test ID of the input element
 * @param params.text - The text to type; pass '' or '{none}' together with
 * `clear` to empty the field without typing a replacement
 * @param params.clear - If true, replaces the field's existing text by typing
 * over a select-all selection; only supported on input/textarea elements
 */
export const inputText = async (params: {
  canvas: Canvas;
  testId: string;
  text: string;
  clear?: boolean;
  timeout?: number;
}) => {
  const options =
    params.timeout !== undefined ? { timeout: params.timeout } : {};
  const inputElement = await findSettledElement(
    params.canvas,
    params.testId,
    options,
  );
  if (params.clear) {
    // Don't use userEvent.clear(): its single deleteContentBackward event gets
    // swallowed on controlled RN-web inputs under load, so typing then appends
    // to the stale value. Type over a select-all selection instead, so every
    // character round-trips React state. '{none}'/empty clears via Backspace.
    if (typeof (inputElement as HTMLInputElement).value !== 'string') {
      // Without a value, the selection below collapses to offset 0 and the
      // text would be silently PREPENDED to the existing content.
      throw new TypeError(
        `inputText: clear is only supported on input/textarea elements, ` +
          `got <${inputElement.tagName.toLowerCase()}> for testId "${
            params.testId
          }"`,
      );
    }
    const isClearOnly = params.text === '' || params.text === '{none}';
    await userEvent.type(
      inputElement,
      isClearOnly ? '{Backspace}' : params.text,
      {
        ...NO_POINTER_EVENTS_CHECK,
        initialSelectionStart: 0,
        // Native setSelectionRange clamps the end to the current value
        // length, so this selects all even if the value changed between the
        // findByTestId above and type()'s internal click.
        initialSelectionEnd: Number.MAX_SAFE_INTEGER,
      },
    );
    return;
  }
  await userEvent.type(inputElement, params.text, NO_POINTER_EVENTS_CHECK);
};

/**
 * Presses the return key on an input.
 * @param canvas - The testing canvas the input lives in
 * @param testId - Test ID of the inner input element (`${testID}-value` for
 * `CustomTextInput`)
 *
 * Uses `keyDown` rather than `userEvent.keyboard`: react-native-web reads the
 * submit off its own `onKeyDown`, and `keyDown` skips the pointer-events and
 * visibility preconditions that make `userEvent` flaky on sheet bodies.
 */
export const pressEnter = async (
  canvas: Canvas,
  testId: string,
  timeout = 5000,
) => {
  const element = await canvas.findByTestId(testId, {}, { timeout });
  await fireEvent.keyDown(element, { key: 'Enter', code: 'Enter' });
  // react-native-web blurs a single-line TextInput on Enter via
  // setTimeout(blur, 0). Yield one macrotask so it lands here — equal-delay
  // timers run in scheduling order — not mid-typing in the caller's next step.
  await new Promise(resolve => {
    setTimeout(resolve, 0);
  });
};

export const goThroughAuthenticationPromptMobile = async (
  canvasElement: HTMLElement,
  password: string,
) => {
  const modalCanvas = within(canvasElement.parentElement!);
  await inputText({
    canvas: modalCanvas,
    testId: 'authentication-prompt-input-value',
    text: password,
    timeout: 10000,
  });
  await click(modalCanvas, 'authentication-prompt-button-confirm');
};

export const handleAuthenticationPromptMobile = async (
  canvasElement: HTMLElement,
  password: string,
) => {
  // Complete any existing authentication modal that was triggered on page load
  // This ensures the auth state returns to 'Idle' and doesn't interfere with the test
  const currentModalCanvas = within(canvasElement.parentElement!);
  const existingPasswordInput = currentModalCanvas.queryByTestId(
    'authentication-prompt-input-value',
  );
  if (existingPasswordInput) {
    await goThroughAuthenticationPromptMobile(canvasElement, password);
    // Wait for the auth prompt to complete and state to return to Idle
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
};

export const goThroughAuthenticationPrompt = async ({
  canvasElement,
  password,
  inputElementTestId = 'authentication-prompt-input',
  confirmButtonTestId = 'authentication-prompt-button-confirm',
}: {
  canvasElement: HTMLElement;
  password: string;
  inputElementTestId?: string;
  confirmButtonTestId?: string;
  timeout?: number;
}) => {
  const modalCanvas = within(canvasElement.parentElement!);
  await inputText({
    canvas: modalCanvas,
    testId: inputElementTestId,
    text: password,
    timeout: 10000,
  });
  await click(modalCanvas, confirmButtonTestId);
};
