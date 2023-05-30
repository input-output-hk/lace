export interface UseCase {
  run(): Promise<void | any>;
}
