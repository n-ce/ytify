import { Connect } from 'vite';
import { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Wraps a Vercel/Serverless handler so it can be used as a Vite middleware.
 */
export function createLocalAdapter(handler: (req: VercelRequest, res: VercelResponse) => Promise<any> | any) {
  return async (req: Connect.IncomingMessage, res: any) => {
    const parsedUrl = new URL(req.url || '', 'http://localhost');
    
    // Mock VercelRequest
    const vercelReq = req as unknown as VercelRequest;
    vercelReq.query = Object.fromEntries(parsedUrl.searchParams) as any;
    
    // Mock VercelResponse
    // We must capture original methods to avoid infinite recursion
    const originalSetHeader = res.setHeader.bind(res);
    const originalEnd = res.end.bind(res);

    const vercelRes = res as unknown as VercelResponse;
    vercelRes.status = (code: number) => {
      res.statusCode = code;
      return vercelRes;
    };
    vercelRes.json = (data: any) => {
      originalSetHeader('Content-Type', 'application/json');
      originalEnd(JSON.stringify(data));
      return vercelRes;
    };
    vercelRes.setHeader = (name: string, value: string) => {
      originalSetHeader(name, value);
      return vercelRes;
    };
    vercelRes.end = (data: any | undefined) => {
      originalEnd(data);
      return vercelRes;
    };

    try {
      await handler(vercelReq, vercelRes);
    } catch (err) {
      console.error('Local API Error:', err);
      if (!res.headersSent) {
          res.statusCode = 500;
          originalEnd(JSON.stringify({ error: 'Internal Server Error', message: (err as Error).message }));
      }
    }
  };
}
