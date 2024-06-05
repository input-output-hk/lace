export type TestWallet = {
  name: string;
  passphrase: string;
  password: string;
  receivingAddress: string;
  network: string;
};

/**
 * Represents a read-only test wallet with predefined properties.
 * This wallet shouldn't be used for any transactions, so its state stays the same.
 */
const PASSWORD = 'W@l!etL@ce123';
export const ReadOnlyWallet: TestWallet = {
  name: 'ReadOnlyWallet',
  passphrase:
    'hundred erosion fresh make pet salon pear glue warrior liberty unknown bargain grunt judge antenna picnic age wisdom act fluid huge service enroll carpet',
  password: PASSWORD,
  receivingAddress: '',
  network: 'preprod'
};

export const EmptyWallet: TestWallet = {
  name: 'EmptyWallet',
  passphrase:
    'arrive tumble judge vault syrup riot sauce rookie forest absent hedgehog prevent lawn rubber mountain catalog trade unveil license nephew resemble supreme move catch',
  password: PASSWORD,
  receivingAddress: '',
  network: 'preprod'
};

export const TransactionWallet: TestWallet = {
  name: 'TransactionWallet',
  passphrase:
    'tent capital supply all trip dash globe hen calm usage void filter year alert else dress oval fork feature similar cream rack expose trim',
  password: PASSWORD,
  receivingAddress:
    'addr_test1qpkgrnuapc5sgjt3pgeaj873pcyfrmngtpwzagwhz0dy9cf530w4xfnen7p95qn2s0xxg5sxf9mmm3qmr7tmtv0gj9tqfc6f9j',
  network: 'preprod'
};

export const NativeToAdaTransactionWallet: TestWallet = {
  name: 'NativeTokensTransactionWallet',
  passphrase:
    'usage bachelor hungry dwarf room text light theory rude clown hub flee lottery abstract repair twin syrup setup trim danger onion race picture coffee',
  password: PASSWORD,
  receivingAddress:
    'addr_test1qpk564q30tpp4qnllygeedzxxseyyp0gwzdj9cmrl25kwgdf2h23uu2kz95t468q9mrwllfqwhxd399rkqwpz9khchlsjqqpnz',
  network: 'preprod'
};

export const NativeToNativeTransactionWallet: TestWallet = {
  name: 'NativeTokensTransactionWallet',
  passphrase:
    'tobacco visit alien horror jazz because hospital flag weapon spike special season else boy stick blouse couple drastic afraid symbol vital food release problem',
  password: PASSWORD,
  receivingAddress:
    'addr_test1qqg2gdtx7yacm0rhemkmfdm0586hl29ktfwnqyd5xqsy4pydmf6464kfnfflrztn0gh4agtqnjrjtu0tgsazuv0ak2nqty37xg',
  network: 'preprod'
};

export const RepoWallet: TestWallet = {
  name: 'RepoWallet',
  passphrase:
    'rib mixture phrase episode thrive baby vast erosion reveal stand tree fork gesture write nest swap find vast evidence immune indoor industry toilet pencil',
  password: PASSWORD,
  receivingAddress:
    'addr_test1qzn8w9pjs34nta09zp74qe4p84tyzpl3unxq8l59x2h0csnednsdtnlg4f7el4cprfcs6wr0cn75nxt2xj4u323xyhlqqxqxhh',
  network: 'preprod'
};
