"use strict";

class Bar {
    constructor(name) {
        this.taps = [];
        this.bartenders = [];
        this.queue = []; // customers

        // create storage
        this.storage = new Storage(this, true);

        // Initialize customer-count
        this.nextCustomerID = 0;

        // start ticker
        setInterval(this.tick.bind(this), 1000);
    }

    addBartender(name) {
        // create a bartender object
        const bartender = new Bartender(this, name);
        this.bartenders.push(bartender);
    }

    addTap( tap ) {
        this.taps.push(tap);
    }

    // add this customer to the queue
    addCustomer(customer) {
        customer.id = this.nextCustomerID++;
        customer.addedToQueue( Date.now() );
        this.queue.push(customer);
    }

    serveNextCustomer( bartender ) {
        const customer = this.queue.shift();

        bartender.startServing( customer );

        // run through the order of this customer

        // add pouring of each beed to the tasks of the bartender

        // finally add payment-job - when that is done, bartender releases the customer, and serve the next one
        const order = customer.order;
        for( let beer of order.beers ) {
//            console.log("order contains: ", beer);
            // serve this beer
            bartender.serveBeer( beer ); // doesn't serve it right away, but adds it to a job-list
        }
        bartender.receivePayment( customer );
        bartender.endServing( customer );

        if(!bartender.isWorking) {
            bartender.work();
        }

    }

    // The ticker runs every N seconds, looks for waiting customers and available bartenders, and
    // assigns work
    tick() {
        console.log("tick");
        // is there any waiting customers
        if( this.queue.length > 0 ) {
            // and any available bartenders?
            const bartender = this.getAvailableBartender();
            if( bartender ) {
                this.serveNextCustomer( bartender );
            }
        }
    }

    // returns a random available bartender, if any - else null
    getAvailableBartender() {
        const bartenders = this.bartenders.filter( bartender => bartender.currentState === bartender.state.READY );

        if( bartenders.length > 0 ) {
            return bartenders[Math.floor(Math.random()*bartenders.length)];
        } else {
            return null;
        }
    }

    getRandomAvailableBeerType() {
        const tap = this.taps[Math.floor(Math.random()*this.taps.length)];
        return tap.keg.beerType;
    }

    waitForAvailableTap( beerType, callback ) {
        // find taps for this kind of beer
        const taps = this.taps.filter( tap => tap.keg.beerType.name == beerType );

        // if one is available now, use that directly
        let tap = null;
        for( let i=0; i < taps.length; i++ ) {
            if( taps[i].isAvailable ) {
                tap = taps[i];
                callback( tap );
                break;
            }
        }
        
        // if no available tap was found, wait for a random one
        if( tap === null ) {
            // sort the list of taps by shortest waitlist
            taps.sort( (a,b) => a.waitList.length - b.waitList.length );

            console.log("No tap available for "+beerType.toString()+" beer - waiting for one of: %o", taps);

            taps[0].addToWaitList( callback );
        } 

        return taps;
    }

    // Returns JSON-data about everything in the bar
    getData() {
        const data = {};

        data.timestamp = Date.now();
/*
        bar: name, closingTime
        queue: customer, id, order, status
        bartenders: name, status
        taps: id, keg (incl beertype), 
*/
        // bar        
        data.bar = { name: this.name, closingTime: "22:00:00"};

        // queue with customers
        data.queue = this.queue.map( cust => {
            const ncust = {};
            ncust.id = cust.id;
            ncust.startTime = cust.queueStart;

            ncust.order = cust.order.beers.map( beer => beer.beerType.name );

            return ncust;
        });

        // bartenders
        data.bartenders = this.bartenders.map( bt => {
            const bart = {name: bt.name};
            switch(bt.currentState) {
                case bt.state.READY: bart.status = "READY";
                    break;
                case bt.state.SERVING:
                case bt.state.PREPARING: bart.status = "WORKING";
                    break;
                case bt.state.BREAK: bart.status = "BREAK";
                    break;
            }
            // TODO: add Off duty!

            return bart;
        });

        // taps
        data.taps = this.taps.map( tap => {
            const t = {};
            // level
            t.level = tap.keg.level;
            // capacity
            t.capacity = tap.keg.capacity;
            // (beertype): name
            t.beer = {
                name: tap.keg.beerType.name,
                // description
            //    description: tap.keg.beerType.description,
                // category    
                category: tap.keg.beerType.category,
                // label
            //    label: tap.keg.beerType.label,
                // alcohol
                alcohol: tap.keg.beerType.alc
            }
            
            return t;
        })


        // return JSON-ified data
        return JSON.stringify(data);
    }
}

