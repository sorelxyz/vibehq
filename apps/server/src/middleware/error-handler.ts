import type { Context, Next } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    console.error('Unhandled error:', error);

    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = ((error as { status?: number }).status || 500) as ContentfulStatusCode;

    return c.json({ error: message }, status);
  }
}
