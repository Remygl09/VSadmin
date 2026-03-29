/**
 * Validates that required environment variables are present at startup.
 * Throws with a clear message if any are missing.
 */
export function validateEnv() {
  const required = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'] as const;
  const missing = required.filter((key) => !import.meta.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}.\n` +
      `Create a .env file with these values. See .env.example for reference.`
    );
  }
}
