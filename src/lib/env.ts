/**
 * Validates that required environment variables are present at startup.
 * Throws with a clear message if any are missing.
 */
export function validateEnv() {
  const missing: string[] = [];
  if (!import.meta.env.VITE_SUPABASE_URL) missing.push('VITE_SUPABASE_URL');
  if (!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) missing.push('VITE_SUPABASE_PUBLISHABLE_KEY');

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}.\n` +
      `Create a .env file with these values. See .env.example for reference.`
    );
  }
}
