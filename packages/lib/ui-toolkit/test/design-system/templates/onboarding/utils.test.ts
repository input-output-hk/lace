import { describe, expect, it } from 'vitest';

import { normalizePassphraseInput } from '../../../../src/design-system/templates/onboarding/utils';
import {
  decodeHtmlEntities,
  normalizeLineBreaks,
  parseHtmlParagraphs,
  parseHtmlTextBlocks,
  truncateText,
} from '../../../../src/design-system/util/text-utils';

describe('normalizePassphraseInput', () => {
  it('trims leading whitespace', () => {
    expect(normalizePassphraseInput('  hello world')).toBe('hello world');
  });

  it('trims trailing whitespace', () => {
    expect(normalizePassphraseInput('hello world  ')).toBe('hello world');
  });

  it('trims both leading and trailing whitespace', () => {
    expect(normalizePassphraseInput('  hello world  ')).toBe('hello world');
  });

  it('replaces multiple spaces with single space', () => {
    expect(normalizePassphraseInput('hello    world')).toBe('hello world');
  });

  it('replaces multiple different whitespace characters with single space', () => {
    expect(normalizePassphraseInput('hello\t\t  \nworld')).toBe('hello world');
  });

  it('converts uppercase to lowercase', () => {
    expect(normalizePassphraseInput('HELLO WORLD')).toBe('hello world');
  });

  it('converts mixed case to lowercase', () => {
    expect(normalizePassphraseInput('HeLLo WoRLd')).toBe('hello world');
  });

  it('handles all transformations together', () => {
    expect(normalizePassphraseInput('  HeLLo    WoRLd  ')).toBe('hello world');
  });

  it('handles empty string', () => {
    expect(normalizePassphraseInput('')).toBe('');
  });

  it('handles string with only whitespace', () => {
    expect(normalizePassphraseInput('   ')).toBe('');
  });

  it('handles single word', () => {
    expect(normalizePassphraseInput('hello')).toBe('hello');
  });

  it('handles multiple words with various spacing', () => {
    expect(normalizePassphraseInput('  one  two   three    four  ')).toBe(
      'one two three four',
    );
  });

  it('preserves single spaces between words', () => {
    expect(normalizePassphraseInput('hello world')).toBe('hello world');
  });

  it('handles tabs and newlines', () => {
    expect(normalizePassphraseInput('hello\tworld\ntest')).toBe(
      'hello world test',
    );
  });

  it('handles special characters', () => {
    expect(normalizePassphraseInput('hello-world_test')).toBe(
      'hello-world_test',
    );
  });

  it('handles numbers', () => {
    expect(normalizePassphraseInput('test 123 ABC')).toBe('test 123 abc');
  });
});

describe('truncateText', () => {
  it('should return empty string for null input', () => {
    expect(truncateText(null)).toBe('');
  });

  it('should return the same string if length is within maxLength', () => {
    expect(truncateText('orange')).toBe('orange');
    expect(truncateText('orange', 10)).toBe('orange');
  });

  it('should truncate text with default maxLength (20)', () => {
    const longText =
      'this is a very long text that exceeds the default max length';
    const result = truncateText(longText);
    expect(result).toBe('this is ...x length');
    expect(result.length).toBe(19);
  });
});

describe('decodeHtmlEntities', () => {
  it('decodes supported HTML entities', () => {
    expect(decodeHtmlEntities('&nbsp; &amp; &lt; &gt; &quot; &#39;')).toBe(
      `  & < > " '`,
    );
  });

  it('leaves non-entity text unchanged', () => {
    expect(decodeHtmlEntities('hello world')).toBe('hello world');
  });
});

describe('normalizeLineBreaks', () => {
  it('replaces <br> tags with newline', () => {
    expect(normalizeLineBreaks('a<br>b')).toBe('a\nb');
    expect(normalizeLineBreaks('a<br/>b')).toBe('a\nb');
    expect(normalizeLineBreaks('a<br />b')).toBe('a\nb');
  });

  it('is case-insensitive', () => {
    expect(normalizeLineBreaks('a<BR />b')).toBe('a\nb');
  });
});

describe('parseHtmlParagraphs', () => {
  it('extracts <p> contents, strips tags, decodes entities, and trims', () => {
    const html =
      '<p class="a"> Hello <strong>world</strong> &amp; friends </p>' +
      '<p>Second<br/>line</p>';

    expect(parseHtmlParagraphs(html)).toEqual([
      'Hello world & friends',
      'Second\nline',
    ]);
  });

  it('filters out empty paragraphs', () => {
    const html = '<p>   </p><p><span></span></p><p>ok</p>';
    expect(parseHtmlParagraphs(html)).toEqual(['ok']);
  });

  it('returns empty array when there are no <p> tags', () => {
    expect(parseHtmlParagraphs('just text<br/>no paragraphs')).toEqual([]);
  });
});

describe('parseHtmlTextBlocks', () => {
  it('classifies headings, paragraphs and bullet lines', () => {
    const html =
      '<p><strong>Explore the Minswap Way!</strong></p>' +
      '<p>Main features:&nbsp;</p>' +
      '<p>- Trade your favourite tokens</p>' +
      '<p>Keep track of your liquidity.</p>';

    expect(parseHtmlTextBlocks(html)).toEqual([
      {
        type: 'heading',
        text: 'Explore the Minswap Way!',
        spans: [{ strong: true, text: 'Explore the Minswap Way!' }],
      },
      {
        type: 'heading',
        text: 'Main features:',
        spans: [{ strong: false, text: 'Main features:' }],
      },
      {
        type: 'bullet',
        text: 'Trade your favourite tokens',
        spans: [{ strong: false, text: 'Trade your favourite tokens' }],
      },
      {
        type: 'paragraph',
        text: 'Keep track of your liquidity.',
        spans: [{ strong: false, text: 'Keep track of your liquidity.' }],
      },
    ]);
  });

  it('parses list items as bullets when no paragraphs exist', () => {
    const html = '<ul><li>First item</li><li>Second item</li></ul>';

    expect(parseHtmlTextBlocks(html)).toEqual([
      {
        type: 'bullet',
        text: 'First item',
        spans: [{ strong: false, text: 'First item' }],
      },
      {
        type: 'bullet',
        text: 'Second item',
        spans: [{ strong: false, text: 'Second item' }],
      },
    ]);
  });

  it('preserves paragraph and list-item order in mixed html content', () => {
    const html =
      '<p><strong>Overview</strong></p>' +
      '<p>Intro paragraph.</p>' +
      '<ul><li><strong>First item</strong>: details</li><li>Second item</li></ul>' +
      '<p>Closing paragraph.</p>';

    expect(parseHtmlTextBlocks(html)).toEqual([
      {
        type: 'heading',
        text: 'Overview',
        spans: [{ strong: true, text: 'Overview' }],
      },
      {
        type: 'paragraph',
        text: 'Intro paragraph.',
        spans: [{ strong: false, text: 'Intro paragraph.' }],
      },
      {
        type: 'bullet',
        text: 'First item: details',
        spans: [
          { strong: true, text: 'First item' },
          { strong: false, text: ': details' },
        ],
      },
      {
        type: 'bullet',
        text: 'Second item',
        spans: [{ strong: false, text: 'Second item' }],
      },
      {
        type: 'paragraph',
        text: 'Closing paragraph.',
        spans: [{ strong: false, text: 'Closing paragraph.' }],
      },
    ]);
  });
});
