import { fromHexString, toHexString } from '@chainsafe/ssz'
import { createSecp256k1PeerId } from '@libp2p/peer-id-factory'
import { randomBytes } from 'crypto'
import debug from 'debug'
import { describe, it, assert } from 'vitest'
import {
  BUFFER_SIZE,
  ContentRequest,
  createSocketKey,
  dropPrefixes,
  encodeWithVariantPrefix,
  getContentKey,
  HeaderExtension,
  ContentKeyType,
  HistoryNetworkContentType,
  INewRequest,
  Packet,
  PacketType,
  PortalNetworkUTP,
  ProtocolId,
  randUint16,
  RequestCode,
  startingNrs,
  UtpSocketType,
} from '../../../src/index.js'
import ContentReader from '../../../src/wire/utp/Socket/ContentReader.js'

const blocks = {
  '0x8faf8b77fedb23eb4d591433ac3643be1764209efa52ac6386e10d1a127e4220': {
    rlp: '0xf9028df90217a013ced9eaa49a522d4e7dcf80a739a57dbf08f4ce5efc4edbac86a66d8010f693a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479452bc44d5378309ee2abf1539bf71de1b7d7be3b5a0ac4ba3fe45d38b28e2af093024e112851a0f3c72bf1d02b306506e93cd39e26da068d722d467154a4570a7d759cd6b08792c4a1cb994261196b99735222b513bd9a00db8f50b32f1ec33d2546b4aa485defeae3a4e88d5f90fdcccadd6dff516e4b9b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008605af25e8b8e583030d41832fefd88252088455ee029798d783010102844765746887676f312e342e32856c696e7578a0ee8523229bf562950f30ad5a85be3fabc3f19926ee479826d54d4f5f2728c245880a0fb916fd59aad0f870f86e822d85850ba43b740083015f90947c5080988c6d91d090c23d54740f856c69450b29874b04c0f2616400801ba09aaf0e60d53dfb7c34ed51991bd350b8e021185ccc070b4264e209d16df5dc08a03565399bd97800b6d0e9959cd0920702039642b85b37a799391181e0610d6ba9c0',
    number: 200001,
  },
  '0x0c1cf9b3d4aa3e20e12b355416a4e3202da53f54eaaafc882a7644e3e68127ec': {
    rlp: '0xf9028ef90217a08faf8b77fedb23eb4d591433ac3643be1764209efa52ac6386e10d1a127e4220a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479452bc44d5378309ee2abf1539bf71de1b7d7be3b5a0bd0eaff61d52c20e085cb7a7c60b312c792e0b141c5a00e50fd42f8ae1cfe51da09b763cefd23adf252ba87898f7cb8ccc06a4ebddc6be9032648fd55789d4c0b8a0cbb141d48d01bbbf96fb19adff38fb2a6c5e3de40843472a91067ef4f9eac09fb90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008605afdbcd75fd83030d42832fefd88252088455ee029f98d783010102844765746887676f312e342e32856c696e7578a04ddfa646f9a9ec8507af565631322186e2e06347586c9f137383d745ee8bf5958885808f6bbbb2a835f871f86f822d86850ba43b740083015f9094c197252baf4a4d2974eab91039594f789a8c207c88017a798d89731c00801ca0825c34f6ddfad0c9fe0e2aa75a3bff9bccc21e81a782fb2a454afb4ad4abac70a0106d3942a42839f74bbbf71b6ff8c5b11082af8b0ff2799cb9b8d14b7fcc9e11c0',
    number: 200002,
  },
  '0x46b332ceda6777098fe7943929e76a5fcea772a866c0fb1d170ec65c46c7e3ae': {
    rlp: '0xf90434f90215a00c1cf9b3d4aa3e20e12b355416a4e3202da53f54eaaafc882a7644e3e68127eca0f4174c5237efe5dfcb1f91cee73ef3e15f896775f5374f8628f6660cd0b991dc94790b8a3ce86e707ed0ed32bf89b3269692a23cc1a03b98c5006b88099ed6ca063af4d9bea89698d5d801a58a35b2aed98165ee5fb8a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008605af25d1fc5083030d43832fefd8808455ee02ad98d783010102844765746887676f312e342e32856c696e7578a0497b768e3d6e1e71063731cbd6efeb0ba6f4f8a1325f8bc89994168b873ddc27887b14e3ad9b3bd930c0f90218f90215a013ced9eaa49a522d4e7dcf80a739a57dbf08f4ce5efc4edbac86a66d8010f693a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347941dcb8d1f0fcc8cbc8c2d76528e877f915e299fbea0afe287aafc9e00aa3f0179c2eb41b9bae0aabe571fc9b1b46bb3da1036b25e01a0cf08f8f9c3416d71d76e914799ba9ac59bd2b36d64e412fee101ad438281b170a0acf0270ca48a90509ee1c00b8bd893a2653b6b7a099433104305fba81ea903cfb90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008605af25e8b8e583030d41832fefd882a4108455ee029796d583010102844765746885676f312e35856c696e7578a0ed167976e19753250f87c908873675e548a0c204a13b35c7ef9214582261e9f488d74671daa008f803',
    number: 200003,
  },
  '0x01f2fe06ea73ebc0e10c8b9b25b0a58c2d2319d78d78e93cd8f33283ec86e878': {
    rlp: '0xf90202f901fda046b332ceda6777098fe7943929e76a5fcea772a866c0fb1d170ec65c46c7e3aea01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479471f954533c351653b9e5d4c15220910627a0c976a0627c054b68081c30ea2ec64d4ea609445ba5ddc3050a6bef4e7ec0cba23ce209a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008605afdbb6b69083030d44832fefd8808455ee02b380a04a296112660546299c9f984e0e4432ad28a27ea117186a958d78473372dfb09a888a85aef81c3ac463c0c0',
    number: 200004,
  },
  '0x8441bdd3500b0bf059ad5e41a9aa7bace7b97d34ab2ece6709d65f4b23b5cd53': {
    rlp: '0xf90202f901fda001f2fe06ea73ebc0e10c8b9b25b0a58c2d2319d78d78e93cd8f33283ec86e878a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d4934794623d2411c3bb3340784155f9a688b0085251ab5ca0738390c87f7b07a6d575dfdcf467a8412c516d1d2655c5c706ebe15565ac7d4ba056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008605af25bb3fbb83030d45832fefd8808455ee02c480a077ae941cdeb99acceb9599e248d7eef036893dc62d5fef13800919b42c325fb588b6146e759001f4eac0c0',
    number: 200005,
  },
  '0x087128daf290420341af422551fbf0ace62a06b9193ab1706126fef975319ebf': {
    rlp: '0xf9028af90215a08441bdd3500b0bf059ad5e41a9aa7bace7b97d34ab2ece6709d65f4b23b5cd53a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d4934794e6a7a1d47ff21b6321162aea7c6cb457d5476bcaa066292dea814388296afdd64d39f0c33217f51b51e49eeb7cfc452d85cd8a5469a0036e3e495e2f15cf4b57c78c347eafb830b6a08af1e9441bc533f25520a10aeea00724d6de990c3b55c6a4d7088fc0df0f3cea12247eaa8a71e605c5a3a37a9d0bb90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008605ae6fd6885583030d46832fefd88252088455ee02d396d583010102844765746885676f312e35856c696e7578a084089e31357603395aaff3405d74e77b57f35feb44854d6de4bf814240637b6f8815e4aaac7aaf6675f86ff86d80850ba43b74008252089429a5c4dd6ea36dece410084343b1310d40f7917b89015af1d78b58c40000801ba035353f7340badf64668d619da22dc09767b42701a42919baf0f6e67917469c42a005472236d2b1c471ed6e7f7ae4cfdaf9f101ee50413f7017ac9e5b674f4bee75c0',
    number: 200006,
  },
  '0x3203188e07e71da78eaf9e6b6d2c9535e2541c60214bc797fe21566f4b7fbd61': {
    rlp: '0xf902f9f90217a0087128daf290420341af422551fbf0ace62a06b9193ab1706126fef975319ebfa01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d493479452bc44d5378309ee2abf1539bf71de1b7d7be3b5a0c753e4ec3841d1765975908004edaee97126df1c27a8dbac4ca4362787a0a6b4a002159ee1bb595d71ad67744cfc6ac10aa6becd8fbf2ffe9052a8732e8747a93fa031541775bfffc833ad9dfc058482d41642d01aa356b2685388e1c3bf0de7c33bb90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008605adba088d8583030d47832fefd882a4108455ee02ed98d783010102844765746887676f312e342e32856c696e7578a0c8f5d988a98d67e49bd3d70c5ddb2c35d7c33f3e18695c7199661fce327dc6628861be0c37c658fd23f8dcf86c4f850ba43b74008252089432be343b94f860124dc4fee278fdcbd38c102d88880df0142ce7946800801ca0651ae29521bc50b336a7c3dc4509cd65465b79208c7fe33ecdc1d0523d199bb2a05499e634ce3a25c88e083475bc035f76699f9473680a5839b96373d7bfd1ff27f86c1e850ba43b74008252089432be343b94f860124dc4fee278fdcbd38c102d8888458debe9dcf23c00801ba0da46f8484ef1cf65edd8364c88d90034fd37d30357886d10890a6e1b172bfd19a005712910f49e9e955d498034e1c1a7cd1236539c8e0dc1b6068a9b4b0d60aaa2c0',
    number: 200007,
  },
  '0x7aaadeb8cf3e1dfda9f60fd41ea6204efa4cabcba89e61881ad475d50e63dfd0': {
    rlp: '0xf9028bf90215a03203188e07e71da78eaf9e6b6d2c9535e2541c60214bc797fe21566f4b7fbd61a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347941dcb8d1f0fcc8cbc8c2d76528e877f915e299fbea0046e3460752018623fab5281291b36a2d69066d449d918b0c6f30f3136e5966ba08cb2fe8f10debba9d6bc251d1968d65d7a197b5e53b94e273dd4be311da02790a044c82107c9a702f945c11edbc0c2093b08d5456b3870797658f24a3bb6cd44c6b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008605ad04514c7583030d48832fefd88252088455ee030496d583010102844765746885676f312e35856c696e7578a04db53587b42fff30656cca71926aca5d332bfa6785d712f463891d82946503f98847bdfcf722f94228f870f86e820a56850ba43b74008252089403e2084aeca980ba3480a69e6bb572d0825be644885c41d6ac2fc94000801ca019c2bae26079dcaaa7889c251424a439343855ee837b2080507eb0a1c5877215a00c31920830894e547f2a73fe469aa9b2fb0e85123e659fb5a1deee55295f168dc0',
    number: 200008,
  },
  '0x6380444f2ed861889c7164c889620130d378f75dd9412d033462d86d7ad9bad4': {
    rlp: '0xf902fcf90215a07aaadeb8cf3e1dfda9f60fd41ea6204efa4cabcba89e61881ad475d50e63dfd0a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347948d8dfbd04db0942d79bb1bb038e8876bb67ff825a0452cc68add3c15c934408e239668c8242aa9a6a4a6ddad1e26a263e260985edfa0db6d3f3f2df5d8ab87d8606f311f87fb7cdfac55c6b7dc7cdbbbf99521e740f9a097f473dd762240d1dfe1805cdc5bec150682b7e436c89b1ff3cde2e1d1f7dbe6b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008605ac4eb0c24d83030d49832fefd882a4108455ee031496d583010102844765746885676f312e35856c696e7578a0b9339fdca233a20be476758e3a8e9268dd85640546e8bb7a0e13238c8ecd6648880dc8e5ea080aa316f8e1f86e822d87850ba43b740083015f9094773d1c659c2ad1875502132cf4eba6f9ed88e0c787203f97b12f0002801ca0a958fe87e26462f5eeafa48acc5b8493658351f6eb6b4cc3a68b72e03d33af62a0221987fe034ec7d455f1d45446d954ddb3ea0d71eab6d8e47e7726271fbbb539f86f822d88850ba43b740083015f909444c1440ed5e2c9db37ae4da02b60f8a430b805d0888b46e44ae73d6000801ba038d5b0fc1369d9cb7e8412a87b229a0ec530d015ad7d747f4752982e5597effba0629ca6e10b90f6984d1fcb4f94c172812c8e1fb355513fc76c0181fc18adff16c0',
    number: 200009,
  },
  '0xf2326ac8adbeabd0372fb6a4bc8cfd34c4197812537ea679a8af1c11f8b6a471': {
    rlp: '0xf90218f90213a06380444f2ed861889c7164c889620130d378f75dd9412d033462d86d7ad9bad4a01dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347941dcb8d1f0fcc8cbc8c2d76528e877f915e299fbea0853b9bad1f716488446ee21ec83969c5298e84ddfef1afdf1d5293481db3bdcba056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421a056e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421b90100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000008605ab9926ec3683030d4a832fefd8808455ee035196d583010102844765746885676f312e35856c696e7578a04eba0b42fb6f6caf0a7dd8141c21b093224f6b672a8cab3778eb03ce4898fbd18883cc96074530bebfc0c0',
    number: 200010,
  },
}

