import {
  getElevation,
  fetchContent,
  updateContent,
  handleImageDisplay,
} from "../js/utils.js";
import { setInSelectionMode, getInSelectionMode } from "../js/state.js";
export let currentInfoWindow = null;

export const getCurrentInfoWindow = () => currentInfoWindow;

export const setCurrentInfoWindow = (infoWindow) => {
  currentInfoWindow = infoWindow;
};
const type = window.type;
// Handling marker click
export async function handleMarkerClick(marker, markerId, date_created, type) {
  marker.addListener("click", async () => {
    if (getInSelectionMode()) {
      alert("no");
      return;
    }

    // Close current InfoWindow if open
    if (getCurrentInfoWindow()) {
      getCurrentInfoWindow().close();
    }

    try {
      let position = marker.position;
      let lat = position.lat;
      let lng = position.lng;

      window.selectedLatLng = { lat, lng };

      let { elevationInFeet, latLong } = await getElevation(lat, lng);

      let contentUrl = "../marker/markerModal.html";
      let content = await fetchContent(contentUrl);

      // Fetch marker data from API or your data source
      let response = await fetch(`/api/markers/${markerId}?type=${type}`);
      let markerData = await response.json();
      content = updateContent(
        content,
        elevationInFeet,
        latLong,
        marker.title,
        marker.desc || "No description",
        markerId,
        date_created,
        markerData.imageUrl,
        type
      );

      // console.log("Displaying info window for marker ID:", markerId);

      let infoWindow = new google.maps.InfoWindow({
        content: content,
        ariaLabel: "Marker Information",
      });

      infoWindow.open({
        anchor: marker,
        map: marker.map,
        shouldFocus: false,
      });

      currentInfoWindow = infoWindow;

      marker.map.addListener("click", () => {
        if (currentInfoWindow) {
          currentInfoWindow.close();
          currentInfoWindow = null;
        }
      });

      setTimeout(() => {
        handleImageDisplay(markerData.imageUrl);

        let editButton = document.querySelector(".edit");

        if (editButton) {
          editButton.addEventListener("click", async (event) => {
            event.preventDefault();
            try {
              if (currentInfoWindow) {
                currentInfoWindow.close();
                currentInfoWindow = null;
              }
              handleEdit(editButton);
            } catch (error) {
              console.error("Error in edit button click handler:", error);
            }
          });
        } else {
          console.error("Edit button not found in the modal content.");
        }

        let uploadButton = document.getElementById("uploadButton");
        if (uploadButton) {
          uploadButton.addEventListener("click", async (event) => {
            event.preventDefault();
            console.log("Upload button clicked");

            let fileInput = document.getElementById("fileUpload");
            let file = fileInput.files[0];

            if (!file) {
              alert("Please select a JPG file to upload.");
              return;
            }

            let formData = new FormData();
            formData.append("image", file);
            formData.append("markerId", markerId);
            formData.append("type", type);

            try {
              let response = await fetch("/upload", {
                method: "POST",
                body: formData,
              });

              let result = await response.json();

              if (response.ok) {
                document.getElementById("uploadStatus").innerText =
                  "Image uploaded successfully!";
                console.log("Image URL:", result.imageUrl);

                let imageContainer = document.getElementById("imageContainer");
                if (imageContainer) {
                  imageContainer.innerHTML = `<img src="${result.imageUrl}" alt="Uploaded Image" style="max-width: 100%; height: 30%;">`;
                }
              } else {
                document.getElementById("uploadStatus").innerText =
                  "Failed to upload image.";
                console.error("Upload error:", result.error);
              }
            } catch (error) {
              console.error("Error during file upload:", error);
              document.getElementById("uploadStatus").innerText =
                "An error occurred during upload.";
            }
          });
        } else {
          console.error("Upload button not found.");
        }
      }, 100);
    } catch (error) {
      console.error("Error displaying marker modal:", error);
    }
  });
}
