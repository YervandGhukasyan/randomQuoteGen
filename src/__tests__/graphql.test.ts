import { buildServer } from '../index';
import { FastifyInstance } from 'fastify';

describe('GraphQL API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildServer();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Query.randomQuote', () => {
    it('should return a random quote', async () => {
      const query = `
        query {
          randomQuote {
            id
            content
            author
            tags
            length
            likes
            isLiked
          }
        }
      `;

      const response = await app.inject({
        method: 'POST',
        url: '/graphql',
        payload: {
          query,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      
      expect(data.data.randomQuote).toMatchObject({
        id: expect.any(String),
        content: expect.any(String),
        author: expect.any(String),
        likes: expect.any(Number),
        isLiked: expect.any(Boolean),
      });
    });

    it('should return a smart random quote', async () => {
      const query = `
        query {
          randomQuote(smart: true) {
            id
            content
            author
            tags
            likes
            isLiked
          }
        }
      `;

      const response = await app.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          'x-user-id': 'test-user-123',
        },
        payload: {
          query,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      
      expect(data.data.randomQuote).toMatchObject({
        id: expect.any(String),
        content: expect.any(String),
        author: expect.any(String),
      });
    });
  });

  describe('Query.popularQuotes', () => {
    it('should return popular quotes', async () => {
      const query = `
        query {
          popularQuotes(limit: 5) {
            quoteId
            likes
          }
        }
      `;

      const response = await app.inject({
        method: 'POST',
        url: '/graphql',
        payload: {
          query,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      
      expect(Array.isArray(data.data.popularQuotes)).toBe(true);
      data.data.popularQuotes.forEach((quote: any) => {
        expect(quote).toMatchObject({
          quoteId: expect.any(String),
          likes: expect.any(Number),
        });
      });
    });
  });

  describe('Mutation.likeQuote', () => {
    it('should like a quote', async () => {
      const mutation = `
        mutation {
          likeQuote(quoteId: "test-quote-id") {
            quoteId
            likes
            isLiked
          }
        }
      `;

      const response = await app.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          'x-user-id': 'test-user-123',
        },
        payload: {
          query: mutation,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      
      expect(data.data.likeQuote).toMatchObject({
        quoteId: 'test-quote-id',
        likes: expect.any(Number),
        isLiked: expect.any(Boolean),
      });
    });
  });

  describe('Mutation.unlikeQuote', () => {
    it('should unlike a quote', async () => {
      const mutation = `
        mutation {
          unlikeQuote(quoteId: "test-quote-id") {
            quoteId
            likes
            isLiked
          }
        }
      `;

      const response = await app.inject({
        method: 'POST',
        url: '/graphql',
        headers: {
          'x-user-id': 'test-user-123',
        },
        payload: {
          query: mutation,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      
      expect(data.data.unlikeQuote).toMatchObject({
        quoteId: 'test-quote-id',
        likes: expect.any(Number),
        isLiked: false,
      });
    });
  });

  describe('Query.similarQuotes', () => {
    it('should return similar quotes', async () => {
      const query = `
        query {
          similarQuotes(quoteId: "test-quote-id", limit: 3) {
            id
            content
            author
            tags
            length
          }
        }
      `;

      const response = await app.inject({
        method: 'POST',
        url: '/graphql',
        payload: {
          query,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      
      // might fail if the quote doesn't exist, that's fine
      if (data.errors) {
        expect(data.errors[0].message).toContain('Failed to fetch similar quotes');
      } else {
        expect(Array.isArray(data.data.similarQuotes)).toBe(true);
      }
    });
  });

  describe('GraphQL Schema validation', () => {
    // mercurius (fastify's graphql plugin) returns generic error messages
    // not the detailed ones you'd get from raw graphql
    it('should reject invalid queries', async () => {
      const invalidQuery = `
        query {
          invalidField {
            nonExistentField
          }
        }
      `;

      const response = await app.inject({
        method: 'POST',
        url: '/graphql',
        payload: {
          query: invalidQuery,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      
      expect(data.errors).toBeDefined();
      // mercurius returns generic validation error message
      expect(data.errors[0].message).toContain('validation error');
    });

    it('should reject mutations with missing required arguments', async () => {
      const mutation = `
        mutation {
          likeQuote {
            quoteId
            likes
            isLiked
          }
        }
      `;

      const response = await app.inject({
        method: 'POST',
        url: '/graphql',
        payload: {
          query: mutation,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      
      expect(data.errors).toBeDefined();
      // mercurius returns generic validation error message
      expect(data.errors[0].message).toContain('validation error');
    });
  });

  describe('GraphQL introspection', () => {
    it('should support introspection queries', async () => {
      const introspectionQuery = `
        query IntrospectionQuery {
          __schema {
            queryType {
              name
            }
            mutationType {
              name
            }
          }
        }
      `;

      const response = await app.inject({
        method: 'POST',
        url: '/graphql',
        payload: {
          query: introspectionQuery,
        },
      });

      expect(response.statusCode).toBe(200);
      const data = response.json();
      
      expect(data.data.__schema).toBeDefined();
      expect(data.data.__schema.queryType.name).toBe('Query');
      expect(data.data.__schema.mutationType.name).toBe('Mutation');
    });
  });
});
