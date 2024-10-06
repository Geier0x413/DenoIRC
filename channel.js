import { stringify } from "./utility.js";

export default class Channel {
  static checkName( info ) {
    info = stringify( info );
    
    const prefixes = Array.from( this.prefixes );
    const channel = new RegExp( `^(?<prefix>[\\${ prefixes.join( "\\" ) }])?(?<name>[^\\s,\\,]+$)` , "i" ).exec( info );
    return channel?.groups || {};
  }

  static extractFromParams( params ) {
    if ( !( params instanceof Array ) ) return "";

    for ( const param of params ) {
      if ( this.prefixes.has( param[0] ) ) return param;
    }
    
    return "";
  }

  #DEFAULT_PREFIX = "#";

  static prefixes = new Set( [ "&" , "#" , "+" , "!" ] );

  toString() {
    return `${ this.prefix }${ this.name }` || "";
  }

  constructor( info ) {
    const channel = Channel.checkName( info );

    this.name = channel.name || "";
    this.prefix = channel.prefix || this.#DEFAULT_PREFIX;
    this.users = new Map();
  }
}