import { describe, it, assert } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
import { fromHexString, toHexString } from '@chainsafe/ssz'
import { ssz } from '@lodestar/types'
import { createBeaconConfig, defaultChainConfig } from '@lodestar/config'
import {
  BeaconLightClientNetworkContentType,
  LightClientBootstrapKey,
  LightClientFinalityUpdateKey,
  LightClientOptimisticUpdateKey,
  LightClientUpdatesByRange,
  LightClientUpdatesByRangeKey,
  MainnetGenesisValidatorsRoot,
} from '../../../src/subprotocols/beacon/types.js'
import { createFromProtobuf } from '@libp2p/peer-id-factory'
import { SignableENR } from '@chainsafe/discv5'
import { multiaddr } from '@multiformats/multiaddr'
import { PortalNetwork, ProtocolId, TransportLayer } from '../../../src/index.js'
import type { BeaconLightClientNetwork } from '../../../src/subprotocols/beacon/index.js'

const specTestVectors = require('./specTestVectors.json')
const genesisRoot = fromHexString(MainnetGenesisValidatorsRoot) // Genesis Validators Root
const config = createBeaconConfig(defaultChainConfig, genesisRoot)

describe('portal network spec test vectors', () => {
  const serializedOptimistincUpdate = fromHexString(
    specTestVectors.optimisticUpdate['6718463'].content_value,
  )
  const serializedOptimistincUpdateKey = fromHexString(
    specTestVectors.optimisticUpdate['6718463'].content_key,
  )
  const forkDigest = ssz.ForkDigest.deserialize(serializedOptimistincUpdate.slice(0, 4))

  it('forkDigest2ForkName', () => {
    assert.equal(config.forkDigest2ForkName(forkDigest), 'capella', 'derived correct fork')
  })

  const deserializedOptimisticUpdate = ssz.capella.LightClientOptimisticUpdate.deserialize(
    serializedOptimistincUpdate.slice(4),
  )
  const optimisticUpdateKey = LightClientOptimisticUpdateKey.deserialize(
    serializedOptimistincUpdateKey.slice(1),
  )

  it('deserializes optimistic update', () => {
    assert.equal(
      deserializedOptimisticUpdate.attestedHeader.beacon.slot,
      6718463,
      'deserialized optimistic update',
    )
  })

  it('deserializes optimistic update key', () => {
    assert.equal(optimisticUpdateKey.zero, 0n, 'correctly deserialized optimstic update key')
  })

  const finalityUpdate = fromHexString(specTestVectors.finalityUpdate['6718463'].content_value)
  const finalityUpdateKey = fromHexString(
    specTestVectors.finalityUpdate['6718463'].content_key,
  ).slice(1)
  const deserializedFinalityUpdate = ssz.capella.LightClientFinalityUpdate.deserialize(
    finalityUpdate.slice(4),
  )

  it('deserializes finality update', () => {
    assert.equal(
      deserializedFinalityUpdate.attestedHeader.beacon.slot,
      6718463,
      'deserialized finality update',
    )
  })

  it('deserializes finality update key', () => {
    assert.equal(
      LightClientFinalityUpdateKey.deserialize(finalityUpdateKey).zero,
      0n,
      'deserialized finality update key',
    )
  })
  const bootstrap = specTestVectors.bootstrap['6718368']
  const deserializedBootstrap = ssz.capella.LightClientBootstrap.deserialize(
    fromHexString(bootstrap.content_value).slice(4),
  )
  const bootstrapKey = fromHexString(bootstrap.content_key).slice(1)
  it('deserializes bootstrap', () => {
    assert.equal(deserializedBootstrap.header.beacon.slot, 6718368, 'deserialized bootstrap')
  })

  it('deserializes bootstrap key', () => {
    assert.equal(
      toHexString(LightClientBootstrapKey.deserialize(bootstrapKey).blockHash),
      '0xbd9f42d9a42d972bdaf4dee84e5b419dd432b52867258acb7bcc7f567b6e3af1',
      'deserialized light client bootstrap key',
    )
  })
  const updateByRange = fromHexString(specTestVectors.updateByRange['6684738'].content_value)
  const updateByRangeKey = fromHexString(
    specTestVectors.updateByRange['6684738'].content_key,
  ).slice(1)
  const deserializedRange = LightClientUpdatesByRange.deserialize(updateByRange)

  let numUpdatesDeserialized = 0
  for (const update of deserializedRange) {
    const forkdigest = update.slice(0, 4)
    const forkname = config.forkDigest2ForkName(forkdigest)
    //@ts-ignore - typescript won't let me set `forkname` to a value from of the Forks type
    ssz[forkname].LightClientUpdate.deserialize(update.slice(4)).attestedHeader.beacon.slot
    numUpdatesDeserialized++
  }
  it('deserializes update by range', () => {
    assert.equal(numUpdatesDeserialized, 4, 'deserialized LightClientUpdatesByRange')
  })

  it('deserializes update by range key', () => {
    assert.equal(
      LightClientUpdatesByRangeKey.deserialize(updateByRangeKey).count,
      4n,
      'deserialized update by range key',
    )
  })
})

