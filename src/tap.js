import {Logger} from './logger.js';

// A tap is connected directly to a keg
class Tap {
    constructor( keg ) {
        this.bar = null;
        this.keg = keg;
        this.waitList = [];
        this.id = -1; // is set to the index when reading the list of taps
    }

    replaceKeg() {
        // TODO: Doesn't work yet!
        /*
        this.isAvailable = true;

        // if anyone is waiting, call them
        this.isAvailable = true;
        const callback = this.waitList.shift();
        if( callback ) {
        //    console.log("Tap is free, callback with ", this);
            callback( this );
        }
        */
    }

    addToWaitList( callback ) {
        this.waitList.push( callback );
    }

    get isAvailable() {
        return this.reservedBy == null;
    } 

    get isEmpty() {
        return this.keg.level <= 0;
    }

    reserve( bartender ) {
        this.reservedBy = bartender;
    }

    release() {
        this.reservedBy = null;
        
        // If someone is waiting for it - call them
        const callback = this.waitList.shift();
        if( callback ) {
            Logger.log("Tap "+this.id+" is free, informing next on waitlist: ", callback);
            callback( this );
        }
    }

    // TODO: Remove this method
    startUsing() {
        console.warn("NO LONGER SUPPORTED METHOD!");
        this.isAvailable = false;
        Logger.log("Tap " + this.id + " is in use");
    }

    drain( amount ) {
        this.keg.drain( amount );
    }

    // TODO: modify and move into release.
    endUsing() {
        console.warn("NO LONGER SUPPORTED METHOD!");
        // Results in one of:
        // - keep: if the keg is to be kept on 
        // - replace: if the keg should be replaced with same beertype
        // - exchange: if the keg should be replaced with a random beertype

        let result = "KEEP";

        // check if the keg is empty
        if( this.keg.level <= 0 ) {
            console.warn("Keg is empty!");
            result = "EXCHANGE";
            Logger.log("Tap " + this.id + "'s keg is empty");

            // Are there anyone waiting for this tap?
            if( this.waitList.length > 0 ) {

                // first, check if they can be moved to another tap with the same beertype
                const others = this.bar.taps.filter( tap => 
                    tap.keg.beerType.name == this.keg.beerType &&
                    tap.keg.level !== 0 &&
                    tap.id != this.id );

                if( others && others.length > 0 ) {
                    // select a random tap, and move waitlist to that one
                    const other = others[Math.floor(Math.random()*others.length)];
                    this.waitList.forEach( func => other.waitList.push(func) );

                    result = "EXCHANGE";

                    Logger.log("Replace empty keg with any kind of beer.");
                }
                else {
                    // there is nowhere to send others - we need to exchange this keg with a similar type
                    result = "REPLACE";

                    Logger.log("Pleace replace keg, keeping it '" + this.keg.beerType + "'");
                }

            // If anyone is waiting for this one, wait for the

            // this means the tap can't be made available, before a new keg has been added
            // if there is a waitlist, the same type of beer MUST be put in the keg
            // - otherwise, select a random type
            }
            
        } else {
            Logger.log("Tap " + this.id + " is available");
            this.isAvailable = true;
            const callback = this.waitList.shift();
            if( callback ) {
            //    console.log("Tap is free, callback with ", this);
                callback( this );
            }

            result = "KEEP";
        }

        return result;
    }

}

export {Tap};