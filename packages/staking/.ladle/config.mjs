const CWD = process.cwd();

export default {
  host: '127.0.0.1',
  port: 8080,
  previewHost: '127.0.0.1',
  previewPort: 8080,
  viteConfig: `${CWD}/.ladle/vite.config.ts`,
};
