"use strict";

// create the bar
const bar = createBar("fooBar");

function createBar(name) {
    const bar = new Bar(name);

    // create types of beer
    bar.addBeerType("ale");
    bar.addBeerType("pilsner");

    // build storage
    bar.storage.addKegs("ale", 10);
    bar.storage.addKegs("pilsner", 10);

    // create taps
    
    // get keg from storage - create tap with that keg
    let keg = bar.storage.getKeg("ale");
    let tap = new Tap(keg);
    bar.addTap(tap);

    keg = bar.storage.getKeg("pilsner");
    tap = new Tap(keg);
    bar.addTap(tap);
    

    // create bartender(s)
    bar.addBartender("Bob");
    bar.addBartender("Alice");

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
    const type = bar.beerTypeList[ Math.floor(Math.random()*bar.beerTypeList.length)];

    // TODO: Maybe weighted probability on different types and sizes ... 

    const beer = new Beer(type);

    return beer;
}

