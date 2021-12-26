import Libp2p from 'libp2p'
import P2pTcp from 'libp2p-tcp'
import { NOISE as P2pNoise } from 'libp2p-noise'
import P2pMplex from 'libp2p-mplex'
import P2pBootstrap from 'libp2p-bootstrap'
import P2pKadDht from 'libp2p-kad-dht'
import process from 'process'
import bootstrappers from './bootstrappers'
import PeerId from 'peer-id'
import pipe from 'it-pipe'
import lp from 'it-length-prefixed'
import { Message } from 'libp2p-kad-dht/src/message/dht'
import { MESSAGE_TYPE_LOOKUP } from 'libp2p-kad-dht/src/message'

const main = async() => {
    const peerId = await PeerId.create()
    console.log('Using Peer ID', peerId.toB58String())

    const node = await Libp2p.create({
        peerId,
        addresses: {
            listen: ['/ip4/127.0.0.1/tcp/0'],
        },
        modules: {
            transport: [P2pTcp],
            connEncryption: [P2pNoise],
            streamMuxer: [P2pMplex],
            peerDiscovery: [P2pBootstrap],
            dht: P2pKadDht,
        },
        config: {
            peerDiscovery: {
                bootstrap: {
                    interval: 60e3,
                    enabled: true,
                    list: bootstrappers
                }
            },
            dht: {
                enabled: true,
                clientMode: false,
            }
        }
    })

    await node.start()
    console.log('libp2p has started')

    const stop = async() => {
        await node.stop()
        console.log('libp2p has stopped')
        process.exit(0)
    }

    process.on('SIGTERM', stop)
    process.on('SIGINT', stop)

    console.log('listening on addresses:')
    node.multiaddrs.forEach(addr => {
        console.log(`${addr.toString()}/p2p/${node.peerId.toB58String()}`)
    })    

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
}

main().catch(console.error)
