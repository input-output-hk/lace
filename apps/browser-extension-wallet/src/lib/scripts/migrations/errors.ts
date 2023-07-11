export class InvalidMigrationData extends Error {
  constructor(version: string, type: 'upgrade' | 'downgrade', reason?: string) {
    super(`Invalid migrated data for version ${version} ${type}${reason ? '. Reason: '.concat(reason) : '.'}`);
  }
}
