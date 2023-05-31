import { createAxiosInstance } from '@lace/core';

const CACHE_MAX_AGE = 300_000; // 5 minutes

const axiosClient = createAxiosInstance({ cache: { options: { maxAge: CACHE_MAX_AGE } } });

export { axiosClient };
