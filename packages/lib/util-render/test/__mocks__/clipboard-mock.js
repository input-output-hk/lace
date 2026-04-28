module.exports = {
  readText: vi.fn().mockResolvedValue('mock clipboard text'),
  writeText: vi.fn().mockResolvedValue(undefined),
};
