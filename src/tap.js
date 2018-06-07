import {Logger} from './logger.js';

// A tap is connected directly to a keg
class Tap {
    constructor( keg ) {
        this.keg = keg;
        this.waitList = [];
        this.isAvailable = true;
        this.id = -1; // is set to the index when reading the list of taps

        // status: in use - vs empty - begge kan være unavailable
    }

    addToWaitList( callback ) {
        this.waitList.push( callback );
    }

    startUsing() {
        this.isAvailable = false;
        Logger.log("Tap " + this.id + " is in use");
    }

    drain( amount ) {
        this.keg.drain( amount );
    }

    endUsing() {
        Logger.log("Tap " + this.id + " is available");
        this.isAvailable = true;
        const callback = this.waitList.shift();
        if( callback ) {
        //    console.log("Tap is free, callback with ", this);
            callback( this );
        }
    }

}

export {Tap};