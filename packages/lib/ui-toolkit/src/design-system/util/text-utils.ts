import type { ReactNode } from 'react';

export const truncateText = (text?: string | null, maxLength = 20): string => {
  if (typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;

  const half = Math.floor((maxLength - 3) / 2);
  return text.slice(0, half) + '...' + text.slice(-half);
};

export const shouldTruncateText = (
  text: ReactNode | string,
): ReactNode | string => {
  if (typeof text === 'string' && text.length > 50) return truncateText(text);
  return text;
};

export const decodeHtmlEntities = (string_: string) =>
  string_
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

export const normalizeLineBreaks = (string_: string) =>
  string_.replace(/<br\s*\/?>/gi, '\n');

export type HtmlTextBlock = {
  type: 'bullet' | 'heading' | 'paragraph';
  spans: HtmlTextSpan[];
  text: string;
};

export type HtmlTextSpan = {
  strong: boolean;
  text: string;
};

export const parseHtmlParagraphs = (html: string): string[] => {
  const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gis;
  const matches = [...html.matchAll(paragraphRegex)];

  return matches
    .map(match => {
      let clean = match[1];
      clean = normalizeLineBreaks(clean).replace(/<[^>]*>/g, '');
      clean = decodeHtmlEntities(clean).trim();
      return clean;
    })
    .filter(Boolean);
};

const parseTextBlockType = (
  originalHtml: string,
  cleanText: string,
): HtmlTextBlock['type'] => {
  const trimmedText = cleanText.trim();

  if (/^[-•]\s+/.test(trimmedText)) return 'bullet';

  const isStrongOnlyParagraph = /^<(strong|b)[^>]*>.*<\/(strong|b)>$/is.test(
    originalHtml.trim(),
  );
  const isShortLabel = trimmedText.endsWith(':') && trimmedText.length <= 40;

  if (isStrongOnlyParagraph || isShortLabel) return 'heading';

  return 'paragraph';
};

const trimHtmlTextSpans = (spans: HtmlTextSpan[]): HtmlTextSpan[] => {
  const trimmed = spans
    .map(span => ({ ...span }))
    .filter(span => span.text.length > 0);

  const firstIndex = trimmed.findIndex(span => span.text.trim().length > 0);
  const lastIndex = trimmed.findLastIndex(span => span.text.trim().length > 0);

  if (firstIndex === -1 || lastIndex === -1) return [];

  trimmed[firstIndex] = {
    ...trimmed[firstIndex],
    text: trimmed[firstIndex].text.trimStart(),
  };
  trimmed[lastIndex] = {
    ...trimmed[lastIndex],
    text: trimmed[lastIndex].text.trimEnd(),
  };

  return trimmed.filter(span => span.text.length > 0);
};

const parseInlineHtmlTextSpans = (rawContent: string): HtmlTextSpan[] => {
  const withMarkers = normalizeLineBreaks(rawContent)
    .replace(/<(strong|b)[^>]*>/gi, '[[[STRONG]]]')
    .replace(/<\/(strong|b)>/gi, '[[[/STRONG]]]');

  const clean = decodeHtmlEntities(withMarkers).replace(/<[^>]*>/g, '');
  const parts = clean.split(/(\[\[\[STRONG\]\]\]|\[\[\[\/STRONG\]\]\])/g);
  const spans: HtmlTextSpan[] = [];
  let isStrong = false;

  for (const part of parts) {
    if (part === '[[[STRONG]]]') {
      isStrong = true;
      continue;
    }

    if (part === '[[[/STRONG]]]') {
      isStrong = false;
      continue;
    }

    if (!part) continue;

    spans.push({
      strong: isStrong,
      text: part,
    });
  }

  return trimHtmlTextSpans(spans);
};

export const parseHtmlTextBlocks = (html: string): HtmlTextBlock[] => {
  const blockRegex = /<(p|li)[^>]*>(.*?)<\/\1>/gis;
  const blocks: HtmlTextBlock[] = [];

  const parseMatch = (
    type: 'bullet' | 'paragraph',
    rawContent: string,
  ): HtmlTextBlock | null => {
    const spans = parseInlineHtmlTextSpans(rawContent);
    const clean = spans.map(span => span.text).join('');

    if (!clean) return null;

    if (type === 'bullet') {
      return {
        spans,
        type: 'bullet',
        text: clean.replace(/^[-•]\s+/, ''),
      };
    }

    const blockType = parseTextBlockType(rawContent, clean);
    const text = blockType === 'bullet' ? clean.replace(/^[-•]\s+/, '') : clean;

    return {
      type: blockType,
      spans:
        blockType === 'bullet'
          ? trimHtmlTextSpans(
              spans.map((span, index) =>
                index === 0
                  ? { ...span, text: span.text.replace(/^[-•]\s+/, '') }
                  : span,
              ),
            )
          : spans,
      text,
    };
  };

  for (const match of html.matchAll(blockRegex)) {
    const [, tagName, rawContent] = match;
    const block = parseMatch(
      tagName.toLowerCase() === 'li' ? 'bullet' : 'paragraph',
      rawContent,
    );
    if (block) blocks.push(block);
  }

  return blocks;
};
