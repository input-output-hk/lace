import { describe, expect, it } from 'vitest';

import {
  CardanoCubeProjectSchema,
  CardanoCubeCategorySchema,
  DappItemSchema,
} from '../src/types';

const makeCategory = () => ({
  id: 1,
  parent_id: null,
  name: 'DeFi',
  slug: 'defi',
  description: null,
  projects_count: 42,
  ancestry_depth: null,
  ancestry: null,
  updated_at: '2025-01-01T00:00:00.000Z',
});

const makeProject = () => ({
  name: 'Minswap',
  slug: 'minswap',
  short_description: 'DEX on Cardano',
  logos: { small: null, medium: 'https://example.com/logo.png', large: null },
  rating: { vote_count: 10, average_rating: 4.5, star_count: 5 },
  website: 'https://minswap.org',
  active_status: 'active',
  scam_status: 'clean',
  twitter: null,
  github: null,
  discord: null,
  telegram: null,
  facebook: null,
  reddit: null,
  linkedin: null,
  updated_at: '2025-01-01T00:00:00.000Z',
  main_category: null,
  additional_categories: [],
});

const makeDappItem = () => ({
  name: 'Minswap',
  slug: 'minswap',
  description: 'DEX',
  logoUrl: 'https://example.com/logo.png',
  website: 'https://minswap.org',
  active_status: 'active',
  scam_status: 'clean',
  rating: { vote_count: 5, average_rating: 4.0, star_count: 3 },
  chain: 'cardano',
  categories: ['defi'],
  socialLinks: [],
  updated_at: '2025-01-01T00:00:00.000Z',
});

describe('CardanoCubeCategorySchema', () => {
  it('parses a valid category', () => {
    expect(() => CardanoCubeCategorySchema.parse(makeCategory())).not.toThrow();
  });

  it('accepts absent optional fields', () => {
    const minimal = {
      id: 1,
      parent_id: null,
      name: 'DeFi',
      slug: 'defi',
      projects_count: 0,
      updated_at: '2025-01-01T00:00:00.000Z',
    };
    expect(() => CardanoCubeCategorySchema.parse(minimal)).not.toThrow();
  });
});

describe('CardanoCubeProjectSchema', () => {
  it('parses a valid project', () => {
    expect(() => CardanoCubeProjectSchema.parse(makeProject())).not.toThrow();
  });

  it('accepts absent optional fields', () => {
    const minimal = {
      name: 'Test',
      slug: 'test',
      logos: { small: null, medium: null, large: null },
      rating: { vote_count: 0, average_rating: null, star_count: 0 },
      active_status: 'active',
      scam_status: 'clean',
      updated_at: '2025-01-01T00:00:00.000Z',
    };
    expect(() => CardanoCubeProjectSchema.parse(minimal)).not.toThrow();
  });

  it('defaults additional_categories to [] when absent', () => {
    const { additional_categories: _additional_categories, ...rest } =
      makeProject();
    const result = CardanoCubeProjectSchema.parse(rest);
    expect(result.additional_categories).toEqual([]);
  });

  it('accepts a populated main_category', () => {
    const project = { ...makeProject(), main_category: makeCategory() };
    expect(() => CardanoCubeProjectSchema.parse(project)).not.toThrow();
  });
});

describe('DappItemSchema', () => {
  it('parses a valid item', () => {
    expect(() => DappItemSchema.parse(makeDappItem())).not.toThrow();
  });

  it('requires chain field', () => {
    const { chain: _chain, ...rest } = makeDappItem();
    expect(() => DappItemSchema.parse(rest)).toThrow();
  });

  it('accepts null description and logoUrl', () => {
    const item = { ...makeDappItem(), description: null, logoUrl: null };
    expect(() => DappItemSchema.parse(item)).not.toThrow();
  });
});
