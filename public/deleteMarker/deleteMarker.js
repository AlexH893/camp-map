import {
  getCurrentInfoWindow,
  setCurrentInfoWindow,
} from "../marker/markerHandler.js";
import { loadMarkers } from "../index.js";

export async function handleDelete(button) {
  let id = button.getAttribute("data-id");
  console.log(`Deleting marker with ID: ${id}`);

  // Close current InfoWindow if open
  const currentWindow = getCurrentInfoWindow();
  if (currentWindow) {
    currentWindow.close();
  }

  await deleteMarker(id);
}

export async function deleteMarker(id) {
  try {
    let response = await fetch("/api/delete-marker", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deleted: 1, id: id }),
    });

    let data = await response.json();

    if (data.success) {
      let marker = window.markers[id];

      if (marker) {
        // Remove the marker from the map and from the markers object
        marker.setMap(null);
        delete window.markers[id];

        // Refresh the map to remove the deleted marker
        await loadMarkers(google.maps.marker.AdvancedMarkerElement);
      } else {
        console.warn(`Marker with ID ${id} not found in markers object`);
      }
    } else {
      console.error(
        `Failed to delete marker: ${data.message || "Unknown error"}`
      );
    }
  } catch (error) {
    console.error("Error deleting marker:", error);
  }
}
window.handleDelete = handleDelete;
window.deleteMarker = deleteMarker;
