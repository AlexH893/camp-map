import {
  setInSelectionMode,
  getInSelectionMode,
  toggleButtonState,
} from "../js/state.js";
import {
  getCurrentInfoWindow,
  setCurrentInfoWindow,
} from "../marker/markerHandler.js";
import { getWeather } from "../js/getWeather.js";
import { getElevation, fetchContent, updateContent } from "../js/utils.js";
import { deleteAddition } from "../js/buttonHandler.js";
import { loadMarkers } from "../index.js";

let markerCounter = 0;

export async function addMarker(map) {
  let snackbar = document.getElementById("snackbar");
  snackbar.className = "show";

  setTimeout(() => {
    snackbar.className = snackbar.className.replace("show", "");
  }, 3000);

  setInSelectionMode(true);

  if (getInSelectionMode()) {
    toggleButtonState();

    let clickListener = map.addListener("click", async (event) => {
      let { lat, lng } = event.latLng.toJSON();
      window.selectedLatLng = { lat, lng };

      try {
        // Create the marker and increment markerCounter
        let marker = new google.maps.marker.AdvancedMarkerElement({
          position: event.latLng,
          map: map,
          title: "New Marker",
        });

        let markerId = `marker-${markerCounter++}`;

        let { elevationInFeet, latLong } = await getElevation(lat, lng);
        window.elevationInFeet = elevationInFeet;

        let content = await fetchContent("../addMarker/addMarkerModal.html");
        content = updateContent(
          content,
          elevationInFeet,
          latLong,
          "New Marker",
          "No description",
          markerId
        );
        window.markers = window.markers || {};
        marker.id = markerId;
        window.markers[marker.id] = marker;

        let infoWindow = new google.maps.InfoWindow({
          content: content,
          ariaLabel: "Test",
        });

        infoWindow.open({ anchor: marker, map, shouldFocus: false });
        setCurrentInfoWindow(infoWindow);

        // Create a temporary container to parse the HTML string
        const tempDiv = document.createElement("div");
        // Convert string to DOM
        tempDiv.innerHTML = infoWindow.getContent();

        // Now, query the DOM from tempDiv
        let submitButton = tempDiv.querySelector("#submit-button");
        if (submitButton) {
          console.log("Submit button found");
          submitButton.addEventListener("click", () => {
            console.log("Submit button clicked");
            let nameInput = tempDiv.querySelector("#name");
            if (!nameInput.value.trim()) {
              alert("Name is required");
              nameInput.focus();
              return;
            }

            let descInput = tempDiv.querySelector("#desc");
            let name = nameInput.value;
            let desc = descInput ? descInput.value : "No description";

            console.log(
              "AdvancedMarkerElement in submitMarker:",
              AdvancedMarkerElement
            );
            console.log("Elevation before submit:", elevationInFeet);

            submitMarker(
              name,
              desc,
              window.selectedLatLng.lat,
              window.selectedLatLng.lng,
              elevationInFeet,
              infoWindow,
              google.maps.marker.AdvancedMarkerElement
            );

            marker.desc = desc;
            handleMarkerClick(marker);
          });
        } else {
          console.error("Submit button not found.");
        }

        // Attach event listener to the close button dynamically after the InfoWindow is loaded
        let closeButton = tempDiv.querySelector("button[name='close']");
        if (closeButton) {
          console.log("Close button found");
          closeButton.addEventListener("click", () => {
            console.log("Close button clicked");
            deleteAddition();
          });
        } else {
          console.error("Close button not found.");
        }

        google.maps.event.removeListener(clickListener);
      } catch (error) {
        console.error("Error adding marker:", error);
      }
    });
  }
}

// Function to submit the marker
export async function submitMarker(
  name,
  desc,
  lat,
  lng,
  elevationInFeet,
  infoWindow,
  AdvancedMarkerElement
) {
  try {
    let response = await fetch("/api/add-marker", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        desc,
        lat,
        lng,
        elevation: elevationInFeet,
      }),
    });

    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

    let data = await response.json();

    await loadMarkers(google.maps.marker.AdvancedMarkerElement);
    setInSelectionMode(false);
    toggleButtonState();

    if (infoWindow) {
      infoWindow.close();
    }
  } catch (error) {
    console.error("Error submitting marker:", error);
  }
}