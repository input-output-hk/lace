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

test('Restore Wallet - All done page - happy path 2', async ({ useRestoreWallet }) => {
  await useRestoreWallet(ReadOnlyWallet);
});

test('Restore Wallet - All done page - happy path 3', async ({ useRestoreWallet }) => {
  await useRestoreWallet(ReadOnlyWallet);
});

test('Restore Wallet - All done page - happy path 4', async ({ useRestoreWallet }) => {
  await useRestoreWallet(ReadOnlyWallet);
});

test('Restore Wallet - All done page - happy path 5', async ({ useRestoreWallet }) => {
  await useRestoreWallet(ReadOnlyWallet);
});

test('Restore Wallet - All done page - happy path 6', async ({ useRestoreWallet }) => {
  await useRestoreWallet(ReadOnlyWallet);
});

test('Restore Wallet - All done page - happy path 7', async ({ useRestoreWallet }) => {
  await useRestoreWallet(ReadOnlyWallet);
});

test('Restore Wallet - All done page - happy path 8', async ({ useRestoreWallet }) => {
  await useRestoreWallet(ReadOnlyWallet);
});

test('Restore Wallet - All done page - happy path 9', async ({ useRestoreWallet }) => {
  await useRestoreWallet(ReadOnlyWallet);
});

test('Restore Wallet - All done page - happy path 10', async ({ useRestoreWallet }) => {
  await useRestoreWallet(ReadOnlyWallet);
});
