import { defineApi } from '@aws-amplify/backend';

export const api = defineApi({
  routes: {
    '/chat': {
      handler: './functions/chat/handler.ts',
      method: 'POST',
    },
    '/generate-summary': {
      handler: './functions/generate-summary/handler.ts',
      method: 'POST',
    },
    '/calculate-kpis': {
      handler: './functions/calculate-kpis/handler.ts',
      method: 'POST',
    },
  },
});
