// GET/PUT /library/:hash - Full library read/write

import { Hono } from "hono";
import { getLibrary, setLibrary } from "../services/storage.ts";

const app = new Hono();

// GET /library/:hash - Return the full library
app.get("/library/:hash", (c) => {
  const userHash = c.req.param("hash");

  if (!userHash) {
    return c.json({ error: "User ID hash not provided." }, 400);
  }

  try {
    const library = getLibrary(userHash);

    if (!library) {
      // Return a default minimal structure for new users
      const defaultState = {
        library_meta: JSON.stringify({ version: 4, tracks: 0 }),
        library_tracks: JSON.stringify({}),
      };
      return c.json(defaultState, 200);
    }

    // Return the library data as JSON string (client expects this format)
    return c.text(JSON.stringify(library.data), 200, {
      "Content-Type": "application/json",
    });
  } catch (e) {
    console.error(`Error reading library for user ${userHash}:`, e);
    return c.json({ error: "Internal server error during library read." }, 500);
  }
});

// PUT /library/:hash - Replace the entire library
app.put("/library/:hash", async (c) => {
  const userHash = c.req.param("hash");

  if (!userHash) {
    return c.json({ error: "User ID hash not provided." }, 400);
  }

  try {
    const newLibraryString = await c.req.text();

    // Validate JSON
    let libraryData;
    try {
      libraryData = JSON.parse(newLibraryString);
    } catch {
      return c.json({ error: "Invalid JSON in request body." }, 400);
    }

    // Store the library
    setLibrary(userHash, libraryData);

    return c.body(null, 204);
  } catch (e) {
    console.error(`Error writing library for user ${userHash}:`, e);
    return c.json({ error: "Internal server error during library write." }, 500);
  }
});

export default app;
