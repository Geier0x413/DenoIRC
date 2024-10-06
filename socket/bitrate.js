import { EventEmitter } from "node:events";

export default class Bitrate extends EventEmitter {
  process() {
    const rate = {
      "incoming": parseFloat( ( this.incoming / this.sizes[ this.size ] ).toFixed( 2 ) ),
      "outgoing": parseFloat( ( this.outgoing / this.sizes[ this.size ] ).toFixed( 2 ) ),
      "rate": this.rate,
      "size": this.size
    }

    this.reset();

    this.emit( "bitrate" , rate );

    setTimeout( () => this.process() , this.rates[ this.rate ] );
  }

  reset() {
    this.incoming = 0;
    this.outgoing = 0;
  }

  rates = {
    "seconds": 1000,
    "minutes": 1000 * 60,
    "hours": 1000 * 60 * 60,
    "days": 1000 * 60 * 60 * 24
  };

  sizes = {
    "bytes": 1,
    "kilobytes": 1000,
    "megabytes": 1000000,
    "gigabytes": 1000000000
  };

  constructor( { rate , size } ) {
    super();

    this.incoming = 0;
    this.outgoing = 0;
    this.rate = rate || "seconds";
    this.size = size || "bytes";

    this.process();
  }
}