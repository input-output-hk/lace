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

  @LW-7215
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
    And I click "Cancel" button in delete folder modal
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
