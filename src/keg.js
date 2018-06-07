/* Keg holds a large amount of beer of a certain type.
   besides the beer-type, it has the following properties:
   - capacity: the total (start) contents of the keg in cl
   - level: the current level of the contents in the keg in cl
*/
class Keg {
    constructor( beerType, capacity ) {
        this.beerType = beerType;
        this.capacity = capacity;
        this.level = this.capacity; // initial the keg is full
    }

    drain( amount ) {
        this.level -= amount;
        // TODO: Handle empty keg
        if( this.level <= 0 ) {
            console.error("!!!KEG EMPTY!!!", this);
        }
    }
}

export {Keg};