const sampleSize = 50000
const peerId = await createSecp256k1PeerId()
const _peerId = await createSecp256k1PeerId()
const DEFAULT_RAND_ID = 1234

describe('uTP Reader/Writer tests', () => {
  const protocolId = ProtocolId.HistoryNetwork
  const content = randomBytes(sampleSize)
  const logger = debug('uTP-')
  const uTP = new PortalNetworkUTP(logger)
  it('Content Write/Read', async () => {
    const socket = uTP.createPortalNetworkUTPSocket(
      protocolId,
      RequestCode.FOUNDCONTENT_WRITE,
      peerId.toString(),
      DEFAULT_RAND_ID,
      DEFAULT_RAND_ID + 1,
      content,
    )
    const _socket = uTP.createPortalNetworkUTPSocket(
      protocolId,
      RequestCode.FINDCONTENT_READ,
      _peerId.toString(),
      DEFAULT_RAND_ID + 1,
      DEFAULT_RAND_ID,
    )
    socket.setSeqNr(2)
    socket.setWriter(2)
    _socket.setReader(2)
    const chunks = socket.writer!.chunk()
    const compiled = await _socket.reader!.compile(Object.values(chunks))
    assert.equal(
      Object.keys(chunks).length,
      Math.ceil(sampleSize / BUFFER_SIZE),
      `Content Writer divided 50000 bytes correctly into ${Math.ceil(
        sampleSize / BUFFER_SIZE,
      )} chunks`,
    )
    assert.equal(compiled.length, content.length, `Compiled length matches content`)
    assert.deepEqual(Buffer.from(compiled), content, `Content Reader correctly recompiled content`)

    const packets = Object.values(chunks).map((chunk, idx) => {
      const packet = Packet.fromOpts<PacketType.ST_DATA>({
        header: {
          pType: PacketType.ST_DATA,
          extension: HeaderExtension.none,
          version: 1,
          seqNr: 2 + idx,
          connectionId: socket.sndConnectionId,
          ackNr: socket.ackNr + idx,
          timestampMicroseconds: 200 * idx,
          timestampDifferenceMicroseconds: 200,
          wndSize: 512,
        },
        payload: chunk,
      })
      return packet
    })
    const finPacket = Packet.fromOpts<PacketType.ST_FIN>({
      header: {
        pType: PacketType.ST_FIN,
        extension: HeaderExtension.none,
        version: 1,
        seqNr: 100,
        connectionId: socket.rcvConnectionId,
        ackNr: socket.ackNr,
        timestampMicroseconds: packets.length * 200,
        timestampDifferenceMicroseconds: 200,
        wndSize: 512,
      },
    })
    socket.reader = new ContentReader(2)
    packets.forEach((packet) => {
      socket.reader!.addPacket(packet)
    })
    assert.equal(
      packets.length,
      socket.reader.packets.length,
      `${packets.length} Packets added to reader`,
    )
    assert.equal(
      packets.length,
      socket.reader.inOrder.length,
      `${packets.length} Packets added in order`,
    )
    await socket.handleFinPacket(finPacket)
    const _compiled = await socket.reader.run()

    assert.deepEqual(
      Buffer.from(_compiled!),
      content,
      `Content Reader correctly recompiled content`,
    )
    const _reader2 = new ContentReader(2)
    packets.reverse().forEach((packet) => {
      _reader2.addPacket(packet)
    })
    assert.equal(_reader2.packets.length, packets.length, 'Packets added to reader')
    assert.equal(_reader2.inOrder.length, 1, 'Packets were added out of order')
    const _compiled2 = await _reader2.run()

    assert.deepEqual(
      Buffer.from(_compiled2),
      content,
      `Content Reader correctly recompiled content with out of order packets`,
    )

    const offerContentHashes = Object.keys(blocks)
    const offerContents = Object.values(blocks).map((block) => {
      return fromHexString(block.rlp)
    })

    const offerContentIds = offerContentHashes.map((hash) => {
      return ContentKeyType.serialize(
        Buffer.concat([
          Uint8Array.from([HistoryNetworkContentType.BlockBody]),
          fromHexString(hash),
        ]),
      )
    })

    const connectionId = 1234
    const _socket2 = uTP.createPortalNetworkUTPSocket(
      protocolId,

      RequestCode.FOUNDCONTENT_WRITE,
      _peerId.toString(),
      uTP.startingIdNrs(connectionId)[RequestCode.FOUNDCONTENT_WRITE].sndId,
      uTP.startingIdNrs(connectionId)[RequestCode.FOUNDCONTENT_WRITE].rcvId,
      content,
    )

    const socketKey = createSocketKey(peerId.toString(), connectionId)
    const contents = [encodeWithVariantPrefix(offerContents)]
    const offer_socket = uTP.createPortalNetworkUTPSocket(
      protocolId,

      RequestCode.OFFER_WRITE,
      peerId.toString(),
      uTP.startingIdNrs(connectionId)[RequestCode.OFFER_WRITE].sndId,
      uTP.startingIdNrs(connectionId)[RequestCode.OFFER_WRITE].rcvId,
      contents[0],
    )!
    const offer = new ContentRequest({
      protocolId: ProtocolId.HistoryNetwork,
      requestCode: RequestCode.OFFER_WRITE,
      socket: offer_socket,
      socketKey,
      content: contents[0],
      contentKeys: offerContentIds,
    })

    assert.deepEqual(
      offer.contentKeys,
      offerContentIds,
      'OFFER request constructed for proper contentKeys',
    )
    assert.deepEqual(
      dropPrefixes(offer.content!),
      offerContents,
      'OFFER request constructed with propper content compression',
    )
    _socket2.setSeqNr(2)
    _socket2.setWriter(2)
    assert.doesNotThrow(async () => {
      await _socket2.writer!.start()
    }, 'writer.start() does not throw')
  })
})

