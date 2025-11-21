/* eslint-disable unicorn/no-useless-undefined */
import { compareVersions } from '../util';

describe('migrations utils', () => {
  describe('compareVersions', () => {
    describe('returns 1', () => {
      test('when v1 is greater than v2', () => {
        const compareByX = compareVersions('1.2.3', '0.2.3');
        const compareByY = compareVersions('0.3.3', '0.2.3');
        const compareByZ = compareVersions('0.2.4', '0.2.3');

        expect(compareByX).toEqual(1);
        expect(compareByY).toEqual(1);
        expect(compareByZ).toEqual(1);
      });

      test('when there is v1 but no v2', () => {
        expect(compareVersions('1.2.3', undefined)).toEqual(1);
      });
    });
    describe('returns -1', () => {
      test('when v1 is lower than v2', () => {
        const compareByX = compareVersions('0.2.3', '1.2.3');
        const compareByY = compareVersions('0.2.3', '0.3.3');
        const compareByZ = compareVersions('0.2.3', '0.2.4');

        expect(compareByX).toEqual(-1);
        expect(compareByY).toEqual(-1);
        expect(compareByZ).toEqual(-1);
      });
      test('when there is v2 but no v1', () => {
        expect(compareVersions(undefined, '1.2.3')).toEqual(-1);
      });
    });
    describe('returns 0', () => {
      test('when v1 and v2 are equal', () => {
        expect(compareVersions('1.2.3', '1.2.3')).toEqual(0);
      });

      test('when both v1 and v2 are not defined', () => {
        expect(compareVersions(undefined, undefined)).toEqual(0);
      });
    });
  });
});
