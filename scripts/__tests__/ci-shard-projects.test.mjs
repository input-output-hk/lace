import { describe, expect, it } from 'vitest';

import { shardProjects } from '../ci-shard-projects.mjs';

describe('shardProjects', () => {
  const projects = ['e', 'a', 'd', 'b', 'c', 'a'];

  it('assigns every project to exactly one shard', () => {
    const shards = [1, 2, 3].map(index => shardProjects(projects, index, 3));
    expect(shards.flat().sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('is independent of input order', () => {
    expect(shardProjects(projects, 2, 3)).toEqual(
      shardProjects([...projects].reverse(), 2, 3),
    );
  });

  it('returns an empty shard when there are fewer projects than shards', () => {
    expect(shardProjects(['a'], 2, 3)).toEqual([]);
  });

  it.each([
    [0, 3],
    [4, 3],
    [1, 0],
    [Number.NaN, 3],
  ])('rejects shard %s of %s', (index, count) => {
    expect(() => shardProjects(projects, index, count)).toThrow();
  });
});
