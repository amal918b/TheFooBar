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
        this.taps.push(tap);
    }

    // add this customer to the queue
    addCustomer(customer) {
        customer.id = this.nextCustomerID++;
        customer.addedToQueue( Date.now() );
        this.queue.push(customer);
        Logger.log("Added customer " + customer.id + " to queue");
    }

    serveNextCustomer( bartender ) {
        const customer = this.queue.shift();

        this.beingServed.push(customer);
        
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

            Logger.log("No tap available for "+beerType+" - waiting for tap " + taps[0].id);
            // console.log("No tap available for "+beerType.toString()+" beer - waiting for one of: %o", taps);

            taps[0].addToWaitList( callback );
        } 

        return taps;
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