/*
Some of token prices that come from https://analyticsv2.muesliswap.com/ticker are in lovelace
i did a script to get the ids of those that comes like this.
this data comes from https://api.muesliswap.com/list?base-policy-id=&base-tokenname=, internar API used in muesliswap app
quoteDecimalPlaces = 0 means that this token are in lovelace and need to be converted to ADA
*/
export const tokenInLovelacePrices: Record<string, { quoteDecimalPlaces: number }> = {
  '3f36f6048afc298de6254c6a7ecc0f5517cdec72875bb73c3dc5795a414d414e544953': {
    quoteDecimalPlaces: 0
  },
  '0029cb7c88c7567b63d1a512c0ed626aa169688ec980730c0473b9136c702007': {
    quoteDecimalPlaces: 0
  },
  '742ea5751fdebe89d5fde58303faebd1a1c17263b38e9c39c31b6b5e474e44': {
    quoteDecimalPlaces: 0
  },
  '2860ce8a9764ac8362efae31482842d4f0de083483712264e871be0b46495348': {
    quoteDecimalPlaces: 0
  },
  '5acc52d5696e52345aec108468050d9d743eb21d6e41305bbc23a27b4154484f4d': {
    quoteDecimalPlaces: 0
  },
  '04d157b43f07a4acbbaf3dd947309feb9542d4e687e4954309affdfe46454c4953': {
    quoteDecimalPlaces: 0
  },
  '0c442180dd6163682d8e03b271caefb4944a24412bdd07adafb04ccb50494e41434f4c414441': {
    quoteDecimalPlaces: 0
  },
  e333fead9f6b6561943c0bfce503d3b865428a9138e9c9c9ea15566650555a5a4c45: {
    quoteDecimalPlaces: 0
  },
  '1f4b1b277c9c001c1522727506a2cfb401a0d0ade069b0241f16f07d4849': {
    quoteDecimalPlaces: 0
  },
  c8d0879cacf27ac47674df9922fecfdc0d98c2f781fb72e28bbe64064d4e4445: {
    quoteDecimalPlaces: 0
  },
  '360152fd7de262466da84d7c1ef564e8732e3ba9c4426751a1b5e24258474145': {
    quoteDecimalPlaces: 0
  },
  c79a25118b06dddc9094a547dd534046ddf9efde264ae1ab9cdf777642756c6c79: {
    quoteDecimalPlaces: 0
  },
  b6798a74fb7441ef5f7af1ff4ea6150bbb7aaeb0aca0113e558592f6584449414d4f4e44: {
    quoteDecimalPlaces: 0
  },
  b0446f1c9105f0cc5bb6bd092f5c3e523e13f8a999b31c870298fa4051554944: {
    quoteDecimalPlaces: 0
  },
  '73719bfda16e672605fda1e3f20824065585073499a7ce6ab55c2adf474252': {
    quoteDecimalPlaces: 0
  },
  '205cc20792cc7b762666e0fffa1ba615f354409ab20166892f9330be4144415949454c44': {
    quoteDecimalPlaces: 0
  },
  '3dd8392365f62eb7970722c1b6163edfd2108629af4271c0e6a556a3434f32544f4b454e': {
    quoteDecimalPlaces: 0
  },
  dca54ecf37b0e3af2fdfd336e1d21fadcc45b3261b0f73a095631dfe444f4558: {
    quoteDecimalPlaces: 0
  },
  '90f876de40014e0049cb01db5a314a27cfb1bf9de1dc40e0addc0ede424e42': {
    quoteDecimalPlaces: 0
  },
  '5e99f52751a61904da6d3511a9445ef372b39ec80bf6388eeabbc0cd5052494e5452': {
    quoteDecimalPlaces: 0
  },
  '3d0e1663a87b328d271f60515f7ccb67a126474463cf33430dfac72b55534454': {
    quoteDecimalPlaces: 0
  },
  '9edb1ba111ab8ecac8d16fccbf3c92330f40be9ddd31bcaaf031dad4464c4143': {
    quoteDecimalPlaces: 0
  },
  '0f17cf1e7d39a6276ae768799b6de376bac7ecd089c883e0396fa1164b414c': {
    quoteDecimalPlaces: 0
  },
  '7bb88ec010b1d7db864b93bba775a19ea808353c25dbf4eb0838a8394d69646e69676874': {
    quoteDecimalPlaces: 0
  },
  '5269b864a26c3bf692635e840b480299e5ca31142811bd61b4bdf8f7504f52545553': {
    quoteDecimalPlaces: 0
  },
  c502b95d98bb47e7e6b7c9a2f0ae37a97e71058a20bf9ec4b198578f444f4747: {
    quoteDecimalPlaces: 0
  },
  '39b71755a3be04599451b0e841fa27209266f338308c84ace47b99c84d494d53': {
    quoteDecimalPlaces: 0
  },
  '641f0571d02b45b868ac1c479fc8118c5be6744ec3d2c5e13bd888b65a4f4d424945': {
    quoteDecimalPlaces: 0
  },
  '2c85a478d53f0e484b852c357e56057dfd8e80a6b72ecb4daffe42e544444f53': {
    quoteDecimalPlaces: 0
  },
  '9f452e23804df3040b352b478039357b506ad3b50d2ce0d7cbd5f806435456': {
    quoteDecimalPlaces: 0
  },
  ad1c1ed3a0bb6f83630ef052a31b71ba3287bf4bafa8370758f14d315349434b: {
    quoteDecimalPlaces: 0
  },
  '4af8016693578c58f943688d4e3f3d599b3a56d7b7d329b4c55c174254574954544552': {
    quoteDecimalPlaces: 0
  },
  acc223f15f040ae7a355ae84b489aa52a94b77a9a61d73c156514124466f756e64: {
    quoteDecimalPlaces: 0
  },
  b9befaf6d58079a8df618555d6371c02029b03b99db6f5b0c9bb2635485043: {
    quoteDecimalPlaces: 0
  },
  '823f7c8e25ee35f368daf2c9b6b4783c1d9a763eb5227b50b095f6c2446a656469': {
    quoteDecimalPlaces: 0
  },
  b24a29b9c16d349df16d9b5553b119e399e46ae19d6150c1a843ef61646964697473: {
    quoteDecimalPlaces: 0
  },
  '478ac73ae45d58572ea2d8bf6fff413596e017d6278feca72305b948434c5652': {
    quoteDecimalPlaces: 0
  },
  '320e3da27c6373e4bc045d7332c734ac393917755eb6b7689ce35ddb50524f5054454341': {
    quoteDecimalPlaces: 0
  },
  b58f78a22d5f45dae1c8aa1a261efb8a67439e7ba17f5d8e99e26f85466f727452756e65: {
    quoteDecimalPlaces: 0
  },
  '4cf268bd648f088ac9901bfa5a43f49610f7bdcae3a6eedc5e201fc3434f434f': {
    quoteDecimalPlaces: 0
  },
  '8ebafefaa249a462ee873d227928fe4ea80de1d0306e4eeace241ad0575454': {
    quoteDecimalPlaces: 0
  },
  efeb309a02323634a05993abfadc8c9cccd3ac8631ad5ee0befd81d5544558494552: {
    quoteDecimalPlaces: 0
  },
  '8c694462d80c490adcec738e53840c5eafa0f63f70d2f9303c8ab6c74d48454c4c': {
    quoteDecimalPlaces: 0
  },
  d2442fa6d08c72811d4bccdb36d0cb35cb28f4db4c5793ef00aff5f1244652414354414c53: {
    quoteDecimalPlaces: 0
  },
  e8e1f503a9ee5e2973ca444692b7c6319fe73e41dcfa7c4cba60a6d34a6f696e74: {
    quoteDecimalPlaces: 0
  },
  fae630fc793b5bb14735616b6f28cfae6d81a82ec05ecca98da3aedc544144: {
    quoteDecimalPlaces: 0
  },
  '56673962a054070732569178ba2b3e1cb591e3413ecd7b57a9e3f18b4245414e53': {
    quoteDecimalPlaces: 0
  },
  a6124329634b5c500fefbbbeb78c76c6a6560806700e234b7a812db04652455941: {
    quoteDecimalPlaces: 0
  },
  '0c78f619e54a5d00e143f66181a2c500d0c394b38a10e86cd1a23c5f41444158': {
    quoteDecimalPlaces: 0
  },
  f09deff3d6fe282874ac5c3c541f566cfe5ecec9058b814f1acd074262624c6f6273746572: {
    quoteDecimalPlaces: 0
  },
  '012d80d846ef2563d02dbb5d1a2b99f621167dbec4a9e48c4b232105535047': {
    quoteDecimalPlaces: 0
  },
  ed08f15a431de9ec271d3227cdd83278eeba54b9a80f3dd77a514e185155454552: {
    quoteDecimalPlaces: 0
  },
  '6b8b984865983965ce5fec2cf864e2325527bb5153d61f5aa7e9b482494645': {
    quoteDecimalPlaces: 0
  },
  a9a7006b174be93b77aaf2597479aacc1f74193f4571d0d6d73c35c8504f494e545a: {
    quoteDecimalPlaces: 0
  },
  '9a8013f453e18e359a4ff04687accfe95ddea58e50d25de8656eba4a54686520476e6f6d696573202d20476e6f6d652049736c616e642062656174':
    {
      quoteDecimalPlaces: 0
    },
  '74932a125bc626a69a836691d9e23dba9f02e7433f28c3d19577d30e47484f5354': {
    quoteDecimalPlaces: 0
  },
  f0b63bb98a30166333b0c92b54ff8b9ec9d40ef48e991ce86d6cd4ef524144546f6b656e73: {
    quoteDecimalPlaces: 0
  },
  '325131448fed69a9492fba814a7231fa3c53bab57f5207872099daec52484f44': {
    quoteDecimalPlaces: 0
  },
  '3ad549db675f4c52f2f3b5a84d8c4349d17982d39ec5be0063f74de04d55534943': {
    quoteDecimalPlaces: 0
  },
  afb2761a173c9b1d17c09f77cd0e76a843b21f13974da292abdfde72596f616e: {
    quoteDecimalPlaces: 0
  },
  a3bbcab3c60de005248e10c8ef07b2ce0c1d8a5805c6214feeb4b6ce48414e445a: {
    quoteDecimalPlaces: 0
  },
  '875dfa68bd2005999bc3dd0032fb816f5231760772c337bc9a3b128b504342': {
    quoteDecimalPlaces: 0
  },
  a9520e6b8b38deaf63316131574705c491fa6c49218cec3b126e6bcd445377697373: {
    quoteDecimalPlaces: 0
  },
  '715d89545d6ce3cfca7680b216a3f327ee61d377732431049ed0b2405368726f6f6d': {
    quoteDecimalPlaces: 0
  },
  '0029cb7c88c7567b63d1a512c0ed626aa169688ec980730c0473b9136c702024': {
    quoteDecimalPlaces: 0
  },
  '2e18f0e1d386bb75c4be7ae6b9c544ef916cae37b9c5567172a1053e5854': {
    quoteDecimalPlaces: 0
  },
  '33774e95986b6effc339886824aac6a566bcd8b11b6b59f4ab09545f43414441': {
    quoteDecimalPlaces: 0
  },
  '2c1bb1c8ccde56c5d2a1c485f0681a43165691c6c1114302bd8a79d6424348': {
    quoteDecimalPlaces: 0
  },
  f59bf53502caff7cf596113b524120fa2920c5e1076f422a3d27b2cf444a4544: {
    quoteDecimalPlaces: 0
  },
  e2087044f1a5028aec705eb05609370754d64587adbdc27eeb33005854414e47: {
    quoteDecimalPlaces: 0
  },
  d5fdd9d4b2349b3ea7f3100ba5832f8f8049b4f82d13951f0970295652555348: {
    quoteDecimalPlaces: 0
  },
  a8a1dccea2e378081f2d500d98d022dd3c0bd77afd9dbc7b55a9d21b63544f5349: {
    quoteDecimalPlaces: 0
  },
  '60a91bfe48ee416f26db9e000d39dcd1c0be95ec7286b62a309f538f50554e54': {
    quoteDecimalPlaces: 0
  },
  '4d9d90b748b83d6d073aec6a3c25df7987aba5c8ee34eed6794ac5924348524f4e4943': {
    quoteDecimalPlaces: 0
  },
  b34b3ea80060ace9427bda98690a73d33840e27aaa8d6edb7f0c757a634e455441: {
    quoteDecimalPlaces: 0
  },
  '009f88446daf6bace9bdcb3a3ebe522d0e1fb862e2eaba0aac48f5cf4e544c': {
    quoteDecimalPlaces: 0
  },
  '31b52d8b92dcb228555bd32c1eccd7ca3ced2b7e6334f748d7d8238b44495254': {
    quoteDecimalPlaces: 0
  },
  '88691a70bb0fe49cf9124b4f78553c36c09fa6264844e2b2941191734575736b6f': {
    quoteDecimalPlaces: 0
  },
  '564a5265a77d07b5079fe41025362903f30272b49abc92d0bea425ea737043': {
    quoteDecimalPlaces: 0
  },
  '6d5a1b23861fd4b301ba811c78464b767e18c1f25f70db6a96fb1009536167696e6177': {
    quoteDecimalPlaces: 0
  },
  '04ee2649faded5397274773a9d1c3617cf105a69f89a0fec070045e7535431': {
    quoteDecimalPlaces: 0
  },
  ab3eb4cc1abc0a6674307221064a4bcfe4c71a496d72b9081819ff7e4172726821: {
    quoteDecimalPlaces: 0
  },
  c4c00fbd8fa227442a5e7cdecde33b24588494d05a2c50fda8938c6d4b49445a: {
    quoteDecimalPlaces: 0
  },
  da77b272cf9effc9753c098d9b4c6b432ae1024fc666690e02590ba74361726461746f72: {
    quoteDecimalPlaces: 0
  },
  '2a11559fb282e4eed9d070e4be579955946ef07349a660e7896a4ab0534558': {
    quoteDecimalPlaces: 0
  },
  d64426fcdd43230024174890eca2455f1a307d9335dca980ace0d10f457468657265756d: {
    quoteDecimalPlaces: 0
  },
  '5ec2e9813fa385d9333d18186d8257d1b3ebea97bdec2dad74026d8d50554743484950': {
    quoteDecimalPlaces: 0
  },
  '9d542ff00d7c8af217f5d669e51b8ee065f84f02dc4e628b6850dccf4455505059': {
    quoteDecimalPlaces: 0
  },
  '57684adcb032c8dbc40179841bed987d8dee7472617a0e5c25ef414059617953776170': {
    quoteDecimalPlaces: 0
  },
  '8dac0fe20a35f0992d44088ad15acb45ee15185a7c8a1ff6df09d4434d494e': {
    quoteDecimalPlaces: 0
  },
  ba94ebd43273e746212efa82ee89abd24356454482853b799d5834cf43434343: {
    quoteDecimalPlaces: 0
  },
  '969eb4e955fae1904fce1c22d1b2069c087835c3dce2a177086100394e4954524f': {
    quoteDecimalPlaces: 0
  },
  '9ad3d0606caaa87f4536f0d08d36b4819fb46237cd4349a728b96800494e4b': {
    quoteDecimalPlaces: 0
  },
  '961f2cac0bb1967d74691af179350c1e1062c7298d1f7be1e4696e312444455250': {
    quoteDecimalPlaces: 0
  },
  f2fe9aafd2e5b3b00e2949a96d44a84d9f4d818d63945010a466a4ae4155444954: {
    quoteDecimalPlaces: 0
  },
  '208a2ca888886921513cb777bb832a8dc685c04de990480151f1215053484942414441': {
    quoteDecimalPlaces: 0
  },
  '1408d4e68d45a9af7f00e2da46630b46e6d9ed0aedcb2185b799b88852756e696344757374': {
    quoteDecimalPlaces: 0
  },
  '4e49f1f7837af9717e75b2c0d5889ebd9a7c83c5b6181acbbc3a2a41525442': {
    quoteDecimalPlaces: 0
  },
  '0de501324fccf0ea4a08c333f9dbd2a7453eeb8037e0f7559c23a1a5534f4c4944': {
    quoteDecimalPlaces: 0
  },
  f381ff151bd0f2b7d39d8c48134f87ef2aa586a1f28f4d95758b078d564c58: {
    quoteDecimalPlaces: 0
  },
  '407ca40d92693cb737f1cfedb98023ae753038d8c6ca9e02483d79c6524e52': {
    quoteDecimalPlaces: 0
  },
  '443a86883085847d95f36c74b422fcf64c84d76594b1c22745323fb5476f74636869': {
    quoteDecimalPlaces: 0
  },
  '4e2939572460b319366c16323567b46acea1667506f38fd993e5623f5052494d45': {
    quoteDecimalPlaces: 0
  },
  b1ebea36cfe204a418dcab6a6e95ba9866eaf16da7c4281fb255c7de4341494154: {
    quoteDecimalPlaces: 0
  },
  '7c00173e45be74a33ce224d36b6443090788299a99ff26dca0d8818546414d45': {
    quoteDecimalPlaces: 0
  },
  d98ace8c0f4a2e5741e7fd6bd92092c08c45d00306f87f910c6c1e134d41474d41: {
    quoteDecimalPlaces: 0
  },
  d096fcad17604f7f2c4ce4360b73527f5dab0ce14c5cf5d89a582469415055: {
    quoteDecimalPlaces: 0
  },
  d894897411707efa755a76deb66d26dfd50593f2e70863e1661e98a07370616365636f696e73: {
    quoteDecimalPlaces: 0
  },
  f6d22be2b858e8a074c14cba92cc0863aa6d46368b35c0a99e92e228426967697479: {
    quoteDecimalPlaces: 0
  },
  c1b52de984edf35066439cd231683683040a8a669913e4ede85c0bb14c696e64614c6f7665: {
    quoteDecimalPlaces: 0
  },
  '4382b7f59a120318da2ee221d5450801601e8cfcafab4a4ae66fdf5174555344': {
    quoteDecimalPlaces: 0
  },
  d3558649b7874a1a596378515f9b80da63e73f324439ea113d34c9bb42454147: {
    quoteDecimalPlaces: 0
  },
  '3d63964527efea27f0e6dcdd314b68bf8c9fa34249d3989d49007c6a4d454f57': {
    quoteDecimalPlaces: 0
  },
  '5abf6e0c07e01aed229a7e8409fd8145412bf2c95d313ccb2da806ee63544f5349': {
    quoteDecimalPlaces: 0
  },
  '141de94d882e6426622898984d8861c4a69e0da5df8c930177926dd9534556': {
    quoteDecimalPlaces: 0
  },
  '8e7e4e43cd201c17ec5766be7e6dfc7b320688e25a38d6797266cdd05a494c': {
    quoteDecimalPlaces: 0
  },
  b026539740f339249ac47ec32516b65b9c9047609fe23aadf020d3cf434152414d454c: {
    quoteDecimalPlaces: 0
  },
  '516fb6427b52947fc183293f0d8387e598318dfc4245fb6e6f7ac9f9444958': {
    quoteDecimalPlaces: 0
  },
  '6d80a73c2510b0809743b76d8bfbdbcb24f3c1c573acabdbd4dadb5d43525558': {
    quoteDecimalPlaces: 0
  },
  '9fa7ce87ac9c6405684eb58b0baae8707cf89f8eb0cdfdd683134872534d4f4b4553': {
    quoteDecimalPlaces: 0
  },
  '884892bcdc360bcef87d6b3f806e7f9cd5ac30d999d49970e7a903ae5041564941': {
    quoteDecimalPlaces: 0
  },
  '8cf66d8c74af3aa53ba498b0d3f18a21f7ed3d12128850bb2b61146d61706578636f696e': {
    quoteDecimalPlaces: 0
  },
  '1111170eb2f1fc2eaf1ea6503c0160eda20de2a84418f988720a7c8e4b525950544f': {
    quoteDecimalPlaces: 0
  },
  '4f771973824f79fff176fe5cc0f29f5f5331a4692e5aa9a0bd0cdde6415058': {
    quoteDecimalPlaces: 0
  },
  '2edc63d29e94747f7ef65df559260c994d2ecfe208ac6afa564517384b494e47': {
    quoteDecimalPlaces: 0
  },
  '750900e4999ebe0d58f19b634768ba25e525aaf12403bfe8fe130501424f4f4b': {
    quoteDecimalPlaces: 0
  },
  fef62c356a35a92ac893529d9d1a0cc53740b5c0d2987fb9671482ad4144414c: {
    quoteDecimalPlaces: 0
  },
  '383cc2bb05799184cd9b31a0567f12dca42740bee8e1f7971da2b0604461726b476f6c64': {
    quoteDecimalPlaces: 0
  },
  ca942cb8bb5d1ef750766ded355f320880539111f10efa2b1a478ff9524147: {
    quoteDecimalPlaces: 0
  },
  e629ee88f6dcad8948e420b929e114c8785e2d4fb9d5c077157a3b37424c5550: {
    quoteDecimalPlaces: 0
  },
  f9a2d8ef86d5d90383a8da97d5798de9430d0d0f95c105b2249634f446414c434f4e: {
    quoteDecimalPlaces: 0
  },
  bdb184eadfa9fb6b584e2d16e1a1a738eb80b47752387cf064ac5d16525547: {
    quoteDecimalPlaces: 0
  },
  '539aeefaf917fe42b65018bf76fa7933c1737f1af92d8ca192ed38c54447454d53': {
    quoteDecimalPlaces: 0
  },
  '0a7e1425cc3e2429208a70867301571c3987b2d7ba8ec50a9153085a474f44': {
    quoteDecimalPlaces: 0
  },
  '722c45e8ba2a3c399cf09949abe74546ecb75defb8206914085dc28e434458': {
    quoteDecimalPlaces: 0
  },
  '59b7bcc2c1837bbd60d29d378db5c9790e18a948c86f28cd36bad00e5753484942': {
    quoteDecimalPlaces: 0
  },
  '6194158d24d71eca5cc5601c45de123bf78d02c297e851be2608810a44454144': {
    quoteDecimalPlaces: 0
  },
  '2afb448ef716bfbed1dcb676102194c3009bee5399e93b90def9db6a4249534f4e': {
    quoteDecimalPlaces: 0
  },
  '86f2bf5e9fbfe6d9a3cd2bfc8e4a9890093db5792ea7425a294356c64c415a59': {
    quoteDecimalPlaces: 0
  },
  b51cfb0728a3901b1c949b88ff4a75a495a80935b5a8e27664eb997747524547: {
    quoteDecimalPlaces: 0
  },
  '2aa9c1557fcf8e7caa049fa0911a8724a1cdaf8037fe0b431c6ac66450494759546f6b656e': {
    quoteDecimalPlaces: 0
  },
  '62c25da0792c3c887fe5e723abcc48db9d49ff0fa3ee5664844f4632434c414e': {
    quoteDecimalPlaces: 0
  },
  '163c599495c3d329054548fbd57a336659e3c1a3df9eba641268d02138393634': {
    quoteDecimalPlaces: 0
  },
  '6394b7c94d47d97761ca8007e3498eef419cddfbea088d1eda20bd12524f424f546f6b656e524f424f': {
    quoteDecimalPlaces: 0
  },
  '84c42a098a4d167692fb4b3af21897ab3077ae6a916c3453ea982e7a4e4e44': {
    quoteDecimalPlaces: 0
  },
  '88ce08e1a232747ee8964662f961e37775271590379b0748a21390aa41464c4f4b49': {
    quoteDecimalPlaces: 0
  },
  '31be0db77af0f3d74281cb973c0476210574daa00f76b8e2b82065254e4f444f': {
    quoteDecimalPlaces: 0
  },
  '17393adb7e95d31bf993cab08781026af17bcbffb95ae18fd5e23743444f47434f494e': {
    quoteDecimalPlaces: 0
  },
  baac8e324e1431190c3eb253ea46155a09347514ae3bb3b1685a2cb3425443: {
    quoteDecimalPlaces: 0
  },
  '8c7ac772868754aedb7b8283e80a04930e149b1c8133d008beabc58a434e4f44455a': {
    quoteDecimalPlaces: 0
  },
  '82bf40616a0c032c0fd068eb23176ca398e73b99ae93afc3bab6830a474d423734': {
    quoteDecimalPlaces: 0
  },
  '0fdaa1b8699080ed281faec8dfae54531d07f37fe9a4bdd8f0733e2e44414e4345': {
    quoteDecimalPlaces: 0
  },
  '60177671fc7a7f28b3db19abf33837297ea12ee62310c4272f8359f66e3131': {
    quoteDecimalPlaces: 0
  },
  '029e844cbbde5a126c4c4c2bdf7a2c419c78685ec714b0549f8c0b8b534255434b53': {
    quoteDecimalPlaces: 0
  },
  b4273f1d8d0021d188784c3d72dc514f602b7ab8cfb87e3134550c42446f6765414441: {
    quoteDecimalPlaces: 0
  },
  f8f93eb8a7250a9966ebfa83774fb0a63ef1a0070955dc4e906f3f8b47484f5354: {
    quoteDecimalPlaces: 0
  },
  '18e8f810abbb9686434675d8fbf7dee0b47f33cab4c5cbaf21cafbdc4175746f': {
    quoteDecimalPlaces: 0
  },
  '7daff8880bd3d04dd7a0d87c241960f94cbf8b614e801bce3834889354494e4b': {
    quoteDecimalPlaces: 0
  },
  '7a72f9007e5200cdd32840a9d5cfb0963d68083962fb96a8c61458f8706965746f6b656e': {
    quoteDecimalPlaces: 0
  },
  '574aa3d956c3fa6f13f93c8c26fffe1226adef9ae6ea6d8e3b6f3c4c43617264616e6f204b69747479': {
    quoteDecimalPlaces: 0
  },
  '3591d17106a7868be5c57af2ac7670638d11bb43284811dfd46461f24341534b': {
    quoteDecimalPlaces: 0
  },
  '3545bf109a4f2c020eac89cf5652608b57986128c4ab8d6f0c375f09434f4b5359': {
    quoteDecimalPlaces: 0
  },
  a1c1e3811c5adb591e026164a519eaf3d2708ee02e5712f891f80b78464142: {
    quoteDecimalPlaces: 0
  },
  '05ded3e66d6413f90908e65d14ca3cc1456a5f650e79a8ad93414cb252554747': {
    quoteDecimalPlaces: 0
  },
  a561173b1e3f145933f94351f79e16b6f90dc8d549ac6f26867233c04144415045: {
    quoteDecimalPlaces: 0
  },
  '6787a47e9f73efe4002d763337140da27afa8eb9a39413d2c39d4286524144546f6b656e73': {
    quoteDecimalPlaces: 0
  },
  '1b3b5cf239766bc74bcc48ce36704bc036cb901ee3066817631475a346475054': {
    quoteDecimalPlaces: 0
  },
  '63766427b4499dd678cb8b715dec3265dd292279ce7779447e3651e54b4f5a': {
    quoteDecimalPlaces: 0
  },
  f14ff85e85032a35ff5bdb2e5e6b64c0dbc3c0187d112217b93e9172464f535441: {
    quoteDecimalPlaces: 0
  },
  '400c0b1999a9ef44530c07b6fd869062e98543bb498112e23531bdc94f5449434f494e': {
    quoteDecimalPlaces: 0
  },
  a09364004043714d039cc477a1827e3587ca8ab13e4a34956daea28b524f47636f696e: {
    quoteDecimalPlaces: 0
  },
  '231deb37ef169dcf47d720cb3d09fccb6c1915f88638204290b1458a617274': {
    quoteDecimalPlaces: 0
  },
  a95d5cd69cc9c2f4ad196ebcbb368911997a47860aab84b73a6a03d94c4f4341: {
    quoteDecimalPlaces: 0
  },
  '127fb4d51dc05d6b8a58aba62c1e0d9a3f6a702026a22059f434e63242616e616e61': {
    quoteDecimalPlaces: 0
  },
  f7c777fdd4531cf1c477551360e45b9684073c05c2fa61334f8f9add5665726974726565546f6b656e: {
    quoteDecimalPlaces: 0
  },
  c6858bf415003dc023c73eb5ca8a6d39ab2d27cb0e30f67aad199cb34f5354: {
    quoteDecimalPlaces: 0
  },
  dba8e004cdec2ac9d53b8aad67b1d6527dffe99a2efe3a1ea04a00d24144414d415253: {
    quoteDecimalPlaces: 0
  },
  a134724e20a26031a75ca1bc8effc60d3beb667c449c95d91587b137486f736b696e736f6e323032325768697465626f617264: {
    quoteDecimalPlaces: 0
  },
  '3b433170eafee93e0bb60be76fca39db2f9defba6f1d7fdaf8691a54416b616761646f3235': {
    quoteDecimalPlaces: 0
  },
  f8654cd7f6c6ed31ee8b091743bb1828d96ffe5369945ddd0a1f502853414e545249: {
    quoteDecimalPlaces: 0
  },
  '354a6c0acd846b195768ead31c92693ad26d82ba013e7df5d9777081514149': {
    quoteDecimalPlaces: 0
  },
  ad31cd361c61857656bc772f689a709edec81c565cff1372f0260a234e5458: {
    quoteDecimalPlaces: 0
  },
  bff3c039ab9274e30b129694085268e44cc0e516a42e5bdda7f4e8b8556b7261696e65: {
    quoteDecimalPlaces: 0
  },
  '0813ad03a12ef3f24acc2daca1ed1e8a0163f69dcabb30655a9e800f53655361': {
    quoteDecimalPlaces: 0
  },
  '11e1bec40d325ea9593bb5e481c51f74f903a036692e916fbb6feae25041525459': {
    quoteDecimalPlaces: 0
  },
  '6acb7c816f839148e2140427b181662380e3074616cbcfb0e644df9a634d455441': {
    quoteDecimalPlaces: 0
  },
  fb47280589dfd58b8423aa93cc0b2b8252288b5344ef3c43084ac6634c4344: {
    quoteDecimalPlaces: 0
  },
  '86b116d8cfd880445825208b4a355b7715b63763d6d8f3d37338d211657465726e616c': {
    quoteDecimalPlaces: 0
  },
  a4da8764a57e66a0085b5bfcde96c89b798d92ee83a75f59237e375b46495245: {
    quoteDecimalPlaces: 0
  },
  c2118eda39aecab66dda2915346c596de07de391f5f5e610edbac0624f4652: {
    quoteDecimalPlaces: 0
  },
  fa3f6e861fd095e3b3032897dcd3a2e730a3827c1b675d6a9c3284e64e4d4b52: {
    quoteDecimalPlaces: 0
  },
  '21c26b0c4d1cb37225374c96f38df70ecffd808bbd7f1aae23d8b3e37461696c73': {
    quoteDecimalPlaces: 0
  },
  '6d82a79eb013124b41166f81c3f2e75f127495306784fab8e30113bc5452554d50': {
    quoteDecimalPlaces: 0
  },
  e7f3b59d695b0ff827a41f3df330bc7cf4d6327dea856473182e810d43415048: {
    quoteDecimalPlaces: 0
  },
  '79ca3fff9bb5b46fdf20ce225298ed89f4930c0bed32fdf0f6a2413848415256455354': {
    quoteDecimalPlaces: 0
  },
  '29ec1590e878fc82e1d5f22de0e139c0ede1be484a91d131a4ea10925452554d50': {
    quoteDecimalPlaces: 0
  },
  ef71f8d84c69bb45f60e00b1f595545238b339f00b137dd5643794bb425552505a: {
    quoteDecimalPlaces: 0
  },
  be6b8eb8d933901999e2cbc1f5efdc4da47e038ccdd0a4cf633ff57a4567675368617264: {
    quoteDecimalPlaces: 0
  },
  '5029eeccd52fef299509d509a8318fd7930c3dffcce1f9f39ff11ef9464743': {
    quoteDecimalPlaces: 0
  },
  '10a1b74dec474a68607e7e93977d2709a9b0ef09ed49d10f8a8b3ba543617368657746': {
    quoteDecimalPlaces: 0
  },
  '9ff14600a3fdaee6da3b1e3d227e2235d1fad199c3691ba2c7d8665a4d415253': {
    quoteDecimalPlaces: 0
  },
  '48d67fb303c89ed4297a95af6952a0195326ef4116ce29a10907942747616c676f': {
    quoteDecimalPlaces: 0
  },
  d01794c4604f3c0e544c537bb1f4268c0e81f45880c00c09ebe4b4a74d595354: {
    quoteDecimalPlaces: 0
  },
  '873e62c27604ec4ae6bfa0bb912bd45a207d2b0f135860bc90bb2836534b59': {
    quoteDecimalPlaces: 0
  },
  cb009feb09db32f159ec0decff7aac7e7469cbb35fe623d965fe9dc35a414441: {
    quoteDecimalPlaces: 0
  },
  '240fb00eff73acc51c09e81dae6628c4bedb9964151d45e3faed874f434c4157': {
    quoteDecimalPlaces: 0
  },
  '300ec0d82a79acdc0616fdc0ef615e7deeddb03275e834685e9ee8a65854': {
    quoteDecimalPlaces: 0
  },
  a00fdf4fb9ab6c8c2bd1533a2f14855edf12aed5ecbf96d4b5f5b9394334: {
    quoteDecimalPlaces: 0
  },
  '0171c997b8853fde686763d93b36ab8e04ce947bb6aa09a9ee5c4401544f4b454e': {
    quoteDecimalPlaces: 0
  },
  '6af4cfb45f660769c6421c81e0c5793f38c1c238fd9104b285c37520462a2a6b696e6720436f766964': {
    quoteDecimalPlaces: 0
  },
  dd36edc829921044b1eda0932538b11c4c31d02e68955a6b6e3e2762544f5054414c: {
    quoteDecimalPlaces: 0
  },
  '2441ab3351c3b80213a98f4e09ddcf7dabe4879c3c94cc4e7205cb6346495245': {
    quoteDecimalPlaces: 0
  },
  '1d896f02622ef78a9abea3c060c6c70460fa9ba72f8041078fb5263c5452415348': {
    quoteDecimalPlaces: 0
  },
  '3010f2093bab0dca73f3ab6e6c1825f0088a86d94d375986e21ae4a36e616b61': {
    quoteDecimalPlaces: 0
  },
  '14ff74cecca10a457485d07d821effdd4627210d31559f83616a73e64a55585441': {
    quoteDecimalPlaces: 0
  },
  '2c96f49b6e6e32ae69a182e85b74db4edfc9539496a13ab76d1258fa434e54': {
    quoteDecimalPlaces: 0
  },
  '98f963154beab3be34c90f7e4c12744b26354686a66e9a545bfa2d8648465350': {
    quoteDecimalPlaces: 0
  },
  '0a50fef0531ad801149ba033b6ed2d4832d59d24e7e9e57c41c9033d4d4153434f54': {
    quoteDecimalPlaces: 0
  },
  '8f52f6a88acf6127bc4758a16b6047afc4da7887feae121ec217b75a534e4f57': {
    quoteDecimalPlaces: 0
  },
  '38c48618248b78626a5cae1f5e41ef356ab216efc8f9200a370dbee64745574f': {
    quoteDecimalPlaces: 0
  },
  '4baf6493c40c06e6e8977e9a768b1552d16a98ad8e7116cca675502857476c6f76': {
    quoteDecimalPlaces: 0
  },
  '925930d4213fb8836878caed29692988ca608a66e96dd3a85e7487bd414c474f': {
    quoteDecimalPlaces: 0
  },
  f555c46bad0731d080c9381d7fff6f82839946a66bd070d185e1ea2f42444f4745: {
    quoteDecimalPlaces: 0
  },
  '71ccb467ef856b242753ca53ade36cd1f8d9abb33fdfa7d1ff89cda3434643': {
    quoteDecimalPlaces: 0
  },
  bf5694fa93f4c8228d14a8db2b8b653a23304af922bc2f992ea24eec6955534474: {
    quoteDecimalPlaces: 0
  },
  '324a920a1b2ff3c86523849931421d6baf106136bce11ad484e8339d2846414b452920414441': {
    quoteDecimalPlaces: 0
  },
  eec5d59c40cefe2e23a568e70328f3667c23fa2c586b98db7c9f4122434f43: {
    quoteDecimalPlaces: 0
  },
  '5c2f3a8dffdeedb5eba62974c3c4042da129a35e077d11788e0d7e145749434b4544': {
    quoteDecimalPlaces: 0
  },
  '49fe136eb6a7f438fec3a2b1fedbc29ce2723c5248530b3b1f5fbde74b49434b': {
    quoteDecimalPlaces: 0
  },
  '9cb9e829158c87919e52ec4230debb4ae146960984cfd1f7409c423f41474f4e59': {
    quoteDecimalPlaces: 0
  },
  '6fc2f560e3c4583000a85268a345562c16b04d283458cafa2fb024264e4a4f5244': {
    quoteDecimalPlaces: 0
  },
  '721f96b81933b34957d05bb050de2f1119e8379cb6223a36073e1a84417065': {
    quoteDecimalPlaces: 0
  },
  '4f6512bb484f6c16393061ce820459fa21ee1704d0fec22a5e58a94c42454552': {
    quoteDecimalPlaces: 0
  },
  ad51e1acb6fe0d3e244260efdb240acd3b515d8e448161f143cb1b514944554e: {
    quoteDecimalPlaces: 0
  },
  '7536b72f0d1f84c7935fc3b4471032ad4ca33b92974d0a3fe7e03e514d494e474f': {
    quoteDecimalPlaces: 0
  },
  '6d10e0dd8495891ec6e22ead52e33466aa6ea13ac47350fbe0ddcf4754686548696464656e4f72646572': {
    quoteDecimalPlaces: 0
  },
  '910beef0c939adc02eb21b83535e26c18ab29b99a0660bc467c0e639444545424f': {
    quoteDecimalPlaces: 0
  },
  cec8e2df35787884fa82abd69b007cd41fdfea36232f64228c92713e433453: {
    quoteDecimalPlaces: 0
  },
  '1e48265c139a3b74e536a773a5f2bdf45f689800748d3b1f65d6a627434447': {
    quoteDecimalPlaces: 0
  },
  fb1f050de21989848f758c2afae425d23ecc877a27875edee1dfa9fc6d636f73414441: {
    quoteDecimalPlaces: 0
  },
  '59e31d17e4d212ea35df6088e0395455c40f5ad463d161497a89c5675345414c': {
    quoteDecimalPlaces: 0
  },
  e14fe3ab348f9a6198359481472601f4557b9f86984f40a186a3b1e8434845525259: {
    quoteDecimalPlaces: 0
  },
  '5c9da1679c0f7ca1909c34e38a8e157eb8a5943236e588edf1cead014e6f726d636f696e': {
    quoteDecimalPlaces: 0
  },
  '437d6682fd33e6d26ff6437ef5fc2f9655d3c3b33637fb69dbd767be42524e44': {
    quoteDecimalPlaces: 0
  },
  ec2eb22f458466a288cff0d2c9aa82e62c5c352aa65e050b77eb67c7425541: {
    quoteDecimalPlaces: 0
  },
  a53caa9b6610d90e401929301ff05abc4bcf83f326b21423f5d3d74b41425443: {
    quoteDecimalPlaces: 0
  },
  '12d5f4fefe222d52a4fdcee56f4b272911d7c2202b068a08ebf5327049414d58': {
    quoteDecimalPlaces: 0
  },
  '9d47b2fc542990a258d41298ae72f54439884aeaac654b2cba4d00f3436f43': {
    quoteDecimalPlaces: 0
  },
  '2a6c1ea5b4805b1aabae53758e9e2e6623e7332cded72fef7e1ff8bf50726f786965576f6d62': {
    quoteDecimalPlaces: 0
  },
  '4732f618c268924aa26ab31b9a431104c82e752f4569723590c6a36e484f54454c': {
    quoteDecimalPlaces: 0
  },
  '06c0e99ad79aaca5132b519a1134b15b4d1a45cbba52a446481c568346555a5a59': {
    quoteDecimalPlaces: 0
  },
  a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235484f534b59: {
    quoteDecimalPlaces: 0
  },
  '153be682cc6068445eac2e36a71e364617aa34db90f820685340fe754c524e': {
    quoteDecimalPlaces: 0
  },
  defca4b95934aec82b818cbafd4bd0ab45511c1d690b58759f07d9b156794669: {
    quoteDecimalPlaces: 0
  },
  b3ae169f874e1133b47e27ca064f20c732c8553879e05d440f5d323f4a55494345: {
    quoteDecimalPlaces: 0
  },
  '776da8416dc56107275424b009eb82353235f10ef8e0b77088fd79645472757374436f696e': {
    quoteDecimalPlaces: 0
  },
  '35edb8e4de68118fca5efec87088e90a8aedf08769ea462a8b87184b4c49474d41': {
    quoteDecimalPlaces: 0
  },
  b788fbee71a32d2efc5ee7d151f3917d99160f78fb1e41a1bbf80d8f4c454146544f4b454e: {
    quoteDecimalPlaces: 0
  },
  '06f1d76820108bc35d6776762213a0a29db89c0ded631d942b486a2f46415254': {
    quoteDecimalPlaces: 0
  },
  ff791cdf3857627970df7f7930bfb7c8eee3ce45df43860d68b9ef604348494d5059: {
    quoteDecimalPlaces: 0
  },
  '034de37322a025c050c10be2ee140524054e8777d4d69524f221914f504150504c45': {
    quoteDecimalPlaces: 0
  },
  '133fac9e153194428eb0919be39837b42b9e977fc7298f3ff1b76ef95055444759': {
    quoteDecimalPlaces: 0
  },
  a3914cb7a564d010c7b67774ac8720a8ece3a758279b51d8a1c05cc55745444e4553444159: {
    quoteDecimalPlaces: 0
  },
  a64aa2a0df1dd4de6b3a7d314e8c30a5fd635db377ff17bdaf12e08f55: {
    quoteDecimalPlaces: 0
  },
  e08b81b81f4755e5584ba57177330eab08ea2b7014f6d174dc38aaf850455442595445: {
    quoteDecimalPlaces: 0
  },
  a089ad89cc6f2c48710ed086fcc9c75893bc1b6da32e24dd94cd35fa4c4f5652: {
    quoteDecimalPlaces: 0
  },
  '815f432f5d9b36e77989d0fea374292e9c8330c5146ca8500632b3cf5371756964': {
    quoteDecimalPlaces: 0
  },
  d1e4552f1f6824d97b6084e8113edd6e6025c36b2d55db7acd36137c504e42: {
    quoteDecimalPlaces: 0
  },
  '1a71dc14baa0b4fcfb34464adc6656d0e562571e2ac1bc990c9ce5f6574f4c46': {
    quoteDecimalPlaces: 0
  },
  '880c5d58c9187c11c6e2ee228b97320dede5d68a990e0dad8cc92c27434152424f4e415241': {
    quoteDecimalPlaces: 0
  },
  f10b16b705ef9baac04ca79c0da011633c8c20356b6a42262a1691da4348454646: {
    quoteDecimalPlaces: 0
  },
  '8b59c28dd174e8f99a9462d7559f9c58f96439d26e257031420eaad3656767': {
    quoteDecimalPlaces: 0
  },
  '162ce9d46a21900149027edf2f6ace391d6d1db9450b3c479b857ada4964696f74636f696e': {
    quoteDecimalPlaces: 0
  },
  '5a297aeb79ba4281a153b43f4ff0ed25bc88b7ddc8ba5261b01baec45552474f': {
    quoteDecimalPlaces: 0
  },
  '885742cd7e0dad321622b5d3ad186797bd50c44cbde8b48be1583fbd534b554c4c': {
    quoteDecimalPlaces: 0
  },
  e278ea4de5989873af9cc6c107cf77ac809ae5e8c354a87bb329fd74455552: {
    quoteDecimalPlaces: 0
  },
  '9c54bb728df9847b0358c84c942500646326a1b581a2b8c43689d2205374726970706572436f696e': {
    quoteDecimalPlaces: 0
  },
  b8cf262fd44f5c0559a22e584d46ccd5f161e495937843f96b68f3d7504f4f504f4f: {
    quoteDecimalPlaces: 0
  },
  '987c1f90efe1c95957509b460e0e4f6d6b3f7025a7aca99cd29090374d595448': {
    quoteDecimalPlaces: 0
  },
  '3f2babe4cd376aa455cb1bd8ce6eb19245c82edbc858d3276d95999e494e5449': {
    quoteDecimalPlaces: 0
  },
  '902387fb6b2d0ddf709c54e9a89f708e50e98600696f8818301671205449434b4554': {
    quoteDecimalPlaces: 0
  },
  e9c28a71273f825b13f38244ccf1fea97c4025813610d01a7c5d681f436861726c7a20546f6b656e: {
    quoteDecimalPlaces: 0
  },
  '47959e79846b8bdcacb91f586408d97e2dff44f31a04f03902cba8185357454554': {
    quoteDecimalPlaces: 0
  },
  '32bc130691066340caf48ef53d52c684a0e497ffc935d2fd6741efe0574f5a': {
    quoteDecimalPlaces: 0
  },
  f01ec1cb021922a491ea300fb4791dbaca720372b2a3142579c52e7d4b616e69: {
    quoteDecimalPlaces: 0
  },
  '8e5d2909dedd5203c6d0b41c8f3c3b36d872ca4063464565722da0cb6c756e6172636f696e': {
    quoteDecimalPlaces: 0
  },
  '14a3455f71c435a04ea1fdb50a3ef4c1cab0e79fb1565627ac66a57552415645': {
    quoteDecimalPlaces: 0
  },
  '007394e3117755fbb0558b93c54ce3bc6c85770920044ade143dc742505443': {
    quoteDecimalPlaces: 0
  },
  '547ceed647f57e64dc40a29b16be4f36b0d38b5aa3cd7afb286fc0946262486f736b79': {
    quoteDecimalPlaces: 0
  },
  c0cb38a4ec36859acde16e5b887a848170bef14ed6de073ea9474e2d57495a444f4745: {
    quoteDecimalPlaces: 0
  },
  f13515ca37ae4a0cf44f13860f325f0d017ee9988f2e7598c06e1d9a42554653: {
    quoteDecimalPlaces: 0
  },
  c45cbb33572ab2e9ca296bdf426e0a97187a00ecc8287fa1c3ca2e5d7261746b696e67: {
    quoteDecimalPlaces: 0
  },
  '333926224ce02ae8750e4c4000352e6f1f5dd94115636e944dc43e28507567436f696e73': {
    quoteDecimalPlaces: 0
  },
  b796509d42180bf7107280d71aa735689e2f55a30ed5dd34ee4486d15a414441: {
    quoteDecimalPlaces: 0
  },
  '952b83ed777c8ae4bdcabd4add3e913e80ad844e31d35b40ea5ed5a2425443': {
    quoteDecimalPlaces: 0
  },
  '2b8822f7799f325e278991a244e7715591945b1c2a3589cc76035ca973637261746368': {
    quoteDecimalPlaces: 0
  },
  '50c950139f7d25dc92ba7959e81e9be08308df2e208e924dc1c892f143656e6e61': {
    quoteDecimalPlaces: 0
  },
  '2cf1acfb7fd9e64f6a13cbb267683a8f4f4ca56fb2e226949fbffc574e435643': {
    quoteDecimalPlaces: 0
  },
  '20df0204c5cdd6ca2dfc3112e413b6af48f9cc500e2ff1e2144ad0d3415354524f': {
    quoteDecimalPlaces: 0
  },
  '7f863dbd7faa4c27dd9cadd1f512e7acee6634a6fd79a02eb832175e44696e6f436f696e': {
    quoteDecimalPlaces: 0
  },
  '7547ef7a9dd2fcc8a522f1f703f5b246c79be582150caea765ce7a3557414c4c': {
    quoteDecimalPlaces: 0
  },
  d0927bf13e6cdaa4519eb107e193959f6d028afdb4928a9df8a43ea050454e495341555220434f494e: {
    quoteDecimalPlaces: 0
  },
  '1c7c26a09e68a19e0fc0f6b1e0e7f0e9521fb0d3252d799efdc15d4b4d41474943': {
    quoteDecimalPlaces: 0
  },
  bfd9766bccc0f413345dc78ccbee437bd30e94d022e7c3ff2fe273ce4269736f6e4275636b73: {
    quoteDecimalPlaces: 0
  },
  '25e6b5d28054fb238cb6215d106ad17a8f673dbaee6d7f2cade6bcdb476f6c6457617272696f724d61736b': {
    quoteDecimalPlaces: 0
  },
  '98dc68b04026544619a251bc01aad2075d28433524ac36cbc75599a1686f736b': {
    quoteDecimalPlaces: 0
  },
  '9f20336296a957de552e8e1283aa138774bc9cf8b75c8244bf8304bb424c5545': {
    quoteDecimalPlaces: 0
  },
  '443726318f7a3995686a79f65ed48fdb79aaf576aecaee354d8ba0184e49444f': {
    quoteDecimalPlaces: 0
  },
  c7dcfa416c127f630b263c7e0fe0564430cfa9c56bba43e1a37c6915474f4b4559: {
    quoteDecimalPlaces: 0
  },
  f4f2398897dfe4abf91232435b48b85133a24b5ae2109be9c171b3dd5552454e54: {
    quoteDecimalPlaces: 0
  },
  d1333653aa3ac24adfa9c6d09c1a2cc8e2b7b86ad334c17f2acb864742696f546f6b656e: {
    quoteDecimalPlaces: 0
  },
  e98165a25cd0320b25f22d686268e58e66f855b6d85974947ccd708d414441464f58: {
    quoteDecimalPlaces: 0
  },
  f8cc9fe32f21f12e1fe21f5c0dc58fa206a4297043212135c54bf24050756d70436f696e: {
    quoteDecimalPlaces: 0
  },
  bb865b8462081a3ba9703a6b6c43032f088b4a4627c89eeeefa4a52b4652494747: {
    quoteDecimalPlaces: 0
  },
  bf5694fa93f4c8228d14a8db2b8b653a23304af922bc2f992ea24eec444a454474: {
    quoteDecimalPlaces: 0
  },
  '4538906c3025bc4dec2843a07d4fb49547589e39e6161c1e489bc2fd46545449': {
    quoteDecimalPlaces: 0
  },
  '79a2c647eb7460e90f1553e2d34902c37fd1179f7ab6dbee8c2c50bf544946': {
    quoteDecimalPlaces: 0
  },
  ce5dc19dfff3c5b989130ea780daafc8b90436bfb1a65b1fc387deea434f4f4b4945: {
    quoteDecimalPlaces: 0
  },
  eef3f1151ef6ed98c78f6825b8cdfe907089b555e5e44203761d4a0764656c7461746f6b656e: {
    quoteDecimalPlaces: 0
  },
  e681e6d095b21bcfdd74e8ae8e2beeb9309d922f8faf8ebf37c076b545514e: {
    quoteDecimalPlaces: 0
  },
  '1e055d68eaad9de5ec94f96e179e08a3a3900cfaa6043f626cfa6031446f6765636f696e2043617368': {
    quoteDecimalPlaces: 0
  },
  c151d8f37e0c00f5636a3dc696a1cccd0643722e58ccc573de2055cf494d43: {
    quoteDecimalPlaces: 0
  },
  '048ee598172481f98d613fc9fb6a03fd6ec3edccb75f8e4afc993b6645584f': {
    quoteDecimalPlaces: 0
  },
  '2eb3e6eac64b7119f948b5529909e45a8e29c88563fa6a3deb78519c484159': {
    quoteDecimalPlaces: 0
  },
  f28f457472e539dc75e1598a2beddf49ce5a717998c708f05f5de61044454653: {
    quoteDecimalPlaces: 0
  },
  '053c4b7bdda55b3073e5d428649ba88a529507aac5eb7039b36c764254414341': {
    quoteDecimalPlaces: 0
  },
  '0864aa509385d78b9d83e8547424a055bb93e152a767383c6e0ea85441494e55': {
    quoteDecimalPlaces: 0
  },
  cd5d3ed26ee75c553c7f3356c92f886f58332aa7f09e760602db7f8c43617264616d756e: {
    quoteDecimalPlaces: 0
  },
  '6f69a35a962c154bab4f2de4d9e116043697c333ade763c2b46fce6e41414441': {
    quoteDecimalPlaces: 0
  },
  b1eb73a732247342724b85ca10f626b9494c69b6f5d21a2bd4052bf7544150316368696c6c696e6732303232: {
    quoteDecimalPlaces: 0
  },
  '89ee1f82a513be9de47853a3dc9f93e314dfec43e78148c896729e82425249434b5a': {
    quoteDecimalPlaces: 0
  },
  '5f1897f3b6fe2864f05720457e24ae72901dcd17d27cdbb2d842adce4e6967676572': {
    quoteDecimalPlaces: 0
  },
  '6773a37a7518485a4b28a4b2684c7ae25ad00389bf08ef11dd67fb6e424947475553': {
    quoteDecimalPlaces: 0
  },
  '5653fadee9993813f02f37a9af55ca78e78bc89e6a7d9b38df1ffa5a42554e434841': {
    quoteDecimalPlaces: 0
  },
  '7c1201c22de0ec31c9a3af6ffbc87d09c2b8a02caa44bbe02f51d2c259756d6d69': {
    quoteDecimalPlaces: 0
  },
  b1b41a71ea01a911682691ea87ad3822daf5d8f4cb269417fd84181c57655468696e6b49744d617474657273546f6b656e: {
    quoteDecimalPlaces: 0
  },
  '55c7056bde3f21f1cff57663ba4a51e85040a11bb795b92daaf695e147414441': {
    quoteDecimalPlaces: 0
  },
  '87cc6061db21a9cc249dc8c419d144a3f1274a4118847378f0e2fec5434f434b2052494e4720434f494e': {
    quoteDecimalPlaces: 0
  },
  '1d76557b2e2df0c19d23513081c1916a92f7ab313d7c06b1e3998283756e7369676e6564746f6b656e': {
    quoteDecimalPlaces: 0
  },
  ff97c85de383ebf0b047667ef23c697967719def58d380caf7f04b64534f554c: {
    quoteDecimalPlaces: 0
  },
  '04c40336e67982e02cc75336cf436a224569df1b950a18c6667189d64d4f4149': {
    quoteDecimalPlaces: 0
  },
  d429c0bc4b899ce581a06e178da0d8a444c6d758873723e4eb3fc0b6534d415254: {
    quoteDecimalPlaces: 0
  },
  c68307e7ca850513507f1498862a57c7f4fae7ba8e84b8bc074093a944494253: {
    quoteDecimalPlaces: 0
  },
  f6ac48c64aa7af16434d9f84e014d11fba38525b436acc338ff20b0d4d7463: {
    quoteDecimalPlaces: 0
  },
  '376b46d7abe9a2a8d9d6dfa8f1979c41bc4251f02bbd7bc58acf3e704a6675656c': {
    quoteDecimalPlaces: 0
  },
  b53ab7913fc164071aa8592b968d05bdb3027cad3ac545966a8c676a61667564: {
    quoteDecimalPlaces: 0
  },
  faa9012be2291017993edb0f2990971dc6ba34357a390ad86c7274a144554c: {
    quoteDecimalPlaces: 0
  },
  '6b5e7bd6daa2b59e7adf7fabc2611107d394272d117dafa9a46c764853746172': {
    quoteDecimalPlaces: 0
  },
  dd36edc829921044b1eda0932538b11c4c31d02e68955a6b6e3e27623750415353: {
    quoteDecimalPlaces: 0
  },
  '0b55c812e3a740b8c7219a190753181b097426c14c558ad75d0b48f9474f4f474c45': {
    quoteDecimalPlaces: 0
  },
  a2c4a2ba9a4298af9200d11a99ff3615d3750acaad6e8625fe86fbc5746f61646b656e: {
    quoteDecimalPlaces: 0
  },
  a8512101cb1163cc218e616bb4d4070349a1c9395313f1323cc583634d7565736c695377617054657374506f6f6c: {
    quoteDecimalPlaces: 0
  },
  e0575226874e2949803e21c6b742dd40e6f790479eb1496a01e2cba2436172426f6f7374: {
    quoteDecimalPlaces: 0
  },
  '996e01a52fe8eb6d4f4d00ded95a428a644ce6fe0e21840429b96625536b756c6c': {
    quoteDecimalPlaces: 0
  },
  '561696ab9e70db98f8ff5c12f0fdbd837bd1b95d84c748b04ede8fba41504f43': {
    quoteDecimalPlaces: 0
  },
  '5cf69e1ffa60c789dcd6083fc6b6536b58039d557ea42201a1d5a579486f646c72': {
    quoteDecimalPlaces: 0
  },
  e9423b8b98160be68f201dd6165a288fa995986d78756f9a1d753f07535043: {
    quoteDecimalPlaces: 0
  },
  bbd0ec94cf9ccc1407b3dbc66bfbbff82ea49718ae4e3dceb817125f24574f524b: {
    quoteDecimalPlaces: 0
  },
  '6b59f4226407e96a970e845f1f36ba67d1b03ecff827c6b1eae3955c636b6e': {
    quoteDecimalPlaces: 0
  },
  '1f4b1b277c9c001c1522727506a2cfb401a0d0ade069b0241f16f07d484953': {
    quoteDecimalPlaces: 0
  },
  b6408f665a71750e622a3f6430f35a1a6d6cde0d0b6c41bc027c035650726f6a656374426f6f6b776f726d: {
    quoteDecimalPlaces: 0
  },
  '87a59599f8f47db431de642329a275cd4b297f21f1517af9db442cee506f705570576f726c64': {
    quoteDecimalPlaces: 0
  },
  '493136618a39dcefb89ff573061f715ee32e88092d0299c54e3a377356595241': {
    quoteDecimalPlaces: 0
  },
  '67b4e597b2858e1f0f80929eebc718e8a1ea9684cb591e33542c938846524545444f4d': {
    quoteDecimalPlaces: 0
  },
  e63d4eb5811cefb39afa002fb4269e918bc2f18e8dc7eee82e5ba5af5455524b4559: {
    quoteDecimalPlaces: 0
  },
  '9680a0a5feb092331a66919eebc226d03da26078b7ace82017301dc1424f4e4b': {
    quoteDecimalPlaces: 0
  },
  cea514eda3ce871c316fdb1f0931baa678d2fa5d373a109dbbcc905e4e6562756c61536572756d: {
    quoteDecimalPlaces: 0
  },
  '877ef7833f37ba011d1b41231bdf25469797b5490cca2f1ee1aa31f84d': {
    quoteDecimalPlaces: 0
  },
  '398e01f47a6e6359ef38d3681d05bc4f130cc4b549137ae256f7bcd3244252414e444f4e': {
    quoteDecimalPlaces: 0
  },
  '9a3c722722dda2f407d639c5cda46845c9090f204b61677765d1279348616c616c42726f6b6572': {
    quoteDecimalPlaces: 0
  },
  '41a255debdfe6c25eba00d82fb70e09bb3a12925b49ffddd9542245541646153776170': {
    quoteDecimalPlaces: 0
  },
  '253d3d74fa43dbe648c16914f58e885ae70e8c25916f02c7c4dbbe524954414c59': {
    quoteDecimalPlaces: 0
  },
  be18c25cdb2dbe713131a313d257456664d0f3bc9fc316fd256fcf2f4144414b4f49: {
    quoteDecimalPlaces: 0
  },
  '2d7444cf9e317a12e3eb72bf424fd2a0c8fbafedf10e20bfdb4ad8ab434845444441': {
    quoteDecimalPlaces: 0
  },
  '5c69413fb0c98e415138599297903a422592d28250c1599a56ec858d434855': {
    quoteDecimalPlaces: 0
  },
  '98dc68b04026544619a251bc01aad2075d28433524ac36cbc75599a16d6963726f686f736b': {
    quoteDecimalPlaces: 0
  },
  d2d7299d615cc9ad32402135a2cfd596325ac39504ba6d28c18d18bd43617264616c6f6e6961: {
    quoteDecimalPlaces: 0
  },
  ab3e31c490d248c592d5bb495823a45fd10f9c8e4f561f13551803fb43617264616e6f20436f6d6d756e697479204368617269747920436f696e:
    {
      quoteDecimalPlaces: 0
    },
  '1b480511e78f737359792ef8f5c025c72c3aba0570300e13b2e8e3e647494d5020434f494e': {
    quoteDecimalPlaces: 0
  },
  '3cbb2431cbb99954e2a2d6bda793f8d9bffa0150dc37f89db6676a2c504f4f4c': {
    quoteDecimalPlaces: 0
  },
  c5fbbed2e3cd4cc2ba10d0c0b7daad3154abb978e33c727fe397d19a47484f5354636861696e: {
    quoteDecimalPlaces: 0
  },
  '2a57f61d61f0e322190ec3bcd414ca5bd035d7bdc1d0c01fa1e974fb4c494f4e4d414e45': {
    quoteDecimalPlaces: 0
  },
  '25ce070dce27c23b15c6a1170472582aee0974d3ac98c8cf82eba9305350414e': {
    quoteDecimalPlaces: 0
  },
  '26737d4f7e75669b71490fbacc4521a7027ca2d70e0a4603097686d824534543524554': {
    quoteDecimalPlaces: 0
  },
  ccdd2f5e413cb5afc9ffb482d32fc175aaef6477567869ec8f0a16c1434152474f: {
    quoteDecimalPlaces: 0
  },
  '59e31d17e4d212ea35df6088e0395455c40f5ad463d161497a89c567426162795365616c': {
    quoteDecimalPlaces: 0
  },
  '7d3b8967e527a2cff1b6c0601bea061fcea55c2654a6ba802077f85e415254': {
    quoteDecimalPlaces: 0
  },
  a62e37d470fae60f897c84cd19eb8aa3a1fc435e4d46734bbf84e8bf5745524e4953: {
    quoteDecimalPlaces: 0
  },
  '58450df30538fa392cf4e1131c33b7d95d9610505ba901dd5e46be214256534b': {
    quoteDecimalPlaces: 0
  },
  a9fc4ed73402b211098ecacbc92dffa12aea088ea81db2727c1d28c650495a5a41: {
    quoteDecimalPlaces: 0
  },
  fc0a98a726497989f926e000d0ed1ea3b0f48c063a367978237f1098534e4f4f5020444f42425920444f424220434f494e: {
    quoteDecimalPlaces: 0
  },
  '8b39e1ad10316c309348b62ad01183fe17bdda2abbe45accaddb8afc504855464659': {
    quoteDecimalPlaces: 0
  },
  '12a3bae3cfdc8abcf870d6ff45deedb9248d2f39c200bf790e429f4e504f524e': {
    quoteDecimalPlaces: 0
  },
  c9281d64953f9531304e57e4ff15111f0c5445167c0b413f70fcd50c52554e45: {
    quoteDecimalPlaces: 0
  },
  '304f8fb45ead63b58ad40dd9490fe48c0d729d4a0eef4404bf831d48425443': {
    quoteDecimalPlaces: 0
  },
  ff6607d320b037f642092f938523eec766a0f2f222445b9d64e667d34d494f: {
    quoteDecimalPlaces: 0
  },
  '969c1ee5ae22173fad229f0ef1b70f135ea524b4f7a6f00946f595ef425654': {
    quoteDecimalPlaces: 0
  },
  aa2797739e4f4a1efd5346998febff59909e425b5fddb1b0ec4a24f84c6f6f6b7a: {
    quoteDecimalPlaces: 0
  },
  '1fa3c3e86c47e4f972ad7199bfb9e57b15ff8da8e921a7d0477b59ce426c6f62436f696e': {
    quoteDecimalPlaces: 0
  },
  '5df412e3eb27ffa1665302f8bf97f74f89fa42215d3e5b09464c1c144c75636b794e654b6f696e': {
    quoteDecimalPlaces: 0
  },
  '2b3d7fdc6f19381d13db089e1f2188caeeb62e095a717204940b5a214348555049': {
    quoteDecimalPlaces: 0
  },
  d953a7ddf54c2cd5fe1677b93272873680c2d5ebff091ecb3c216f224e4d4b52: {
    quoteDecimalPlaces: 0
  },
  '98dc68b04026544619a251bc01aad2075d28433524ac36cbc75599a16b696c6f686f736b': {
    quoteDecimalPlaces: 0
  },
  c5609c4800c05e82c4219ccf14c7fdf5212e11f83dbbb57ac716e98e666c756666: {
    quoteDecimalPlaces: 0
  },
  '551cc2a7fa623c51f92c2f37680b8b7adfe5528c8ec1a1c75692b643474c50': {
    quoteDecimalPlaces: 0
  },
  '524f1a70ee99c1bc4404f572ba7d3193c08cfc5492886f5c6374008024534254': {
    quoteDecimalPlaces: 0
  },
  b2167af30bf8a670bbf0398d4da366fa48ee4328b65144213ab1e15756455241: {
    quoteDecimalPlaces: 0
  },
  b1a80ea5d4b5c9f8d550fb9fa9fe53433903f420a449c8977b3470fa4245414d: {
    quoteDecimalPlaces: 0
  },
  '283f57a2d334cec622e8a87cfee16d3551a0c1d285c7aee27c242eee5241494e': {
    quoteDecimalPlaces: 0
  },
  fa51cfe366337afc788b9e41aef494a9b6530f341303e32417707e8543415348: {
    quoteDecimalPlaces: 0
  },
  '418c45ce1ed7d355bcc3427973a77281d1ab52f3ec5c2e3a8470316d4d4754': {
    quoteDecimalPlaces: 0
  },
  cb53b2d3cfab2d599e42c156fc0d877c60f74af5761317501d8a5a8d6b61747a: {
    quoteDecimalPlaces: 0
  },
  '8f7ac6a61c33ccea4bc087b4c263c8ef998d3c2360cf2ccd4f0b1b8d435237': {
    quoteDecimalPlaces: 0
  },
  '544571c086d0e5c5022aca9717dd0f438e21190abb48f37b3ae129f047524f57': {
    quoteDecimalPlaces: 0
  },
  '6d37fc977f8fa1d657b6d9db1a17e9ed69dd332165e5efa3f8a568f1534f4c': {
    quoteDecimalPlaces: 0
  },
  '27eee19588c997ca54d3137f64afe55a18dfcf9062fa83a724bf23574845584f4e49554d': {
    quoteDecimalPlaces: 0
  },
  '98dc68b04026544619a251bc01aad2075d28433524ac36cbc75599a16d696c6c69686f736b': {
    quoteDecimalPlaces: 0
  },
  '72e9e6952663e5844d49321e1cc9f65a9e09305e57709c15fa7583ee436865656b79497277696e': {
    quoteDecimalPlaces: 0
  },
  fdf5bea134b5f11fb10cd793b379f5eeb8f71554a104bd52bdd8f6704f535449: {
    quoteDecimalPlaces: 0
  },
  '249b7c4b9522b11489b41df89c8ce2244dea99d33abff8e8a1a86246536c6f7474657279': {
    quoteDecimalPlaces: 0
  },
  '8154b67ba1fe3a7eb3031780029dec4354266fde071b71cecd006327784d697269666963': {
    quoteDecimalPlaces: 0
  },
  eded2cac8ff591bb8213edb74af223ad013d75fa6f5e3bc2260b30df417065436f696e: {
    quoteDecimalPlaces: 0
  },
  '89ae7a3c1cbfbe8fcaed5387eac0cce3ae8402cc995fd9e7fd271ba153544f5269': {
    quoteDecimalPlaces: 0
  },
  dd36edc829921044b1eda0932538b11c4c31d02e68955a6b6e3e27624b4f4d55: {
    quoteDecimalPlaces: 0
  },
  '81fd41215b08ab60f78dda8c076487f65228ace5bb9ca122e8bc05f442697473636f696e': {
    quoteDecimalPlaces: 0
  },
  be18c25cdb2dbe713131a313d257456664d0f3bc9fc316fd256fcf2f43415444414e4f: {
    quoteDecimalPlaces: 0
  },
  '16ef9b59555d78b84c8ba9cc15b1c8d89bce5893fe96bd6d3f89ebe373696c7661': {
    quoteDecimalPlaces: 0
  },
  d0af056c509b6b1133cd83a750b7245e561169281fde3df1cb6e2d96506f6f6c5065656b436f696e: {
    quoteDecimalPlaces: 0
  },
  '4fd6d8b1eac12b029cd68acd25220c20dd13b9c4b0d0b585d49135d353414354': {
    quoteDecimalPlaces: 0
  },
  d0ec062966515421bab9e40d5798cbf462becaf1a3bb127860373b3b5374617244757374: {
    quoteDecimalPlaces: 0
  },
  '68f514c3504baaa0f38ba3211de163ef6e90b64acecc1d3050224a3b525442': {
    quoteDecimalPlaces: 0
  },
  '44619a1501561105a832f9b6ed99634841ae977879635b0a8207016150555250': {
    quoteDecimalPlaces: 0
  },
  '6873bddc4ae10fdc75ce8104c4b032cb02d8ef0022531e8f067fee6c42494c4c4f4e': {
    quoteDecimalPlaces: 0
  },
  '13d3e1b54c41a2782c061013ab9038095df00530682e353b10e595024a4f4b45': {
    quoteDecimalPlaces: 0
  },
  ae2a0aa5a24b27d9868c4a73b7c08077ac21baade5eca0fa467a2bbd58524159: {
    quoteDecimalPlaces: 0
  },
  adb13ebed342b6cd6fff67405830f8cab05c6f44db597150ccc9379f4567675368617264: {
    quoteDecimalPlaces: 0
  },
  '0cb96b9829264649b3631751dfa95e262824016a83c6140555cba6c961656f6e69756d': {
    quoteDecimalPlaces: 0
  },
  '3d77d63dfa6033be98021417e08e3368cc80e67f8d7afa196aaa0b3953746172636820546f6b656e': {
    quoteDecimalPlaces: 0
  },
  '59eccbbd4cdf738e6272ccabfbb6d1c02f6335ed4f860bfde4d53cb84752415659': {
    quoteDecimalPlaces: 0
  },
  '02a46eaed53a75095bb7c4562e104437d3c9c33abebf5cfc3bdfada556455241': {
    quoteDecimalPlaces: 0
  },
  d50e2161174aaaa54a9b93f2e7694275351ddb7922d6a611d666c7e150454550494e204a4f4520434f494e: {
    quoteDecimalPlaces: 0
  },
  e1d921643d6fd55a815f495f72aff7f5c3d7ac57a8783e0be293ac1752656465656d61626c65: {
    quoteDecimalPlaces: 0
  },
  a42681bf4ff192896b9f14a4858e8df70c7fb70e04c08861c4609a3241434c: {
    quoteDecimalPlaces: 0
  },
  '1f4b1b277c9c001c1522727506a2cfb401a0d0ade069b0241f16f07d484947': {
    quoteDecimalPlaces: 0
  },
  ea2d23f1fa631b414252824c153f2d6ba833506477a929770a4dd9c24d414442554c: {
    quoteDecimalPlaces: 0
  },
  '50a3f216a05472687288662e691ee201015eefa13b3aaa10e40b5fbb426974636f696e': {
    quoteDecimalPlaces: 0
  },
  '5afab751f7426e56ffe6db2f96d0699fed7c10440671d1f1ed1992db5352434943': {
    quoteDecimalPlaces: 0
  },
  c898c986b97e7ac5b33e999bc11b054a9987f48ec4459f8c1ea0c32b435245414d504945: {
    quoteDecimalPlaces: 0
  },
  b1fdfa12c530ce665f043d4c3c96b81e91b0b43812db816f76f144fd4d41475343: {
    quoteDecimalPlaces: 0
  },
  '482fb00dc32186a4c587dca2df3c7cf2bc455332ab581d51967306e14d4f4149': {
    quoteDecimalPlaces: 0
  },
  '31d77ea6aed35aff35af568f680e327bfe428e45cdf229d77c3a59204e544b4e': {
    quoteDecimalPlaces: 0
  },
  b9939a9b1a3b21098114cf8c0d21d1f5db7313f59592e78d1d4ccdc34d414348: {
    quoteDecimalPlaces: 0
  },
  '9a842044973b2833a711ae2706d33cae1db92b6e8ba7b627b390a83a4e455244': {
    quoteDecimalPlaces: 0
  },
  dd2bebba256099ddbc70d691935215d6dfd73cef054a087207947e894d4d: {
    quoteDecimalPlaces: 0
  },
  ffb1abe9fe93ee9f13874403a3d4f8addaa65fbf22d5d7f41c087d8e4d5554414e54: {
    quoteDecimalPlaces: 0
  },
  '6cfbfedd8c8ea23d264f5ae3ef039217100c210bb66de8711f21c903434e4654': {
    quoteDecimalPlaces: 0
  },
  '4247d5091db82330100904963ab8d0850976c80d3f1b927e052e07bd546f6b68756e': {
    quoteDecimalPlaces: 0
  },
  bb2b5aefba609e1ab89a0dfce12770a8835b24b6be81799f32ab03c931383730436f696e78: {
    quoteDecimalPlaces: 0
  },
  '1e268a71fc8c39bb797f0f0ef18b62a77a06c27f75ed754fe757245a4144417661756c74': {
    quoteDecimalPlaces: 0
  },
  '338ab4a3a0fdd9f458f4b186aaf75c1f8064c471914f08b5c3124827464354484d': {
    quoteDecimalPlaces: 0
  },
  '4cb48d60d1f7823d1307c61b9ecf472ff78cf22d1ccc5786d59461f84144414d4f4f4e': {
    quoteDecimalPlaces: 0
  },
  e92bde7590820644eb29b69c347ef96bc645084e2e376782140158cb5452555354: {
    quoteDecimalPlaces: 0
  },
  '05ccf5207e0ffd0fc3548bb88dc8170b2e4ad7201f9b5b7034f943db454c564953': {
    quoteDecimalPlaces: 0
  },
  bca67d793738d9c2eec664dc85a6cd9cf44b050906963da193fd19064d4941: {
    quoteDecimalPlaces: 0
  },
  '1c5f002f36885dddb12932506f2827995dc1ed85c6cc40bf602419a54f4c4420534c415050455220434f494e': {
    quoteDecimalPlaces: 0
  },
  da62981ce05e40c1bceda10a8e988f6cd03d922c3b84ada550d0e16a4d45524954: {
    quoteDecimalPlaces: 0
  },
  '64700329d616f20f4e83f2bc579513fca51646d47466a97f8fd1c229444958': {
    quoteDecimalPlaces: 0
  },
  b0af30edf2c7f11465853821137e0a6ebc395cab71ee39c24127ffb44e465443: {
    quoteDecimalPlaces: 0
  },
  '894212cbfc91f506fd273a9814625c425477790a35bda34e13a1c167544158': {
    quoteDecimalPlaces: 0
  },
  '83ae38349ebc09f35e78f603cb716a0329ce2e34587e57b3c80619d84d4e52': {
    quoteDecimalPlaces: 0
  },
  '37b47fcaeb067582eb0b4230632633adffa7753481139b67cc8fe3ce5045524e4953': {
    quoteDecimalPlaces: 0
  },
  e043081e11575b51a1b478ff4c815f654dce3152c54ccb0c450d6313465245594a41: {
    quoteDecimalPlaces: 0
  },
  '2fb223ab8264f5f371465b2edebc2cf62e2344df77009716fa2e439a4e4654696e73757265': {
    quoteDecimalPlaces: 0
  },
  '85f91c028ebae29481a7b3f0f166f43f8f95ec962b2007eaca93db89594e4452': {
    quoteDecimalPlaces: 0
  },
  '4fd0d998dc0700ca6ef89fafff05fbf523a3a25c1fc8314bf7e4d1c247726f777468': {
    quoteDecimalPlaces: 0
  },
  '521d5d8a86b62af5f7863a7e2e421bcb31a6ec8df5cf6cac5660a561544f52434859': {
    quoteDecimalPlaces: 0
  },
  '98c3ae8fa2fa18d90b38aa9f737d293f70be3eea2b1fc2e72e11e8485461626f6f': {
    quoteDecimalPlaces: 0
  },
  e8aab5eceef88273264406a29cb71bca8ccb3142bcbe4aef147839fd517569746572436f696e: {
    quoteDecimalPlaces: 0
  },
  '52489ea87bbceaf6375cc22f74c19382a3d5da3f8b9b15d2537044b95052535052': {
    quoteDecimalPlaces: 0
  },
  '7c76fc6c7496acb811ca913b3f9f1a3e4a875d7d1f1b11b9676840ce4a554445': {
    quoteDecimalPlaces: 0
  },
  '19c2a6ee081568ac374d4ffabbe1a7ec6118b35347f906cdcc302e094d6572': {
    quoteDecimalPlaces: 0
  },
  d030b626219d81673bd32932d2245e0c71ae5193281f971022b23a78436172646f67656f: {
    quoteDecimalPlaces: 0
  },
  '89267e9a35153a419e1b8ffa23e511ac39ea4e3b00452e9d500f2982436176616c6965724b696e67436861726c6573': {
    quoteDecimalPlaces: 0
  },
  '0fa7c317c7f1dc31d08a08d9cad823e6339a39baad371191bd49cad543617264616e6f426c7565': {
    quoteDecimalPlaces: 0
  },
  '9d86482511c8a49f21d5c83ee58a49e2926f70ac57dd73ed204042697175657374': {
    quoteDecimalPlaces: 0
  },
  cc23ae82bd518021787ab4929062718fdce75726c9e78b360a953925444f47474f: {
    quoteDecimalPlaces: 0
  },
  d314c0f60dad944651e27470da8e30ad11d440c17a2faf8e13e3f7c9474d58: {
    quoteDecimalPlaces: 0
  },
  '9a2ff23d533e7f8c009e2f51c49896aa28c066946b89d2ccd55ab84743524545505a': {
    quoteDecimalPlaces: 0
  },
  a70d9a56a72ea4d2694256fcdfa88b12963d7ec8995b30de08f70a8c534e4b: {
    quoteDecimalPlaces: 0
  },
  '448ad242085ff774cf52644191d38b3f282eff2a6e551cd74a028b924e585431303030': {
    quoteDecimalPlaces: 0
  },
  '20049b3532cae34ccc8a7fbb9d40077da54923827fe44e892516f1cd636861726c6965': {
    quoteDecimalPlaces: 0
  },
  d3a034e403b98cbdb0adbc8a3144d7779330916e190d387815bb85c650555252: {
    quoteDecimalPlaces: 0
  },
  '8e73cdaede27505777c64b4d19b4c9031de9d42be96a6f2950c9ea46524550': {
    quoteDecimalPlaces: 0
  },
  '1cc6d4608321b1dc5690b531c0be8cce68da52f4e21e0259db828ed354524f4e495820434f494e': {
    quoteDecimalPlaces: 0
  },
  d1ec168628a7cdbb92e8d92a184503223626188ddd2d34811b7f5816434841494e6553: {
    quoteDecimalPlaces: 0
  },
  '23423c0967380c9a2e0764df92d93469b6dd17b63753d9c5f0b7cafc5348414d454e': {
    quoteDecimalPlaces: 0
  },
  '972726fa74995595833ac939dc213097c381459f79c2b007f6efde1f566572746578': {
    quoteDecimalPlaces: 0
  },
  f9944ae786ccd11c9614315cd91d8e898e215200860f5d189f084fd0414442: {
    quoteDecimalPlaces: 0
  },
  '2f6df15b42f2fe88d057e379853b1bba3b1b35df4795e9a32b736f074e4244': {
    quoteDecimalPlaces: 0
  },
  '76f063bd1b6908a23cdc607571750a3d3e3e65034ac4132fee43c1c250454f504c45': {
    quoteDecimalPlaces: 0
  },
  '6767df9b642eb1252ceb2d469a85b93889eae2790acd788ea31fa0834b495441': {
    quoteDecimalPlaces: 0
  },
  '313976f5ba067849307383bb982b1f5b221b3b8ef4ceb123d2a596d642616d626f6f436f696e': {
    quoteDecimalPlaces: 0
  },
  '1c1e38cfcc815d2015dbda6bee668b2e707ee3f9d038d96668fcf63c4567677363617065436c75624561737465725a656e6e79': {
    quoteDecimalPlaces: 0
  },
  '0fd9819a9d7fb414880883f43a42d33458f12bc5f9841cec6457dc155669527553': {
    quoteDecimalPlaces: 0
  },
  '7ae1fef487d2367392d734cf9e446304c5c6afcd4d681ce4f56210db56495249444953': {
    quoteDecimalPlaces: 0
  },
  cd2a16b11a7c307b65d4f2de8507ed09202d84824f6ca34971e9e2bd414448495241: {
    quoteDecimalPlaces: 0
  },
  '59d06ef639a0dfa78c832cb271567f1a4a1853744d32c87be7b31446534e494646': {
    quoteDecimalPlaces: 0
  },
  aa0b6cdbd6dd203b93d07dd6049a02283b039013bc559a2ec81466b2446f75626c65446f6c6c617273: {
    quoteDecimalPlaces: 0
  },
  '8654e8b350e298c80d2451beb5ed80fc9eee9f38ce6b039fb8706bc34c4f4253544552': {
    quoteDecimalPlaces: 0
  },
  '40bd871a85d2b5ff0efe75ef036e1f4ac17a4ad273c371b94501ae31464c414e4f': {
    quoteDecimalPlaces: 0
  },
  c05a2fcd99fdd7e58d9042fd5973a4bdd552f5d2c2969e404b22264b50494e454150504c45: {
    quoteDecimalPlaces: 0
  },
  '54ef11805333453c8c3d6fbaa0d4496ddeb94857e1d7f3411bb79489414452': {
    quoteDecimalPlaces: 0
  },
  '9f0e526add5f7661ee81076254ae430c7de5c11bf7830ce5e9503fdc53544b53': {
    quoteDecimalPlaces: 0
  },
  '6631bfb865442ddbb39feb2e3906827a552a128e3707b1434315266b53454c': {
    quoteDecimalPlaces: 0
  },
  '7b6780751ae8a606bff374bde0e49c4f979c46989ef5a6affed6332b53686974636f696e': {
    quoteDecimalPlaces: 0
  },
  '5b597e4f6560f9403dcba7618fef04df235bfcb72552176c0e8a599b42656572': {
    quoteDecimalPlaces: 0
  },
  e45605e3f7d131723422c67353a3d2e0cccc06192e2e92efab9c8deb496e73616e6961: {
    quoteDecimalPlaces: 0
  },
  d455802ebf6c83dcf74005c26741e77b8b46419e5c0a9f1941bc5177446f6c6c617242657473436f696e: {
    quoteDecimalPlaces: 0
  },
  '1774343241680e4daef7cbfe3536fc857ce23fb66cd0b66320b2e3dd4249534f4e': {
    quoteDecimalPlaces: 0
  },
  '018637f4b8c945164a6650c33b0ad537909aedf34f99334e651cc96d506f5348': {
    quoteDecimalPlaces: 0
  },
  cfd283330fdb8b57d67029a06a96e02bd84ed48c14c951f8e70a5736447261676f6e53696c766572: {
    quoteDecimalPlaces: 0
  },
  '7e7dbfe44b4145a2f994a9c649ce84a3ee0706f06e9ec82360e0f64250494e54': {
    quoteDecimalPlaces: 0
  },
  '8a1cfae21368b8bebbbed9800fec304e95cce39a2a57dc35e2e3ebaa4d494c4b': {
    quoteDecimalPlaces: 0
  },
  '1310f31e6f41d1cacb0f625a0d0f009e2d5429d25548101fb414d5855052494445': {
    quoteDecimalPlaces: 0
  },
  dd5c3cebfbdef5c37aff39980e85e48ea80c9cde855a97d16105e2c447504159: {
    quoteDecimalPlaces: 0
  },
  fe46f59fbd3fb10e8f4ae676457f6bd1b2e06d90b0aaa341483af104524f475545: {
    quoteDecimalPlaces: 0
  },
  '441e0ce6ac7ee8bc0ce1ba9905a829b2d716b1f2ce7826ff7bb5d59e47616c61637469634372656469745374616e64617264': {
    quoteDecimalPlaces: 0
  },
  '7caf1ea0c6a09e68127de5396efefef45718018d5703604ad803dee05741544552': {
    quoteDecimalPlaces: 0
  },
  '10c3ac952135d0db4d37f7c5e754a9779260a4450d3f37385eeb4c164d414e454b4f': {
    quoteDecimalPlaces: 0
  },
  '94a21344f388a259dc8b1f3bcf91d9439379dd748b18a7168ed0b35976414441': {
    quoteDecimalPlaces: 0
  },
  f19ea989299cbde1a2dea622bf3dfe2f5c3c13d6fcbae7ecff0dbc5c426974636f696e: {
    quoteDecimalPlaces: 0
  },
  '551f1b35abe2e5d917f43505154f3f12a956c52ec07e5134ca464265736166617269': {
    quoteDecimalPlaces: 0
  },
  '060618551a7df716bd004b9b0c0891b7afe49986292eada19e3f40164d455441': {
    quoteDecimalPlaces: 0
  },
  b588e13e123f6b79c867f507311ded8fd68015c59d238e89eabb494f424c52: {
    quoteDecimalPlaces: 0
  },
  '2ae22b27cb82a1c315bff3fe111a49d81ae6ffce881552700f36fe2643464354': {
    quoteDecimalPlaces: 0
  },
  bc7058e1eb1157655d43a91ff083790331d4a0f1893d2b37037840c143525744: {
    quoteDecimalPlaces: 0
  },
  fce30a7f7d16e48c69a7847ec908fe098a0efa0dbc99bad8e2aec15a69646f6c: {
    quoteDecimalPlaces: 0
  },
  '4ea6fd26e61fafd2a6deae2af266bed7c003c4e41e87ac3a59c4d14f4841505059': {
    quoteDecimalPlaces: 0
  },
  b8c7dd0050cce0527888e7d1727bc6c656b6203a9654688ace6dfd6d53414d55524149: {
    quoteDecimalPlaces: 0
  },
  '976e5f73871e03089e428a8773f78ea7368002b3dd722b54a72ad6584d6e4d': {
    quoteDecimalPlaces: 0
  },
  bdc9bcd31173e259714abefcfb345da6b10c2382e9ade6d370b01d2b437269747465725377656574436f696e: {
    quoteDecimalPlaces: 0
  },
  cdaaee586376139ee8c3cc4061623968810d177ca5c300afb890b48a43415354: {
    quoteDecimalPlaces: 0
  },
  '2877216d841a90869ee7376b9aa36ce88890545b853d80e85f92c772626f6e65': {
    quoteDecimalPlaces: 0
  },
  '84b5a4c4fd48b87c0d5a38c516e230bb31ad045d52a7c909b9050957565244414f': {
    quoteDecimalPlaces: 0
  },
  f3b91fd93d1426ebc6db9b302ccf6ae1db34790759680b5fc8f4d9c24e5458: {
    quoteDecimalPlaces: 0
  },
  '7f376e3d1cf52e6c4350a1a91c8f8d0f0b63baedd443999ebe8fe57a424f52475a': {
    quoteDecimalPlaces: 0
  },
  '14696a4676909f4e3cb1f2e60e2e08e5abed70caf5c02699be97113943554259': {
    quoteDecimalPlaces: 0
  },
  '074b5d06e9ce6d592f2e0200c249e55a30a650d3ef63f6cf2e88d088575444': {
    quoteDecimalPlaces: 0
  },
  ebe182dbee1a4db8848312f98179cb73fd48520ddf5cf1588e52b8b2426f6f62696573: {
    quoteDecimalPlaces: 0
  },
  '1f4b1b277c9c001c1522727506a2cfb401a0d0ade069b0241f16f07d484950': {
    quoteDecimalPlaces: 0
  },
  '67ca21ff82dee411106df756ce2b1375343bbc33aaf1aefff21f9de7537461796b': {
    quoteDecimalPlaces: 0
  },
  '078eafce5cd7edafdf63900edef2c1ea759e77f30ca81d6bbdeec92479756d6d69': {
    quoteDecimalPlaces: 0
  },
  '628436be6fa349ebf4ac3d749e87a36981b930d4bb4319c11e64042c464c5a': {
    quoteDecimalPlaces: 0
  },
  be10bf4c0caa83fb7c75fb0fcf981d439f7731f8c81b12a775b3593d4e45465459: {
    quoteDecimalPlaces: 0
  },
  '810bf7f8c9410ec9bdfbb0e37c02e8fe2718168d1b9551e0ba60c9d364616e6479': {
    quoteDecimalPlaces: 0
  },
  df0172804f8418afc4e5b0a15b8fc78bdc3ca6d179405a7cd194f3b4464c49434b: {
    quoteDecimalPlaces: 0
  },
  '5b01968867e13432afaa2f814e1d15e332d6cd0aa77e350972b0967d4144414f476f7665726e616e6365546f6b656e': {
    quoteDecimalPlaces: 0
  },
  '8d0ae3c5b13b47907b16511a540d47436d12dcc96453c0f59089b45142524f4f4d': {
    quoteDecimalPlaces: 0
  },
  '32701cad2d7e08e8188c4f3a1a69cc6723102afebe8c820639f18b60534c414d': {
    quoteDecimalPlaces: 0
  }
};
