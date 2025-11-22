import type { Config, Context } from "@netlify/edge-functions";
import { validateEmail, hashCredentials } from 'backend/utils';

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
  const isEmailValid = await validateEmail(email);

  if (!isEmailValid) {
    return new Response("Email is not valid", {
      status: 400,
      headers: { "content-type": "text/plain" },
    });
  }

  // 2. Password Hashing (hash of email + password)
  const hashedPassword = await hashCredentials(email, password);

  return new Response(hashedPassword, {
    headers: { "content-type": "text/plain" },
  });
};

export const config: Config = {
  path: "/cs/hash",
};