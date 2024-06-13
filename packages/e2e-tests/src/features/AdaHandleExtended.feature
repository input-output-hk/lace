@AdaHandle-extended @Testnet
Feature: ADA handle - extended view

  Background:
    Given Wallet is synced
#    And all NFT folders are removed

  @LW-7331
  Scenario: Extended view - Add a valid ADA handle to the address book
    Given I am on NFTs extended page

  @LW-7333
  Scenario: Extended view - Add an invalid ADA handle to the address book
    Given I am on NFTs extended page

  @LW-7335
  Scenario: Extended view - Edit an ADA handle from the address book
    Given I am on NFTs extended page
