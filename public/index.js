import { Loader } from "../node_modules/@googlemaps/js-api-loader/dist/index.mjs";
import { addMarker } from "./addMarker/addMarker.js";
import { handleMarkerClick } from "./marker/markerHandler.js";
import {
  setInSelectionMode,
  getInSelectionMode,
  toggleButtonState,
} from "../js/state.js";

// export let currentInfoWindow = null;

let map;
window.markers = {};

let idleListener;
export const debouncedLoadMarkers = debounce(loadMarkers, 300);

// Fetch the API key and load the Google Maps API
fetch("/api/getApiKey")
  .then((response) => response.json())
  .then((data) => {
    let { apiKey } = data;

    let loader = new Loader({
      apiKey: apiKey,
      version: "weekly",
      libraries: ["places", "marker"],
    });

    loader
      .importLibrary("maps")
      .then(async () => {
        // Load the AdvancedMarkerElement here before using it
        let { AdvancedMarkerElement } = await google.maps.importLibrary(
          "marker"
        );
        console.log("Google Maps API version:", google.maps.version);

        // Now you can initialize the map
        map = new google.maps.Map(document.getElementById("map"), {
          center: { lat: 39.85664657967366, lng: -105.3838304599834 },
          zoom: 12,
          mapId: "DEMO_MAP_ID",
        });

        // Listen for the 'idle' event to ensure map bounds are ready
        idleListener = map.addListener("idle", () => {
          if (!getInSelectionMode()) {
            debouncedLoadMarkers(AdvancedMarkerElement);
          }
        });

        // Pass the AdvancedMarkerElement to the loadMarkers function
        // loadMarkers(AdvancedMarkerElement);

        let locationButton = document.getElementById("locationButton");
        map.controls[google.maps.ControlPosition.BOTTOM_RIGHT].push(
          locationButton
        );
        document
          .getElementById("addMarkerButton")
          .addEventListener("click", () => addMarker(map));

        map.controls[google.maps.ControlPosition.BOTTOM_RIGHT].push(
          addMarkerButton
        );

        let input = document.getElementById("pac-input");
        input.placeholder = "Search coordinates, places";
        let searchBox = new google.maps.places.SearchBox(input);
        map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

        map.addListener("bounds_changed", () => {
          searchBox.setBounds(map.getBounds());
        });

        let markers = [];

        searchBox.addListener("places_changed", () => {
          let places = searchBox.getPlaces();

          if (places.length == 0) {
            return;
          }

          markers.forEach((marker) => {
            marker.setMap(null);
          });
          markers = [];

          let bounds = new google.maps.LatLngBounds();

          places.forEach((place) => {
            if (!place.geometry || !place.geometry.location) {
              console.log("Returned place contains no geometry");
              return;
            }

            let markerContent = document.createElement("div");
            markerContent.classList.add("custom-marker");
            markerContent.style.backgroundImage = `url(${place.icon})`;
            markerContent.style.width = "25px";
            markerContent.style.height = "25px";
            markerContent.style.backgroundSize = "contain";

            markers.push(
              new AdvancedMarkerElement({
                map,
                content: markerContent,
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
          map.setZoom(18);
        });

        let infoWindow = new google.maps.InfoWindow();

        locationButton.addEventListener("click", () => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                let pos = {
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
                };

                markers.forEach((marker) => {
                  marker.setMap(null);
                });
                markers = [];

                let marker = new AdvancedMarkerElement({
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
  let errorMessage = browserHasGeolocation
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
          // Define the color
          let markerColor, insideMarkerColor;

          if (markerData.type === "camp") {
            markerColor = "#FF6347";
            insideMarkerColor = "#FF7F50";
          } else if (markerData.type === "waypoint") {
            markerColor = "#6B8E23";
            insideMarkerColor = "#7E8F59";
          } else {
            markerColor = "#6B8E23";
            insideMarkerColor = "#7E8F59";
          }

          // Create an SVG string with the desired color
          let svgMarkerString = `
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="${markerColor}" />
              <circle cx="12" cy="12" r="8" fill="${insideMarkerColor}" /> <!-- Optional inner circle -->
            </svg>
          `;

          // Convert the SVG string into a DOM node using DOMParser
          let parser = new DOMParser();
          let svgMarker = parser.parseFromString(
            svgMarkerString,
            "image/svg+xml"
          ).documentElement;

          let marker = new AdvancedMarkerElement({
            position: { lat: markerData.lat, lng: markerData.lng },
            map: map,
            title: markerData.name,
            id: markerData.id,
            // Set the SVG node as the marker content
            content: svgMarker,
          });

          let dateCreated = markerData.date_created;

          // Store marker in the global markers object
          window.markers[markerData.id] = marker;
          marker.desc = markerData.desc;
          marker.type = markerData.type;

          // Attach click event for modal display
          handleMarkerClick(
            marker,
            markerData.id,
            dateCreated,
            markerData.type
          );
        } catch (error) {
          console.error("Error creating marker:", error);
        }
      });

      // Check if map bounds are defined
      if (map && map.getBounds()) {
        updateSidePanel(map, window.markers);
      } else {
        console.error("Map bounds are not defined yet.");
      }
    })
    .catch((error) => console.error("Error loading markers:", error));
}
// Flyout menu handling
document.addEventListener("DOMContentLoaded", () => {
  const addMarkerButton = document.getElementById("addMarkerButton");
  const flyoutMenu = document.getElementById("addMarkerFlyout");
  const addCampSpotButton = document.getElementById("addCampSpot");
  const addWaypointButton = document.getElementById("addWaypoint");

  // Toggle flyout menu on button click
  addMarkerButton.addEventListener("click", () => {
    if (flyoutMenu.style.display === "block") {
      flyoutMenu.style.display = "none";
    } else {
      const buttonRect = addMarkerButton.getBoundingClientRect();
      flyoutMenu.style.top = `${
        buttonRect.top - flyoutMenu.offsetHeight - 100
      }px`;
      flyoutMenu.style.left = `${buttonRect.left}px`;
      flyoutMenu.style.display = "block";
    }
  });

  // Close the flyout when selecting an option
  const closeFlyout = () => {
    flyoutMenu.style.display = "none";
  };

  addCampSpotButton.addEventListener("click", (event) => {
    const markerType = event.target.dataset.type;
    console.log(`Selected marker type: ${markerType}`);
    closeFlyout();
  });

  addWaypointButton.addEventListener("click", (event) => {
    const markerType = event.target.dataset.type;
    console.log(`Selected marker type: ${markerType}`);
    closeFlyout();
  });

  fetch("./sidePanel/side-panel.html")
    .then((response) => response.text())
    .then((html) => {
      document.getElementById("side-panel-container").innerHTML = html;
    })
    .catch((error) => console.error("Error loading side panel:", error));
});

function updateSidePanel(map, markers) {
  // Get map's current bounds
  let bounds = map.getBounds();

  // Ensure bounds are available
  if (!bounds) {
    console.error("Map bounds are not defined yet.");
    return;
  }

  // Then get side panel element
  let markerList = document.getElementById("marker-list");
  // console.log(markerList);

  // Clear current marker list
  markerList.innerHTML = "";

  // Loop thru all markers, check if they're within map bounds
  Object.values(markers).forEach((marker) => {
    if (marker && marker.position && bounds.contains(marker.position)) {
      // Then add marker details to side panel
      let li = document.createElement("li");

      const titleTypeSpan = document.createElement("span");
      titleTypeSpan.textContent = `${marker.title} - ${marker.type}`;

      const descSpan = document.createElement("span");
      descSpan.textContent = marker.desc;

      const typeSpan = document.createElement("span");
      typeSpan.textContent = `${marker.type}`;

      let btn = document.createElement("button");
      btn.id = "zoomToMarker";
      btn.textContent = "Zoom";

      li.appendChild(titleTypeSpan);
      li.appendChild(document.createElement("br"));
      li.appendChild(descSpan);
      li.appendChild(document.createElement("br"));
      li.appendChild(btn);
      markerList.appendChild(li);
    }
  });
}

function debounce(func, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}
