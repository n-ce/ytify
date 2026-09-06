import type { Config, Context } from "@netlify/edge-functions";

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: { "content-type": "text/plain" },
    });
  }

  const { email, password } = await req.json();

  if (!email || !password) {
    return new Response("Missing email or password", {
      status: 400,
      headers: { "content-type": "text/plain" },
    });
  }

  const trimmedEmail = typeof email === "string" ? email.trim() : "";

  // 1. Email Format Verification
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return new Response("Email is not valid", {
      status: 400,
      headers: { "content-type": "text/plain" },
    });
  }

  // 2. Optional external verification with timeout
  const validatorUrl = `https://rapid-email-verifier.fly.dev/api/validate?email=${encodeURIComponent(trimmedEmail)}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    try {
      const emailResponse = await fetch(validatorUrl, {
        signal: controller.signal,
      });
      if (emailResponse.ok) {
        const emailData = await emailResponse.json();
        if (emailData.status === "INVALID") {
          return new Response("Email is not valid", {
            status: 400,
            headers: { "content-type": "text/plain" },
          });
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    console.warn("Optional email validator check skipped/timed out:", error);
  }

  // 3. Password Hashing (hash of email + password)
  const normalizedEmail = trimmedEmail.toLowerCase();
  const combinedString = `${normalizedEmail}|${password}`;
  const msgBuffer = new TextEncoder().encode(combinedString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashedPassword = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return new Response(hashedPassword, {
    headers: { "content-type": "text/plain" },
  });
};

export const config: Config = {
  path: "/hash",
};
