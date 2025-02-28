@NFT-Folders-Extended @Analytics @Testnet @Mainnet
@SkipFirefox
Feature: Analytics - Posthog - NFTs - Extended view

  Background:
    Given Wallet is synced
    And all NFT folders are removed

  @LW-7916
  Scenario: Analytics - Extended view - Open NFT
    Given I set up request interception for posthog analytics request(s)
    And I am on NFTs extended page
    Then I validate latest analytics single event "nft | nfts | click"
    And I left click on the NFT with name "Bison Coin" on NFTs page
    And I am on a NFT details on the extended view for NFT with name: "Bison Coin"
    Then I validate latest analytics single event "nft | nfts | nft image | click"
    And I validate that 2 analytics event(s) have been sent

  @LW-8708
  Scenario: Extended-view - NFT Folders - Creating a folder and adding NFTs
    Given I set up request interception for posthog analytics request(s)
    Given I navigate to NFTs extended page
    And I click "Create folder" button on NFTs page
    Then I validate latest analytics single event "nft | nfts | create folder | click"
    When I enter a folder name "Sample NFT folder" into "Folder name" input
    And I click "Next" button on "Name your folder" page
    Then I validate latest analytics single event "nft | create folder | name your folder | next | click"
    And I click NFT with name "Ibilecoin"
    And I click NFT with name "Bison Coin"
    When I click "Next" button on "Select NFTs" page
    Then I validate latest analytics single event "nft | create folder | select nfts | next | click"
