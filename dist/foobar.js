(function () {
   'use strict';

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
       // UNTESTED
       getRandomKeg() {
           // find random type, by creating a list of all types with count > 0
           const beerTypes = Array.from(this.storage).filter(pair => pair[1] > 0).map( pair => pair[0]);
           console.log("Available beertypes: ", beerTypes);
           return this.getKeg( beerTypes[Math.floor(Math.random()*beerTypes.length)]);
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

   };

   /* logger is used for debugging - everything logs to here, and filters control how the log is shown/stored 


   */
   class _Logger {
       constructor() {
           this.outputToConsole = false;
           this.store = [];
       }

       show( outputToConsole ) {
           this.outputToConsole = outputToConsole;
       }

       log(message) {
           message = message.replace("\n", "\n                    " );

           const time = new Date();
           const timestring = "" + time.getFullYear() + "-" 
                               + String(time.getMonth()).padStart(2,0) + "-"
                               + String(time.getDate()).padStart(2,0) + " "
                               + String(time.getHours()).padStart(2,0) + ":"
                               + String(time.getMinutes()).padStart(2,0) + ":"
                               + String(time.getSeconds()).padStart(2,0);

           const msg = timestring + " " + message;

           // Store messages
           this.store.push(msg);

           // Show log to console, if enabled
           if(this.outputToConsole) {
               console.log(msg);
           }

           // TODO: if store gets too large, start dumping old messages ...
       }



   }

   const Logger = new _Logger();

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
           };

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
           this.addTask( new StartServing(customer) );
       }

       serveBeer( beer ) {
           this.addTask( new ServeBeer(beer) );
           this.addTask( new PourBeer(beer) );
           this.addTask( new DonePouringBeer(beer) );
       }
       
       receivePayment( customer ) {
           this.addTask( new ReceivePayment(customer));
       }
       
       endServing( customer ) {
           this.addTask( new EndServing(customer) );
       }

   }

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

   // A tap is connected directly to a keg
   class Tap {
       constructor( keg ) {
           this.keg = keg;
           this.waitList = [];
           this.isAvailable = true;
           this.id = -1; // is set to the index when reading the list of taps

           // status: in use - vs empty - begge kan være unavailable
       }

       addToWaitList( callback ) {
           this.waitList.push( callback );
       }

       startUsing() {
           this.isAvailable = false;
           Logger.log("Tap " + this.id + " is in use");
       }

       drain( amount ) {
           this.keg.drain( amount );
       }

       endUsing() {
           Logger.log("Tap " + this.id + " is available");
           this.isAvailable = true;
           const callback = this.waitList.shift();
           if( callback ) {
           //    console.log("Tap is free, callback with ", this);
               callback( this );
           }
       }

   }

   class Customer {
       constructor() {
           this.order = null;
           this.queueStart = 0;
           this.queueEnd = 0;
       }

       addedToQueue( timestamp ) {
           this.queueStart = timestamp;
       }

       startServing( timestamp ) {
           this.queueEnd = timestamp;
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
           } );
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

   //====================
   const version = "0.04";


   /* TODO:
       * add replacement of empty kegs
       * add breaks for bartenders
   */


   const beerinfo = [
       {
           "name":"El Hefe",
           "description":{
               "aroma": "Low to moderate grainy wheat or rye character.  Some malty sweetness is acceptable.  Esters can be moderate to none, although should reflect American yeast strains.  The clove and banana aromas common to German hefeweizens are inappropriate.  Hop aroma may be low to moderate, and can have either a citrusy American or a spicy or floral noble hop character.  Slight crisp sharpness is optional.  No diacetyl.",
               "appearance": "Usually pale yellow to gold.  Clarity may range from brilliant to hazy with yeast approximating the German hefeweizen style of beer.  Big, long-lasting white head.",
               "flavor": "Light to moderately strong grainy wheat or rye flavor, which can linger into the finish.  Rye versions are richer and spicier than wheat.  May have a moderate malty sweetness or finish quite dry.  Low to moderate hop bitterness, which sometimes lasts into the finish.  Low to moderate hop flavor (citrusy American or spicy/floral noble).  Esters can be moderate to none, but should not take on a German Weizen character (banana).  No clove phenols, although a light spiciness from wheat or rye is acceptable.  May have a slightly crisp or sharp finish.  No diacetyl.",
               "mouthfeel": "Medium-light to medium body.  Medium-high to high carbonation.  May have a light alcohol warmth in stronger examples.",
               "overallImpression": "Refreshing wheat or rye beers that can display more hop character and less yeast character than their German cousins."
           },
           "category":"Hefeweizen",
           "label":"elhefe.png",
           "alc": 5.4
       },{
           "name":"Fairy Tale Ale",
           "description":{
               "aroma": "A prominent to intense hop aroma with a citrusy, floral, perfume-like, resinous, piney, and/or fruity character derived from American hops.  Many versions are dry hopped and can have an additional grassy aroma, although this is not required.  Some clean malty sweetness may be found in the background, but should be at a lower level than in English examples.  Fruitiness, either from esters or hops, may also be detected in some versions, although a neutral fermentation character is also acceptable.  Some alcohol may be noted.",
               "appearance": "Color ranges from medium gold to medium reddish copper; some versions can have an orange-ish tint.  Should be clear, although unfiltered dry-hopped versions may be a bit hazy.  Good head stand with white to off-white color should persist.",
               "flavor": "Hop flavor is medium to high, and should reflect an American hop character with citrusy, floral, resinous, piney or fruity aspects.  Medium-high to very high hop bitterness, although the malt backbone will support the strong hop character and provide the best balance.  Malt flavor should be low to medium, and is generally clean and malty sweet although some caramel or toasty flavors are acceptable at low levels. No diacetyl.  Low fruitiness is acceptable but not required.  The bitterness may linger into the aftertaste but should not be harsh.  Medium-dry to dry finish.  Some clean alcohol flavor can be noted in stronger versions.  Oak is inappropriate in this style.  May be slightly sulfury, but most examples do not exhibit this character.",
               "mouthfeel": "Smooth, medium-light to medium-bodied mouthfeel without hop-derived astringency, although moderate to medium-high carbonation can combine to render an overall dry sensation in the presence of malt sweetness.  Some smooth alcohol warming can and should be sensed in stronger (but not all) versions.  Body is generally less than in English counterparts.",
               "overallImpression": "A decidedly hoppy and bitter, moderately strong American pale ale."
           },
           "category":"IPA",
           "label":"fairytaleale.png",
           "alc": 7.9
       },{
           "name":"GitHop",
           "description":{
               "aroma": "A prominent to intense hop aroma with a citrusy, floral, perfume-like, resinous, piney, and/or fruity character derived from American hops.  Many versions are dry hopped and can have an additional grassy aroma, although this is not required.  Some clean malty sweetness may be found in the background, but should be at a lower level than in English examples.  Fruitiness, either from esters or hops, may also be detected in some versions, although a neutral fermentation character is also acceptable.  Some alcohol may be noted.",
               "appearance": "Color ranges from medium gold to medium reddish copper; some versions can have an orange-ish tint.  Should be clear, although unfiltered dry-hopped versions may be a bit hazy.  Good head stand with white to off-white color should persist.",
               "flavor": "Hop flavor is medium to high, and should reflect an American hop character with citrusy, floral, resinous, piney or fruity aspects.  Medium-high to very high hop bitterness, although the malt backbone will support the strong hop character and provide the best balance.  Malt flavor should be low to medium, and is generally clean and malty sweet although some caramel or toasty flavors are acceptable at low levels. No diacetyl.  Low fruitiness is acceptable but not required.  The bitterness may linger into the aftertaste but should not be harsh.  Medium-dry to dry finish.  Some clean alcohol flavor can be noted in stronger versions.  Oak is inappropriate in this style.  May be slightly sulfury, but most examples do not exhibit this character.",
               "mouthfeel": "Smooth, medium-light to medium-bodied mouthfeel without hop-derived astringency, although moderate to medium-high carbonation can combine to render an overall dry sensation in the presence of malt sweetness.  Some smooth alcohol warming can and should be sensed in stronger (but not all) versions.  Body is generally less than in English counterparts.",
               "overallImpression": "A decidedly hoppy and bitter, moderately strong American pale ale."
           },
           "category":"IPA",
           "label":"githop.png",
           "alc": 8.7
       },{
           "name":"Hollaback Lager",
           "description":{
               "aroma": "Rich German malt aroma (of Vienna and/or Munich malt).  A light to moderate toasted malt aroma is often present.  Clean lager aroma with no fruity esters or diacetyl.  No hop aroma.  Caramel aroma is inappropriate.",
               "appearance": "Dark gold to deep orange-red color. Bright clarity, with solid, off-white, foam stand.",
               "flavor": "Initial malty sweetness, but finish is moderately dry.  Distinctive and complex maltiness often includes a toasted aspect.  Hop bitterness is moderate, and noble hop flavor is low to none. Balance is toward malt, though the finish is not sweet.  Noticeable caramel or roasted flavors are inappropriate.  Clean lager character with no diacetyl or fruity esters.",
               "mouthfeel": "Medium body, with a creamy texture and medium carbonation.  Smooth.  Fully fermented, without a cloying finish.",
               "overallImpression": "Smooth, clean, and rather rich, with a depth of malt character.  This is one of the classic malty styles, with a maltiness that is often described as soft, complex, and elegant but never cloying."
           },
           "category":"Oktoberfest",
           "label":"hollaback.png",
           "alc": 6.5
       },{
           "name":"Hoppily Ever After",
           "description":{
               "aroma": "A prominent to intense hop aroma with a citrusy, floral, perfume-like, resinous, piney, and/or fruity character derived from American hops.  Many versions are dry hopped and can have an additional grassy aroma, although this is not required.  Some clean malty sweetness may be found in the background, but should be at a lower level than in English examples.  Fruitiness, either from esters or hops, may also be detected in some versions, although a neutral fermentation character is also acceptable.  Some alcohol may be noted.",
               "appearance": "Color ranges from medium gold to medium reddish copper; some versions can have an orange-ish tint.  Should be clear, although unfiltered dry-hopped versions may be a bit hazy.  Good head stand with white to off-white color should persist.",
               "flavor": "Hop flavor is medium to high, and should reflect an American hop character with citrusy, floral, resinous, piney or fruity aspects.  Medium-high to very high hop bitterness, although the malt backbone will support the strong hop character and provide the best balance.  Malt flavor should be low to medium, and is generally clean and malty sweet although some caramel or toasty flavors are acceptable at low levels. No diacetyl.  Low fruitiness is acceptable but not required.  The bitterness may linger into the aftertaste but should not be harsh.  Medium-dry to dry finish.  Some clean alcohol flavor can be noted in stronger versions.  Oak is inappropriate in this style.  May be slightly sulfury, but most examples do not exhibit this character.",
               "mouthfeel": "Smooth, medium-light to medium-bodied mouthfeel without hop-derived astringency, although moderate to medium-high carbonation can combine to render an overall dry sensation in the presence of malt sweetness.  Some smooth alcohol warming can and should be sensed in stronger (but not all) versions.  Body is generally less than in English counterparts.",
               "overallImpression": "A decidedly hoppy and bitter, moderately strong American pale ale."
           },
           "category":"IPA",
           "label":"hoppilyeverafter.png",
           "alc": 4.5
       },{
           "name":"Mowintime",
           "description":{
               "aroma": "Rich German malt aroma (of Vienna and/or Munich malt).  A light to moderate toasted malt aroma is often present.  Clean lager aroma with no fruity esters or diacetyl.  No hop aroma.  Caramel aroma is inappropriate.",
               "appearance": "Dark gold to deep orange-red color. Bright clarity, with solid, off-white, foam stand.",
               "flavor": "Initial malty sweetness, but finish is moderately dry.  Distinctive and complex maltiness often includes a toasted aspect.  Hop bitterness is moderate, and noble hop flavor is low to none. Balance is toward malt, though the finish is not sweet.  Noticeable caramel or roasted flavors are inappropriate.  Clean lager character with no diacetyl or fruity esters.",
               "mouthfeel": "Medium body, with a creamy texture and medium carbonation.  Smooth.  Fully fermented, without a cloying finish.",
               "overallImpression": "Smooth, clean, and rather rich, with a depth of malt character.  This is one of the classic malty styles, with a maltiness that is often described as soft, complex, and elegant but never cloying."
           },
           "category":"European Lager",
           "label":"mowintime.png",
           "alc": 4
       },{
           "name":"Row 26",
           "description":{
               "aroma": "Moderate to strong aroma of roasted malts, often having a roasted coffee or dark chocolate quality.  Burnt or charcoal aromas are low to none.  Medium to very low hop aroma, often with a citrusy or resiny American hop character.  Esters are optional, but can be present up to medium intensity.  Light alcohol-derived aromatics are also optional.  No diacetyl.",
               "appearance": "Generally a jet black color, although some may appear very dark brown.  Large, persistent head of light tan to light brown in color.  Usually opaque.",
               "flavor": "Moderate to very high roasted malt flavors, often tasting of coffee, roasted coffee beans, dark or bittersweet chocolate.  May have a slightly burnt coffee ground flavor, but this character should not be prominent if present.  Low to medium malt sweetness, often with rich chocolate or caramel flavors.  Medium to high bitterness. Hop flavor can be low to high, and generally reflects citrusy or resiny American varieties.  Light esters may be present but are not required.  Medium to dry finish, occasionally with a light burnt quality.  Alcohol flavors can be present up to medium levels, but smooth.  No diacetyl.",
               "mouthfeel": "Medium to full body.  Can be somewhat creamy, particularly if a small amount of oats have been used to enhance mouthfeel.  Can have a bit of roast-derived astringency, but this character should not be excessive.  Medium-high to high carbonation.  Light to moderately strong alcohol warmth, but smooth and not excessively hot.",
               "overallImpression": "A hoppy, bitter, strongly roasted Foreign-style Stout (of the export variety)."
           },
           "category":"Stout",
           "label":"row26.png",
           "alc": 6.2
       },{
           "name":"Ruined Childhood",
           "description":{
               "aroma": "Variable.  Most exhibit varying amounts of fruity esters, spicy phenols and/or yeast-borne aromatics.  Aromas from actual spice additions may be present.  Hop aroma may be none to high, and may include a dry-hopped character.  Malt aroma may be low to high, and may include character of non-barley grains such as wheat or rye.  Some may include aromas of Belgian microbiota, most commonly Brettanomyces and/or Lactobacillus.  No diacetyl.",
               "appearance": "Variable.  Color varies considerably from pale gold to very dark.  Clarity may be hazy to clear.  Head retention is usually good.  Generally moderate to high carbonation.",
               "flavor": "Variable.  A great variety of flavors are found in these beers.  Maltiness may be light to quite rich.  Hop flavor and bitterness may be low to high.  Spicy flavors may be imparted by yeast (phenolics) and/or actual spice additions.  May include characteristics of grains other than barley, such as wheat or rye.  May include flavors produced by Belgian microbiota such as Brettanomyces or Lactobacillus.  May include flavors from adjuncts such as caramelized sugar syrup or honey.",
               "mouthfeel": "Variable.  Some are well-attenuated, thus fairly light-bodied for their original gravity, while others are thick and rich.  Most are moderately to highly carbonated.  A warming sensation from alcohol may be present in stronger examples.  A “mouth puckering” sensation may be present from acidity.",
               "overallImpression": "Variable.  This category encompasses a wide range of Belgian ales produced by truly artisanal brewers more concerned with creating unique products than in increasing sales."
           },
           "category":"Belgian Specialty Ale",
           "label":"ruinedchildhood.png",
           "alc": 10
       },{
           "name":"Sleighride",
           "description":{
               "aroma": "Variable.  Most exhibit varying amounts of fruity esters, spicy phenols and/or yeast-borne aromatics.  Aromas from actual spice additions may be present.  Hop aroma may be none to high, and may include a dry-hopped character.  Malt aroma may be low to high, and may include character of non-barley grains such as wheat or rye.  Some may include aromas of Belgian microbiota, most commonly Brettanomyces and/or Lactobacillus.  No diacetyl.",
               "appearance": "Variable.  Color varies considerably from pale gold to very dark.  Clarity may be hazy to clear.  Head retention is usually good.  Generally moderate to high carbonation.",
               "flavor": "Variable.  A great variety of flavors are found in these beers.  Maltiness may be light to quite rich.  Hop flavor and bitterness may be low to high.  Spicy flavors may be imparted by yeast (phenolics) and/or actual spice additions.  May include characteristics of grains other than barley, such as wheat or rye.  May include flavors produced by Belgian microbiota such as Brettanomyces or Lactobacillus.  May include flavors from adjuncts such as caramelized sugar syrup or honey.",
               "mouthfeel": "Variable.  Some are well-attenuated, thus fairly light-bodied for their original gravity, while others are thick and rich.  Most are moderately to highly carbonated.  A warming sensation from alcohol may be present in stronger examples.  A “mouth puckering” sensation may be present from acidity.",
               "overallImpression": "Variable.  This category encompasses a wide range of Belgian ales produced by truly artisanal brewers more concerned with creating unique products than in increasing sales."
           },
           "category":"Belgian Specialty Ale",
           "label":"sleighride.png",
           "alc":8.5
       },{
           "name":"Steampunk",
           "description":{
               "aroma": "Typically showcases the signature Northern Brewer hops (with woody, rustic or minty qualities) in moderate to high strength.  Light fruitiness acceptable.  Low to moderate caramel and/or toasty malt aromatics support the hops.  No diacetyl.",
               "appearance": "Medium amber to light copper color.  Generally clear.  Moderate off-white head with good retention.",
               "flavor": "Moderately malty with a pronounced hop bitterness.  The malt character is usually toasty (not roasted) and caramelly.  Low to moderately high hop flavor, usually showing Northern Brewer qualities (woody, rustic, minty).  Finish fairly dry and crisp, with a lingering hop bitterness and a firm, grainy malt flavor.  Light fruity esters are acceptable, but otherwise clean.  No diacetyl.",
               "mouthfeel": "Medium-bodied.  Medium to medium-high carbonation.",
               "overallImpression": "A lightly fruity beer with firm, grainy maltiness, interesting toasty and caramel flavors, and showcasing the signature Northern Brewer varietal hop character."
           },
           "category":"California Common",
           "label":"steampunk.png",
           "alc": 5
       }
   ];


   function createBar(name) {
       const bar = new Bar(name);
       bar.version = version;

       // * create types of beer
       // FUTURE: load beerinfo.json into beerinfo - for now it is just there
       beerinfo.forEach( info => {
           // Create Beertype
           const beerType = new BeerType(info);
       }); 

       // * build storage
       // - add between 2 and 10 kegs of each type
       BeerTypes.all().forEach( beerType => bar.storage.addKegs(beerType, Math.floor(Math.random()*8)+2));

       // * create taps
       // FUTURE: Get numberOfTaps from configuration - for now just use this constant
       const numberOfTaps = 7;

       // let all the taps be random, but no more than two of a kind!
       // - create a list of all beertypes - duplicate and concatenate it to itself - select random indexes and remove
       const possibilities = BeerTypes.all().concat(BeerTypes.all());
       for( let i=0; i < numberOfTaps; i++ ) {
           const index = Math.floor(Math.random()*possibilities.length);
           const beerType = possibilities[i];

           // get a keg of this type from storage
           const keg = bar.storage.getKeg(beerType);

           // create a tap, and add it to the bar
           const tap = new Tap(keg);
           bar.addTap(tap);

           // remove beerType from possibilities
           possibilities.splice(index,1);
       }

       // * create bartenders
       // FUTURE: Get bartendernames from configuration
       bar.addBartender("Peter");
       bar.addBartender("Jonas");
       bar.addBartender("Martin");
     //  bar.addBartender("Marie"); 
     //  bar.addBartender("Santiago"); 
     //  bar.addBartender("Wes");
     //  bar.addBartender("Sarah");

       console.log("Created Bar '"+bar.name+"' - ready for customers ...");

       // return the bar
       return bar;
   }

   // create a customer with an order for some random beers
   function createCustomer() {
       const customer = new Customer();

       const numberOfBeers = Math.ceil( Math.random() * 4); // TODO: Make better random distribution
       const order = new Order( customer );

       for( let i=0; i < numberOfBeers; i++ ) {
           const beer = createRandomBeer();
           order.addBeer(beer);
       }

       return customer;
   }

   function createRandomBeer() {
       // ask bar for beertypes
       const beer = new Beer( bar.getRandomAvailableBeerType() );
       return beer;
   }

   // Customer-generator
   function CustomerGenerator() {
       
       function generateCustomers(min=0, max=4) {

           // generate between 0 and 4 customers
           for( let number = Math.floor(Math.random()*(max-min))+min; number > 0; number-- ) {
           //    console.log("Generate customer");
               // Never more than 25 customers in queue!
               if( bar.queue.length < 25 ) {
                   bar.addCustomer( createCustomer() );
                   //console.log("add customer");
               }
           }

           // By default wait 60 seconds before adding to the queue
           // If there are less than 10 people in the queue, wait only 30 seconds
           let nextCustomerIn = 60;
           if( bar.queue.length < 10 ) {
               nextCustomerIn = 30;
           }
           // If the queue is empty, wait only 10 seconds
           if( bar.queue.length === 0 ) {
               nextCustomerIn = 10;
           }

           setTimeout( generateCustomers, nextCustomerIn*1000 );
       }

       // First time it is called, generate a queue between 5 and 15 people
       generateCustomers(5,15);
       console.log("Initialised CustomerGenerator with " + bar.queue.length + " customers");
   }


   const bar = createBar("FooBar");
   CustomerGenerator();

   // For "exporting" to normal use outside modules
   window.FooBar = bar;

}());
