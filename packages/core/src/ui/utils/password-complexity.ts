import { isNotNil } from '@cardano-sdk/util';
import zxcvbn from 'zxcvbn';

// map each possible suggestion phrase with a key that must be used for translation
export const translationKeysMap = new Map([
  ['Add another word or two. Uncommon words are better.', 'feedback.1'],
  ['Use a few words, avoid common phrases', 'feedback.2'],
  ['No need for symbols, digits, or uppercase letters', 'feedback.3'],
  ['Use a longer keyboard pattern with more turns', 'feedback.4'],
  ['Avoid repeated words and characters', 'feedback.5'],
  ['Avoid sequences', 'feedback.6'],
  ['Avoid recent years', 'feedback.7'],
  ['Avoid years that are associated with you', 'feedback.8'],
  ['Avoid dates and years that are associated with you', 'feedback.9'],
  ["Capitalization doesn't help very much", 'feedback.10'],
  ['All-uppercase is almost as easy to guess as all-lowercase', 'feedback.11'],
  ["Reversed words aren't much harder to guess", 'feedback.12'],
  ["Predictable substitutions like '@' instead of 'a' don't help very much", 'feedback.13']
]);

const defaultKey = 'Add another word or two. Uncommon words are better.';

const SCORE_GOOD = 3;
const SCORE_EXCELLENT = 4;

/**
 * receive a password and returns a the complexity score and an array of suggestion keys to be use for translation
 */
export const passwordComplexity = (password?: string): { feedbackKeys: string[]; score: number } => {
  if (!password) return { feedbackKeys: [], score: 0 };

  const { feedback, score } = zxcvbn(password);
  const translationFeedbackKeyList = feedback.suggestions
    .map((text) => translationKeysMap.get(text) || translationKeysMap.get(defaultKey))
    // eslint-disable-next-line unicorn/no-array-callback-reference
    .filter(isNotNil);

  /*
    In case user provides strong password (score 3 or 4) we would like to display
    additional, dedicated feedback, which zxcvbn package does not support.
    Read more: https://input-output.atlassian.net/browse/LW-3211
  */
  if (score === SCORE_GOOD && translationFeedbackKeyList.length === 0) {
    translationFeedbackKeyList.push('feedback.14');
  }

  if (score === SCORE_EXCELLENT && translationFeedbackKeyList.length === 0) {
    translationFeedbackKeyList.push('feedback.15');
  }

  return { feedbackKeys: translationFeedbackKeyList, score };
};
