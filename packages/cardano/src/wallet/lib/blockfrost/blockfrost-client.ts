import { catchError, firstValueFrom, switchMap, throwError } from 'rxjs';
import { fromFetch } from 'rxjs/fetch';
import { CustomError } from 'ts-custom-error';

export type BlockfrostClientConfig = {
  projectId: string;
  baseUrl: string;
};

export type RateLimiter = {
  schedule: <T>(task: () => Promise<T>) => Promise<T>;
};

export type BlockfrostClientDependencies = {
  rateLimiter: RateLimiter;
};

export class BlockfrostError extends CustomError {
  constructor(public status?: number, public body?: string, public innerError?: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message: string | null = body || (innerError as any)?.message;
    super(`Blockfrost error with status '${status}': ${message}`);
  }
}

export class BlockfrostClient {
  private rateLimiter: RateLimiter;
  private baseUrl: string;
  private requestInit: RequestInit;

  constructor(
    { projectId, baseUrl }: BlockfrostClientConfig,
    { rateLimiter }: BlockfrostClientDependencies,
    private apiVersion = 'v0'
  ) {
    this.rateLimiter = rateLimiter;
    // eslint-disable-next-line camelcase
    this.requestInit = { headers: { project_id: projectId } };
    this.baseUrl = baseUrl;
  }

  /**
   * @param endpoint e.g. 'blocks/latest'
   * @throws {BlockfrostError}
   */
  public request<T>(endpoint: string): Promise<T> {
    return this.rateLimiter.schedule(() =>
      firstValueFrom(
        fromFetch(`${this.baseUrl}/api/${this.apiVersion}/${endpoint}`, this.requestInit).pipe(
          switchMap(async (response): Promise<T> => {
            if (response.ok) {
              try {
                return await response.json();
              } catch {
                throw new BlockfrostError(response.status, 'Failed to parse json');
              }
            }
            try {
              const body = await response.text();
              throw new BlockfrostError(response.status, body);
            } catch {
              throw new BlockfrostError(response.status);
            }
          }),
          catchError((err) => {
            if (err instanceof BlockfrostError) {
              return throwError(() => err);
            }
            return throwError(() => new BlockfrostError(undefined, undefined, err));
          })
        )
      )
    );
  }
}
