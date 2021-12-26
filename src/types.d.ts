declare module 'libp2p-mplex' {
    class MPlex implements Muxer {
        const static multicodec: string
       
        readonly streams: Array<MuxedStream>;
        /**
         * Initiate a new stream with the given name. If no name is
         * provided, the id of th stream will be used.
         */
        newStream (name?: string): MuxedStream;
        
        /**
         * A function called when receiving a new stream from the remote.
         */
        onStream (stream: MuxedStream): void;
        
        /**
         * A function called when a stream ends.
         */
        onStreamEnd (stream: MuxedStream): void;
    }
    
    export default MPlex
}

declare module 'libp2p-kad-dht/src/message' {
    export const MESSAGE_TYPE_LOOKUP: Array
}