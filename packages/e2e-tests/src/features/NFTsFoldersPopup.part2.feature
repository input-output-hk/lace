@NFT-Folders-Popup @Testnet
Feature: NFT - Folders - Popup view

  Background:
    Given Wallet is synced
    And all NFT folders are removed

  @LW-7272
  Scenario: Popup-view - NFT Folders - Select NFTs page - clear button
    Given I navigate to "Select NFTs" page in popup mode
    And I do not see "Clear" button next to NFTs counter
    When I select 5 NFTs
    Then I see "Clear" button next to NFTs counter
    When I click "Clear" button next to NFTs counter
    Then No NFT is selected

  @LW-7271
  Scenario: Popup-view - NFT Folders - Select NFTs page - selected NFTs counter
    Given I navigate to "Select NFTs" page in popup mode
    And I do not see NFTs counter
    When I select 5 NFTs
    Then I see NFTs counter showing 5 selected NFTs

  @LW-7275
  Scenario: Popup-view - NFT Folders - Select NFTs page - search for existing NFTs and clear
    Given I navigate to "Select NFTs" page in popup mode
    And I save all NFTs that I have
    When I enter "coin" into the search bar
    Then I see NFTs containing "coin" on the "Select NFTs" page
    When I press "Clear" button in search bar
    And "Select NFTs" page is showing all NFTs that I have

  @LW-7190
  Scenario: Popup-view - NFT Folders - "Add NFT" button availability and click within the NFT folder
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs popup page
    And I save all NFTs that I have
    When I left click on the NFT folder with name "Sample NFT folder"
    Then I can see "Add NFT" button active
    When I click "Add NFT" button within the NFT folder
    Then "Select NFTs" page is showing all NFTs that I have

  @LW-7191
  Scenario: Popup-view - NFT Folders - Adding NFTs to existing folder
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs popup page
    When I left click on the NFT folder with name "Sample NFT folder"
    And I can see "Add NFT" button active
    And I click "Add NFT" button within the NFT folder
    And I click NFT with name "Ibilecoin"
    And I click NFT with name "Bison Coin"
    When I click "Add selected NFTs" button on "Select NFTs" page
    Then I see a toast with text: "NFTs added to folder"
    And I see "Sample NFT folder" NFT folder page in popup mode
    And I see NFT with name "Ibilecoin" on the NFT folder page
    And I see NFT with name "Bison Coin" on the NFT folder page

  @LW-7193
  Scenario Outline: Popup-view - NFT Folders - Context menu with "Remove from folder" option is displayed: <is_displayed>
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs popup page
    And I left click on the NFT folder with name "Sample NFT folder"
    And I see "Sample NFT folder" NFT folder page in popup mode
    When I <action> on the NFT folder page
    Then NFT context menu with "Remove" option <is_displayed> displayed
    Examples:
      | action                                     | is_displayed |
      | right click on the NFT with name "LaceNFT" | is           |
      | right click on the add NFT button          | is not       |

  @LW-7194
  Scenario: Popup-view - NFT Folders - Closing context menu with "Remove from folder" option
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs popup page
    And I left click on the NFT folder with name "Sample NFT folder"
    And I see "Sample NFT folder" NFT folder page in popup mode
    When I right click on the NFT with name "LaceNFT" on the NFT folder page
    Then NFT context menu with "Remove" option is displayed
    When I click outside the NFT folder context menu
    Then NFT context menu with "Remove" option is not displayed

  @LW-7195
  Scenario: Popup-view - NFT Folders - Removing NFTs from existing folder
    Given the NFT folder with name "Sample NFT folder" and 2 NFT was created
    And I navigate to NFTs popup page
    And I do not see NFT with name: "LaceNFT" on the NFTs page
    And I do not see NFT with name: "Ibilecoin" on the NFTs page
    And I left click on the NFT folder with name "Sample NFT folder"
    And I see "Sample NFT folder" NFT folder page in popup mode
    And I see NFT with name "Ibilecoin" on the NFT folder page
    And I see NFT with name "LaceNFT" on the NFT folder page
    And I right click on the NFT with name "LaceNFT" on the NFT folder page
    When I click "Remove from folder" option in NFT context menu
    Then I see a toast with text: "NFT removed"
    And I see NFT with name "Ibilecoin" on the NFT folder page
    And I do not see NFT with name "LaceNFT" on the NFT folder page
    And I close the drawer by clicking back button
    And I see NFT with name: "LaceNFT" on the NFTs page
    And I do not see NFT with name: "Ibilecoin" on the NFTs page

  @LW-7276
  Scenario: Popup-view - NFT Folders - NFT folders sorted alphabetically
    Given I navigate to NFTs popup page
    When I create folder with name: "abc" and first available NFT
    And I create folder with name: "bcd" and first available NFT
    And I create folder with name: "cde" and first available NFT
    Then I see folders on the NFTs page in the alphabetical order

  @LW-7229 @Pending
  @issue=LW-7632
  Scenario: Popup-view - NFT Folders - Trying to rename folder using name that already exists
    Given I navigate to NFTs popup page
    When I create folder with name: "Sample NFT folder1" and first available NFT
    And I create folder with name: "Sample NFT folder2" and first available NFT
    And I right click on the NFT folder with name "Sample NFT folder1"
    And I click "Rename" option in NFT folder context menu
    And I see "Rename your folder" drawer in popup mode
    When I clear "Folder name" input
    And I enter a folder name "Sample NFT folder2" into "Folder name" input
    Then I see "Given name already exists" error on "Name your folder" page
    And "Confirm" button is disabled on "Rename your folder" drawer
    When I clear "Folder name" input
    And I enter a folder name "Sample NFT folder3" into "Folder name" input
    Then I do not see "Given name already exists" error on "Name your folder" page
    And "Confirm" button is enabled on "Rename your folder" drawer

  @LW-7179
  Scenario Outline: Popup-view - NFT Folders - Folder thumbnail when there are <number_of_nfts_in_folder> in it
    Given I navigate to NFTs popup page
    When I create folder with name: "Sample NFT folder1" that contains <number_of_nfts_in_folder> NFTs
    Then Folder "Sample NFT folder1" displays <number_of_nft_thumbnails> NFT thumbnails
    And There is a NFTs counter showing <number_of_remaining_nfts> of remaining NFTs in folder "Sample NFT folder1"

    Examples:
      | number_of_nfts_in_folder | number_of_nft_thumbnails | number_of_remaining_nfts |
      | 1                        | 1                        | 0                        |
      | 2                        | 2                        | 0                        |
      | 3                        | 3                        | 0                        |
      | 4                        | 4                        | 0                        |
      | 5                        | 3                        | 2                        |
      | 9                        | 3                        | 6                        |

  @LW-7180
  Scenario Outline: Popup-view - NFT Folders - Folder thumbnail & counter updated when <action> NFT to <number_of_nfts_in_folder> NFTs
    Given I navigate to NFTs popup page
    And I create folder with name: "Sample NFT folder1" that contains <number_of_nfts_in_folder> NFTs
    When I left click on the NFT folder with name "Sample NFT folder1"
    When I <action> 1 NFT to or from the folder
    And I close the drawer by clicking back button
    Then Folder "Sample NFT folder1" displays <number_of_nft_thumbnails> NFT thumbnails
    And There is a NFTs counter showing <number_of_remaining_nfts> of remaining NFTs in folder "Sample NFT folder1"
    Examples:
      | number_of_nfts_in_folder | action |  number_of_nft_thumbnails | number_of_remaining_nfts |
      | 1                        | add    |  2                        | 0                        |
      | 3                        | add    |  4                        | 0                        |
      | 4                        | add    |  3                        | 2                        |
      | 6                        | add    |  3                        | 4                        |
      | 1                        | remove |  0                        | 0                        |
      | 4                        | remove |  3                        | 0                        |
      | 5                        | remove |  4                        | 0                        |
      | 6                        | remove |  3                        | 2                        |

  @LW-7852
  Scenario: Popup-view - NFT Folders - Click NFT in Folder
    Given the NFT folder with name "Sample NFT folder" and 2 NFT was created
    And I navigate to NFTs popup page
    And I left click on the NFT folder with name "Sample NFT folder"
    And I see "Sample NFT folder" NFT folder page in popup mode
    When I click NFT with name "Ibilecoin"
    Then I am on a NFT details on the popup view for NFT with name: "Ibilecoin"
