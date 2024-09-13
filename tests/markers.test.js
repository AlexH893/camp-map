import { request, expect } from "./setup.js"; // Import from setup.js
import fs from "fs";

import path from "path";
let markerId, name;

// POST create marker
describe("POST /api/add-marker", () => {
  it("should create a marker and return the marker ID", async () => {
    const markerData = {
      name: "Chai Marker",
      desc: "Test Description",
      lat: 39.80077970416114,
      lng: -105.38245716896778,
      elevation: 9076.527162578124,
      date_created: new Date().toISOString(),
    };

    // Sending POST request to create a marker
    const res = await request.post("/api/add-marker").send(markerData);

    // Checking the response status
    expect(res.status).to.equal(200);

    // Extracting marker ID from the response body
    const { id, message } = res.body;

    // Verifying the response body has the marker ID and message
    expect(id).to.exist; // Check if the ID is present
    expect(message).to.equal("Marker added successfully");
    markerId = id;

    console.log("Created Marker ID:", id);
  });
});

// POST upload image
describe("POST /upload", () => {
  it("should upload an image and update the marker with the image URL", async () => {
    if (!markerId) {
      throw new Error("markerId not set");
    }

    const imagePath = path.join(process.cwd(), "tests/mountain.jpg");

    // Check if the file exists before running the test
    if (!fs.existsSync(imagePath)) {
      throw new Error("Sample image file does not exist");
    }

    // Sending POST request to upload the image
    const res = await request
      .post("/upload")
      .field("markerId", markerId)
      .attach("image", imagePath);

    // Checking the response status
    expect(res.status).to.equal(200);

    // Verifying the image URL in the response
    const { imageUrl } = res.body;
    expect(imageUrl).to.exist;
    expect(imageUrl).to.be.a("string");

    const getRes = await request.get(`/api/markers/${markerId}`);
    expect(getRes.body).to.have.property("imageUrl", imageUrl);
  });
});

// PUT update marker
describe("PUT /api/update-marker/:id", () => {
  it("should update a marker", async () => {
    const updatedMarkerData = {
      name: "Chai Marker Updated",
      desc: "Updated Description",
      lat: 39.80077970416114,
      lng: -105.38245716896778,
      elevation: 9076.527162578124,
      date_created: new Date().toISOString(),
      imageUrl: "https://i.ibb.co/H2T1X43/True-Blue-1600px-DMP-Website.jpg",
    };

    // Ensure markerId is defined from previous tests
    if (!markerId) {
      throw new Error("markerId not set");
    }

    // Sending PUT request to update the marker
    const res = await request
      .put(`/api/update-marker/${markerId}`)
      .send(updatedMarkerData);

    // Checking the response status
    expect(res.status).to.equal(200);

    // Verifying the success message in the response
    const { message } = res.body;

    const getRes = await request.get(`/api/markers/${markerId}`);
    expect(getRes.body).to.have.property("name", updatedMarkerData.name);
    expect(getRes.body).to.have.property("desc", updatedMarkerData.desc);

    console.log("Updated Marker ID:", markerId);
  });
});

// GET all markers
describe("GET /api/markers", () => {
  it("should return all markers", async () => {
    const res = await request.get("/api/markers");
    expect(res.status).to.equal(200);
    expect(res.body).to.be.an("array");

    // Store the ID of the first marker in the response for later use
    if (res.body.length > 0) {
      markerId = res.body[0].id;
      name = res.body[0].name;
      expect(res.body[0]).to.have.property("name");
    }
  });
});

// GET marker by id
describe("GET /api/markers/:id", () => {
  it("should retrieve the marker by ID", async () => {
    if (!markerId) {
      throw new Error("markerId not set");
    }
    const res = await request.get(`/api/markers/${markerId}`);

    expect(res.status).to.equal(200);
    expect(res.body).to.have.property("id", markerId);
  });
});

// PUT delete marker
describe("PUT /api/delete-marker", () => {
  it("should mark a marker as deleted", async () => {
    if (!markerId) {
      throw new Error("markerId not set from POST test");
    }

    const res = await request
      .put("/api/delete-marker")
      .send({ deleted: 1, id: markerId });

    // Checking the response status
    expect(res.status).to.equal(200);

    // Verifying the success message in the response
    const { success, message, changes } = res.body;
    expect(success).to.be.true;
    expect(message).to.equal("Marker marked deleted");
    expect(changes).to.equal(1);
    console.log(res.body);
  });
});
