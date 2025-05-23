@NFT-Folders-Extended @Testnet
Feature: NFT - Folders - Extended view

  Background:
    Given Wallet is synced
    And all NFT folders are removed

  @LW-7259
  Scenario: Extended-view - NFT Folders - NFT folders sorted alphabetically
    Given I navigate to NFTs extended page
    When I create folder with name: 'abc' and first available NFT
    And I create folder with name: 'bcd' and first available NFT
    And I create folder with name: 'cde' and first available NFT
    Then I see folders on the NFTs page in the alphabetical order

  @LW-7228
  Scenario: Extended-view - NFT Folders - Trying to rename folder using name that already exists
    Given I navigate to NFTs extended page
    When I create folder with name: 'Sample NFT folder1' and first available NFT
    And I create folder with name: 'Sample NFT folder2' and first available NFT
    And I right click on the NFT folder with name 'Sample NFT folder1'
    And I click 'Rename' option in NFT folder context menu
    And I see 'Rename your folder' drawer in extended mode
    When I clear 'Folder name' input
    And I enter a folder name 'Sample NFT folder2' into 'Folder name' input
    Then I see 'Given name already exists' error on 'Name your folder' page
    And 'Confirm' button is disabled on 'Rename your folder' drawer
    When I clear 'Folder name' input
    And I enter a folder name 'Sample NFT folder3' into 'Folder name' input
    Then I do not see 'Given name already exists' error on 'Name your folder' page
    And 'Confirm' button is enabled on 'Rename your folder' drawer

  @LW-7177
  Scenario Outline: Extended-view - NFT Folders - Folder thumbnail when there are <number_of_nfts_in_folder> in it
    Given I navigate to NFTs extended page
    When I create folder with name: 'Sample NFT folder1' that contains <number_of_nfts_in_folder> NFTs
    Then Folder 'Sample NFT folder1' displays <number_of_nft_thumbnails> NFT thumbnails
    And There is a NFTs counter showing <number_of_remaining_nfts> of remaining NFTs in folder 'Sample NFT folder1'
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
    And I create folder with name: 'Sample NFT folder1' that contains <number_of_nfts_in_folder> NFTs
    When I left click on the NFT folder with name 'Sample NFT folder1'
    When I <action> 1 NFT to or from the folder
    Then I close the drawer by clicking close button
    Then Folder 'Sample NFT folder1' displays <number_of_nft_thumbnails> NFT thumbnails
    And There is a NFTs counter showing <number_of_remaining_nfts> of remaining NFTs in folder 'Sample NFT folder1'
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
    Given the NFT folder with name 'Sample NFT folder' and 2 NFT was created
    And I navigate to NFTs extended page
    And I left click on the NFT folder with name 'Sample NFT folder'
    And I see 'Sample NFT folder' NFT folder page in extended mode
    When I click NFT with name 'Ibilecoin'
    Then I am on a NFT details on the extended view for NFT with name: 'Ibilecoin'

  @LW-10454 @Pending
  @issue=LW-10634
  Scenario: Extended-view - NFT Folders - Search bar for NFTs
    Given the NFT folder with name 'Sample NFT folder' and 2 NFT was created
    And I navigate to NFTs extended page
    And I search for NFT with name: 'LaceNFT'
    Then I see NFT with name 'LaceNFT' on the NFT folder page
    And I do not see NFT with name: 'Ibilecoin' on the NFTs page

  @LW-10455
  Scenario: Extended-view - NFT Folders - NFTs details show NFTs path
    Given the NFT folder with name 'SampleFolder' and 2 NFT was created
    And I navigate to NFTs extended page
    And I left click on the NFT folder with name 'SampleFolder'
    And I see 'SampleFolder' NFT folder page in extended mode
    When I click NFT with name 'Ibilecoin'
    Then I see NFTs Folder path: 'Root/SampleFolder'
