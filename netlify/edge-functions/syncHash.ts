import type { Config, Context } from "@netlify/edge-functions";

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
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

  // 1. Email Verification
  const validatorUrl = `https://rapid-email-verifier.fly.dev/api/validate?email=${email}`;
  let isEmailValid = false;

  try {
    const emailResponse = await fetch(validatorUrl);
    if (emailResponse.ok) {
      const emailData = await emailResponse.json();
      if (emailData.status === 'VALID') {
        isEmailValid = true;
      }
    }
  } catch (error) {
    console.error("Error during email verification:", error);
    // Continue even if email verification fails, but mark as invalid
  }

  if (!isEmailValid) {
    return new Response("Email is not valid", {
      status: 400,
      headers: { "content-type": "text/plain" },
    });
  }

  // 2. Password Hashing (hash of email + password)
  const combinedString = email + password; // Concatenate email and password
  const msgBuffer = new TextEncoder().encode(combinedString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashedPassword = Array
    .from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return new Response(hashedPassword, {
    headers: { "content-type": "text/plain" },
  });
};

export const config: Config = {
  path: "/hash",
};
