#!/usr/bin/env node
/* eslint-disable functional/no-let */

/*
 * detect-checksum-change.js file.txt && chained-command
 *
 * If exit code === 0: execute chained command
 */

const { createHash } = require('node:crypto');
const {
  createReadStream,
  createWriteStream,
  readFileSync,
} = require('node:fs');
const { resolve: resolvePath } = require('node:path');

const resultMessage = {
  changeDetected: 'change-detected',
  checksumIdentical: 'checksum-identical',
  noBaseChecksumFile: 'no-base-checksum-file',
};

const filePath = resolvePath(process.cwd(), process.argv[2]);
const checksumFilePath = `${filePath}.checksum`;

let currentChecksumValue = null;
try {
  currentChecksumValue = readFileSync(checksumFilePath, 'utf8');
} catch {}

const stream = createReadStream(filePath)
  .pipe(createHash('sha256'))
  .setEncoding('hex');

stream.pipe(createWriteStream(checksumFilePath));

let targetResult = resultMessage.checksumIdentical;

if (!currentChecksumValue) {
  targetResult = resultMessage.noBaseChecksumFile;
} else {
  stream.on('readable', () => {
    const newChecksumValue = stream.read();
    if (newChecksumValue === null || currentChecksumValue === newChecksumValue)
      return;
    targetResult = resultMessage.changeDetected;
  });
}

stream.on('end', () => {
  // eslint-disable-next-line no-console
  console.info(targetResult);
});