let nextCustomerID = 0;

class Customer {
    constructor() {
        this.order = null;
        this.queueStart = 0;
    }

    addedToQueue( timestamp ) {
        this.queueStart = timestamp;
    }
}
// A bartender receives an order, creates the beers in the order, and returns it to the customer.
class Bartender {
    constructor( bar, name ) {
        this.bar = bar;
        this.name = name;

        this.tasks = [];

        this.state = {
            READY: Symbol("State.READY"),
            SERVING: Symbol("State.SERVING"),
            PREPARING: Symbol("State.PREPARING"), // When the bartender changes a keg between customers ... 
            BREAK: Symbol("State.BREAK"),
            OFF: Symbol("State.BREAK")
        }

        this.currentState = this.state.READY;
    }

    addTask( task ) {
        this.tasks.push(task);
        task.owner = this;
    }

    work( parameter ) {
        
        if(this.tasks.length > 0) {
            this.isWorking = true;

            const task = this.tasks.shift();
            console.log("Bartender " + this.name + " starts task " + task.name + ", with parameter", parameter);
            task.perform( parameter );
        } else {
            this.isWorking = false;
            console.log("Bartender " + this.name + " has no more work");// ... will go for a break in 5 minutes");
            if( this.bar.queue.length === 0 ) {
                console.log("will go for a break in 5 minutes");   
                // TODO: start break in 5 minutes, if no work shows up
                this.requestBreak(5);
            }
            
        }
    }

    requestBreak( inMinutes ) {
        setTimeout( function() {
            // request the break here!
            console.log("Request break for", this);

            // TODO: In some way the bar should know about requests for breaks, and if no customers are waiting
            // the next tick, then approve the break to the requester that has waited the longest since last
            // break ...
            // This means storing the time since last break in each bartender.
            // A bartender can only get a break if two other bartenders are behind the bar. No-one can be called back
            // from a break once it has begun.


        }.bind(this), inMinutes*1000);
    }


    // convenience functions for adding tasks
    startServing( customer ) {
        this.addTask( new StartServing(customer) );
    }

    serveBeer( beer ) {
        this.addTask( new ServeBeer(beer) );
        this.addTask( new PourBeer(beer) );
    }
    
    receivePayment( customer ) {
        this.addTask( new ReceivePayment(customer));
    }
    
    endServing( customer ) {
        this.addTask( new EndServing(customer) );
    }

}

class Task {
    constructor(name) {
        this.name = name;
        this.owner = null; // the owner should set itself when adding the task
        this.time = 0; // the time for this task to complete - set by extending classes
    }

    perform() {
        // do this task ... 
        console.log("-task: "+this.name+" will take %d seconds", this.time)

        // and callback on the owner to do the next task, when done
        setTimeout( this.owner.work.bind(this.owner), this.time*1000 );
    }
}

class StartServing extends Task {
    constructor(customer) {
        super("startServing");
        this.customer = customer;
        this.time = 2; // Taking the order takes 10 seconds

        // TODO: customer.state should be modified in stead of this
        customer.beingServed = true;
    }

    perform() { 
        super.perform();

        // log list of beers in this customer's order
        this.customer.order.beers.forEach( beer => {
            console.log("--" + beer);
        })

        this.owner.currentState = this.owner.state.SERVING;
    }
}

class ServeBeer extends Task {
    constructor(beer) {
        super("serveBeer");
        this.beer = beer;
    }

    perform() {
        // Find available tap - then pourbeer (that is expected to be next task in queue)
        this.owner.bar.waitForAvailableTap( this.beer, this.owner.work.bind(this.owner) );
    }
}

class PourBeer extends Task {
    constructor(beer) {
        super("pourBeer");
        this.beer = beer;

        this.time = beer.size / beer.beerType.pouringSpeed;
    }

    perform( tap ) {
        console.log("Pour beer from tap ", tap);

        tap.drain( this.beer.size );

        // TODO: drain beer from keg
        super.perform();

    }
}

class ReceivePayment extends Task {
    constructor() {
        super("receivePayment");
        this.time = 5;
    }
}

