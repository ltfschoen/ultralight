__IN ACTIVE DEVELOPMENT -- DON'T USE IN PRODUCTION__
# Portal Network Module 

A partially complete Typescript library for interacting with the Portal Network

See [API](./docs/modules.md) for more details

See [Architecture](./ARCHITECTURE.md) for architectural concepts

## Routing Table Management

The Portal Network module currently supports two overlay routing tables for use with the below two subnetworks:
- State Network
- History Network

The Ultralight implementation of the Portal Network uses the following strategy to maintain a live and up to date routing table for each subnetwork

### Joining the network

Each time `portal.addBootNode` is called, Ultralight will try to connect to the bootnode with the provided ENR.  Once a discv5 session is established, the client sends a Portal Network `PING` request to the bootnode for each supported Portal Network subnetwork and adds the bootnode to the corresponding k-bucket in each subnetwork routing table. It follows on with FINDNODES requests at all log2 distances between 239-256 where the node has empty k-buckets.  

### Routing Table Maintenance

- To keep k-buckets fresh, every 30 seconds, the client selects a random bucket from the nearest 10 buckets that are not full (i.e. have 16 ENRs already), generates a random Node ID that would fall in that bucket, and then initiates a `nodeLookup` request.  Whenever a discv5 session is established with a new node in the network, the client also sends a Portal Network PING message to that node and adds it to the corresponding Subnetwork routing table.
- Whenever a `NODES` response contains 1 or more ENRs [here](https://github.com/ethereumjs/ultralight/blob/1b374767997d2feb5addd478d09fd94d6750da3b/packages/portalnetwork/src/client/client.ts#L192) is received, any ENRs not currently held in the routing table are added and the corresponding node sent a PING message to verify liveness.
- Nodes are removed from a specified subnetwork routing table whenever a node doesn't respond to a PING requests.

## Content Management

### History Network

Content for the history network is stored in the DB as key/value pairs consisting of the below:
- `key` -- hex string encoded representation of the History Network `content-id` (e.g. `0xfac2ca64257e97b691a0ff405c4f8d62ab52a6e0f0d2f92e25022ca12a56a881` is the `content-id` for the header for Block 1 on mainnet)
- `value` -- hex string encoded representation of the RLP serialized content (block header, block body, receipt)
# Acknowledgements

[Chainsafe's `discv5` implementation](https://github.com/ChainSafe/discv5) without which none of this would be possible
