import { deepMerge } from "https://deno.land/std@0.160.0/collections/deep_merge.ts";
import NUMERICAL_REPLIES from "./assets/numerical_replies.json" with { "type": "json" };

// Parse JSON file and return an object
JSON.parseFile = file => {
  try {
    return JSON.parse( Deno.readTextFileSync( new URL( stringify( file ) ) ) );
  } catch( error ) { throw error }
};

// Save JSON to file and return response from Deno.writeTextFileSync
JSON.saveFile = ( file , data ) => {
  try {
    return Deno.writeTextFileSync( file , JSON.stringify( data , null , 2 ) );
  } catch( error ) { throw error }
};

// Return deep merged object
Object.deepMerge = deepMerge;

// Return an object of IRC numerical replies
export const numerical_replies = NUMERICAL_REPLIES;

// Force input type to be a string
export function stringify( input ) {
  return new String( input || "" ).toString();
}

// Help encode and decode messages
export const text = {
  "encode" : msg => new TextEncoder().encode( msg ),
  "decode" : msg => new TextDecoder().decode( msg )
};

// Translate IRC replies
export function translateIRCReply( input ) {
  input = stringify( input ).toUpperCase();
  input = input.match( /\d{1,3}/g ) ? input.padStart( 3 , "0" ) : input;

  for ( const code in numerical_replies ) {
    const reply = stringify( numerical_replies[ code ] ).toUpperCase();

    if ( input == code ) {
      return reply;
    } else if ( input == reply ) {
      return code;
    }
  }

  return null;
}