@AdaHandleSend-extended @Testnet
Feature: ADA handle - extended view

  Background:
    Given Wallet is synced
#    And I am on NFTs extended page
#    And Address book is empty
#    And I use a wallet with ADA handle "$handletosend" NFT in extended mode

  @LW-7073 @E2E
  Scenario: Extended view - Ada handle transfer e2e, review flow
    Given I am on NFTs extended page

  @LW-9106
  Scenario: Extended view - test for bug LW-9082 - scenario 1
    Given I am on NFTs extended page

  @LW-9107
  Scenario: Extended view - test for bug LW-9082 - scenario 2
    Given I am on NFTs extended page
