import {Keg} from './keg.js';
import {Logger} from './logger.js';

// There can be only one storage-object in the system - it contains a number of kegs with various beertypes in them
class Storage {
    constructor( bar, autofill = true ) {
        this.bar = bar;
        this.autofill = autofill;
        this.storage = new Map(); // key: beerType, value: number of kegs in storage of that type
    }

    addKegs( beerType, numberOfKegs ) {
        // find this beerType in the map - default to 0
        let count = this.storage.get(beerType) || 0;
        // increment with more kegs
        count+= numberOfKegs;
        // store the new number
        this.storage.set(beerType, count);
    }

    

    getKeg( beerType ) {
        let keg = null;

        Logger.log("Get keg with '"+beerType+"' from storage");

        // find the count for this type 
        let count = this.storage.get(beerType) || (this.autofill ? 10 : 0);

        if( count > 0 ) {
            // create new keg
            keg = new Keg(beerType, 2500);
            count--;
            if( count === 0 && this.autofill ) {
                count = 10;
            } 
            this.storage.set(beerType, count);
        }



        return keg;
    }

    // returns a random keg (of a type that there more than 0 of!)
    // UNTESTED
    getRandomKeg() {
        // find random type, by creating a list of all types with count > 0
        const beerTypes = Array.from(this.storage).filter(pair => pair[1] > 0).map( pair => pair[0]);
        console.log("Available beertypes: ", beerTypes);
        return this.getKeg( beerTypes[Math.floor(Math.random()*beerTypes.length)]);
    }

}

export {Storage};