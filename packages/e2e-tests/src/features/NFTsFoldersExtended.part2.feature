@NFT-Folders-Extended @Testnet
Feature: NFT - Folders - Extended view

  Background:
    Given Wallet is synced
    And all NFT folders are removed

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

  @LW-7228 @Pending
  @issue=LW-7632
  Scenario: Extended-view - NFT Folders - Trying to rename folder using name that already exists
    Given I navigate to NFTs extended page
    When I create folder with name: "Sample NFT folder1" and first available NFT
    And I create folder with name: "Sample NFT folder2" and first available NFT
    And I right click on the NFT folder with name "Sample NFT folder1"
    And I click "Rename" option in NFT folder context menu
    And I see "Rename your folder" drawer in extended mode
    When I clear "Folder name" input
    And I enter a folder name "Sample NFT folder2" into "Folder name" input
    Then I see "Given name already exists" error on "Name your folder" page
    And "Confirm" button is disabled on "Rename your folder" drawer
    When I clear "Folder name" input
    And I enter a folder name "Sample NFT folder3" into "Folder name" input
    Then I do not see "Given name already exists" error on "Name your folder" page
    And "Confirm" button is enabled on "Rename your folder" drawer

  @LW-7177
  Scenario Outline: Extended-view - NFT Folders - Folder thumbnail when there are <number_of_nfts_in_folder> in it
    Given I navigate to NFTs extended page
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

  @LW-7178
  Scenario Outline: Extended-view - NFT Folders - Folder thumbnail & counter updated when <action> NFT to <number_of_nfts_in_folder> NFTs
    Given I navigate to NFTs extended page
    And I create folder with name: "Sample NFT folder1" that contains <number_of_nfts_in_folder> NFTs
    When I left click on the NFT folder with name "Sample NFT folder1"
    When I <action> 1 NFT to or from the folder
    Then I close the drawer by clicking close button
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

  @LW-7851
  Scenario: Extended-view - NFT Folders - Click NFT in Folder
    Given the NFT folder with name "Sample NFT folder" and 2 NFT was created
    And I navigate to NFTs extended page
    And I left click on the NFT folder with name "Sample NFT folder"
    And I see "Sample NFT folder" NFT folder page in extended mode
    When I click NFT with name "Ibilecoin"
    Then I am on a NFT details on the extended view for NFT with name: "Ibilecoin"

  @LW-10454 @Pending
  @issue=LW-10634
  Scenario: Extended-view - NFT Folders - Search bar for NFTs
    Given the NFT folder with name "Sample NFT folder" and 2 NFT was created
    And I navigate to NFTs extended page
    And I search for NFT with name: "LaceNFT"
    Then I see NFT with name "LaceNFT" on the NFT folder page
    And I do not see NFT with name: "Ibilecoin" on the NFTs page

  @LW-10455
  Scenario: Extended-view - NFT Folders - NFTs details show NFTs path
    Given the NFT folder with name "SampleFolder" and 2 NFT was created
    And I navigate to NFTs extended page
    And I left click on the NFT folder with name "SampleFolder"
    And I see "SampleFolder" NFT folder page in extended mode
    When I click NFT with name "Ibilecoin"
    Then I see NFTs Folder value: "Root/SampleFolder"