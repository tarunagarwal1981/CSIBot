/**
 * Generate Summary Route Handler
 */

import { Request, Response } from 'express';
import { handler as lambdaHandler } from '../../amplify/functions/generate-summary/handler.js';

export async function generateSummaryHandler(req: Request, res: Response) {
  try {
    const event = {
      body: JSON.stringify(req.body),
      headers: req.headers,
      httpMethod: req.method,
      path: req.path,
    };

    const result = await lambdaHandler(event as any, {} as any, () => {});

    res.status(result.statusCode || 200);
    
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        res.setHeader(key, value as string);
      });
    }

    res.json(JSON.parse(result.body || '{}'));
  } catch (error: any) {
    console.error('Generate summary handler error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}
