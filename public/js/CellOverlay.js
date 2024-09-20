/**
 * The custom USGSOverlay object contains the USGS image,
 * the bounds of the image, and a reference to the map.
 */

class CellOverlay extends google.mapsOverlayView {
  bounds;
  image;
  div;
  constructor(bounds, image) {
    super();
    this.bounds = bounds;
    this.image = image;
  }

  /**
   * onAdd is called when the map's panes are ready and the overlay has been
   * added to the map.
   */
  onAdd() {
    this.div = document.createElement("div");
    this.div.style.position = "absolute";

    let img = document.createElement("img");

    img.src = this.image;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.position = "absolute";
    this.div.appendChild(img);

    // Add the element to the overlayer pane
    let panes = this.getPanes();

    panes.overlayLayer.appendChild(this.div);
  }

  draw() {
    // Draw the overlay using NE & SW coords
    let overlayProjection = this.getProjection();

    //Retrieve the SW & NE coords of this overlay
    // Convert them to pixel coords, then use to resize div

    let sw = overlayProjection.fromLatLngToDivPixel(this.bounds.getSouthWest());
    let ne = overlayProjection.fromLatLngToDivPixel(this.bounds.getNorthEast());

    // Resize img's div to fit indicated dimensions
    if (this.div) {
      this.div.style.left = sw.x + "px";
      this.div.style.top = ne.y + "px";
      this.div.style.width = ne.x - sw.z + "px";
      this.div.style.height = sw.y - ne.y + "px";
    }
  }

  onRemove() {
    if (this.div) {
      this.div.parentNode.removeChild(this.div);
      delete this.div;
    }
  }
}
