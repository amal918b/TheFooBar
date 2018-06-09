import {Logger} from './logger.js';

class Task {
    constructor(name) {
        this.name = name;
        this.owner = null; // the owner should set itself when adding the task
        this.time = 0; // the time for this task to complete - set by extending classes
    }

    // called by work, calls work again after 
    enter( parameter ) {
//        console.log("enter task %o with parameter %o", this, parameter);
        setTimeout( this.owner.work.bind(this.owner), this.time*1000 );
    }

    exit() {
//        console.log("exit task ", this);
    }
/*
    perform() {
        // do this task ... 
       // console.log("-task: "+this.name+" will take %d seconds", this.time)

        // and callback on the owner to do the next task, when done
        setTimeout( this.owner.work.bind(this.owner), this.time*1000 );
    }
*/    

    toString() {
        return this.name;
    }
}

class Waiting extends Task {
    constructor() {
        super("waiting");
    }

    enter() {
        Logger.log("Bartender "+this.owner.name+" is waiting for a new customer");
    }

    exit() {
        Logger.log("Bartender "+this.owner.name+" is done waiting.");
    }
}

class StartServing extends Task {
    constructor(customer) {
        super("startServing");
        this.customer = customer;
        this.time = 2; // Taking the order takes 10 seconds - or only two?
    }

    enter() {
        // TODO: customer.state should be modified instead of this
        this.customer.beingServed = true;
        // TODO: log the current time in the customer

        const ordertext = this.customer.order.beers.map( b => "'"+b.beerType.name+"'" ).join(', ');
        Logger.log("Bartender "+this.owner.name+" starts serving customer " + this.customer.id + "\nwith order [" + ordertext + "]");

        super.enter();
    }

    exit() {
        // Log bartenders tasklist
        const tasklist = this.owner.tasks.join(', ');
        Logger.log("Bartender "+this.owner.name+"' plan for serving customer "+this.customer.id+" is: ["+tasklist+"]");

        super.exit();
    }

    
}

class ReserveTap extends Task {
    constructor(beer) {
        super("reserveTap");
        this.beer = beer;
    }

    enter() {
        Logger.log("Bartender "+this.owner.name+" wants to pour '" + this.beer + "'");
        // Find available tap - then pourbeer (that is expected to be next task in queue)
        this.owner.bar.waitForAvailableTap( this.beer, this.owner.work.bind(this.owner) );
        
        // don't call super - the tap handles the callback
    }

    exit(tap) {
        // exit should be called by the tap, or whatever calls us when wap is ready
        Logger.log("Bartender "+this.owner.name+" has reserved tap '" + tap.id + "'");
        this.owner.reserveTap(tap);
        
        super.exit();
    }

    toString() {
        return super.toString() + " ("+this.beer.beerType.name+")";
    }
}

class ReleaseTap extends Task {
    constructor() {
        super("releaseTap");
        this.time = 1;
    }

    enter() {
        this.tap = this.owner.currentTap;
        this.owner.releaseTap();

        super.enter();
    }

    exit() {
        Logger.log("Bartender "+this.owner.name+" has released tap '" + this.tap.id + "'");
        super.exit();
    }
}

class PourBeer extends Task {
    constructor(beer) { 
        super("pourBeer");

        // We need the beer for the size, and pouringSpeed
        this.beer = beer;

        this.time = beer.size / beer.beerType.pouringSpeed;
    }

    enter() {
        this.tap = this.owner.currentTap;
        this.tap.drain( this.beer.size );
        Logger.log("Bartender "+this.owner.name+" pours '" + this.beer + "' from tap " + this.tap.id);
        super.enter();
    }

    exit() {
        Logger.log("Bartender "+this.owner.name+" is done pouring '" + this.beer + "' from tap " + this.tap.id);
        super.exit();
    }

}

// TODO: Make entry and exit methods for tasks, rather than two tasks
class DonePouringBeer extends Task {
    constructor(beer) {
        super("donePouringBeer");
        this.beer = beer;
        this.time = 0;
    }

    perform( ) {
        // free this tap
        const tap = this.owner.tap;
        Logger.log("Bartender "+this.owner.name+" is done pouring '" + this.beer + "' from tap " + tap.id);

        this.owner.tap = null;
        const result = tap.endUsing();

        if( result !== "KEEP" ) {
            Logger.log("Bartender "+this.owner.name+" should replace keg for tap " + tap.id);

            // Create tasks for replacing keg
            const replaceTask = new ReplaceKeg(tap,result);
            const replaceTaskDone = new DoneReplacingKeg(tap);

            // if this customer wants more of this beertype (and there are no other taps for this type)
            // - then exchange the keg immediately

            // look through the tasks for this bartender - if anyone is pourBeer with the same beertype as the current keg
            if( result === "REPLACE" ||
                this.owner.tasks.filter( task => task.name === "pourBeer" && task.beer.beerType == tap.keg.beerType).length > 0 ) {
                Logger.log("Replace keg immediately");

                this.owner.insertTask(replaceTaskDone);
                this.owner.insertTask(replaceTask);

            } else {
                Logger.log("Replace keg after serving this customer");
                this.owner.addTask(replaceTask);
                this.owner.addTask(replaceTaskDone);
            }

            // if it is, but this customer doesn't need any more:
            // - exchange the keg after serving this customer
            // if it isn't, don't care!!
        }

        
        
        super.perform();
    }
}

class ReceivePayment extends Task {
    constructor(order) {
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

    enter() {
        this.customer.beingServed = false;

        // remove customer from beingServed list
        // TODO: Should be done by the bar!
        const index = this.owner.bar.beingServed.findIndex(cust => cust.id === this.customer.id);
        this.owner.bar.beingServed.splice(index,1);

        super.enter();
    }

    exit() {
        super.exit()

    }
}

class ReplaceKeg extends Task {
    constructor(tap, mode) {
        super("replaceKeg");
        // mode suggests REPLACE: with one of same kind,
        // or EXCHANGE: with a random kind
        this.tap = tap;
        this.mode = mode;

        this.time = 30; // it takes 30 seconds to replace a keg
    }

    perform() {
        super.perform();

        
    }
}

// TODO: Make entry and exit methods for tasks, rather than two tasks
class DoneReplacingKeg extends Task {
    constructor(tap,mode) {
        super("doneReplacingKeg");
        this.tap = tap;
        this.mode = mode;
        this.time = 0; 
    }

    perform() {
        super.perform();

        // find keg from storage
        const keg = this.owner.bar.storage.getKeg(this.tap.keg.beerType);
        console.log("Replaced keg with ", keg);
        this.tap.keg = keg;
        this.tap.replaceKeg();

    }
}

export {Waiting, StartServing, ReserveTap, PourBeer, ReleaseTap, ReceivePayment, EndServing};