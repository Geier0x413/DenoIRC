import Channel from "./channel.js";
import Socket from "./socket/client.js";
import User from "./user.js";
import * as utility from "./utility.js";

export default class Client extends Socket {
  static numerical_replies = utility.numerical_replies;

  join( ...channels ) {
    if ( !this.require.automatic.management ) return;

    let channel = new Channel( channels[0] );

    if ( !this.channels.has( `${ channel }` ) ) this.channels.set( `${ channel }` , channel );

    channel = this.channels.get( `${ channel }` );
    channel.pending ??= "JOIN";

    if ( channel.pending == "JOIN" ) this.message( `JOIN ${ channel }` );

    setTimeout( () => {
      if ( !channel.pending ) channels.shift();
      if ( channels.length ) this.join( ...channels );
    } , ( 2 ** ++Channel.attempts ) * 1000 );
  }

  part( ...channels ) {
    if ( !this.require.automatic.management ) return;

    let channel = new Channel( channels[0] );

    if ( !this.channels.has( `${ channel }` ) ) this.channels.set( `${ channel }` , channel );

    channel = this.channels.get( `${ channel }` );
    channel.pending ??= "PART";

    if ( channel.pending == "PART" ) this.message( `PART ${ channel }` );

    setTimeout( () => {
      if ( !channel.pending ) channels.shift();
      if ( channels.length ) this.part( ...channels );
    } , ( 2 ** ++Channel.attempts ) * 1000 );
  }

  privmsg( channel , message ) {
    channel = new Channel( channel );
    message = utility.stringify( message );

    if ( !this.channels.has( `${ channel }` ) ) this.channels.set( `${ channel }` , channel );

    channel = this.channels.get( `${ channel }` );

    if ( message ) this.message( `PRIVMSG ${ channel } :${ message }` );
  }

  #monitorChannelPresence() {
    if ( !this.require.automatic.management ) return;

    this.channels = new Map();

    Channel.attempts ??= -2;

    [ "JOIN" , "PART" ].forEach( ( event ) => {
      this.on( event , ( msg ) => {
        let channel = Channel.extractFromParams( msg.params.leading );
        if ( !this.channels.has( channel ) ) return;
        channel = this.channels.get( channel );

        if ( msg.prefix.user == this.registration.username ) {
          channel.pending = null;
          channel.status = msg.command.name == "PART" ? "PARTED" : "JOINED";
          Channel.attempts = -2;
        }

        let user = new User( msg.prefix.nick || msg.prefix.user );
        if ( !channel.users.has( `${ user }` ) ) channel.users.set( `${ user }` , user );

        user = channel.users.get( `${ user }` );
        user.status = msg.command.name == "PART" ? "PARTED" : "JOINED";
      } );
    } );
  }

  #monitorDisconnect() {
    if ( !this.require.automatic.management ) return;

    this.on( "disconnect" , () => {
      this.channels = new Map();
    } );
  }

  #monitorEvents() {
    this.#monitorChannelPresence();
    this.#monitorDisconnect();
  }

  constructor( settings ) {
    super( settings );

    if ( this.require.automatic.management ) this.#monitorEvents();
  }
}