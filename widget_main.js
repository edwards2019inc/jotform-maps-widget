/**
 * @license
 * Copyright 2022 Google LLC. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */
let map;
let pickupMarker;
let pickupInfoWindow;
let dropoffMarker;
let dropoffInfoWindow;
let pickupPlace;
let dropoffPlace;
let jotformReturnData;
let erc_maps_init = false;

async function initMap() {
  console.log("Initializing Maps...");
  // Request needed libraries.
  //@ts-ignore
  const [{
    Map
  }, {
    AdvancedMarkerElement
  }] = await Promise.all([
    google.maps.importLibrary("marker"),
    google.maps.importLibrary("places"),
    google.maps.importLibrary("routes"),
  ]);

  // Initialize the map.
  map = new google.maps.Map(document.getElementById("map"), {
    center: {
      lat: 44.975289,
      lng: -93.267124
    },
    zoom: 8,
    mapId: "8656a74301df763a",
    mapTypeControl: false,
    fullscreenControl: false,
    streetViewControl:false,

  });

  // Initialize Directions
  directionsService = new google.maps.DirectionsService();

  const tripSummaryCard = document.getElementById("trip-summary-card");
  //map.controls[google.maps.ControlPosition.TOP_LEFT].push(tripSummaryCard);

  //@ts-ignore
  const placeAutocompletePickup = new google.maps.places.PlaceAutocompleteElement();
  
  //@ts-ignore
  placeAutocompletePickup.id = "place-autocomplete-input-pickup";
  placeAutocompletePickup.classList.add("place-autocomplete-input");
  
  const pickupCard = document.getElementById("place-autocomplete-card-pickup");

  //@ts-ignore
  pickupCard.appendChild(placeAutocompletePickup);

  //@ts-ignore
  const placeAutocompleteDropoff = new google.maps.places.PlaceAutocompleteElement();

  //@ts-ignore
  placeAutocompleteDropoff.id = "place-autocomplete-input-dropoff";
  placeAutocompleteDropoff.classList.add("place-autocomplete-input");
  
  const dropoffCard = document.getElementById("place-autocomplete-card-dropoff");

  //@ts-ignore
  dropoffCard.appendChild(placeAutocompleteDropoff);

  // Create the marker and infowindow
  pickupMarker = new google.maps.marker.AdvancedMarkerElement({
    map,
  });
  pickupInfoWindow = new google.maps.InfoWindow({headerDisabled:true});

  dropoffMarker = new google.maps.marker.AdvancedMarkerElement({
    map,
  });
  dropoffInfoWindow = new google.maps.InfoWindow({headerDisabled:true});

  // Add the gmp-placeselect listener, and display the results on the map.
  //@ts-ignore
  placeAutocompletePickup.addEventListener("gmp-placeselect", async ({
    place
  }) => {
    
    await place.fetchFields({
      fields: ["displayName", "formattedAddress", "location"],
    });
    pickupPlace = place
    // If the place has a geometry, then present it on a map.
    if (place.viewport) {
      map.fitBounds(place.viewport);
    } else {
      map.setCenter(place.location);
      map.setZoom(17);
    }

    let content =
      '<div class="infowindow-content">' +
      '<span>Pickup:</span>' +
      '<span id="pickup-displayname" class="title">' +
      place.displayName +
      "</span><br />" +
      '<span id="pickup-address">' +
      place.formattedAddress +
      "</span>" +
      "</div>";

    updateInfoWindow(pickupInfoWindow, pickupMarker, content, place.location);
    pickupMarker.position = place.location;
  });
  placeAutocompleteDropoff.addEventListener("gmp-placeselect", async ({
    place
  }) => {
    dropoffPlace = place
    await place.fetchFields({
      fields: ["displayName", "formattedAddress", "location"],
    });
    // If the place has a geometry, then present it on a map.
    if (place.viewport) {
      map.fitBounds(place.viewport, 25);
    } else {
      map.setCenter(place.location);
      map.setZoom(17);
    }

    let content =
      '<div class="infowindow-content">' +
      '<span>Dropoff:</span>' +
      '<span id="dropoff-displayname" class="title">' +
      place.displayName +
      "</span><br />" +
      '<span id="dropoff-address">' +
      place.formattedAddress +
      "</span>" +
      "</div>";

    updateInfoWindow(dropoffInfoWindow, dropoffMarker, content, place.location);
    dropoffMarker.position = place.location;
    if(pickupPlace && dropoffPlace){
      document.getElementById("place-autocomplete-card-dropoff").blur();
      document.getElementById("place-autocomplete-card-pickup").blur();
      document.getElementById("map").focus();
      console.log("blurring input and switching focus to map");
      getDirections(pickupPlace, dropoffPlace);
    }
  });
  placeAutocompleteDropoff.addEventListener("gmp-placeselect", 
    place => {
      document.activeElement.blur();
  });
  console.log("Maps Initialized.");
  erc_maps_init = true;
}
// Helper function to create an info window.
function updateInfoWindow(infoWindow, marker, content, center) {
  infoWindow.setContent(content);
  infoWindow.setPosition(center);
  infoWindow.open({
    map,
    anchor: marker,
    shouldFocus: false,
  });
}

