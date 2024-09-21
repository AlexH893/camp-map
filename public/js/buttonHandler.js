import {
  getCurrentInfoWindow,
  setCurrentInfoWindow,
} from "../marker/markerHandler.js";
import { loadMarkers } from "../index.js";
import { setInSelectionMode, toggleButtonState } from "../js/state.js";
import { submitMarker } from "../addMarker/addMarker.js";

// Function to delete the marker if closed before submission
export async function deleteAddition() {
  if (getCurrentInfoWindow()) {
    getCurrentInfoWindow().close();
  }

  await loadMarkers(google.maps.marker.AdvancedMarkerElement);
  setInSelectionMode(false);
  toggleButtonState();
}

export function handleSubmit() {
  console.log("Submit button clicked");
  const type = window.type;
  console.log(window.type);

  const nameInput = document.getElementById("name");
  const descInput = document.getElementById("desc");

  if (!nameInput.value.trim()) {
    alert("Name is required");
    nameInput.focus();
    return;
  }

  const name = nameInput.value;
  const desc = descInput.value || "No description";

  if (!window.selectedLatLng) {
    alert("Coordinates are missing, please place a marker.");
    return;
  }

  const lat = window.selectedLatLng.lat;
  const lng = window.selectedLatLng.lng;

  if (!type) {
    alert("type not selected");
    return;
  }

  // Access the globally stored elevation
  const elevationInFeet = window.elevationInFeet;

  if (!elevationInFeet) {
    console.error("Elevation data is missing");
    alert("Elevation data could not be retrieved. Please try again.");
    return;
  }
  submitMarker(
    name,
    desc,
    lat,
    lng,
    elevationInFeet,
    getCurrentInfoWindow(),
    google.maps.marker.AdvancedMarkerElement,
    type
  );
}

window.handleSubmit = handleSubmit;