class EndServing extends Task {
    constructor(customer) {
        super("endServing");
        this.customer = customer;
        this.time = 0;

        customer.beingServed = false;
    }

    perform() { 
        super.perform();
        this.owner.currentState = this.owner.state.READY;
    }
}

// An order is a list of beers for a customer.
// The customer creates, and gives the order to the bartender, requesting beers,
// The bartender then returns the order, with the beers included
class Order {
    constructor( customer ) {
        this.customer = customer;
        this.customer.order = this;
        this.beers = [];
    }

    addBeer(beer) {
        this.beers.push(beer);

        // keep order sorted by beertype!
        this.beers.sort( (a,b) => {
            if( a.beerType.name < b.beerType.name ) {
                return -1;
            } else if( a.beerType.name > b.beerType.name ) {
                return 1;
            } else {
                return 0;
            }
        } )
    }
}

// A beer is a glass of beer of a certain type+size. Default 50cl.
class Beer {
    constructor( beerType, size = 50) {
        this.beerType = beerType;
        this.size = size;
    }

    toString() {
        return this.beerType.toString();
    }
}

const BeerTypes = {
    add(beerType) {
        if(!this._data) {
            this._data = [];
        }
        this._data.push(beerType);
    },

    get(beerTypeName) {
        return this._data.find( beerType => beerType.name === beerTypeName );
    },

    all() {
        return this._data;
    },

    random() {
        return this._data[Math.floor(Math.random()*this._data.length)];
    }

}

// A beertype has a name and a pouringSpeed (some beers might be slower!)
class BeerType {
    // TODO: Add probability/popularity of this beer
    constructor( info ) {
        /* Info object is expected to have:
            -name
            -category
            -pouringSpeed in cl pr second
            -popularity from 0 to 1
            -alc
            -label
            -description:
                - appearance
                - aroma
                - flavor
                - mouthfeel
                - overallImpression
        */

        this.name = info.name;
        this.category = info.category;
        this.pouringSpeed = info.pouringSpeed || 5;
        this.popularity = info.popularity || 1;
        this.alc = info.alc;
        this.label = info.label;
        this.description = info.description || "no description";

        BeerTypes.add(this);
    }

    toString() {
        return this.name;
    }
}

// A tower is a collection of taps
// class Tower {
//     constructor( taps ) { // TODO figure out how to use spread operator here
//         this.taps = taps;
//     }
        
// }

// A tap is connected directly to a keg
class Tap {
    constructor( keg ) {
        this.keg = keg;
        this.waitList = [];
        this.isAvailable = true;
    }

    addToWaitList( callback ) {
        this.waitList.push( callback );
    }

    startUsing() {
        this.isAvailable = false;
    }

    drain( amount ) {
        this.keg.drain( amount );
    }

    endUsing() {
        this.isAvailable = true;
        const callback = this.waitList.shift();
        if( callback ) {
            console.log("Tap is free, callback with ", this);
            callback( this );
        }
    }

}
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

// There can be only one storage-object in the system - it contains a number of kegs with various beertypes in them
class Storage {
    constructor( bar, autofill = true ) {
        this.bar = bar;
        this.autofill = autofill;
        this.storage = new Map(); // key: beerType, value: number of kegs in storage of that type
    }

    add( keg ) {
        console.error("UNUSED METHOD! Storage.add");
        /*
        // find type - add to count
        const typeOfBeer = keg.typeOfBeer.name;
        let list = this.storage[typeOfBeer];
        if(!list) {
            list = [];
            this.storage[typeOfBeer] = list;
        }
        list.push(keg);
        */
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

        // find the count for this type 
        let count = this.storage.get(beerType) || (this.autofill ? 10 : 0);

        if( count > 1 ) {
            // create new keg
            keg = new Keg(beerType, 2500);
            count--;
            this.storage.set(beerType, count);
        }

        return keg;
    }

    // returns a random keg (of a type that there more than 0 of!)
    getRandomKeg() {
        // find random type, by creating a list of all types with count > 0
        const beerTypes = Array.from(this.storage).filter(pair => pair[1] > 0).map( pair => pair[0]);
        console.log("Available beertypes: ", beerTypes);
        return this.getKeg( beerTypes[Math.floor(Math.random()*beerTypes.length)]);
    }

}