function logStatusMessage(msg) {
  var statusDiv = $("<div class='status_msg'></div>");
  $(statusDiv).text(msg);
  $("#statusBar").append(statusDiv);
  setTimeout(function() {
    $(statusDiv).remove();
  }, 3000);
};

function km2mi(km) {
  return km * 3.28084 / 5280;
}
//function getDirections(apikey, origin, destination, timeAnchor, anchorTime){
function getDirections(originPlace, destinationPlace) {
  // timAnchor is one of departure_time or arrival_time
  // anchorTime is an integer from Date.getTime()
  console.log(originPlace);
  console.log(destinationPlace);
  directionsService.route({
      origin:{placeId: originPlace.id},
      destination:{placeId: destinationPlace.id},
      travelMode: google.maps.TravelMode.DRIVING,
    })
    .then((response) => {
      onDirectionsReady(response);
    });
}

function onDirectionsReady(directions) {
  let duration = directions.routes[0].legs[0].duration.value;
  let distance = km2mi(directions.routes[0].legs[0].distance.value);
  $('#trip-summary-miles').text(Math.ceil(distance * 10) / 10);
  $('#trip-summary-minutes').text(Math.ceil(duration / 60 * 10) / 10);
  jotformReturnData = {
    pickupAddress: pickupPlace.formattedAddress,
    pickupPlaceID:pickupPlace.id,
    destinationAddress: dropoffPlace.formattedAddress,
    destinationPlaceID: dropoffPlace.id,
    driveTime: $('#trip-summary-minutes').text(),
    driveDistance: $('#trip-summary-miles').text()
  }
  bounds = new google.maps.LatLngBounds();
  bounds.extend(pickupMarker.position);
  bounds.extend(dropoffMarker.position);
  console.log(pickupInfoWindow.getAnchor());
  bounds.extend(pickupInfoWindow.getAnchor().position);
  bounds.extend(dropoffInfoWindow.getAnchor().position);
  map.fitBounds(bounds,100);
  console.log("sending maps data: " + JSON.stringify(jotformReturnData))
  JFCustomWidget.sendData({
    valid: true,
    value: JSON.stringify(jotformReturnData)
  });
}
function autoPopulate(value){
  place_ids = value.split("|");
  console.log("place ids: " + JSON.stringify(place_ids));
  getDirections(place_ids[0], place_ids[1]);
}
//always subscribe to ready event and implement widget related code
//inside callback function , it is the best practice while developing widgets
JFCustomWidget.subscribe("ready", function(initData) {
  console.log("ready: " + JSON.stringify(initData));
  var label = JFCustomWidget.getWidgetSetting('QuestionLabel');
  document.getElementById('label_text').innerHTML = label;
  //subscribe to form submit event
  JFCustomWidget.subscribe("submit", function() {
    console.log("Maps Widget submit");
    var msg = {
      //you should valid attribute to data for JotForm
      //to be able to use youw widget as required
      valid: true,
      value: JSON.stringify(jotformReturnData)
    };
    msg = {
      valid: true,
      //return [a + ": " + t.origin_addresses[0], 
      //r + ": " + t.destination_addresses[0],
      //l + ": " + t.rows[0].elements[0].distance.text,
      //d + ": " + t.rows[0].elements[0].duration.text]
      //.join("\n")
      value: ["Trip pick-up location: " + jotformReturnData.pickupAddress,
        "Trip destination: " + jotformReturnData.destinationAddress,
        "One-way distance: " + jotformReturnData.driveDistance + " mi",
        "One-way duration: " + jotformReturnData.driveTime + " mins"
      ].join("\n")
    };
    console.log("Submitting data: ");
    console.log(msg);
    // send value to JotForm
    JFCustomWidget.sendSubmit(msg);

  });
  
  //TODO: update to support populating (need to fill in autocomplete)
  JFCustomWidget.subscribe('populate', function(data) {
    console.log("populate: " + JSON.stringify(data));
    if(!erc_maps_init){
      console.log("Maps not initialized yet. Initializing... ");
      initMap();
    }
    autoPopulate(data.value);
  });

  if(initData.state == "oldvalue"){
    if(initData.value){
      autoPopulate(initData.value);
    }
  }

});
initMap();
