"use strict";

// TODO: måske add stock-price

class Bar {
    constructor(name) {
        // TODO: Closing-time (hardcoded 22:00:00)

        this.beerTypes = [];
        this.beerTypeList = []; // The same content as beerTypes, but arranged as a numbered array

        this.taps = [];

        this.bartenders = [];
        this.queue = [];

        // create storage
        this.storage = new Storage(this, true);

        // Initialize customer-count
        this.nextCustomerID = 0;

        // start ticker
      //  setInterval(this.tick.bind(this), 1000);
    }

    addBeerType(name, size) {
        const type = new BeerType(name, size);
        this.beerTypes[name] = type;
        this.beerTypeList.push(type);
    }

    addBartender(name) {
        // create a bartender
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

    waitForAvailableTap( beerType, callback ) {
        // find taps for this kind of beer
        const taps = this.taps.filter( tap => tap.keg.typeOfBeer.name == beerType );

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

            ncust.order = cust.order.beers.map( beer => beer.typeOfBeer.name );

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
                name: tap.keg.typeOfBeer.name,
                // description
                description: tap.keg.typeOfBeer.description,
                // category    
                category: tap.keg.typeOfBeer.category,
                // label
                label: tap.keg.typeOfBeer.label,
                // alcohol
                alcohol: tap.keg.typeOfBeer.alcohol
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
            BREAK: Symbol("State.BREAK")
        }

        this.currentState = this.state.READY;
    }

    addTask( task ) {
        this.tasks.push(task);
        task.owner = this;
    }

    work( parameter ) {
        console.log("Working for this %o with %o", this, parameter);
        if(this.tasks.length > 0) {
            this.isWorking = true;

            const task = this.tasks.shift();
            task.perform( parameter );
        } else {
            this.isWorking = false;
            console.log("No work to be done for " + this.name + " - playing a bit of fussball ...");
        }
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
        console.log("Starting task: %s - will take %d seconds", this.name, this.time)

        // and callback on the owner to do the next task, when done
        setTimeout( this.owner.work.bind(this.owner), this.time*1000 );
    }
}

class StartServing extends Task {
    constructor(customer) {
        super("startServing");
        this.customer = customer;
        this.time = 2; // Taking the order takes 10 seconds

        customer.beingServed = true;
    }

    perform() { 
        super.perform();
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
        super("serveBeer");
        this.beer = beer;

        this.time = beer.size / beer.typeOfBeer.pouringSpeed;
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
            if( a.typeOfBeer.name < b.typeOfBeer.name ) {
                return -1;
            } else if( a.typeOfBeer.name > b.typeOfBeer.name ) {
                return 1;
            } else {
                return 0;
            }
        } )
    }
}

// A beer is a glass of beer of a certain type+size. Default 50cl.
class Beer {
    constructor( typeOfBeer, size = 50) {
        this.typeOfBeer = typeOfBeer;
        this.size = size;
    }

    toString() {
        return this.typeOfBeer.toString();
    }
}

// A beertype has a name and a pouringSpeed (some beers might be slower!)
class BeerType {
    // TODO: Add probability/popularity of this beer
    constructor( name, pouringSpeed = 5 ) {
        this.name = name;
        this.pouringSpeed = pouringSpeed; // cl pr second
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
    constructor( typeOfBeer, capacity ) {
        this.typeOfBeer = typeOfBeer;
        this.capacity = capacity;
        this.level = this.capacity; // initial the keg is full
    }

    drain( amount ) {
        this.level -= amount;
        // TODO: Handle empty keg
    }
}

// There can be only one storage-object in the system - it contains a number of kegs
class Storage {
    constructor( bar, autofill = true ) {
        this.bar = bar;
        this.autofill = autofill;
        this.storage = {}; 
    }

    add( keg ) {
        // find type - add to count
        const typeOfBeer = keg.typeOfBeer.name;
        let list = this.storage[typeOfBeer];
        if(!list) {
            list = [];
            this.storage[typeOfBeer] = list;
        }
        list.push(keg);
    }

    addKegs( typeOfBeer, numberOfKegs ) {
        const type = this.bar.beerTypes[typeOfBeer];
        for( let i=0; i < numberOfKegs; i++ ) {
            const keg = new Keg(type, 2500);
            
            this.add( keg );
        }
    }

    getKeg( typeOfBeer ) {
        const keg = this.storage[typeOfBeer].shift();

        if( this.autofill && this.storage[typeOfBeer].length == 0) {
            this.addKegs(typeOfBeer, 10); // autofill to 10 if empty
        }
        
        return keg;
    }

}

