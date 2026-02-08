// POST /hash - Generate SHA-256 hash from email + password

import { Hono } from "hono";
import { config } from "../config.ts";

const app = new Hono();

app.post("/hash", async (c) => {
  let email: string;
  let password: string;

  try {
    const body = await c.req.json();
    email = body.email;
    password = body.password;
  } catch {
    return c.text("Invalid JSON body", 400);
  }

  if (!email || !password) {
    return c.text("Missing email or password", 400);
  }

  // Email validation
  let isEmailValid = false;
  try {
    const validatorUrl = `${config.emailValidatorUrl}?email=${encodeURIComponent(email)}`;
    const emailResponse = await fetch(validatorUrl);
    if (emailResponse.ok) {
      const emailData = await emailResponse.json();
      if (emailData.status === "VALID") {
        isEmailValid = true;
      }
    }
  } catch (error) {
    console.error("Error during email verification:", error);
    // Continue even if email verification fails - fallback to basic check
    // Basic email format check as fallback
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    isEmailValid = emailRegex.test(email);
  }

  if (!isEmailValid) {
    return c.text("Email is not valid", 400);
  }

  // Generate SHA-256 hash of email + password
  const combinedString = email + password;
  const msgBuffer = new TextEncoder().encode(combinedString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashedPassword = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return c.text(hashedPassword);
});

export default app;
