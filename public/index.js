import { Loader } from "../node_modules/@googlemaps/js-api-loader/dist/index.mjs";
import { addMarker, handleMarkerClick } from "./addMarker.js";

let map;
window.markers = {};

fetch("/api/getApiKey")
  .then((response) => response.json())
  .then((data) => {
    const { apiKey } = data;

    const loader = new Loader({
      apiKey: apiKey,
      version: "weekly",
      libraries: ["places"],
    });

    // Initialize and add the map
    let infoWindow;
    window.addMarker = addMarker;

    // Load the Google Maps API and initialize the map
    loader
      .load()
      .then(() => {
        map = new google.maps.Map(document.getElementById("map"), {
          center: { lat: 39.724596, lng: -105.347991 }, // Example center coordinates
          zoom: 12, // Example zoom level
        });

        if (map instanceof google.maps.Map) {
          // Map is correctly initialized
          loadMarkers();
        } else {
          console.error("Failed to initialize the map.");
        }

        // Define the bounds for the ground overlay
        const bounds = new google.maps.LatLngBounds(
          new google.maps.LatLng(37.0, -109.045), // Southwest corner of Colorado
          new google.maps.LatLng(41.0, -102.041)
        );

        // The URL of the image to be used as overlay
        const imageUrl = "./cellmap.png";

        // Custom Overlay class extending google.maps.OverlayView
        class CellOverlay extends google.maps.OverlayView {
          constructor(bounds, image) {
            super();
            this.bounds = bounds;
            this.image = image;
            this.div = null;
          }

          onAdd() {
            this.div = document.createElement("div");
            this.div.style.borderStyle = "none";
            this.div.style.borderWidth = "0px";
            this.div.style.position = "absolute";

            const img = document.createElement("img");
            img.src = this.image;
            img.style.width = "100%";
            img.style.opacity = ".0";
            img.style.height = "100%";
            img.style.position = "absolute";
            this.div.appendChild(img);

            const panes = this.getPanes();
            panes.overlayLayer.appendChild(this.div);
          }

          draw() {
            const overlayProjection = this.getProjection();
            const sw = overlayProjection.fromLatLngToDivPixel(
              this.bounds.getSouthWest()
            );
            const ne = overlayProjection.fromLatLngToDivPixel(
              this.bounds.getNorthEast()
            );

            if (this.div) {
              this.div.style.left = sw.x + "px";
              this.div.style.top = ne.y + "px";
              this.div.style.width = ne.x - sw.x + "px";
              this.div.style.height = sw.y - ne.y + "px";
            }
          }

          onRemove() {
            if (this.div) {
              this.div.parentNode.removeChild(this.div);
              this.div = null;
            }
          }

          hide() {
            if (this.div) {
              this.div.style.visibility = "hidden";
            }
          }

          show() {
            if (this.div) {
              this.div.style.visibility = "visible";
            }
          }

          toggle() {
            if (this.div) {
              if (this.div.style.visibility === "hidden") {
                this.show();
              } else {
                this.hide();
              }
            }
          }

          toggleDOM(map) {
            if (this.getMap()) {
              this.setMap(null);
            } else {
              if (map instanceof google.maps.Map) {
                this.setMap(map);
              } else {
                console.error("Invalid map object passed to setMap.");
              }
            }
          }
        }

        const overlay = new CellOverlay(bounds, imageUrl);
        overlay.setMap(map);

        infoWindow = new google.maps.InfoWindow();

        // Add a button control to the map
        const toggleButton = document.createElement("button");
        toggleButton.textContent = "Toggle";
        toggleButton.classList.add("custom-map-control-button");

        const toggleDOMButton = document.createElement("button");
        toggleDOMButton.textContent = "Toggle DOM Attachment";
        toggleDOMButton.classList.add("custom-map-control-button");

        toggleButton.addEventListener("click", () => {
          overlay.toggle();
        });

        toggleDOMButton.addEventListener("click", () => {
          overlay.toggleDOM(map);
        });

        // Adds the btns to map
        map.controls[google.maps.ControlPosition.TOP_RIGHT].push(
          toggleDOMButton
        );
        // map.controls[google.maps.ControlPosition.TOP_RIGHT].push(toggleButton);

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
              new google.maps.Marker({
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

                const marker = new google.maps.Marker({
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
        loadMarkers();
      })
      .catch((error) => {
        console.error("Error loading Google Maps:", error);
      });
  })
  .catch((error) => {
    console.error("Error fetching API key:", error);
  });
function handleLocationError(browserHasGeolocation, infoWindow, pos) {
  const errorMessage = browserHasGeolocation
    ? "Error: The Geolocation service failed."
    : "Error: Your browser doesn't support geolocation.";

  console.error(errorMessage);

  infoWindow.setPosition(pos);
  infoWindow.setContent(errorMessage);
  infoWindow.open(map);
}

// Loading markers
export function loadMarkers() {
  fetch("/api/markers")
    .then((response) => response.json())
    .then((markersData) => {
      // Clear existing markers
      Object.values(window.markers).forEach((marker) => marker.setMap(null));
      window.markers = {};

      markersData.forEach((markerData) => {
        const marker = new google.maps.Marker({
          position: { lat: markerData.lat, lng: markerData.lng },
          map: map,
          title: markerData.name,
          id: markerData.id,
        });

        // Store marker in the global markers object
        window.markers[markerData.id] = marker;

        // Attach click event for modal display
        handleMarkerClick(marker);
      });
    })
    .catch((error) => console.error("Error loading markers:", error));
}
