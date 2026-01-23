/**
 * Amplify Auth Configuration
 * Authentication resource for future implementation
 * Currently disabled - placeholder for future authentication
 * @module amplify/auth/resource
 */

import { defineAuth } from '@aws-amplify/backend';

/**
 * Define authentication configuration
 * Note: This is currently a placeholder and not actively used
 * In production, enable this and configure proper authentication
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
});