describe('API tests', async () => {
  const privateKeys = [
    '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
  ]
  const id1 = await createFromProtobuf(fromHexString(privateKeys[0]))
  const enr1 = SignableENR.createFromPeerId(id1)
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3000`)
  enr1.setLocationMultiaddr(initMa)

  const node1 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.BeaconLightClientNetwork],
    config: {
      enr: enr1,
      bindAddrs: {
        ip4: initMa,
      },
      peerId: id1,
    },
  })

  const protocol = <BeaconLightClientNetwork>(
    node1.protocols.get(ProtocolId.BeaconLightClientNetwork)
  )

  const bootstrap = specTestVectors.bootstrap['6718368']

  await protocol.store(
    BeaconLightClientNetworkContentType.LightClientBootstrap,
    bootstrap.content_key,
    fromHexString(bootstrap.content_value),
  )
  const retrievedBootstrap = await protocol.findContentLocally(fromHexString(bootstrap.content_key))

  it('stores and retrieves bootstrap', () => {
    assert.equal(
      ssz.capella.LightClientBootstrap.deserialize(retrievedBootstrap!.slice(4)).header.beacon.slot,
      ssz.capella.LightClientBootstrap.deserialize(fromHexString(bootstrap.content_value).slice(4))
        .header.beacon.slot,
      'successfully stored and retrieved bootstrap',
    )
  })

  const finalityUpdate = specTestVectors.finalityUpdate['6718463']
  await protocol.store(
    BeaconLightClientNetworkContentType.LightClientFinalityUpdate,
    finalityUpdate.content_key,
    fromHexString(finalityUpdate.content_value),
  )
  const retrievedFinalityUpdate = await protocol.findContentLocally(
    fromHexString(finalityUpdate.content_key),
  )

  it('stores and retrieves finality update', () => {
    assert.equal(
      ssz.capella.LightClientFinalityUpdate.deserialize(retrievedFinalityUpdate!.slice(4))
        .attestedHeader.beacon.slot,
      ssz.capella.LightClientFinalityUpdate.deserialize(
        fromHexString(finalityUpdate.content_value).slice(4),
      ).attestedHeader.beacon.slot,
      'successfully stored and retrieved finality update',
    )
  })
  const optimisticUpdate = specTestVectors.optimisticUpdate['6718463']
  await protocol.store(
    BeaconLightClientNetworkContentType.LightClientFinalityUpdate,
    optimisticUpdate.content_key,
    fromHexString(optimisticUpdate.content_value),
  )
  const retrievedOptimisticUpdate = await protocol.findContentLocally(
    fromHexString(optimisticUpdate.content_key),
  )

  it('stores and retrieves optimistic update', () => {
    assert.equal(
      ssz.capella.LightClientOptimisticUpdate.deserialize(retrievedOptimisticUpdate!.slice(4))
        .attestedHeader.beacon.slot,
      ssz.capella.LightClientOptimisticUpdate.deserialize(
        fromHexString(optimisticUpdate.content_value).slice(4),
      ).attestedHeader.beacon.slot,
      'successfully stored and retrieved optimistic update',
    )
  })
  // TODO: Update this test once logic for handling light client updates is implemented
  const updatesByRange = specTestVectors.updateByRange['6684738']
  it('throws when trying to store a batch of light client updates', async () => {
    try {
      await protocol.store(
        BeaconLightClientNetworkContentType.LightClientUpdatesByRange,
        updatesByRange.content_key,
        fromHexString(optimisticUpdate.content_value),
      )
      assert.fail('should throw')
    } catch {
      assert.ok(true, 'throws when trying to store a batch of light client updates')
    }
  })
})

it('API tests', async () => {
  const privateKeys = [
    '0x0a2700250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c12250802122102273097673a2948af93317235d2f02ad9cf3b79a34eeb37720c5f19e09f11783c1a2408021220aae0fff4ac28fdcdf14ee8ecb591c7f1bc78651206d86afe16479a63d9cb73bd',
  ]
  const id1 = await createFromProtobuf(fromHexString(privateKeys[0]))
  const enr1 = SignableENR.createFromPeerId(id1)
  const initMa: any = multiaddr(`/ip4/127.0.0.1/udp/3000`)
  enr1.setLocationMultiaddr(initMa)

  const node1 = await PortalNetwork.create({
    transport: TransportLayer.NODE,
    supportedProtocols: [ProtocolId.BeaconLightClientNetwork],
    config: {
      enr: enr1,
      bindAddrs: {
        ip4: initMa,
      },
      peerId: id1,
    },
  })

  const protocol = <BeaconLightClientNetwork>(
    node1.protocols.get(ProtocolId.BeaconLightClientNetwork)
  )

  const bootstrap = specTestVectors.bootstrap['6718368']

  await protocol.store(
    BeaconLightClientNetworkContentType.LightClientBootstrap,
    bootstrap.content_key,
    fromHexString(bootstrap.content_value),
  )
  const retrievedBootstrap = await protocol.findContentLocally(fromHexString(bootstrap.content_key))
  assert.equal(
    ssz.capella.LightClientBootstrap.deserialize(retrievedBootstrap!.slice(4)).header.beacon.slot,
    ssz.capella.LightClientBootstrap.deserialize(fromHexString(bootstrap.content_value).slice(4))
      .header.beacon.slot,
    'successfully stored and retrieved bootstrap',
  )

  const finalityUpdate = specTestVectors.finalityUpdate['6718463']
  await protocol.store(
    BeaconLightClientNetworkContentType.LightClientFinalityUpdate,
    finalityUpdate.content_key,
    fromHexString(finalityUpdate.content_value),
  )
  const retrievedFinalityUpdate = await protocol.findContentLocally(
    fromHexString(finalityUpdate.content_key),
  )
  assert.equal(
    ssz.capella.LightClientFinalityUpdate.deserialize(retrievedFinalityUpdate!.slice(4))
      .attestedHeader.beacon.slot,
    ssz.capella.LightClientFinalityUpdate.deserialize(
      fromHexString(finalityUpdate.content_value).slice(4),
    ).attestedHeader.beacon.slot,
    'successfully stored and retrieved finality update',
  )
  const optimisticUpdate = specTestVectors.optimisticUpdate['6718463']
  await protocol.store(
    BeaconLightClientNetworkContentType.LightClientFinalityUpdate,
    optimisticUpdate.content_key,
    fromHexString(optimisticUpdate.content_value),
  )
  const retrievedOptimisticUpdate = await protocol.findContentLocally(
    fromHexString(optimisticUpdate.content_key),
  )
  assert.equal(
    ssz.capella.LightClientOptimisticUpdate.deserialize(retrievedOptimisticUpdate!.slice(4))
      .attestedHeader.beacon.slot,
    ssz.capella.LightClientOptimisticUpdate.deserialize(
      fromHexString(optimisticUpdate.content_value).slice(4),
    ).attestedHeader.beacon.slot,
    'successfully stored and retrieved optimistic update',
  )
  // TODO: Update this test once logic for handling light client updates is implemented
  const updatesByRange = specTestVectors.updateByRange['6684738']
  try {
    await protocol.store(
      BeaconLightClientNetworkContentType.LightClientUpdatesByRange,
      updatesByRange.content_key,
      fromHexString(optimisticUpdate.content_value),
    )
    assert.fail('should throw')
  } catch {
    assert.ok(true, 'throws when trying to store a batch of light client updates')
  }
})
