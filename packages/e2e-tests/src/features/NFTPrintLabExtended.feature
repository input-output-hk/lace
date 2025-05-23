@NftPrintLab-Extended @Testnet @Mainnet
Feature: NFT Print Lab support - extended view

  Background:
    Given Wallet is synced

  @LW-12876
  Scenario: Extended View - Print this NFT - Continue
    Given I switch network to: 'Mainnet' in extended mode
    And Wallet is synced
    When I navigate to NFTs extended page
    And I left click on the NFT with name 'Bison Coin' on NFTs page
    And I click 'Print this NFT' button on NFT details drawer
    Then I see 'You're leaving Lace for NFTPrintLab.io' modal
    When I click on 'Continue' button on 'You're leaving Lace for NFTPrintLab.io' modal
    Then I do not see 'You're leaving Lace for NFTPrintLab.io' modal
    And NFT Print Lab page is displayed in a new tab

  @LW-12877
  Scenario: Extended View - Print this NFT - Cancel
    Given I switch network to: 'Mainnet' in extended mode
    And Wallet is synced
    When I navigate to NFTs extended page
    And I left click on the NFT with name 'Bison Coin' on NFTs page
    And I click 'Print this NFT' button on NFT details drawer
    And I click on 'Cancel' button on 'You're leaving Lace for NFTPrintLab.io' modal
    Then I do not see 'You're leaving Lace for NFTPrintLab.io' modal
    And I am on a NFT details on the extended view for NFT with name: 'Bison Coin'
