import { Address } from './Address';
import { getTestWallet, TestWalletName } from '../support/walletConfiguration';

export const shelley = new Address(
  'Shelley',
  String(getTestWallet(TestWalletName.TAWalletDelegatedFunds).accounts[0].address),
  String(getTestWallet(TestWalletName.TAWalletDelegatedFunds).accounts[0].mainnetAddress)
);

export const byron = new Address(
  'Byron',
  '37btjrVyb4KC6N6XtRHwEuLPQW2aa9JA89gbnm67PArSi8E7vGeqgA6W1pFBphc1hhrk1WKGPZpUbnvYRimVLRVnUH6M6d3dsVdxYoAC4m7oNj7Dzp',
  'DdzFFzCqrhsoqZW6Se7eYLQ9GDb41idYxSeMHou7GvXdG2Y66RUofhgtMfwpEmwd67RHdTFASRcA2RWdd2w7CViBdMFeBvZNkNFiPvM4'
);

export const icarus = new Address(
  'Icarus',
  '2cWKMJemoBainaQxNUjUnKDr6mGgSERDRrvKAJzWejubdymYZv1uKedpSYkkehHnSwMCf',
  'Ae2tdPwUPEYvt58gUF8xAvK3ZmveAXA4ieXVvQQtyEvJwihF9fSfHVV1Hy9'
);

export const shelleyInvalid = new Address(
  'Shelley Invalid',
  'addr_test1vqrlltfahshjxl5sy5h5mvfrrlt6me5fqphhwjqvj5jd88cccqcek',
  'addr1qxntwt0uz4pu7syd8r00xsnp94lrrl8ymjpd4uhz27u6kwvtf9904fl986cjlftkfn46lzurdjvknzxsv3q5jl92h8psevdsg8'
);

export const byronInvalid = new Address(
  'Byron Invalid',
  '37btjrVyb4KC6N6XtRHwEuLPQW2aa9JA89gbom67PArSi8E7vGeqgA6W1pFBphc1hhrk1WKGPZpUbnvYRimVLRVnUH6M6d3dsVdxYoAC4m7oNj7Dzp',
  'DdzFFzCqrhsoqZW6Se7eYLQ9GDb41idYxSeMHou7GsXdG2Y66RUofhgtMfwpEmwd67RHdTFASRcA2RWdd2w7CViBdMFeBvZNkNFiPvM4'
);

export const validAddress = new Address(
  'Valid address',
  'addr_test1qqfxlxzvs4feuqzgavy0l8c7q59sgtmns5edvavpmfh6wrjz9gcwtvd8l32qm9z6c0rkctnzafjlsc6vta6fs8xrfajsdkmzyn',
  'addr1q9es9uenlf3kedxxzldrrsly92uczwc0hxf3juq82kkm20hftnqe247ykg7hj7xs5dzfhcdy9j64neqdh9xrn48w5t4q5h6rxq'
);

export const validAddress2 = new Address(
  'Valid address2',
  'addr_test1qp9xn9gwdjkj0w300vc8xgctegvgty2ks4n875zdzjkkzy3qz69wq6z9tpmuj9tutsc7f0s4kx6mvh3mwupmjdjx2fjqf0q2j2',
  'addr1qy0zksr23c60u72mx0k2zk5sh02269qfqxaxl0h64pppnp8t3rv6aqw8wv5v02js2cau0zlrgn6ft97qgsurgx6w94rqvusnqv'
);

export const validAddress3 = new Address(
  'Valid address3',
  'addr_test1qpln5lvjuhns6nkg2c8rc9fhnaayk8qlwwyvnw8tazwlrvht2n49u8a2j2h7jehhd8glddx3r45y2r9968cqayawcw8qceyt59',
  'addr1q8rlsdtq2wmwupmthr75a65zulgm6p68zrfwldu37d5jgq92czxaeszsrpztxlu0lnen044eqld72hnkq7yxvjhr8x8qwmxmqc'
);

export const validAddress4 = new Address(
  'Valid address4',
  'addr_test1qqvg0tyw8qqfytupx0q4mtdtrqejezyfxgxcljct3me2c46jchen5u9zc3dh6yteef4ncau93675sdtdpwenp0srqkxqy7m35q',
  'addr1qylm3qkg4fc0nryf8uuvrlxwar3quj948rrvlr2dzm735c80y5ef83qvkkrkd9vg4pt8v6xa5rsexvmxu56emyh2mjuq76cfa2'
);

export const validAddress5 = new Address(
  'Valid address5',
  'addr_test1qp4pnt8h82ya3ncukgz24e5n99s28z6sqwygmcjr6gwwuxllrre24l4aekm4ju432fxd5hcqdwhefks8pxj4vzz5aagsxzgu9q',
  'addr1qyce0xd6valqpgfse3cryladmle3en3tk2pp0mr4a9v8m0kapl5xlsj83597h2gfzsc3xmh23fw6x7haha6v9ags8nvqgkawk0'
);

export const validAddress6 = new Address(
  'Valid address6',
  'addr_test1qp359szgsge93nuvqsq2qxsd8s4l03ruwwdput6j9ccgnu3zxpm8x89fvmkrqhesn89awp4d69hh6055lx0wvz4p90ssxd99tt',
  'addr1q9qxfqcjz3uq4mevu7rnf5zefvk9gz8fnt7e2saq44qhcytj9hwek0yzxwfa3446amdf3f8sn070pp53p52pczfc0r4syd9k07'
);

export const adaHandle1 = new Address('Ada Handle 1', '$test_handle_1', '$test_handle_1');
export const adaHandle2 = new Address('Ada Handle 2', '$test_handle_2', '$test_handle_2');

export const testAddresses = new Map<string, Address>([
  ['Shelley', shelley],
  ['Byron', byron],
  ['Icarus', icarus],
  ['Shelley Invalid', shelleyInvalid],
  ['Byron Invalid', byronInvalid],
  ['Valid address', validAddress],
  ['Valid address2', validAddress2],
  ['Valid address3', validAddress3],
  ['Valid address4', validAddress4],
  ['Valid address5', validAddress5],
  ['Valid address6', validAddress6],
  ['Ada Handle 1', adaHandle1],
  ['Ada Handle 2', adaHandle2]
]);

export const getAddressByName = (addressName: string): string | undefined =>
  testAddresses.get(addressName)?.getAddress();

export const getAddressDetailsByName = (addressName: string): Address | undefined => testAddresses.get(addressName);
