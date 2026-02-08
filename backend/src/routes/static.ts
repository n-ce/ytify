// GET/POST /ss/:id? - Static storage

import { Hono } from "hono";
import { getStaticContent, setStaticContent } from "../services/storage.ts";

const app = new Hono();

// GET /ss/:id - Retrieve immutable content by its key (timestamp)
app.get("/ss/:id", (c) => {
  const id = c.req.param("id");

  if (!id) {
    return c.json({ error: "ID parameter is required." }, 400);
  }

  const data = getStaticContent(id);

  if (!data) {
    return c.json({ error: "Content not found." }, 404);
  }

  return c.text(data, 200, {
    "Content-Type": "application/json",
  });
});

// POST /ss - Write new immutable content
app.post("/ss", async (c) => {
  let data;
  try {
    data = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON in request body." }, 400);
  }

  if (!data) {
    return c.json({ error: "Request body is missing." }, 400);
  }

  const timestamp = Date.now();
  const key = String(timestamp);

  setStaticContent(key, JSON.stringify(data));

  return c.json({ timestamp }, 201);
});

export default app;
