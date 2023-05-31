import { CustomProjectConfig } from 'lost-pixel';

export const config: CustomProjectConfig = {
  failOnDifference: true,
  generateOnly: true,
  ladleShots: {
    ladleUrl: 'http://127.0.0.1:8080',
  },
  threshold: 0.05,
};
