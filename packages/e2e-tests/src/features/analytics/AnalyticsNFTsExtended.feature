@NFTs-Extended @Testnet @Pending
Feature: Analytics - Posthog - NFTs - Extended view

  Background:
    Given Wallet is synced

  @LW-7916 @Mainnet
  Scenario: Extended view - Analytics - Open NFT
    Given I set up request interception for posthog analytics request(s)
    And I am on NFTs extended page
    Then I validate latest analytics single event "nft | nfts | click"
    And I am on a NFT details on the extended view for NFT with name: "Ibilecoin"
    Then I validate latest analytics single event "nft | nfts | nft image | click"
    And I validate that 2 analytics event(s) have been sent
