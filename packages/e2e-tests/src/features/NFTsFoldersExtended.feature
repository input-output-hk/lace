@NFT-Folders-Extended @Testnet
Feature: NFT - Folders - Extended view

  Background:
    Given Wallet is synced
    And all NFT folders are removed

  @LW-7202
  Scenario Outline: Extended-view - NFT Folders - Context menu with "Rename" & "Delete" options <is_displayed> displayed
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs extended page
    When I right click on <element_to_click>
    Then NFT folder context menu with "Rename" & "Delete" options <is_displayed> displayed
    Examples:
      | element_to_click                             | is_displayed |
      | the NFT folder with name "Sample NFT folder" | is           |
      | the NFT with name "Ibilecoin" on NFTs page   | is not       |

  @LW-7203
  Scenario: Extended-view - NFT Folders - Closing context menu with "Rename" & "Delete" options
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs extended page
    When I right click on the NFT folder with name "Sample NFT folder"
    Then NFT folder context menu with "Rename" & "Delete" options is displayed
    When I click outside the NFT folder context menu
    Then NFT folder context menu with "Rename" & "Delete" options is not displayed

  @LW-7204
  Scenario: Extended-view - NFT Folders - Context menu "Rename" option click
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs extended page
    And I right click on the NFT folder with name "Sample NFT folder"
    When I click "Rename" option in NFT folder context menu
    Then I see "Rename your folder" drawer in extended mode
    And "Folder name" input is filled with "Sample NFT folder"
    And "Confirm" button is disabled on "Rename your folder" drawer

  @LW-7205
  Scenario Outline: Extended-view - NFT Folders - "Rename" and cancel by <action>
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs extended page
    And I right click on the NFT folder with name "Sample NFT folder"
    And I click "Rename" option in NFT folder context menu
    When <action>
    Then I do not see "Rename your folder" drawer in extended mode
    And A gallery view showing my NFTs is displayed
    Examples:
      | action                                                 |
      | I click "Cancel" button in "Rename your folder" drawer |
      | I close the drawer by clicking close button            |
      | I click outside the drawer                             |

  @LW-7206 @Pending
  #Bug: LW-7632
  Scenario: Extended-view - NFT Folders - Trying to rename folder using too long name
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs extended page
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

  @LW-7207
  Scenario: Extended-view - NFT Folders - Renaming a folder
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs extended page
    And I right click on the NFT folder with name "Sample NFT folder"
    And I click "Rename" option in NFT folder context menu
    And I see "Rename your folder" drawer in extended mode
    When I clear "Folder name" input
    And I enter a folder name "new folder name" into "Folder name" input
    Then "Confirm" button is enabled on "Rename your folder" drawer
    When I click "Confirm" button in "Rename your folder" drawer
    Then I see a toast with text: "Folder renamed successfully"
    And I do not see "Rename your folder" drawer in extended mode
    And A gallery view showing my NFTs is displayed
    And I see folder with name "new folder name" on the NFTs page
    And I do not see folder with name "Sample NFT folder" on the NFTs page

  @LW-7208
  Scenario: Extended-view - NFT Folders - Context menu "Delete" option click
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs extended page
    And I right click on the NFT folder with name "Sample NFT folder"
    When I click "Delete" option in NFT folder context menu
    Then I see delete folder modal

  @LW-7209
  Scenario: Extended-view - NFT Folders - Context menu "Delete" option click and cancel
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs extended page
    And I right click on the NFT folder with name "Sample NFT folder"
    When I click "Delete" option in NFT folder context menu
    Then I do not see delete folder modal
    And A gallery view showing my NFTs is displayed
    And I see folder with name "Sample NFT folder" on the NFTs page

  @LW-7210
  Scenario: Extended-view - NFT Folders - Deleting a folder
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs extended page
    And I do not see NFT with name: "LaceNFT" on the NFTs page
    And I right click on the NFT folder with name "Sample NFT folder"
    When I click "Delete" option in NFT folder context menu
    When I click "Confirm" button in delete folder modal
    Then I see a toast with text: "Folder deleted successfully"
    And I do not see delete folder modal
    And A gallery view showing my NFTs is displayed
    And I do not see folder with name "Sample NFT folder" on the NFTs page
    And I see NFT with name: "LaceNFT" on the NFTs page

  @LW-7242
  Scenario: Extended-view - NFT Folders - "Create folder" button click
    Given I navigate to NFTs extended page
    When I click "Create folder" button on NFTs page
    Then I see "Create NFT folder" page in extended mode
    And "Folder name" input is empty on "Name your folder" page
    And "Next" button is disabled on "Name your folder" page

  @LW-7243
  Scenario: Extended-view - NFT Folders - "Create NFT folder" page "Next" button enabled when name input is not empty
    Given I navigate to NFTs extended page
    And I click "Create folder" button on NFTs page
    When I enter a folder name "example folder" into "Folder name" input
    Then "Next" button is enabled on "Name your folder" page

  @LW-7244
  Scenario Outline: Extended-view - NFT Folders - "Create folder" flow and warning modal when <action>
    Given I navigate to NFTs extended page
    And I click "Create folder" button on NFTs page
    When <action>
    Then I see "You'll have to start again" modal
    Examples:
      | action                                      |
      | I close the drawer by clicking close button |
      | I click outside the drawer                  |

  @LW-7245
  Scenario: Extended-view - NFT Folders - "Create folder" flow and warning modal cancellation
    Given I navigate to NFTs extended page
    And I click "Create folder" button on NFTs page
    And I see "Create NFT folder" drawer in extended mode
    And I close the drawer by clicking close button
    When I click "Cancel" button on "You'll have to start again" modal for create NFTs folder
    Then I don't see "You'll have to start again" modal
    And I see "Create NFT folder" drawer in extended mode

  @LW-7246
  Scenario: Extended-view - NFT Folders - "Create folder" flow and warning modal confirmation
    Given I navigate to NFTs extended page
    And I click "Create folder" button on NFTs page
    And I see "Create NFT folder" drawer in extended mode
    And I close the drawer by clicking close button
    When I click "Agree" button on "You'll have to start again" modal for create NFTs folder
    Then I don't see "You'll have to start again" modal
    And I don't see "Create NFT folder" drawer in extended mode
    And A gallery view showing my NFTs is displayed

  @LW-7247
  Scenario: Extended-view - NFT Folders - Trying to create folder using too long name
    Given I navigate to NFTs extended page
    And I click "Create folder" button on NFTs page
    And I see "Create NFT folder" page in extended mode
    And "Folder name" input is empty on "Name your folder" page
    And "Next" button is disabled on "Name your folder" page
    When I enter a folder name "012345678901234567890" into "Folder name" input
    Then I see "Folder name" input max length 20 error
    And "Next" button is disabled on "Name your folder" page
    When I clear "Folder name" input
    And I enter a folder name "01234567890123456789" into "Folder name" input
    Then I don't see "Folder name" input max length 20 error
    And "Next" button is enabled on "Name your folder" page

  @LW-7248
  Scenario: Extended-view - NFT Folders - Trying to create folder using name that already exists
    Given the NFT folder with name "NFT folder 1" and 1 NFT was created
    And I navigate to NFTs extended page
    And I click "Create folder" button on NFTs page
    When I enter a folder name "NFT folder 1" into "Folder name" input
    Then I see "Given name already exists" error on "Name your folder" page
    And "Next" button is disabled on "Name your folder" page
    When I clear "Folder name" input
    And I enter a folder name "NFT folder 2" into "Folder name" input
    Then I do not see "Given name already exists" error on "Name your folder" page
    And "Next" button is enabled on "Name your folder" page

  @LW-7249
  Scenario: Extended-view - NFT Folders - Creating a folder happy path
    Given I navigate to NFTs extended page
    And I click "Create folder" button on NFTs page
    And I enter a folder name "Sample NFT folder" into "Folder name" input
    And I click "Next" button on "Name your folder" page
    And I click NFT with name "Ibilecoin"
    And I click NFT with name "Bison Coin"
    When I click "Next" button on "Select NFTs" page
    Then I see a toast with text: "Folder created successfully"
    And I do not see "Select NFTs" page in extended mode
    And I see folder with name "Sample NFT folder" on the NFTs page
    When I left click on the NFT folder with name "Sample NFT folder"
    Then I see "Sample NFT folder" NFT folder page in extended mode
    And I see NFT with name "Ibilecoin" on the NFT folder page
    And I see NFT with name "Bison Coin" on the NFT folder page

  @LW-7250 @LW-7251
  Scenario: Extended-view - NFT Folders - Select NFTs page displayed
    Given I navigate to NFTs extended page
    And I save all NFTs that I have
    When I click "Create folder" button on NFTs page
    When I enter a folder name "example folder" into "Folder name" input
    And I click "Next" button on "Name your folder" page
    Then I see "Select NFTs" page in extended mode
    And No NFT is selected
    And "Select NFTs" page is showing all NFTs that I have
    And "Next" button is disabled on "Create folder" page

  @LW-7252
  Scenario: Extended-view - NFT Folders - Select NFTs page - back button click
    Given I navigate to "Select NFTs" page in extended mode
    When I close the drawer by clicking back button
    Then I see "Create NFT folder" drawer in extended mode

  @LW-7253
  Scenario Outline: Extended-view - NFT Folders - Select NFTs page - warning modal when <action>
    Given I navigate to "Select NFTs" page in extended mode
    When <action>
    Then I see "You'll have to start again" modal
    Examples:
      | action                                      |
      | I close the drawer by clicking close button |
      | I click outside the drawer                  |

  @LW-7256
  Scenario: Extended-view - NFT Folders - Select NFTs page - select and unselect a NFT
    Given I navigate to "Select NFTs" page in extended mode
    When I click NFT with name "Ibilecoin"
    Then NFT with name "Ibilecoin" is selected
    When I click NFT with name "Ibilecoin"
    Then NFT with name "Ibilecoin" is not selected

  @LW-7257
  Scenario: Extended-view - NFT Folders - Select NFTs page - search for NFT - no results
    Given I navigate to "Select NFTs" page in extended mode
    When I enter "some random phrase" into the search bar on "Select NFTs" drawer
    Then I see no results for "Select NFTs" drawer

  @LW-7255
  Scenario: Extended-view - NFT Folders - Select NFTs page - clear button
    Given I navigate to "Select NFTs" page in extended mode
    And I do not see "Clear" button next to NFTs counter
    When I select 5 NFTs
    Then I see "Clear" button next to NFTs counter
    When I click "Clear" button next to NFTs counter
    Then No NFT is selected

  @LW-7254
  Scenario: Extended-view - NFT Folders - Select NFTs page - selected NFTs counter
    Given I navigate to "Select NFTs" page in extended mode
    And I do not see NFTs counter
    When I select 5 NFTs
    Then I see NFTs counter showing 5 selected NFTs

  @LW-7258
  Scenario: Extended-view - NFT Folders - Select NFTs page - search for existing NFTs and clear
    Given I navigate to "Select NFTs" page in extended mode
    And I save all NFTs that I have
    When I enter "coin" into the search bar
    Then I see NFTs containing "coin" on the "Select NFTs" page
    When I press "Clear" button in search bar
    And "Select NFTs" page is showing all NFTs that I have

  @LW-7184
  Scenario: Extended-view - NFT Folders - "Add NFT" button availability and click within the NFT folder
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs extended page
    And I save all NFTs that I have
    When I left click on the NFT folder with name "Sample NFT folder"
    Then I can see "Add NFT" button active
    When I click "Add NFT" button within the NFT folder
    Then "Select NFTs" page is showing all NFTs that I have

  @LW-7185
  Scenario: Extended-view - NFT Folders - Adding NFTs to existing folder
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs extended page
    When I left click on the NFT folder with name "Sample NFT folder"
    And I can see "Add NFT" button active
    And I click "Add NFT" button within the NFT folder
    And I click NFT with name "Ibilecoin"
    And I click NFT with name "Bison Coin"
    When I click "Add selected NFTs" button on "Select NFTs" page
    Then I see a toast with text: "NFTs added to folder"
    And I see "Sample NFT folder" NFT folder page in extended mode
    And I see NFT with name "Ibilecoin" on the NFT folder page
    And I see NFT with name "Bison Coin" on the NFT folder page

  @LW-7187
  Scenario Outline: Extended-view - NFT Folders - Context menu with "Remove from folder" option is displayed: <is_displayed>
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs extended page
    And I left click on the NFT folder with name "Sample NFT folder"
    And I see "Sample NFT folder" NFT folder page in extended mode
    When I <action> on the NFT folder page
    Then NFT context menu with "Remove" option <is_displayed> displayed
    Examples:
      | action                                     | is_displayed |
      | right click on the NFT with name "LaceNFT" | is           |
      | right click on the add NFT button          | is not       |

  @LW-7188
  Scenario: Extended-view - NFT Folders - Closing context menu with "Remove from folder" option
    Given the NFT folder with name "Sample NFT folder" and 1 NFT was created
    And I navigate to NFTs extended page
    And I left click on the NFT folder with name "Sample NFT folder"
    And I see "Sample NFT folder" NFT folder page in extended mode
    When I right click on the NFT with name "LaceNFT" on the NFT folder page
    Then NFT context menu with "Remove" option is displayed
    When I click outside the NFT folder context menu
    Then NFT context menu with "Remove" option is not displayed

  @LW-7189
  Scenario: Extended-view - NFT Folders - Removing NFTs from existing folder
    Given the NFT folder with name "Sample NFT folder" and 2 NFT was created
    And I navigate to NFTs extended page
    And I do not see NFT with name: "LaceNFT" on the NFTs page
    And I do not see NFT with name: "Ibilecoin" on the NFTs page
    And I left click on the NFT folder with name "Sample NFT folder"
    And I see "Sample NFT folder" NFT folder page in extended mode
    And I see NFT with name "Ibilecoin" on the NFT folder page
    And I see NFT with name "LaceNFT" on the NFT folder page
    And I right click on the NFT with name "LaceNFT" on the NFT folder page
    When I click "Remove from folder" option in NFT context menu
    Then I see a toast with text: "NFT removed"
    And I see NFT with name "Ibilecoin" on the NFT folder page
    And I do not see NFT with name "LaceNFT" on the NFT folder page
    And I close the drawer by clicking close button
    And I see NFT with name: "LaceNFT" on the NFTs page
    And I do not see NFT with name: "Ibilecoin" on the NFTs page

  @LW-7259
  Scenario: Extended-view - NFT Folders - NFT folders sorted alphabetically
    Given I navigate to NFTs extended page
    When I create folder with name: "abc" and first available NFT
    And I create folder with name: "bcd" and first available NFT
    And I create folder with name: "cde" and first available NFT
    Then I see folders on the NFTs page in the alphabetical order
