/* eslint-disable no-magic-numbers */
import { addEllipsis } from '../add-ellipsis';

describe('Add ellipsis', () => {
  describe('addEllipsis', () => {
    test('add ellipsis to a string in the correct place', () => {
      expect(addEllipsis('test has not passed', 8, 6)).toEqual('test has...passed');
    });
    test('replace the whole string with ellipsis if string is > 4 and both parameters are 0', () => {
      expect(addEllipsis('this should be hidden', 0, 0)).toEqual('...');
    });
    test('do not add ellipsis if the string length is <= 4 regardless of parameters', () => {
      expect(addEllipsis('test', 0, 0)).toEqual('test');
      expect(addEllipsis('test', 1, 0)).toEqual('test');
      expect(addEllipsis('test', 1, 1)).toEqual('test');
    });
    test('do not add ellipsis if the string is not longer than the calculated minimum', () => {
      // Minimum = First part length + second part length + ellipsis length(4)
      expect(addEllipsis('18 characters long', 13, 1)).toEqual('18 characters long');
      expect(addEllipsis('18 characters long', 7, 7)).toEqual('18 characters long');
      expect(addEllipsis('18 characters long', 1, 13)).toEqual('18 characters long');
    });
  });
});
