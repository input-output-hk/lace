import { cardanoMetadatumToObj, getChunks } from '../get-auxiliary-data';

const bigIntNumber = 1_000_000;
const metadataString = 'test metadata';
const metadataBigInt = BigInt(bigIntNumber);
const metadataMap = new Map([['msg', metadataString]]);

describe('Testing cardanoMetadatumToObj function', () => {
  test('should return same value if the parameter is a string', async () => {
    const result = cardanoMetadatumToObj(metadataString);
    expect(result).toBe(metadataString);
  });

  test('should return bigint value converted into a string', async () => {
    const result = cardanoMetadatumToObj(metadataBigInt);
    expect(result).toBe(metadataBigInt.toString());
    expect(typeof result === 'string').toBe(true);
  });

  test('should return an array with of objects if parameter type of Map', async () => {
    const result = cardanoMetadatumToObj(new Map([['msg', metadataMap]]));
    expect(JSON.stringify(result)).toBe('[{"msg":[{"msg":"test metadata"}]}]');
  });

  test('should return an array with of object arrays if parameter type of array', async () => {
    const result = cardanoMetadatumToObj([new Map([['msg', metadataMap]]), metadataMap]);
    expect(JSON.stringify(result)).toBe('[[{"msg":[{"msg":"test metadata"}]}],[{"msg":"test metadata"}]]');
  });
});

describe('Testing getChunks function', () => {
  test('given a byte size of 2 and a sentence with 13 characters, should return an array of length 7', async () => {
    const chunkSize = 2;
    const arrayLength = 7;
    const result = getChunks(metadataString, chunkSize);
    expect(result.length).toBe(arrayLength);
  });
});
