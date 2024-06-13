@AdaHandleSend-popup @Testnet
Feature: ADA handle - popup view

  Background:
    Given Wallet is synced

  @LW-7332
  Scenario: Popup view - Add a valid ADA handle to the address book
    Given I am on Address Book popup page

  @LW-7334
  Scenario: Popup view - Add an invalid ADA handle to the address book
    Given I am on Address Book popup page

  @LW-7336
  Scenario: Popup view - Edit an ADA handle from the address book
    Given I am on Address Book popup page
