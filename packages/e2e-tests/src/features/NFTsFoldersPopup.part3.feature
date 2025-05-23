@NFT-Folders-Popup @Testnet
Feature: NFT - Folders - Popup view

  Background:
    Given Wallet is synced
    And all NFT folders are removed

  @LW-7179
  Scenario Outline: Popup-view - NFT Folders - Folder thumbnail when there are <number_of_nfts_in_folder> in it
    Given I navigate to NFTs popup page
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

  @LW-7180
  Scenario Outline: Popup-view - NFT Folders - Folder thumbnail & counter updated when <action> NFT to <number_of_nfts_in_folder> NFTs
    Given I navigate to NFTs popup page
    And I create folder with name: 'Sample NFT folder1' that contains <number_of_nfts_in_folder> NFTs
    When I left click on the NFT folder with name 'Sample NFT folder1'
    When I <action> 1 NFT to or from the folder
    And I close the drawer by clicking back button
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

  @LW-7852
  Scenario: Popup-view - NFT Folders - Click NFT in Folder
    Given the NFT folder with name 'Sample NFT folder' and 2 NFT was created
    And I navigate to NFTs popup page
    And I left click on the NFT folder with name 'Sample NFT folder'
    And I see 'Sample NFT folder' NFT folder page in popup mode
    When I click NFT with name 'Ibilecoin'
    Then I am on a NFT details on the popup view for NFT with name: 'Ibilecoin'

  @LW-10456 @Pending
  @issue=LW-10634
  Scenario: Popup-view - NFT Folders - Search bar for NFTs
    Given the NFT folder with name 'Sample NFT folder' and 2 NFT was created
    And I navigate to NFTs popup page
    And I search for NFT with name: 'LaceNFT'
    Then I see NFT with name 'LaceNFT' on the NFT folder page
    And I do not see NFT with name: 'Ibilecoin' on the NFTs page

  @LW-10457
  Scenario: Popup-view - NFT Folders - NFTs details show NFTs path
    Given the NFT folder with name 'SampleFolder' and 2 NFT was created
    And I navigate to NFTs popup page
    And I left click on the NFT folder with name 'SampleFolder'
    And I see 'SampleFolder' NFT folder page in popup mode
    When I click NFT with name 'Ibilecoin'
    Then I see NFTs Folder path: 'Root/SampleFolder'
