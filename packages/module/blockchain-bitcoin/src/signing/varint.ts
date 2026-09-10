/** Encodes a length as a Bitcoin varint. */
export const varint = (length: number): Buffer => {
  if (length < 0xfd) {
    return Buffer.from([length]);
  }
  if (length <= 0xffff) {
    const buffer = Buffer.alloc(3);
    buffer[0] = 0xfd;
    buffer.writeUInt16LE(length, 1);
    return buffer;
  }
  const buffer = Buffer.alloc(5);
  buffer[0] = 0xfe;
  buffer.writeUInt32LE(length, 1);
  return buffer;
};

/** Encodes a string as its varint byte length followed by its UTF-8 bytes. */
export const varstr = (text: string): Buffer => {
  const bytes = Buffer.from(text, 'utf8');
  return Buffer.concat([varint(bytes.length), bytes]);
};
