import { Loader } from "../node_modules/@googlemaps/js-api-loader/dist/index.mjs";
import { addMarker, handleMarkerClick } from "./addMarker.js";
export let currentInfoWindow = null;

let map;
window.markers = {};

// Fetch the API key and load the Google Maps API
fetch("/api/getApiKey")
  .then((response) => response.json())
  .then((data) => {
    const { apiKey } = data;

    const loader = new Loader({
      apiKey: apiKey,
      version: "weekly",
      libraries: ["places", "marker"],
    });

    loader
      .importLibrary("maps")
      .then(async () => {
        // Load the AdvancedMarkerElement here before using it
        const { AdvancedMarkerElement } = await google.maps.importLibrary(
          "marker"
        );
        console.log("Google Maps API version:", google.maps.version);

        // Now you can initialize the map
        map = new google.maps.Map(document.getElementById("map"), {
          center: { lat: 39.85664657967366, lng: -105.3838304599834 },
          zoom: 12,
          mapId: "DEMO_MAP_ID",
        });

        // Pass the AdvancedMarkerElement to the loadMarkers function
        loadMarkers(AdvancedMarkerElement);

        const locationButton = document.getElementById("locationButton");
        map.controls[google.maps.ControlPosition.BOTTOM_RIGHT].push(
          locationButton
        );
        document
          .getElementById("addMarkerButton")
          .addEventListener("click", () => addMarker(map));

        map.controls[google.maps.ControlPosition.BOTTOM_RIGHT].push(
          addMarkerButton
        );

        const input = document.getElementById("pac-input");
        input.placeholder = "Search coordinates, places";
        const searchBox = new google.maps.places.SearchBox(input);
        map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

        map.addListener("bounds_changed", () => {
          searchBox.setBounds(map.getBounds());
        });

        let markers = [];

        searchBox.addListener("places_changed", () => {
          const places = searchBox.getPlaces();

          if (places.length == 0) {
            return;
          }

          markers.forEach((marker) => {
            marker.setMap(null);
          });
          markers = [];

          const bounds = new google.maps.LatLngBounds();

          places.forEach((place) => {
            if (!place.geometry || !place.geometry.location) {
              console.log("Returned place contains no geometry");
              return;
            }

            const icon = {
              url: place.icon,
              size: new google.maps.Size(71, 71),
              origin: new google.maps.Point(0, 0),
              anchor: new google.maps.Point(17, 34),
              scaledSize: new google.maps.Size(25, 25),
            };

            markers.push(
              new AdvancedMarkerElement({
                map,
                icon,
                title: place.name,
                position: place.geometry.location,
              })
            );

            if (place.geometry.viewport) {
              bounds.union(place.geometry.viewport);
            } else {
              bounds.extend(place.geometry.location);
            }
          });
          map.fitBounds(bounds);
        });

        const infoWindow = new google.maps.InfoWindow();

        locationButton.addEventListener("click", () => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const pos = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                };

                markers.forEach((marker) => {
                  marker.setMap(null);
                });
                markers = [];

                const marker = new AdvancedMarkerElement({
                  position: pos,
                  map: map,
                  title: "Your Location",
                });

                infoWindow.setPosition(pos);
                map.setCenter(pos);
                map.setZoom(15);
              },
              () => {
                handleLocationError(true, infoWindow, map.getCenter());
              }
            );
          } else {
            handleLocationError(false, infoWindow, map.getCenter());
          }
        });
      })
      .catch((error) => {
        console.error("Error loading Google Maps:", error);
      });
  })
  .catch((error) => {
    console.error("Error fetching API key:", error);
  });

// Error handling function for location services
function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  const errorMessage = browserHasGeolocation
    ? "Error: The Geolocation service failed."
    : "Error: Your browser doesn't support geolocation.";

  console.error(errorMessage);

  infoWindow.setPosition(pos);
  infoWindow.setContent(errorMessage);
  infoWindow.open(map);
}

// Loading markers with AdvancedMarkerElement
export function loadMarkers(AdvancedMarkerElement) {
  fetch("/api/markers")
    .then((response) => response.json())
    .then((markersData) => {
      // Clear existing markers
      Object.values(window.markers).forEach((marker) => marker.setMap(null));
      window.markers = {};

      markersData.forEach((markerData) => {
        try {
          const marker = new AdvancedMarkerElement({
            position: { lat: markerData.lat, lng: markerData.lng },
            map: map,
            title: markerData.name,
            id: markerData.id,
          });

          const dateCreated = markerData.date_created;

          // Store marker in the global markers object
          window.markers[markerData.id] = marker;
          console.log("loaded marker id(s): " + markerData.id);
          marker.desc = markerData.desc;

          // Attach click event for modal display
          handleMarkerClick(marker, markerData.id, dateCreated);
        } catch (error) {
          console.error("Error creating marker:", error);
        }
      });
    })
    .catch((error) => console.error("Error loading markers:", error));
}
