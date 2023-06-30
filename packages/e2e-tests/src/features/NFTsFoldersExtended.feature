@NFT-Folders-Extended @Testnet
Feature: NFT - Folders - Extended view

  Background:
    Given Wallet is synced

  @LW-7242
  Scenario: Extended-view - NFT Folders - "Create folder" button click
    Given I navigate to NFTs extended page
    When I click "Create folder" button on NFTs page
    Then I see "Create NFT folder" page in extended mode
    And "Folder name" input is empty on "Name your folder" page
    And "Next" button is disabled on "Name your folder" page
