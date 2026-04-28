import { waitFor, within } from '@testing-library/dom';
import userEvent, {
  PointerEventsCheckLevel,
} from '@testing-library/user-event';

import type { BoundFunctions, queries } from '@testing-library/dom';

// some elements seem to be initially loaded with 'pointer-events: none',
// which results in flaky test
const NO_POINTER_EVENTS_CHECK = {
  pointerEventsCheck: PointerEventsCheckLevel.Never,
};

type Canvas = BoundFunctions<typeof queries>;

const waitForNotDisabled = async (element: Element, timeout: number) =>
  waitFor(
    () => {
      const disabledAttribute = element.getAttribute('disabled');
      // React Native's TouchableOpacity and Pressable don't expose a real disabled attribute when
      // disabled={true}
      // Instead they mark the element with accessibility props such as aria-disabled
      // See https://callstack.github.io/react-native-testing-library/docs/api/jest-matchers#tobeenabled
      const ariaDisabledAttribute = element.getAttribute('aria-disabled');
      const isDisabled =
        (disabledAttribute !== null && disabledAttribute !== 'false') ||
        ariaDisabledAttribute === 'true';

      return !isDisabled;
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
 * Types text into an input field with optional configuration.
 * @param params - Configuration object
 * @param params.canvas - The testing canvas context
 * @param params.testId - The test ID of the input element
 * @param params.text - The text to type
 * @param params.clear - If true, clears the input field before typing
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
  const inputElement = await params.canvas.findByTestId(
    params.testId,
    {},
    options,
  );
  if (params.clear) {
    await userEvent.clear(inputElement);
  }
  await userEvent.type(inputElement, params.text, NO_POINTER_EVENTS_CHECK);
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
