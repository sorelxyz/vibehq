import { Hono } from 'hono';
import * as imagesService from '../services/images';

const app = new Hono();

// POST /api/tickets/:ticketId/images - Upload image
app.post('/tickets/:ticketId/images', async (c) => {
  const ticketId = c.req.param('ticketId');
  const formData = await c.req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return c.json({ error: 'No file provided' }, 400);
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: 'Invalid file type. Allowed: jpg, png, gif, webp' }, 400);
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return c.json({ error: 'File too large. Max 10MB' }, 400);
  }

  const image = await imagesService.uploadImage(ticketId, file);
  return c.json(image, 201);
});

// GET /api/tickets/:ticketId/images - List images for ticket
app.get('/tickets/:ticketId/images', async (c) => {
  const images = await imagesService.getImagesForTicket(c.req.param('ticketId'));
  return c.json(images);
});

// DELETE /api/images/:id - Delete image
app.delete('/images/:id', async (c) => {
  await imagesService.deleteImage(c.req.param('id'));
  return c.json({ success: true });
});

export default app;
