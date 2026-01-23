/**
 * Chat Route Handler
 * Wraps the Lambda handler for Express
 */

import { Request, Response } from 'express';
import { handler as lambdaHandler } from '../../amplify/functions/chat/handler.js';

export async function chatHandler(req: Request, res: Response) {
  try {
    console.log('📨 Chat request received:', {
      method: req.method,
      body: req.body,
      hasMessage: !!req.body?.message,
      hasUserId: !!req.body?.userId,
    });

    // Convert Express request to Lambda event format
    const event = {
      body: JSON.stringify(req.body),
      headers: req.headers,
      httpMethod: req.method,
      path: req.path,
      queryStringParameters: req.query,
    };

    // Call the Lambda handler
    const result = await lambdaHandler(event as any, {} as any, () => {});

    console.log('✅ Chat handler response:', {
      statusCode: result.statusCode,
      hasBody: !!result.body,
    });

    // Send response
    res.status(result.statusCode || 200);
    
    // Set CORS headers
    if (result.headers) {
      Object.entries(result.headers).forEach(([key, value]) => {
        res.setHeader(key, value as string);
      });
    }

    res.json(JSON.parse(result.body || '{}'));
  } catch (error: any) {
    console.error('❌ Chat handler error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
    });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
