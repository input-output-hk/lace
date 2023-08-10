@NFT-Folders-Popup @Testnet
Feature: NFT - Folders - Popup view

  Background:
    Given Wallet is synced
    And all NFT folders are removed

  @LW-7211
  Scenario Outline: Popup-view - NFT Folders - Context menu with "Rename" & "Delete" options <is_displayed> displayed
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs popup page
    When I right click on <element_to_click>
    Then NFT folder context menu with "Rename" & "Delete" options <is_displayed> displayed
    Examples:
      | element_to_click                             | is_displayed |
      | the NFT folder with name "Sample NFT folder" | is           |
      | the NFT with name "Ibilecoin" on NFTs page   | is not       |

  @LW-7212
  Scenario: Popup-view - NFT Folders - Closing context menu with "Rename" & "Delete" options
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs popup page
    When I right click on the NFT folder with name "Sample NFT folder"
    Then NFT folder context menu with "Rename" & "Delete" options is displayed
    When I click outside the NFT folder context menu
    Then NFT folder context menu with "Rename" & "Delete" options is not displayed

  @LW-7213
  Scenario: Popup-view - NFT Folders - Context menu "Rename" option click
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs popup page
    And I right click on the NFT folder with name "Sample NFT folder"
    When I click "Rename" option in NFT folder context menu
    Then I see "Rename your folder" drawer in popup mode
    And "Folder name" input is filled with "Sample NFT folder"
    And "Confirm" button is disabled on "Rename your folder" drawer

  @LW-7214
  Scenario: Popup-view - NFT Folders - "Rename" and cancel
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs popup page
    And I right click on the NFT folder with name "Sample NFT folder"
    When I click "Rename" option in NFT folder context menu
    When I click "Cancel" button in "Rename your folder" drawer
    Then I do not see "Rename your folder" drawer in popup mode
    And A gallery view showing my NFTs is displayed

  @LW-7215 @Pending
  #Bug: LW-7632
  Scenario: Popup-view - NFT Folders - Trying to rename folder using too long name
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs popup page
    And I right click on the NFT folder with name "Sample NFT folder"
    And I click "Rename" option in NFT folder context menu
    And I clear "Folder name" input
    When I enter a folder name "012345678901234567890" into "Folder name" input
    Then I see "Folder name" input max length 20 error
    And "Confirm" button is disabled on "Rename your folder" drawer
    When I clear "Folder name" input
    And I enter a folder name "01234567890123456789" into "Folder name" input
    Then I don't see "Folder name" input max length 20 error
    And "Confirm" button is enabled on "Rename your folder" drawer

  @LW-7216
  Scenario: Popup-view - NFT Folders - Renaming a folder
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs popup page
    And I right click on the NFT folder with name "Sample NFT folder"
    And I click "Rename" option in NFT folder context menu
    And I see "Rename your folder" drawer in popup mode
    When I clear "Folder name" input
    And I enter a folder name "new folder name" into "Folder name" input
    Then "Confirm" button is enabled on "Rename your folder" drawer
    When I click "Confirm" button in "Rename your folder" drawer
    Then I see a toast with text: "Folder renamed successfully"
    And I do not see "Rename your folder" drawer in popup mode
    And A gallery view showing my NFTs is displayed
    And I see folder with name "new folder name" on the NFTs page
    And I do not see folder with name "Sample NFT folder" on the NFTs page

  @LW-7217
  Scenario: Popup-view - NFT Folders - Context menu "Delete" option click
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs popup page
    And I right click on the NFT folder with name "Sample NFT folder"
    When I click "Delete" option in NFT folder context menu
    Then I see delete folder modal

  @LW-7218
  Scenario: Popup-view - NFT Folders - Context menu "Delete" option click and cancel
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs popup page
    And I right click on the NFT folder with name "Sample NFT folder"
    When I click "Delete" option in NFT folder context menu
    Then I do not see delete folder modal
    And A gallery view showing my NFTs is displayed
    And I see folder with name "Sample NFT folder" on the NFTs page

  @LW-7219
  Scenario: Popup-view - NFT Folders - Deleting a folder
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs popup page
    And I do not see NFT with name: "LaceNFT" on the NFTs page
    And I right click on the NFT folder with name "Sample NFT folder"
    When I click "Delete" option in NFT folder context menu
    When I click "Confirm" button in delete folder modal
    Then I see a toast with text: "Folder deleted successfully"
    And I do not see delete folder modal
    And A gallery view showing my NFTs is displayed
    And I do not see folder with name "Sample NFT folder" on the NFTs page
    And I see NFT with name: "LaceNFT" on the NFTs page

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
    When I enter a folder name "example folder" into "Folder name" input
    Then "Next" button is enabled on "Name your folder" page

  @LW-7262
  Scenario: Popup-view - NFT Folders - "Create folder" flow and warning modal when closing the drawer by clicking back button
    Given I navigate to NFTs popup page
    And I click "Create folder" button on NFTs page
    When I close the drawer by clicking back button
    Then I see "You'll have to start again" modal

  @LW-7263
  Scenario: Popup-view - NFT Folders - "Create folder" flow and warning modal cancellation
    Given I navigate to NFTs popup page
    And I click "Create folder" button on NFTs page
    And I see "Create NFT folder" drawer in popup mode
    And I close the drawer by clicking back button
    When I click "Cancel" button on "You'll have to start again" modal for create NFTs folder
    Then I don't see "You'll have to start again" modal
    And I see "Create NFT folder" drawer in popup mode

  @LW-7264
  Scenario: Popup-view - NFT Folders - "Create folder" flow and warning modal confirmation
    Given I navigate to NFTs popup page
    And I click "Create folder" button on NFTs page
    And I see "Create NFT folder" drawer in popup mode
    And I close the drawer by clicking back button
    When I click "Agree" button on "You'll have to start again" modal for create NFTs folder
    Then I don't see "You'll have to start again" modal
    And I don't see "Create NFT folder" drawer in popup mode
    And A gallery view showing my NFTs is displayed

  @LW-7265
  Scenario: Popup-view - NFT Folders - Trying to create folder using too long name
    Given I navigate to NFTs popup page
    And I click "Create folder" button on NFTs page
    And I see "Create NFT folder" page in popup mode
    And "Folder name" input is empty on "Name your folder" page
    And "Next" button is disabled on "Name your folder" page
    When I enter a folder name "012345678901234567890" into "Folder name" input
    Then I see "Folder name" input max length 20 error
    And "Next" button is disabled on "Name your folder" page
    When I clear "Folder name" input
    And I enter a folder name "01234567890123456789" into "Folder name" input
    Then I don't see "Folder name" input max length 20 error
    And "Next" button is enabled on "Name your folder" page

  @LW-7266
  Scenario: Popup-view - NFT Folders - Trying to create folder using name that already exists
    Given the NFT folder with name "NFT folder 1" and 1 NFT was created
    And I navigate to NFTs popup page
    And I click "Create folder" button on NFTs page
    When I enter a folder name "NFT folder 1" into "Folder name" input
    Then I see "Given name already exists" error on "Name your folder" page
    And "Next" button is disabled on "Name your folder" page
    When I clear "Folder name" input
    And I enter a folder name "NFT folder 2" into "Folder name" input
    Then I do not see "Given name already exists" error on "Name your folder" page
    And "Next" button is enabled on "Name your folder" page

  @LW-7268 @LW-7269
  Scenario: Popup-view - NFT Folders - Select NFTs page displayed
    Given I navigate to NFTs popup page
    And I save all NFTs that I have
    When I click "Create folder" button on NFTs page
    And I enter a folder name "example folder" into "Folder name" input
    And I click "Next" button on "Name your folder" page
    Then I see "Select NFTs" page in popup mode
    And No NFT is selected
    And "Select NFTs" page is showing all NFTs that I have
    And "Next" button is disabled on "Create folder" page

  @LW-7270
  Scenario: Popup-view - NFT Folders - Select NFTs page - back button click
    Given I navigate to "Select NFTs" page in popup mode
    When I close the drawer by clicking back button
    Then I see "Create NFT folder" drawer in popup mode

  @LW-7273
  Scenario: Popup-view - NFT Folders - Select NFTs page - select and unselect a NFT
    Given I navigate to "Select NFTs" page in popup mode
    When I click NFT with name "Ibilecoin"
    Then NFT with name "Ibilecoin" is selected
    When I click NFT with name "Ibilecoin"
    Then NFT with name "Ibilecoin" is not selected

  @LW-7274
  Scenario: Popup-view - NFT Folders - Select NFTs page - search for NFT - no results
    Given I navigate to "Select NFTs" page in popup mode
    When I enter "some random phrase" into the search bar on "Select NFTs" drawer
    Then I see no results for "Select NFTs" drawer

  @LW-7267
  Scenario: Popup-view - NFT Folders - Creating a folder happy path
    Given I navigate to NFTs popup page
    And I click "Create folder" button on NFTs page
    And I enter a folder name "Sample NFT folder" into "Folder name" input
    And I click "Next" button on "Name your folder" page
    And I click NFT with name "Ibilecoin"
    And I click NFT with name "Bison Coin"
    And I click "Next" button on "Select NFTs" page
    Then I see a toast with text: "Folder created successfully"
    And I do not see "Select NFTs" page in popup mode
    And I see folder with name "Sample NFT folder" on the NFTs page
    When I left click on the NFT folder with name "Sample NFT folder"
    Then I see "Sample NFT folder" NFT folder page in popup mode
    And I see NFT with name "Ibilecoin" on the NFT folder page
    And I see NFT with name "Bison Coin" on the NFT folder page

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
  #Bug: LW-7632
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
