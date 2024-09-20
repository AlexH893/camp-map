import express from "express";
import { fileURLToPath } from "url";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import sqlite from "sqlite3";
import cors from "cors";
import dotenv from "dotenv";
import request from "request";
import path from "path";

// Define __filename and __dirname
let __filename = fileURLToPath(import.meta.url);
let __dirname = path.dirname(__filename);

// Configure multer to use memory storage
let storage = multer.memoryStorage();
let upload = multer({ storage: storage });

dotenv.config();

let app = express();

app.use(cors());
app.use(express.json());

let port = process.env.PORT || 3000;
let apiKey = process.env.API_KEY;

// Initialize and configure the sqlite3 instance
let db = new sqlite.Database("./mydb.sqlite", (err) => {
  if (err) {
    // Log error if connection fails
    console.error("Error connecting to the database:", err.message);
  } else {
    // Log success message if connection is successful
    console.log("Successfully connected to the SQLite database.");
  }
});

app.get("/api/elevation", (req, res) => {
  let { lat, lng } = req.query;

  // Construct the correct URL for the Google Elevation API
  let elevationUrl = `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${lng}&key=${apiKey}`;

  request(elevationUrl, function (error, response, body) {
    if (error) {
      console.error("Error:", error);
      res.status(500).send(error);
    } else if (response && response.statusCode !== 200) {
      console.error("Status Code:", response.statusCode);
      res.status(response.statusCode).send(body);
    } else {
      res.send(body);
    }
  });
});

app.get("/currentTemp", (req, res) => {
  let { lat, lng } = req.query;

  let currTempUrl =
    "https://api.open-meteo.com/v1/forecast?latitude=$92.644&longitude=$-104.364&current=temperature_2m,precipitation,cloud_cover&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=America%2FChicago&forecast_days=1";

  request(currTempUrl, function (error, response, body) {
    if (error) {
      console.error("Error:", error);
      res.status(500).send(error);
    } else if (response && response.statusCode !== 200) {
      console.error("Status Code:", response.statusCode);
      res.status(response.statusCode).send(body);
    } else {
      res.send(body);
    }
  });
});

// Route to upload image
app.post("/upload", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  try {
    console.log(req.file); // Debugging line

    let form = new FormData();
    // Converting file buffer to base64
    form.append("image", req.file.buffer.toString("base64"));
    form.append("key", "2a349d17e6d9e364ae745c226c5f7b86");

    // Send the image to Imgbb
    let response = await axios.post("https://api.imgbb.com/1/upload", form, {
      headers: {
        ...form.getHeaders(),
      },
    });

    console.log(response.data); // Log response data for debugging
    let imageUrl = response.data.data.url;

    if (!imageUrl) {
      throw new Error("Image URL is undefined in response");
    }

    let markerId = req.body.markerId;

    // Save the image URL in the database associated with the marker
    let query = `UPDATE camp_locations SET imageUrl = ? WHERE id = ?`;
    let params = [imageUrl, markerId];

    db.run(query, params, function (err) {
      if (err) {
        console.error("Error updating marker with image URL:", err.message);
        return res.status(500).json({ error: err.message });
      } else {
        res.json({ imageUrl });
      }
    });
  } catch (err) {
    console.error("Error uploading image to Imgbb:", err.message);
    res.status(500).json({ error: "Failed to upload image." });
  }
});

// Route to delete image
app.delete("/api/delete-image/:id", async (req, res) => {
  let markerId = req.params.id;
  try {
    let query = "UPDATE camp_locations SET imageUrl = NULL where id = ?";
    await db.run(query, markerId);

    res.status(200).send({ message: "image deletion success" });
  } catch (error) {
    console.error("Error deleting image", error);
    res.status(500).send({ message: "failed to delete image" });
  }
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));
app.use("/node_modules", express.static(path.join(__dirname, "node_modules")));

// Ensure .js files are served with correct MIME type
app.use((req, res, next) => {
  if (req.url.endsWith(".js")) {
    res.type("text/javascript");
  }
  next();
});

// Route to create a marker
app.post("/api/add-marker", (req, res) => {
  let { name, desc, lat, lng, elevation, date_created, imageUrl } = req.body;

  // Log the incoming request body
  console.log("Received request to add marker with data:", {
    name,
    desc,
    lat,
    lng,
    elevation,
    date_created,
    imageUrl,
  });

  let query =
    "INSERT into camp_locations (name, desc, lat, lng, elevation, date_created, imageUrl) VALUES (?,?,?,?,?,?,?)";
  let params = [name, desc, lat, lng, elevation, date_created, imageUrl];

  // Log the SQL query and parameters
  console.log("Executing query:", query);
  console.log("With parameters:", params);

  db.run(query, params, function (err) {
    if (err) {
      // Log error message
      console.error("Error inserting marker into database:", err.message);

      // Send error response and return immediately to prevent further execution
      return res.status(500).json({ error: "Failed to add marker" });
    } else {
      // Log the ID of the newly created marker
      console.log("Marker added successfully with ID:", this.lastID);

      // Send success response
      res.json({
        message: "Marker added successfully",
        id: this.lastID,
        imageUrl,
      });
    }
  });
});

// Route to update deleted marker flag
app.put("/api/delete-marker", (req, res) => {
  let { deleted, id } = req.body;

  let query = `
    UPDATE camp_locations
    SET deleted = ?
    WHERE id = ?
  `;
  let params = [deleted, id];

  db.run(query, params, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ message: "No matching record found to update" });
    } else {
      res.json({
        success: true,
        message: "Marker marked deleted",
        changes: this.changes,
      });
    }
  });
});

// Route to update marker info
app.put("/api/update-marker/:id", (req, res) => {
  let { name, desc } = req.body;
  let { id } = req.params;

  let query = `
    UPDATE camp_locations
    SET name = ?,
        desc = ?
    WHERE id = ?
  `;
  let params = [name, desc, id];

  db.run(query, params, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ message: "No matching record found to update" });
    } else {
      res.json({
        success: true,
        message: "Marker updated",
        changes: this.changes,
      });
    }
  });
});

// Route to get all markers from db
app.get("/api/markers", (req, res) => {
  let query = "SELECT * FROM camp_locations WHERE deleted = 0";

  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Route to get a marker by id
app.get("/api/markers/:id", (req, res) => {
  let markerId = req.params.id;
  let query = "SELECT * FROM camp_locations WHERE id = ? AND deleted = 0";

  db.get(query, [markerId], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: "Marker not found" });
    } else {
      res.json(row);
    }
  });
});

// Endpoint to serve API key to client
app.get("/api/getApiKey", (req, res) => {
  res.json({ apiKey: process.env.API_KEY });
});

app.listen(port, "::", () => {
  console.log(`Server running at http://[::]:${port}/`);
});
export default app;
