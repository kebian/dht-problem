# dht-problem
Demonstration of only receiving FIND_NODE messages on the DHT streams.

This example uses Typescript and ts-node and can be ran using `npm start`.

My objective is to passively intercept ADD_PROVIDER messages in order to discover new CIDs.  Unfortunately I only ever see ADD_NODE messages on the KAD DHT streams.
The simplest way I can demonstrate this is to override the `/ipfs/kad/1.0.0` protocol handler and then call the real one.

```ts
    // hijack wan kad protocol handler
    node.handle([
        '/ipfs/kad/1.0.0', // https://docs.libp2p.io/concepts/protocols/#kad-dht
        
    ], async props  => {
        const peerId = props.connection.remotePeer
        console.log(`DHT stream opened to ${peerId.toB58String()}`)
        await pipe(
            props.stream.source,
            lp.decode(),
            (source: AsyncIterable<Uint8Array>) => (async function * () {
                for await (const msg of source) {    
                    const message = Message.decode(msg.slice())
                    if (message.type === null || message.type === undefined) continue
                    
                    console.log(`Message type is ${MESSAGE_TYPE_LOOKUP[message.type]}`)
                    if (message.type === Message.MessageType.ADD_PROVIDER) {
                        console.log('ADD_PROVIDER message FOUND!!!')
                    }
                    // Call default libp2p-kad-dht handler
                    const res = await node._dht._wan._rpc.handleMessage(peerId, message)
                    if (res) yield res.serialize()
                }
            })(),
            lp.encode(),
            props.stream.sink,
        )    
    })
```
