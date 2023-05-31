export class InvalidMigrationData extends Error {
  constructor(version: string, reason?: string) {
    super(`Invalid migrated data for version ${version}${reason ? '. Reason: '.concat(reason) : '.'}`);
  }
}
