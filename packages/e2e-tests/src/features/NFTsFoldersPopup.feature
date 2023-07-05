@NFT-Folders-Popup @Testnet
Feature: NFT - Folders - Popup view

  Background:
    Given Wallet is synced

  @LW-7260
  Scenario: Popup-view - NFT Folders - "Create folder" button click
    Given I navigate to NFTs popup page
    When I click "Create folder" button on NFTs page
    Then I see "Create NFT folder" page in popup mode
    And "Folder name" input is empty on "Name your folder" page
    And "Next" button is disabled on "Name your folder" page

  @LW-7261
  Scenario: Popup-view - NFT Folders - "Create NFT folder" page "Next" button enabled when name input is not empty
    Given I navigate to NFTs popup page
    And I click "Create folder" button on NFTs page
    When I enter: "example folder" into folder name input
    Then "Next" button is enabled on "Name your folder" page

  @LW-7268 @LW-7269
  Scenario: Extended-view - NFT Folders - "Create folder" button click
    Given I navigate to NFTs popup page
    And I save all NFTs that I have
    When I click "Create folder" button on NFTs page
    And I enter: "example folder" into folder name input
    And I click "Next" button on "Name your folder" page
    Then I see "Select NFTs" page in popup mode
    And No NFT is selected
    And "Select NFTs" page is showing all NFTs that I have
    And "Next" button is disabled on "Create folder" page
