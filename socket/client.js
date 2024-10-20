import * as bytes from "https://deno.land/std@0.160.0/bytes/mod.ts";
import { EventEmitter } from "node:events";
import Message from "https://raw.githubusercontent.com/Geier0x413/irc.js/main/message.js";
import Bitrate from "./bitrate.js";
import Channel from "../channel.js";
import * as utility from "../utility.js";

import DEFAULT_CONFIG from "../config/client.json" with { "type": "json" };

const DEFAULT_TAG_SIZE = 4096;
const DEFAULT_MESSAGE_SIZE = 512;
const DEFAULT_PACKET_SIZE = DEFAULT_TAG_SIZE + DEFAULT_MESSAGE_SIZE;

export default class Socket extends EventEmitter {
  #socket = null;

  #buffer() {
    if ( !this.#socket ) return setTimeout( () => this.#buffer() );

    let snapshot = this.#socket.buffer;

    const crlf = new Uint8Array( [ 13 , 10 ] );
    const needle = bytes.indexOfNeedle( snapshot , crlf );

    if( needle < 0 ) return setTimeout( () => this.#buffer() );

    let message = snapshot.subarray( 0 , needle + crlf.length );

    snapshot = snapshot.subarray( message.length , snapshot.length );
    this.#socket.buffer = snapshot;

    try {
      message = new Message( utility.text.decode( message ) );

      this.#event( message );
    } catch( error ) {
      this.#debug( "error" , error );
    }

    setTimeout( () => this.#buffer() );
  }

  async connect() {
    if ( this.#socket ) return;

    try {
      this.#socket = await Deno[ this?.require?.encryption ? "connectTls" : "connect" ]( {
        "hostname" : this.network.host,
        "port" : this.network.port,
        ...this.network.tls
      } );
      
      this.#debug( "connect" );
      this.emit( "connect" );
    
      this.#socket.buffer = new Uint8Array();
      this.#buffer();
      this.#receive();
    
    } catch ( error ) {
      this.#debug( "error" , error );
    }
  }

  #debug( event , info ) {
    if ( !this.listenerCount( "debug" ) ) return;

    const report = {
      "timestamp" : new Date(),
      "event" : event
    };

    if ( info ) report.info = info;

    this.emit( "debug" , report );
  }

  async disconnect() {
    try {
      await this.#socket.close();

      this.emit( "disconnect" );
      
      this.#socket = null;
    } catch ( error ) {
      this.#debug( "error" , error );
    }
  }

  #event( msg ) {
    const commands = [ msg.command.code , msg.command.name , msg.command.reply ].filter( event => event );
    const prefix = Array.from( ( new Set( [ msg.prefix.nick , msg.prefix.user , msg.prefix.host , `${ msg.prefix }`.replace( ":" , "" ) ].filter( event => event ) ) ) );
    const channel = Channel.extractFromParams( msg.params.leading );
    const events = [ "message" ].concat( commands , prefix , channel );

    this.#debug( "receive" , msg );
    events.forEach( event => this.listenerCount( event ) ? this.emit( event , msg ) : null );
  }

  #handlePort() {
    const port = !isNaN( this.network?.port ) ? Math.abs( this.network.port ) % ( 2 ** 16 ) : 0;
    this.network.port = !port ? ( this?.require?.encryption ? 6697 : 6667 ) : port;
  }

  #handleRegistration() {
    this.registration.nickname = utility.stringify( this.registration.nickname || this.registration.username || this.registration.realname );
    this.registration.realname = utility.stringify( this.registration.realname || this.registration.username || this.registration.nickname );
    this.registration.username = utility.stringify( this.registration.username || this.registration.nickname || this.registration.realname );
  }

  message( msg ) {
    try {
      this.#transmit( !( msg instanceof Message ) ? new Message( msg ) : msg );
    } catch( error ) {
      this.#debug( "error" , error );
    }
  }

  pong() {
    this.on( "PING" , msg => {
      this.message( `PONG :${ msg.params.trailing }` );
    } );
  }

  async #receive() {
    try {
      const packet = new Uint8Array( DEFAULT_PACKET_SIZE );
      const byteCount = await this.#socket.read( packet );

      this.bitrate.incoming += byteCount;

      if ( byteCount ) this.#socket.buffer = bytes.concat( this.#socket.buffer , packet.subarray( 0 , byteCount ) );

      this.#receive();
    } catch ( error ) {
      this.#debug( "error" , error );
    }
  }

  async #transmit( msg ) {
    try {
      await this.#socket.write( utility.text.encode( `${ msg }` ) );

      this.bitrate.outgoing += `${ msg }`.length;

      this.#debug( "transmit" , msg );
    } catch ( error ) {
      this.#debug( "error" , error );
    }
  }

  constructor( settings ) {
    super();

    if ( !settings || typeof settings != "object" ) settings = {};
    settings = Object.deepMerge( DEFAULT_CONFIG , settings );
    
    this.network = settings?.network;
    this.registration = settings?.registration;
    this.require = settings?.require;
    this.bitrate = new Bitrate( this.network?.bitrate );

    this.#handlePort();
    this.#handleRegistration();

    this.bitrate.on( "bitrate" , rate => {
      this.#debug( "bitrate" , rate );
      this.emit( "bitrate" , rate );
    } );

    if ( this.require.automatic.connect ) this.connect();
    if ( this.require.automatic.ping ) this.pong();
  }
}