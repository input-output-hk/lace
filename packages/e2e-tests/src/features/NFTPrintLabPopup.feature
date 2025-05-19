@NftPrintLab-Popup @Testnet @Mainnet
Feature: NFT Print Lab support - popup view

  Background:
    Given Wallet is synced

  @LW-12878
  Scenario: Popup View - Print this NFT - Continue
    Given I switch network to: "Mainnet" in popup mode
    And Wallet is synced
    When I navigate to NFTs popup page
    And I left click on the NFT with name "Bison Coin" on NFTs page
    And I click "Print this NFT" button on NFT details drawer
    Then I see "You're leaving Lace for NFTPrintLab.io" modal
    When I click on "Continue" button on "You're leaving Lace for NFTPrintLab.io" modal
    Then I do not see "You're leaving Lace for NFTPrintLab.io" modal
    And NFT Print Lab page is displayed in a new tab

  @LW-12879
  Scenario: Popup View - Print this NFT - Cancel
    Given I switch network to: "Mainnet" in popup mode
    And Wallet is synced
    When I navigate to NFTs popup page
    And I left click on the NFT with name "Bison Coin" on NFTs page
    And I click "Print this NFT" button on NFT details drawer
    And I click on "Cancel" button on "You're leaving Lace for NFTPrintLab.io" modal
    Then I do not see "You're leaving Lace for NFTPrintLab.io" modal
    And I am on a NFT details on the popup view for NFT with name: "Bison Coin"
