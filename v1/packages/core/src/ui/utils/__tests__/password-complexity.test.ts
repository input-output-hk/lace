/* eslint-disable no-magic-numbers */
import { passwordComplexity } from '../password-complexity';

describe('Testing passwordComplexity function', () => {
  test('should return suggestion key feedback.1 and score 0 ', async () => {
    const { score, feedbackKeys } = passwordComplexity('zxcvbn');

    expect(score).toBe(0);
    expect(feedbackKeys).toContain('feedback.1');
  });

  test('should return suggestion key feedback.4 and score 2 ', async () => {
    const { score, feedbackKeys } = passwordComplexity('!"£$%^&*()');

    expect(score).toBe(2);
    expect(feedbackKeys).toContain('feedback.4');
  });

  test('should return suggestion key feedback.5 and score 1 ', async () => {
    const { score, feedbackKeys } = passwordComplexity('D0g..................');

    expect(score).toBe(1);
    expect(feedbackKeys).toContain('feedback.5');
  });

  test('should return suggestion key feedback.6 and score 0 ', async () => {
    const { score, feedbackKeys } = passwordComplexity('123');

    expect(score).toBe(0);
    expect(feedbackKeys).toContain('feedback.6');
  });

  test('should return suggestion key feedback.7 and score 0 ', async () => {
    const { score, feedbackKeys } = passwordComplexity('2018');

    expect(score).toBe(0);
    expect(feedbackKeys).toContain('feedback.7');
  });

  test('should return suggestion key feedback.8 and score 0 ', async () => {
    const { score, feedbackKeys } = passwordComplexity('2018');

    expect(score).toBe(0);
    expect(feedbackKeys).toContain('feedback.8');
  });

  test('should return suggestion key feedback.9 and score 2 ', async () => {
    const { score, feedbackKeys } = passwordComplexity('zhang198822');

    expect(score).toBe(2);
    expect(feedbackKeys).toContain('feedback.9');
  });

  test('should return suggestion key feedback.10 and score 2 ', async () => {
    const { score, feedbackKeys } = passwordComplexity('Tr0ub4dour&3');

    expect(score).toBe(2);
    expect(feedbackKeys).toContain('feedback.10');
  });

  test('should return suggestion key feedback.11 and score 2 ', async () => {
    const { score, feedbackKeys } = passwordComplexity('ROSEBUD');

    expect(score).toBe(0);
    expect(feedbackKeys).toContain('feedback.11');
  });

  test('should return suggestion key feedback.12 and score 0 ', async () => {
    const { score, feedbackKeys } = passwordComplexity('drowssap');

    expect(score).toBe(0);
    expect(feedbackKeys).toContain('feedback.12');
  });

  test('should return suggestion key feedback.13 and score 2 ', async () => {
    const { score, feedbackKeys } = passwordComplexity('Tr0ub4dour&3');

    expect(score).toBe(2);
    expect(feedbackKeys).toContain('feedback.13');
  });

  test('should return suggestion key feedback.14 and score 3 ', async () => {
    const { score, feedbackKeys } = passwordComplexity('LoremIPSUM');

    expect(score).toBe(3);
    expect(feedbackKeys).toContain('feedback.14');
  });

  test('should return suggestion key feedback.15 and score 4 ', async () => {
    const { score, feedbackKeys } = passwordComplexity('LoremIPSUM#');

    expect(score).toBe(4);
    expect(feedbackKeys).toContain('feedback.15');
  });
});
