import {Storage} from './storage.js';
import {BeerType,BeerTypes} from './beertype.js';
import {Bartender} from './bartender.js';

import {Logger} from './logger.js';

class Bar {
    constructor(name) {
        this.name = name;
        this.taps = [];
        this.bartenders = [];
        this.queue = []; // customers

        this.beingServed = []; // customers currently being served

        // create storage
        this.storage = new Storage(this, true);

        // Initialize customer-count
        this.nextCustomerID = 0;

        // start ticker
        setInterval(this.tick.bind(this), 1000);

        // Remember logger for external access
        this.Logger = Logger;
    }

    addBartender(name) {
        // create a bartender object
        const bartender = new Bartender(this, name);
        this.bartenders.push(bartender);
    }

    addTap( tap ) {
        tap.id = this.taps.length;
        tap.bar = this;
        this.taps.push(tap);
    }

    // add this customer to the queue
    addCustomer(customer) {
        customer.id = this.nextCustomerID++;
        customer.addedToQueue( Date.now() );
        this.queue.push(customer);
        Logger.log("Added customer " + customer.id + " to queue");
    }

    open() {
        
        // Log configuration
        Logger.log("Configuration - bartenders: " + this.bartenders.map( (bartender,i) => i + ": " + bartender.name ).join(", "));
        Logger.log("Configuration - taps: " + this.taps.map( tap => tap.id + ": " + tap.keg.beerType ).join(", "));
    }

    serveNextCustomer( bartender ) {
        // move customer out of queue
        const customer = this.queue.shift();
        // - to beingServed-list
        this.beingServed.push(customer);
        
        // and start serving the customer
        bartender.serveCustomer(customer);

        // then get to work
        if(!bartender.isWorking) {
            bartender.work();
        }
    }

    // The ticker runs every N seconds, looks for waiting customers and available bartenders, and
    // assigns work
    tick() {
        // console.log("tick");
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
        const bartenders = this.bartenders.filter( bartender => !bartender.isWorking );

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

    waitForAvailableTap( beer , callback ) {
        // find taps for this kind of beer
        let taps = this.taps.filter( tap => !tap.isBlocked && tap.keg.beerType === beer.beerType );

        // If there are no available taps for this kind of beer - first check if the blocked ones will get it
        if( taps.length === 0 ) {
            taps = this.taps.filter( tap => tap.isBlocked && tap.nextBeerType === beer.beerType );
            
            if( taps.length === 0 ) {
                // if the requested type is still not available, and wont be, ask the customer to modify their order
                return false;
            }
        }

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
            if( taps.length > 0 ) {
                // sort the list of taps by shortest waitlist
                taps.sort( (a,b) => a.waitList.length - b.waitList.length );
                Logger.log("No tap available for "+beer.beerType+" - waiting for tap " + taps[0].id);
                taps[0].addToWaitList( callback );
            } else {
                // Should never happen
                console.error("!!! DISASTER - tap for "+beerType+" can't be found!");
            }
        } 

        return true;
    }

    // Returns JSON-data about everything in the bar
    getData( short=false ) {
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

        // customers being served
        data.serving = this.beingServed.map(cust => {
            const ncust = {};
            ncust.id = cust.id;
            ncust.startTime = cust.queueStart;

            ncust.order = cust.order.beers.map( beer => beer.beerType.name );

            return ncust;
        });

        // bartenders
        data.bartenders = this.bartenders.map( bt => {
            const bart = {name: bt.name};

            // Status - Old style: READY or WORKING
            if( bt.currentTask.name === "waiting" ) {
                bart.status = "READY";
            } else {
                bart.status = "WORKING";
            }

            // Added detailed status = task.name
            bart.statusDetail = bt.currentTask.name;

            // Current tap being used
            bart.usingTap = bt.currentTap ? bt.currentTap.id : null; 

            // Current customer
            bart.servingCustomer = bt.currentCustomer ? bt.currentCustomer.id : null;
            return bart;
        });

        // taps
        data.taps = this.taps.map( tap => {
            const t = {};
            // id
            t.id = tap.id;
            // level
            t.level = tap.keg.level;
            // capacity
            t.capacity = tap.keg.capacity;
            // (beertype): name
            t.beer = tap.keg.beerType.name;
            // in use
            t.inUse = !tap.isAvailable;
            
            return t;
        });

        // storage
        data.storage = Array.from(this.storage.storage).map( pair => {
            return {
                name: pair[0].name,
                amount: pair[1]
            }
        });


        // beerinfo
        if( !short ) {
            data.beertypes = BeerTypes.all().map( info => {
                return {
                name: info.name,
                category: info.category,
                pouringSpeed: info.pouringSpeed,
                popularity: info.popularity,
                alc: info.alc,
                label: info.label,
                description: info.description
                }
            }

            );
        }


        // return JSON-ified data
        return JSON.stringify(data);
    }
}

export {Bar};