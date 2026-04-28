import { Tagged } from 'type-fest';

/**
 * Uniform Resource Identifier
 *
 * Examples:
 * - https://path.to/asset.png
 * - data:image/jpeg;base64,/9j/4AAQSkZJRgABAgAAZABkAAD
 */
export type Uri = Tagged<string, 'Uri'>;
export const Uri = (value: string) => value as Uri;
