// backend/utils.ts

export function shuffle<T>(array: T[]) {
  let currentIndex = array.length;
  while (currentIndex != 0) {
    const randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
}

export async function validateEmail(email: string): Promise<boolean> {
    const validatorUrl = `https://rapid-email-verifier.fly.dev/api/validate?email=${email}`;
    try {
        const emailResponse = await fetch(validatorUrl);
        if (emailResponse.ok) {
            const emailData = await emailResponse.json();
            return emailData.status === 'VALID';
        }
    } catch (error) {
        console.error("Error during email verification:", error);
    }
    return false;
}

export async function hashCredentials(email: string, password: string): Promise<string> {
    const combinedString = email + password;
    const msgBuffer = new TextEncoder().encode(combinedString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashedPassword = Array
        .from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    return hashedPassword;
}

// Function to format the duration string
export const formatDuration = (duration: string): string => {
  // Split the duration into minutes and seconds
  const parts = duration.split(':');

  if (parts.length === 2) {
    const [minutesStr, secondsStr] = parts;

    // Pad the minutes part with a leading zero if it's a single digit
    const paddedMinutes = minutesStr.padStart(2, '0');

    // Combine them back
    return `${paddedMinutes}:${secondsStr}`;
  }

  // Return the original string if it's not in the expected 'm:ss' or 'mm:ss' format
  return duration;
};

