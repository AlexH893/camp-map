import { loadMarkers } from "./index.js";
let modalLoaded = false;
let markerId = null;

// Function to load the modal HTML
export async function loadEditModal() {
  if (modalLoaded) {
    console.log("Edit marker modal already loaded.");
    return;
  }

  try {
    const response = await fetch("editMarkerModal.html");
    if (!response.ok) {
      throw new Error("Failed to load edit marker modal");
    }
    const modalHtml = await response.text();
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    modalLoaded = true;
  } catch (error) {
    console.error("Error loading edit marker modal:", error);
  }
}

// Function to detect if click is outside the modal and close it
function outsideClickListener(event) {
  const modalContainer = document.getElementById("editModalContainer");
  if (modalContainer && !modalContainer.contains(event.target)) {
    closeModal();
    removeClickListener(); // Remove the event listener after modal is closed
  }
}

// Add the event listener to close modal on outside click
function addClickListener() {
  document.addEventListener("click", outsideClickListener);
}

// Remove the event listener
function removeClickListener() {
  document.removeEventListener("click", outsideClickListener);
}

// Handle the edit button click
export async function handleEdit(button) {
  // Ensure the modal is loaded
  await loadEditModal();

  // Find modal
  const modalContainer = document.getElementById("editModalContainer");
  if (!modalContainer) {
    console.error("Modal container not found. Ensure it exists in the HTML.");
    return;
  }

  // Get the marker ID from the button's data-id attribute
  markerId = button.getAttribute("data-id");

  // Display the modal
  modalContainer.style.display = "block";

  // Set up submit button listener
  const submitButton = document.getElementById("submit");
  if (submitButton) {
    submitButton.setAttribute("data-id", markerId);

    // Remove old listener if it exists and add a new listener
    submitButton.removeEventListener("click", handleSubmit);
    submitButton.addEventListener("click", async () => {
      const markerId = submitButton.getAttribute("data-id");

      if (markerId) {
        try {
          await editMarker(markerId); // Ensure you have the editMarker function defined properly
        } catch (error) {
          console.error("Error while editing marker:", error);
        }
      } else {
        console.error("Marker ID not found on submit button.");
      }
    });
  } else {
    console.error("Submit button not found.");
  }

  // Fetch and populate content with the correct marker ID
  try {
    await fetchContent(markerId);
  } catch (error) {
    console.error("Error fetching content for marker ID:", markerId, error);
  }

  // Add click listener for closing modal when clicking outside
  addClickListener();
}

// Hide the modal
export function closeModal() {
  const modalContainer = document.getElementById("editModalContainer");
  if (modalContainer) {
    modalContainer.style.display = "none";
    removeClickListener(); // Remove the listener when modal is closed
  }
}

// Handle submit button click
async function handleSubmit() {
  const submitButton = document.getElementById("submit");
  const markerId = submitButton ? submitButton.getAttribute("data-id") : null;

  if (markerId) {
    // Pass the markerId from the button
    await editMarker(markerId);
  } else {
    console.error("Marker ID not found");
  }
}

// Fetch marker data from the API
export async function fetchContent(markerId) {
  try {
    const response = await fetch(`/api/markers/${markerId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const markerDataArray = await response.json();

    // Assuming the API returns an array and you need the first item
    const markerData = Array.isArray(markerDataArray)
      ? markerDataArray[0]
      : markerDataArray;

    // Check if markerData contains expected fields
    if (!markerData) {
      console.error("Marker data is empty.");
      return;
    }

    // Populate the modal fields with marker data
    document.getElementById("name").value = markerData.name || "";
    document.getElementById("desc").value = markerData.desc || "";
    document.getElementById("lat").innerText = markerData.lat || "";
    document.getElementById("lng").innerText = markerData.lng || "";
    document.getElementById("elevation").innerText = markerData.elevation || "";
  } catch (error) {
    console.error("Error fetching marker data:", error);
  }
}

// Submit edited marker data
export async function editMarker(markerId, AdvancedMarkerElement) {
  if (!markerId) {
    console.error("Marker ID not provided for editing.");
    return;
  }

  const name = document.getElementById("name").value;
  const desc = document.getElementById("desc").value;

  try {
    const response = await fetch(`/api/update-marker/${markerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, desc }),
    });

    if (response.ok) {
      console.log("Marker updated successfully.");
      closeModal();
      loadMarkers(google.maps.marker.AdvancedMarkerElement);
    } else {
      console.error("Failed to update marker.");
    }
  } catch (error) {
    console.error("Error updating marker:", error);
  }
}

// Expose functions globally
window.handleEdit = handleEdit;
window.closeModal = closeModal;
