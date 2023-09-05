@NFTs-Popup @Analytics @Testnet @Mainnet
Feature: Analytics - Posthog - NFTs - Popup view

  Background:
    Given Wallet is synced

  @LW-7915
  Scenario: Analytics - Popup view - Open NFT
    Given I set up request interception for posthog analytics request(s)
    And I am on NFTs popup page
    Then I validate latest analytics single event "nft | nfts | click"
    And I left click on the NFT with name "Ibilecoin" on NFTs page
    And I am on a NFT details on the popup view for NFT with name: "Ibilecoin"
    Then I validate latest analytics single event "nft | nfts | nft image | click"
    And I validate that 2 analytics event(s) have been sent
