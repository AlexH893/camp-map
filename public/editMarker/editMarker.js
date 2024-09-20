import { loadMarkers } from "../index.js";
let modalLoaded = false;
let markerId = null;

// Function to load the modal HTML
export async function loadEditModal() {
  if (modalLoaded) {
    console.log("Edit marker modal already loaded.");
    return;
  }

  try {
    let response = await fetch("../editMarker/editMarkerModal.html");
    if (!response.ok) {
      throw new Error("Failed to load edit marker modal");
    }
    let modalHtml = await response.text();
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    modalLoaded = true;
  } catch (error) {
    console.error("Error loading edit marker modal:", error);
  }
}

// Detect click outside modal and close it
function outsideClickListener(event) {
  let modalContainer = document.getElementById("editModalContainer");
  if (modalContainer && !modalContainer.contains(event.target)) {
    closeModal();
    removeClickListener();
  }
}

// Add listener to close modal when clicking outside
function addClickListener() {
  document.addEventListener("click", outsideClickListener);
}

// Remove the click listener
function removeClickListener() {
  document.removeEventListener("click", outsideClickListener);
}

// Handle the edit button click
export async function handleEdit(button) {
  // Ensure the modal is loaded
  await loadEditModal();

  // Find modal
  let modalContainer = document.getElementById("editModalContainer");
  if (!modalContainer) {
    console.error("Modal container not found. Ensure it exists in the HTML.");
    return;
  }

  // Get marker ID from button
  markerId = button.getAttribute("data-id");

  // Display the modal
  modalContainer.style.display = "block";

  // Set up submit button listener
  let submitButton = document.getElementById("submit");
  if (submitButton) {
    submitButton.setAttribute("data-id", markerId);

    // Remove old listener and add new one
    submitButton.removeEventListener("click", handleSubmit);
    submitButton.addEventListener("click", async () => {
      let markerId = submitButton.getAttribute("data-id");

      if (markerId) {
        try {
          await editMarker(markerId);
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

  // Fetch and populate content with correct marker ID
  try {
    await fetchContent(markerId);
  } catch (error) {
    console.error("Error fetching content for marker ID:", markerId, error);
  }

  // Add click listener for closing modal on outside click
  addClickListener();
}

// Close the modal
export function closeModal() {
  let modalContainer = document.getElementById("editModalContainer");
  if (modalContainer) {
    modalContainer.style.display = "none";
    removeClickListener();
  }
}

// Submit the edited marker data
async function handleSubmit() {
  let submitButton = document.getElementById("submit");
  let markerId = submitButton ? submitButton.getAttribute("data-id") : null;

  if (markerId) {
    await editMarker(markerId);
  } else {
    console.error("Marker ID not found");
  }
}

// Fetch marker data from API
export async function fetchContent(markerId) {
  try {
    let response = await fetch(`/api/markers/${markerId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    let markerDataArray = await response.json();

    // Get the first item
    let markerData = Array.isArray(markerDataArray)
      ? markerDataArray[0]
      : markerDataArray;

    if (!markerData) {
      console.error("Marker data is empty.");
      return;
    }

    // Populate modal fields with marker data
    document.getElementById("name").value = markerData.name || "";
    document.getElementById("desc").value = markerData.desc || "";
    document.getElementById("lat").innerText = markerData.lat || "";
    document.getElementById("lng").innerText = markerData.lng || "";
    document.getElementById("elevation").innerText = markerData.elevation || "";

    // Handling the image display
    let imageContainer = document.getElementById("imageContainer");
    if (imageContainer && markerData.imageUrl) {
      imageContainer.innerHTML = `
        <img src="${markerData.imageUrl}" alt="Uploaded Image" style="max-width: 100%; height: auto;">
        <button id="deleteImageButton">X</button>
      `;
      document
        .getElementById("deleteImageButton")
        .addEventListener("click", async () => {
          await deleteImage(markerId);
        });
    } else {
      imageContainer.innerHTML = "No Image";
    }
  } catch (error) {
    console.error("Error fetching marker data:", error);
  }
}

// Submit edited marker data
export async function editMarker(markerId) {
  if (!markerId) {
    console.error("Marker ID not provided for editing.");
    return;
  }

  let name = document.getElementById("name").value;
  let desc = document.getElementById("desc").value;

  try {
    let response = await fetch(`/api/update-marker/${markerId}`, {
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

// Delete marker image
async function deleteImage(markerId) {
  try {
    let response = await fetch(`/api/delete-image/${markerId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      console.log("Image deletion successful.");
      let imageContainer = document.getElementById("imageContainer");
      imageContainer.innerHTML = "No Image";
    } else {
      console.error("Failed to delete image.");
    }
  } catch (error) {
    console.error("Error deleting image:", error);
  }
}

// Expose globally if needed
window.handleEdit = handleEdit;
window.closeModal = closeModal;
