import { Tagged } from 'type-fest';

/**
 * Uniform Resource Identifier
 *
 * Examples:
 * - https://path.to/asset.png
 * - data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAZABkAAD
 */
export type Uri = Tagged<string, 'Uri'>;
/** Types a string as a URI, such as an `https:` or `data:` URL. It checks nothing. */
export const Uri = (value: string) => value as Uri;
