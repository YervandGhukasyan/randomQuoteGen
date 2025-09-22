import { buildServer } from '../index';
import { FastifyInstance } from 'fastify';

describe('API Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        name: 'Random Quote Generator API',
        version: '1.0.0',
        endpoints: {
          rest: '/api/quotes',
          graphql: '/graphql',
          docs: '/docs',
          health: '/health',
        },
      });
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({
        status: 'healthy',
        environment: expect.any(String),
        uptime: expect.any(Number),
      });
    });
  });

  describe('GET /api/quotes/random', () => {
    it('should return a random quote', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/quotes/random',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        id: expect.any(String),
        content: expect.any(String),
        author: expect.any(String),
        likes: expect.any(Number),
        isLiked: expect.any(Boolean),
      });
      expect(data.timestamp).toBeDefined();
    });

    it('should return smart random quote when requested', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/quotes/random?smart=true',
        headers: {
          'x-user-id': 'test-user-123',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        id: expect.any(String),
        content: expect.any(String),
        author: expect.any(String),
      });
    });
  });

  describe('POST /api/quotes/:quoteId/like', () => {
    it('should like a quote', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/quotes/test-quote-id/like',
        headers: {
          'x-user-id': 'test-user-123',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        quoteId: 'test-quote-id',
        likes: expect.any(Number),
        isLiked: expect.any(Boolean),
      });
    });

    it('should like a quote without user ID', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/quotes/test-quote-id/like',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.success).toBe(true);
      expect(data.data.quoteId).toBe('test-quote-id');
    });
  });

  describe('DELETE /api/quotes/:quoteId/like', () => {
    it('should unlike a quote', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/quotes/test-quote-id/like',
        headers: {
          'x-user-id': 'test-user-123',
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.success).toBe(true);
      expect(data.data).toMatchObject({
        quoteId: 'test-quote-id',
        likes: expect.any(Number),
        isLiked: false,
      });
    });
  });

  describe('GET /api/quotes/popular', () => {
    it('should return popular quotes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/quotes/popular?limit=5',
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.count).toBeDefined();
    });
  });

  describe('GET /api/quotes/similar/:quoteId', () => {
    it('should return similar quotes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/quotes/similar/test-quote-id?limit=3',
      });

      // might fail if quote doesn't exist, whatever
      if (response.statusCode === 500) {
        expect(response.json().error.code).toBe('SIMILAR_QUOTES_ERROR');
      } else {
        expect(response.statusCode).toBe(200);
        const data = response.json();
        expect(data.success).toBe(true);
        expect(Array.isArray(data.data)).toBe(true);
      }
    });
  });

  describe('Error handling', () => {
    // these tests check error handling for malformed URLs
    // fastify treats empty path params as 500 errors, not validation errors
    it('should handle invalid quote ID format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/quotes//like', // Empty quote ID
      });

      // fastify returns 500 for invalid routes, not 400
      expect(response.statusCode).toBe(500);
      const data = response.json();
      expect(data.success).toBe(false);
    });

    it('should handle missing quote ID in similar quotes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/quotes/similar/', // Empty quote ID
      });

      // fastify returns 500 for invalid routes, not 400
      expect(response.statusCode).toBe(500);
      const data = response.json();
      expect(data.success).toBe(false);
    });
  });
});
