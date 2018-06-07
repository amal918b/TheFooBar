import {Logger} from './logger.js';

class Task {
    constructor(name) {
        this.name = name;
        this.owner = null; // the owner should set itself when adding the task
        this.time = 0; // the time for this task to complete - set by extending classes
    }

    perform() {
        // do this task ... 
       // console.log("-task: "+this.name+" will take %d seconds", this.time)

        // and callback on the owner to do the next task, when done
        setTimeout( this.owner.work.bind(this.owner), this.time*1000 );
    }
}

class StartServing extends Task {
    constructor(customer) {
        super("startServing");
        this.customer = customer;
        this.time = 2; // Taking the order takes 10 seconds

        // TODO: customer.state should be modified instead of this
        customer.beingServed = true;
    }

    perform() { 
        super.perform();

        const ordertext = this.customer.order.beers.map( b => "'"+b.beerType.name+"'" ).join(', ');

        Logger.log("Bartender "+this.owner.name+" starts serving customer " + this.customer.id + "\nwith order [" + ordertext + "]");
        // TODO: log the current time in the customer
//        this.customer.
        // log list of beers in this customer's order
    /*    this.customer.order.beers.forEach( beer => {
            console.log("--" + beer);
        })
*/
        this.owner.currentState = this.owner.state.SERVING;
    }
}

class ServeBeer extends Task {
    constructor(beer) {
        super("serveBeer");
        this.beer = beer;
    }

    perform() {
        Logger.log("Bartender "+this.owner.name+" wants to pour '" + this.beer + "'");
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
     //   console.log("Pour beer from tap ", tap);
        Logger.log("Bartender "+this.owner.name+" pours '" + this.beer + "' from tap " + tap.id);

        // reserve this tap
        tap.startUsing();
        this.owner.tap = tap;

        tap.drain( this.beer.size );

        // TODO: drain beer from keg
        super.perform();

    }
}

class DonePouringBeer extends Task {
    constructor(beer) {
        super("donePouringBeer");
        this.beer = beer;
        this.time = 1;
    }

    perform( ) {
        // free this tap
        const tap = this.owner.tap;
        Logger.log("Bartender "+this.owner.name+" is done pouring '" + this.beer + "' from tap " + tap.id);

        this.owner.tap = null;
        tap.endUsing();
//        this.owner.tap = null
        
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

     
    }

    perform() { 
        super.perform();

        this.customer.beingServed = false;

        // remove customer from beingServed list
        const index = this.owner.bar.beingServed.findIndex(cust => cust.id === this.customer.id);
        this.owner.bar.beingServed.splice(index,1);

        this.owner.currentState = this.owner.state.READY;
    }
}

export {StartServing, ServeBeer, PourBeer, DonePouringBeer, ReceivePayment, EndServing};