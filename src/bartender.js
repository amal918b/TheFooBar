import * as Task from './bartender_tasks.js';
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

        this.tap = null;

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
            //console.log("Bartender " + this.name + " starts task " + task.name + ", with parameter", parameter);
            task.perform( parameter );
        } else {
            this.isWorking = false;
            //console.log("Bartender " + this.name + " has no more work");// ... will go for a break in 5 minutes");
            if( this.bar.queue.length === 0 ) {
                //console.log("will go for a break in 5 minutes");   
                // TODO: start break in 5 minutes, if no work shows up
                this.requestBreak(5);
            }
            
        }
    }

    requestBreak( inMinutes ) {
        setTimeout( function() {
            // request the break here!
            //console.log("Request break for", this);

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
        this.addTask( new Task.StartServing(customer) );
    }

    serveBeer( beer ) {
        this.addTask( new Task.ServeBeer(beer) );
        this.addTask( new Task.PourBeer(beer) );
        this.addTask( new Task.DonePouringBeer(beer) );
    }
    
    receivePayment( customer ) {
        this.addTask( new Task.ReceivePayment(customer));
    }
    
    endServing( customer ) {
        this.addTask( new Task.EndServing(customer) );
    }

}

export {Bartender};