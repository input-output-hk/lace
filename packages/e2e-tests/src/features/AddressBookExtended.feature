@AddressBook-extended @Mainnet @Testnet
Feature: Address book - extended view

  Background:
    Given Lace is ready for test

  @LW-4456
  Scenario: Extended-view - Address Book - Empty address book
    Given I am on NFTs extended page

  @LW-4459
  Scenario: Extended-view - Address Book - Addresses list verification
    Given I am on NFTs extended page

  @LW-4464 @Smoke
  Scenario: Extended-view - Address Book - Add new address "Shelley_manual"
    Given I am on NFTs extended page
