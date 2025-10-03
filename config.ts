/**
 * Application Configuration
 *
 * This file centralizes configuration variables for the application.
 * It's crucial for managing settings like API keys and client IDs in one place.
 */

// IMPORTANT: These values must be correctly configured for the application to function.
// These are placeholders and should be replaced with your own Google Cloud Project credentials.

const config = {
  /**
   * The Google Client ID for OAuth 2.0 authentication.
   * This ID is obtained from the Google Cloud Console and is used to identify the application
   * to Google's authentication servers.
   */
  GOOGLE_CLIENT_ID: '65331249013-h92qnupqivfh85jbfh1jehv5vgt2ok7g.apps.googleusercontent.com',

  /**
   * The Google Cloud Project ID.
   * This ID is used to associate API calls with a specific Google Cloud project,
   * which is necessary for billing and resource management.
   */
  GOOGLE_PROJECT_ID: 'concise-perigee-474013-p4',
};

export default config;