describe('PortalNetworkUTP test', () => {
  const logger = debug('log')
  const utp = new PortalNetworkUTP(logger)
  it('createPortalNetworkUTPSocket', async () => {
    const protocolId = ProtocolId.HistoryNetwork
    // connectionId comes from discv5 talkResp message
    const connectionId = randUint16()
    const socketIds = utp.startingIdNrs(connectionId)
    assert.ok(utp, 'PortalNetworkUTP created')
    let socket = utp.createPortalNetworkUTPSocket(
      protocolId,
      RequestCode.FOUNDCONTENT_WRITE,
      '0xPeerAddress',
      socketIds[RequestCode.FOUNDCONTENT_WRITE].sndId,
      socketIds[RequestCode.FOUNDCONTENT_WRITE].rcvId,
      Buffer.from('test'),
    )
    assert.ok(socket, 'UTPSocket created by PortalNetworkUTP')
    assert.equal(socket.sndConnectionId, connectionId + 1, 'UTPSocket has correct sndConnectionId')
    assert.equal(socket.rcvConnectionId, connectionId, 'UTPSocket has correct rcvConnectionId')
    assert.equal(socket.remoteAddress, '0xPeerAddress', 'UTPSocket has correct peerId')
    assert.equal(socket.type, UtpSocketType.WRITE, 'UTPSocket has correct requestCode')
    assert.deepEqual(socket.content, Buffer.from('test'), 'UTPSocket has correct content')
    assert.equal(
      socket.ackNr,
      startingNrs[RequestCode.FOUNDCONTENT_WRITE].ackNr,
      'UTPSocket has correct ackNr',
    )
    socket = utp.createPortalNetworkUTPSocket(
      protocolId,
      RequestCode.FINDCONTENT_READ,
      '0xPeerAddress',
      socketIds[RequestCode.FINDCONTENT_READ].sndId,
      socketIds[RequestCode.FINDCONTENT_READ].rcvId,
    )
    assert.equal(socket.type, UtpSocketType.READ, 'UTPSocket has correct requestCode')
    assert.equal(socket.sndConnectionId, connectionId, 'UTPSocket has correct sndConnectionId')
    assert.equal(socket.rcvConnectionId, connectionId + 1, 'UTPSocket has correct rcvConnectionId')

    assert.equal(
      socket.getSeqNr(),
      startingNrs[RequestCode.FINDCONTENT_READ].seqNr,
      'UTPSocket has correct seqNr',
    )
    assert.equal(
      socket.ackNr,
      startingNrs[RequestCode.FINDCONTENT_READ].ackNr,
      'UTPSocket has correct ackNr',
    )

    socket = utp.createPortalNetworkUTPSocket(
      protocolId,
      RequestCode.OFFER_WRITE,
      '0xPeerAddress',
      socketIds[RequestCode.OFFER_WRITE].sndId,
      socketIds[RequestCode.OFFER_WRITE].rcvId,
      Buffer.from('test'),
    )
    assert.equal(socket.type, UtpSocketType.WRITE, 'UTPSocket has correct requestCode')
    assert.equal(socket.sndConnectionId, connectionId, 'UTPSocket has correct sndConnectionId')
    assert.equal(socket.rcvConnectionId, connectionId + 1, 'UTPSocket has correct rcvConnectionId')

    assert.equal(
      socket.getSeqNr(),
      startingNrs[RequestCode.OFFER_WRITE].seqNr,
      'UTPSocket has correct seqNr',
    )
    socket = utp.createPortalNetworkUTPSocket(
      protocolId,
      RequestCode.ACCEPT_READ,
      '0xPeerAddress',
      socketIds[RequestCode.ACCEPT_READ].sndId,
      socketIds[RequestCode.ACCEPT_READ].rcvId,
    )
    assert.equal(socket.type, UtpSocketType.READ, 'UTPSocket has correct requestCode')
    assert.equal(socket.sndConnectionId, connectionId + 1, 'UTPSocket has correct sndConnectionId')
    assert.equal(socket.rcvConnectionId, connectionId, 'UTPSocket has correct rcvConnectionId')
    assert.equal(
      socket.ackNr,
      startingNrs[RequestCode.ACCEPT_READ].ackNr,
      'UTPSocket has correct ackNr',
    )
  })
  it('handleNewRequest', async () => {
    const connectionId = randUint16()
    let params: INewRequest = {
      protocolId: ProtocolId.HistoryNetwork,
      contentKeys: [randomBytes(33)],
      peerId: '0xPeerAddress',
      connectionId,
      requestCode: RequestCode.FOUNDCONTENT_WRITE,
      contents: [fromHexString('0x1234')],
    }
    let contentRequest = await utp.handleNewRequest(params)
    let requestKey = createSocketKey(params.peerId, connectionId)
    assert.equal(
      utp.getRequestKey(params.connectionId, params.peerId),
      requestKey,
      'requestKey recoverd from packet info',
    )
    assert.ok(contentRequest, 'contentRequest created')
    assert.ok(utp.openContentRequest.get(requestKey), 'contentRequest added to openContentRequest')
    assert.equal(
      contentRequest.protocolId,
      ProtocolId.HistoryNetwork,
      'contentRequest has correct protocolId',
    )
    assert.equal(
      contentRequest.requestCode,
      RequestCode.FOUNDCONTENT_WRITE,
      'contentRequest has correct requestCode',
    )
    assert.deepEqual(
      contentRequest.contentKeys,
      params.contentKeys,
      'contentRequest has correct contentKeys',
    )
    assert.deepEqual(
      contentRequest.content,
      fromHexString('0x1234'),
      'contentRequest has correct content',
    )
    assert.equal(contentRequest.socketKey, requestKey, 'contentRequest has correct socketKey')
    assert.equal(
      contentRequest.socket.type,
      UtpSocketType.WRITE,
      'contentRequest has correct socket type',
    )
    assert.deepEqual(
      contentRequest.socket.content,
      fromHexString('0x1234'),
      'contentRequest socket has correct content',
    )
    utp.closeRequest(params.connectionId, params.peerId)
    assert.notOk(
      utp.openContentRequest.get(requestKey),
      'contentRequest removed from openContentRequest',
    )
    params = { ...params, requestCode: RequestCode.FINDCONTENT_READ, contents: undefined }
    contentRequest = await utp.handleNewRequest(params)
    requestKey = createSocketKey(params.peerId, params.connectionId)
    assert.equal(
      utp.getRequestKey(params.connectionId, params.peerId),
      requestKey,
      'requestKey recoverd from packet info',
    )
    assert.ok(contentRequest, 'contentRequest created')
    assert.ok(utp.openContentRequest.get(requestKey), 'contentRequest added to openContentRequest')
    assert.equal(
      contentRequest.protocolId,
      ProtocolId.HistoryNetwork,
      'contentRequest has correct protocolId',
    )
    assert.equal(
      contentRequest.requestCode,
      RequestCode.FINDCONTENT_READ,
      'contentRequest has correct requestCode',
    )
    assert.deepEqual(
      contentRequest.contentKeys,
      params.contentKeys,
      'contentRequest has correct contentKeys',
    )
    assert.equal(contentRequest.content, undefined, 'contentRequest has correct content')
    assert.equal(contentRequest.socketKey, requestKey, 'contentRequest has correct socketKey')
    assert.equal(
      contentRequest.socket.type,
      UtpSocketType.READ,
      'contentRequest has correct socket type',
    )
    utp.closeRequest(params.connectionId, params.peerId)
    assert.notOk(
      utp.openContentRequest.get(requestKey),
      'contentRequest removed from openContentRequest',
    )
    params = {
      ...params,
      requestCode: RequestCode.OFFER_WRITE,
      contents: [fromHexString('0x1234')],
    }
    contentRequest = await utp.handleNewRequest(params)
    requestKey = createSocketKey(params.peerId, params.connectionId)
    assert.equal(
      utp.getRequestKey(params.connectionId, params.peerId),
      requestKey,
      'requestKey recoverd from packet info',
    )
    assert.ok(contentRequest, 'contentRequest created')
    assert.ok(utp.openContentRequest.get(requestKey), 'contentRequest added to openContentRequest')
    assert.equal(
      contentRequest.protocolId,
      ProtocolId.HistoryNetwork,
      'contentRequest has correct protocolId',
    )
    assert.equal(
      contentRequest.requestCode,
      RequestCode.OFFER_WRITE,
      'contentRequest has correct requestCode',
    )
    assert.deepEqual(
      contentRequest.contentKeys,
      params.contentKeys,
      'contentRequest has correct contentKeys',
    )
    assert.equal(contentRequest.content, params.contents![0], 'contentRequest has correct content')
    assert.equal(contentRequest.socketKey, requestKey, 'contentRequest has correct socketKey')
    assert.equal(
      contentRequest.socket.type,
      UtpSocketType.WRITE,
      'contentRequest has correct socket type',
    )
    assert.deepEqual(
      contentRequest.socket.content,
      params.contents![0],
      'contentRequest socket has correct content',
    )
    utp.closeRequest(params.connectionId, params.peerId)
    assert.notOk(
      utp.openContentRequest.get(requestKey),
      'contentRequest removed from openContentRequest',
    )
    params = { ...params, requestCode: RequestCode.ACCEPT_READ, contents: undefined }
    contentRequest = await utp.handleNewRequest(params)
    requestKey = createSocketKey(params.peerId, params.connectionId)
    assert.equal(
      utp.getRequestKey(params.connectionId, params.peerId),
      requestKey,
      'requestKey recoverd from packet info',
    )
    assert.ok(contentRequest, 'contentRequest created')
    assert.ok(utp.openContentRequest.get(requestKey), 'contentRequest added to openContentRequest')
    assert.equal(
      contentRequest.protocolId,
      ProtocolId.HistoryNetwork,
      'contentRequest has correct protocolId',
    )
    assert.equal(
      contentRequest.requestCode,
      RequestCode.ACCEPT_READ,
      'contentRequest has correct requestCode',
    )
    assert.deepEqual(
      contentRequest.contentKeys,
      params.contentKeys,
      'contentRequest has correct contentKeys',
    )
    assert.equal(contentRequest.content, undefined, 'contentRequest has correct content')
    assert.equal(contentRequest.socketKey, requestKey, 'contentRequest has correct socketKey')
    assert.equal(
      contentRequest.socket.type,
      UtpSocketType.READ,
      'contentRequest has correct socket type',
    )
    utp.closeRequest(params.connectionId, params.peerId)
    assert.notOk(
      utp.openContentRequest.get(requestKey),
      'contentRequest removed from openContentRequest',
    )
  })
  it('send', async () => {
    const peerId = '0xpeerId'
    const msg = Buffer.from([1, 2, 3])
    const sent = utp.send(peerId, msg, ProtocolId.HistoryNetwork)
    utp.emit('Sent')
    assert.ok(await sent, 'send method returns true when sent event is emitted')
  })
  it('return content', async () => {
    const contents = [randomBytes(100), randomBytes(100), randomBytes(100)]
    const contentHashes = contents.map(() => toHexString(randomBytes(32)))
    const contentKeys = contentHashes.map((hash) =>
      fromHexString(getContentKey(HistoryNetworkContentType.BlockHeader, fromHexString(hash))),
    )
    utp.on('Stream', (selector, hash, value) => {
      assert.equal(selector, HistoryNetworkContentType.BlockHeader, 'Stream selector correct')
      assert.ok(contentHashes.includes(hash), 'Streamed a requested content hash')
      assert.deepEqual(value, contents[contentHashes.indexOf(hash)], 'Stream content correct')
    })
    await utp.returnContent(ProtocolId.HistoryNetwork, contents, contentKeys)
    utp.removeAllListeners()
  })
})
