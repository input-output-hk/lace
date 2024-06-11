import { test } from '../fixtures/restoreLaceWallet';
import { ReadOnlyWallet } from '../utils/wallets';

// @LW-2464
// Scenario: Restore Wallet - All done page - happy path
// Given I click "Restore" button on wallet setup page
// And I go to "Wallet setup" page from "Restore" wallet flow
// When I click "Enter wallet" button
// Then I see LW homepage

test('Restore Wallet - All done page - happy path 1', async ({ useRestoreWallet }) => {
  await useRestoreWallet(ReadOnlyWallet);
});
