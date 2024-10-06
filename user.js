import { stringify } from "./utility.js";

export default class User {
  static checkName( info ) {
    info = stringify( info );

    const prefixes = Array.from( this.prefixes );
    const user = new RegExp( `^(?<prefix>[\\${ prefixes.join( "\\" ) }])?(?<name>\\S+)$` , "i" ).exec( info );
    return user?.groups || {};
  }

  static prefixes = new Set( [ "~" , "&" , "@" , "%" , "+" ] );

  toString() {
    return `${ this.prefix }${ this.name }` || "";
  }

  constructor( info ) {
    const user = User.checkName( info );
    
    this.name = user.name || "";
    this.prefix = user.prefix || "";
  }
}