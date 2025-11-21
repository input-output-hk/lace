/* eslint-disable no-magic-numbers */
import BigNumber from 'bignumber.js';
import { UnitSymbol, UnitThreshold, getNumberUnit } from '../get-number-unit';

describe('get-number-unit', () => {
  describe('returns no unit and 0 as threshold', () => {
    test('when absolute value is exactly 0', () => {
      expect(getNumberUnit(0)).toEqual({ unit: UnitSymbol.ZERO, unitThreshold: UnitThreshold.ZERO });
      expect(getNumberUnit('0')).toEqual({ unit: UnitSymbol.ZERO, unitThreshold: UnitThreshold.ZERO });
      expect(getNumberUnit(UnitSymbol.ZERO)).toEqual({ unit: UnitSymbol.ZERO, unitThreshold: UnitThreshold.ZERO });
    });
    test('when absolute value is greater than 0 and less than 1000', () => {
      expect(getNumberUnit(500)).toEqual({ unit: UnitSymbol.ZERO, unitThreshold: UnitThreshold.ZERO });
      expect(getNumberUnit(-500)).toEqual({ unit: UnitSymbol.ZERO, unitThreshold: UnitThreshold.ZERO });
      expect(getNumberUnit('999.99')).toEqual({ unit: UnitSymbol.ZERO, unitThreshold: UnitThreshold.ZERO });
      expect(getNumberUnit('-999')).toEqual({ unit: UnitSymbol.ZERO, unitThreshold: UnitThreshold.ZERO });
    });
    test('when value is not a valid number', () => {
      expect(getNumberUnit('NaN')).toEqual({ unit: UnitSymbol.ZERO, unitThreshold: UnitThreshold.ZERO });
      expect(getNumberUnit(new BigNumber('something'))).toEqual({
        unit: UnitSymbol.ZERO,
        unitThreshold: UnitThreshold.ZERO
      });
    });
  });

  describe('returns K as unit and 1000 as threshold', () => {
    test('when absolute value is exactly 1000', () => {
      expect(getNumberUnit(1000)).toEqual({ unit: UnitSymbol.THOUSAND, unitThreshold: UnitThreshold.THOUSAND });
      expect(getNumberUnit(-1000)).toEqual({ unit: UnitSymbol.THOUSAND, unitThreshold: UnitThreshold.THOUSAND });
      expect(getNumberUnit('1000')).toEqual({ unit: UnitSymbol.THOUSAND, unitThreshold: UnitThreshold.THOUSAND });
    });
    test('when absolute value is greater than 1000 and less than 1000000', () => {
      expect(getNumberUnit(500_000)).toEqual({ unit: UnitSymbol.THOUSAND, unitThreshold: UnitThreshold.THOUSAND });
      expect(getNumberUnit(-500_000)).toEqual({ unit: UnitSymbol.THOUSAND, unitThreshold: UnitThreshold.THOUSAND });
      expect(getNumberUnit('999999.99')).toEqual({ unit: UnitSymbol.THOUSAND, unitThreshold: UnitThreshold.THOUSAND });
      expect(getNumberUnit('-999999')).toEqual({ unit: UnitSymbol.THOUSAND, unitThreshold: UnitThreshold.THOUSAND });
    });
  });

  describe('returns M as unit and 1_000_000 as threshold', () => {
    test('when absolute value is exactly 1_000_000', () => {
      expect(getNumberUnit(1_000_000)).toEqual({ unit: UnitSymbol.MILLION, unitThreshold: UnitThreshold.MILLION });
      expect(getNumberUnit(-1_000_000)).toEqual({ unit: UnitSymbol.MILLION, unitThreshold: UnitThreshold.MILLION });
      expect(getNumberUnit('1000000')).toEqual({ unit: UnitSymbol.MILLION, unitThreshold: UnitThreshold.MILLION });
    });
    test('when absolute value is greater than 1_000_000 and less than 1_000_000_000', () => {
      expect(getNumberUnit(500_000_000)).toEqual({ unit: UnitSymbol.MILLION, unitThreshold: UnitThreshold.MILLION });
      expect(getNumberUnit(-500_000_000)).toEqual({ unit: UnitSymbol.MILLION, unitThreshold: UnitThreshold.MILLION });
      expect(getNumberUnit('999999999.99')).toEqual({ unit: UnitSymbol.MILLION, unitThreshold: UnitThreshold.MILLION });
      expect(getNumberUnit('-999999999')).toEqual({ unit: UnitSymbol.MILLION, unitThreshold: UnitThreshold.MILLION });
    });
  });

  describe('returns B as unit and 1_000_000_000 as threshold', () => {
    test('when absolute value is exactly 1_000_000_000', () => {
      expect(getNumberUnit(1e9)).toEqual({ unit: UnitSymbol.BILLION, unitThreshold: UnitThreshold.BILLION });
      expect(getNumberUnit(-1e9)).toEqual({ unit: UnitSymbol.BILLION, unitThreshold: UnitThreshold.BILLION });
      expect(getNumberUnit('1000000000')).toEqual({ unit: UnitSymbol.BILLION, unitThreshold: UnitThreshold.BILLION });
    });
    test('when absolute value is greater than 1_000_000_000 and less than 1_000_000_000_000', () => {
      expect(getNumberUnit(5e11)).toEqual({ unit: UnitSymbol.BILLION, unitThreshold: UnitThreshold.BILLION });
      expect(getNumberUnit(-5e11)).toEqual({ unit: UnitSymbol.BILLION, unitThreshold: UnitThreshold.BILLION });
      expect(getNumberUnit('999999999999.99')).toEqual({
        unit: UnitSymbol.BILLION,
        unitThreshold: UnitThreshold.BILLION
      });
      expect(getNumberUnit('-999999999999')).toEqual({
        unit: UnitSymbol.BILLION,
        unitThreshold: UnitThreshold.BILLION
      });
    });
  });

  describe('returns T as unit and 1_000_000_000_000 as threshold', () => {
    test('when absolute value is exactly 1_000_000_000_000', () => {
      expect(getNumberUnit(1e12)).toEqual({ unit: UnitSymbol.TRILLION, unitThreshold: UnitThreshold.TRILLION });
      expect(getNumberUnit(-1e12)).toEqual({ unit: UnitSymbol.TRILLION, unitThreshold: UnitThreshold.TRILLION });
      expect(getNumberUnit('1000000000000')).toEqual({
        unit: UnitSymbol.TRILLION,
        unitThreshold: UnitThreshold.TRILLION
      });
    });
    test('when absolute value is greater than 1_000_000_000_000 and less than 1_000_000_000_000_000', () => {
      expect(getNumberUnit(5e14)).toEqual({ unit: UnitSymbol.TRILLION, unitThreshold: UnitThreshold.TRILLION });
      expect(getNumberUnit(-5e14)).toEqual({ unit: UnitSymbol.TRILLION, unitThreshold: UnitThreshold.TRILLION });
      expect(getNumberUnit('999999999999999.99')).toEqual({
        unit: UnitSymbol.TRILLION,
        unitThreshold: UnitThreshold.TRILLION
      });
      expect(getNumberUnit('-999999999999999')).toEqual({
        unit: UnitSymbol.TRILLION,
        unitThreshold: UnitThreshold.TRILLION
      });
    });
  });

  describe('returns Q as unit and 1_000_000_000_000_000 as threshold', () => {
    test('when absolute value is exactly 1_000_000_000_000_000', () => {
      expect(getNumberUnit(1e15)).toEqual({ unit: UnitSymbol.QUADRILLION, unitThreshold: UnitThreshold.QUADRILLION });
      expect(getNumberUnit(-1e15)).toEqual({ unit: UnitSymbol.QUADRILLION, unitThreshold: UnitThreshold.QUADRILLION });
      expect(getNumberUnit('1000000000000000')).toEqual({
        unit: UnitSymbol.QUADRILLION,
        unitThreshold: UnitThreshold.QUADRILLION
      });
    });
    test('when absolute value is greater than 1_000_000_000_000_000', () => {
      expect(getNumberUnit(5e20)).toEqual({ unit: UnitSymbol.QUADRILLION, unitThreshold: UnitThreshold.QUADRILLION });
      expect(getNumberUnit(-5e20)).toEqual({ unit: UnitSymbol.QUADRILLION, unitThreshold: UnitThreshold.QUADRILLION });
      expect(getNumberUnit('1000000000000000000.999')).toEqual({
        unit: UnitSymbol.QUADRILLION,
        unitThreshold: UnitThreshold.QUADRILLION
      });
      expect(getNumberUnit('-1000000000000000000')).toEqual({
        unit: UnitSymbol.QUADRILLION,
        unitThreshold: UnitThreshold.QUADRILLION
      });
    });
  });
});
