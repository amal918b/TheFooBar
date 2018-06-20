"use strict";

window.addEventListener("DOMContentLoaded", poll);

// Since the configuration has to load, and I don't have a callback out here
// I'm just "polling" : asking every millisecond, if it is ready, before starting.
function poll() {
    if( window.FooBar ) {
        start();
    } else {
//        console.count("timeouts");
        setTimeout( poll, 1);
    }
}


function start() {
    console.log("Start");
//    FooBar.Logger.show(true);

    let data = JSON.parse(FooBar.getData(true));
    buildDisplay(data);

    setTimeout(refreshDisplay, 1000);
}

function refreshDisplay() {
    const data = JSON.parse(FooBar.getData(true));

    // update bartenders
    data.bartenders.forEach( (bartender,i) => {
        // find info
        const element = document.querySelector("#bartender_"+i);

        element.querySelector("[data-data='status']").textContent = bartender.status;
        element.querySelector("[data-data='statusDetail']").textContent = bartender.statusDetail;
        element.querySelector("[data-data='usingTap']").textContent = bartender.usingTap;
        element.querySelector("[data-data='servingCustomer']").textContent = bartender.servingCustomer;
        
    });

    // update taps
    data.taps.forEach( tap => {
        const element = document.querySelector("#tap_"+tap.id);

        element.querySelector("[data-data='beer']").textContent = tap.beer;
        element.querySelector("[data-data='inUse']").textContent = tap.inUse;
        element.querySelector("[data-data='level']").textContent = tap.level;
    });

    // update being served
    // first clear the contents
    document.querySelector("#serving_list").innerHTML = "";
    data.serving.forEach( customer => {
        // build customer-element
        const element = getCustomerElement(customer);
        document.querySelector("#serving_list").appendChild(element);
    });

    // update queue
    document.querySelector("#queue_list").innerHTML = "";
    data.queue.forEach( customer => {
        // build customer-element
        const element = getCustomerElement(customer);
        document.querySelector("#queue_list").appendChild(element);
    });

    // update storage
    document.querySelector("#storage_list").innerHTML = "";
    data.storage.forEach( store => {
        const clone = document.querySelector("template#storage_keg").content.cloneNode(true);
        clone.querySelector("[data-data='beertype']").textContent = store.name;
        clone.querySelector("[data-data='amount']").textContent = store.amount;

        document.querySelector("#storage_list").appendChild(clone);
    });

    setTimeout(refreshDisplay, 1000);
}

function getCustomerElement( customer ) {
    const element = document.querySelector("template#customer").content.cloneNode(true);

    element.querySelector("[data-data='id']").textContent = customer.id;
    element.querySelector("[data-data='order']").textContent = "["+customer.order.join(', ')+"]";

    return element;
}



// Load data, and build display
function buildDisplay( d ) {

    // build bartenders
    let template = document.querySelector("template#bartender");
    d.bartenders.forEach( (bartender,i) => {
        // clone bartender_template
        let clone = template.content.cloneNode(true);
        // fill with data
        clone.querySelector("#bartender_").id = "bartender_"+i;
        clone.querySelector("[data-data='name']").textContent = bartender.name;
        clone.querySelector("[data-data='status']").textContent = bartender.status;
        clone.querySelector("[data-data='statusDetail']").textContent = bartender.statusDetail;

        // insert into #bartenders
        document.querySelector("#bartenders").appendChild(clone);
    });

    // build taps
    template = document.querySelector("template#tap");
    d.taps.forEach( (tap) => {
        let clone = template.content.cloneNode(true);

        clone.querySelector("#tap_").id = "tap_"+tap.id;

        clone.querySelector("[data-data='id']").textContent = tap.id;
        clone.querySelector("[data-data='beer']").textContent = tap.beer;
        clone.querySelector("[data-data='inUse']").textContent = tap.inUse;
        clone.querySelector("[data-data='level']").textContent = tap.level;
        clone.querySelector("[data-data='capacity']").textContent = tap.capacity;

        document.querySelector("#taps").appendChild(clone);
    });
}
