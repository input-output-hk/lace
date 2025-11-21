const DEFAULT_TIMEOUT = 1000;

export const fakeApiRequest = <TResponse>(response: TResponse, timeout = DEFAULT_TIMEOUT): Promise<TResponse> =>
  new Promise<TResponse>((resolve) => {
    setTimeout(() => resolve(response), timeout);
  });
