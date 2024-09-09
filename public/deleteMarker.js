import { currentInfoWindow } from "./addMarker.js";
import { loadMarkers } from "./index.js";

export async function handleDelete(button) {
  const id = button.getAttribute("data-id");
  console.log(id);
  // Close current InfoWindow if open
  if (currentInfoWindow) {
    currentInfoWindow.close();
  }

  await deleteMarker(id);
}

export async function deleteMarker(id) {
  try {
    const response = await fetch("/api/delete-marker", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deleted: 1, id: id }),
    });

    const data = await response.json();

    if (data.success) {
      const marker = window.markers[id];

      if (marker) {
        // Remove the marker from the map
        marker.setMap(null);
        // Remove it from the markers object
        delete window.markers[id];
        // Refresh markers
        await loadMarkers();
      } else {
        console.warn("Marker not found in markers object");
      }
    } else {
      console.error(
        "Failed to delete marker:",
        data.message || "Unknown error"
      );
    }
  } catch (error) {
    console.error("Error deleting marker:", error);
  }
}

window.handleDelete = handleDelete;
window.deleteMarker = deleteMarker;
