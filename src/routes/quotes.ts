import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { QuoteService } from '../services/quoteService';
import { QuoteResponse, QuoteListResponse, LikeResponse, ApiError } from '../types';

// schemas to validate incoming requests
const RandomQuoteParamsSchema = z.object({
  smart: z.enum(['true', 'false']).optional(),
});

const LikeQuoteParamsSchema = z.object({
  quoteId: z.string().min(1),
});

const SimilarQuotesParamsSchema = z.object({
  quoteId: z.string().min(1),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

const UserIdHeaderSchema = z.object({
  'x-user-id': z.string().optional(),
});

export async function quoteRoutes(fastify: FastifyInstance) {
  const quoteService = new QuoteService(
    process.env.DATABASE_PATH,
    process.env.QUOTABLE_API_URL,
    process.env.DUMMYJSON_API_URL
  );

  // close quote service when server dies
  fastify.addHook('onClose', async () => {
    quoteService.close();
  });

  // endpoint to get a random quote
  fastify.get('/random', {
    schema: {
      description: 'Get a random quote',
      tags: ['quotes'],
      querystring: {
        type: 'object',
        properties: {
          smart: { type: 'string', enum: ['true', 'false'] },
        },
      },
      headers: {
        type: 'object',
        properties: {
          'x-user-id': { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                content: { type: 'string' },
                author: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } },
                length: { type: 'number' },
                likes: { type: 'number' },
                isLiked: { type: 'boolean' },
              },
            },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = RandomQuoteParamsSchema.parse(request.query);
      const headers = UserIdHeaderSchema.parse(request.headers);
      
      const smartMode = query.smart === 'true';
      const userId = headers['x-user-id'];

      let quote;
      if (smartMode) {
        quote = await quoteService.getSmartRandomQuote(userId);
      } else {
        // grab any old quote
        const basicQuote = await quoteService.getRandomQuote();
        const likes = quoteService.getQuoteLikes(basicQuote.id, userId);
        quote = {
          ...basicQuote,
          likes: likes.likes,
          isLiked: likes.isLiked,
        };
      }

      const response: QuoteResponse = {
        success: true,
        data: quote,
        timestamp: new Date().toISOString(),
      };

      return reply.code(200).send(response);
    } catch (error) {
        const apiError: ApiError = {
          success: false,
          error: {
            code: 'QUOTE_FETCH_ERROR',
            message: error instanceof Error ? error.message : 'Something went wrong',
            details: error,
          },
          timestamp: new Date().toISOString(),
        };

      return reply.code(500).send(apiError);
    }
  });

  // find quotes that are kinda like this one
  fastify.get('/similar/:quoteId', {
    schema: {
      description: 'Get quotes similar to the specified quote',
      tags: ['quotes'],
      params: {
        type: 'object',
        properties: {
          quoteId: { type: 'string' },
        },
        required: ['quoteId'],
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string', pattern: '^\\d+$' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  content: { type: 'string' },
                  author: { type: 'string' },
                  tags: { type: 'array', items: { type: 'string' } },
                  length: { type: 'number' },
                },
              },
            },
            count: { type: 'number' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = SimilarQuotesParamsSchema.parse(request.params);
      const limit = params.limit || 5;

      const similarQuotes = await quoteService.getSimilarQuotes(params.quoteId, limit);

      const response: QuoteListResponse = {
        success: true,
        data: similarQuotes,
        count: similarQuotes.length,
        timestamp: new Date().toISOString(),
      };

      return reply.code(200).send(response);
    } catch (error) {
      const apiError: ApiError = {
        success: false,
        error: {
          code: 'SIMILAR_QUOTES_ERROR',
            message: error instanceof Error ? error.message : 'Something went wrong',
          details: error,
        },
        timestamp: new Date().toISOString(),
      };

      return reply.code(500).send(apiError);
    }
  });

  // let people like quotes
  fastify.post('/:quoteId/like', {
    schema: {
      description: 'Like a quote',
      tags: ['quotes'],
      params: {
        type: 'object',
        properties: {
          quoteId: { type: 'string' },
        },
        required: ['quoteId'],
      },
      headers: {
        type: 'object',
        properties: {
          'x-user-id': { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                quoteId: { type: 'string' },
                likes: { type: 'number' },
                isLiked: { type: 'boolean' },
              },
            },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = LikeQuoteParamsSchema.parse(request.params);
      const headers = UserIdHeaderSchema.parse(request.headers);
      const userId = headers['x-user-id'];

      const result = quoteService.likeQuote(params.quoteId, userId);

      // learn what they like if we know who they are
      if (userId) {
        quoteService.updateUserPreferences(userId);
      }

      const response: LikeResponse = {
        success: true,
        data: {
          quoteId: params.quoteId,
          likes: result.likes,
          isLiked: result.isLiked,
        },
        timestamp: new Date().toISOString(),
      };

      return reply.code(200).send(response);
    } catch (error) {
      const apiError: ApiError = {
        success: false,
        error: {
          code: 'LIKE_QUOTE_ERROR',
            message: error instanceof Error ? error.message : 'Something went wrong',
          details: error,
        },
        timestamp: new Date().toISOString(),
      };

      return reply.code(500).send(apiError);
    }
  });

  // let people unlike quotes too
  fastify.delete('/:quoteId/like', {
    schema: {
      description: 'Unlike a quote',
      tags: ['quotes'],
      params: {
        type: 'object',
        properties: {
          quoteId: { type: 'string' },
        },
        required: ['quoteId'],
      },
      headers: {
        type: 'object',
        properties: {
          'x-user-id': { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                quoteId: { type: 'string' },
                likes: { type: 'number' },
                isLiked: { type: 'boolean' },
              },
            },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = LikeQuoteParamsSchema.parse(request.params);
      const headers = UserIdHeaderSchema.parse(request.headers);
      const userId = headers['x-user-id'];

      const result = quoteService.unlikeQuote(params.quoteId, userId);

      const response: LikeResponse = {
        success: true,
        data: {
          quoteId: params.quoteId,
          likes: result.likes,
          isLiked: result.isLiked,
        },
        timestamp: new Date().toISOString(),
      };

      return reply.code(200).send(response);
    } catch (error) {
      const apiError: ApiError = {
        success: false,
        error: {
          code: 'UNLIKE_QUOTE_ERROR',
            message: error instanceof Error ? error.message : 'Something went wrong',
          details: error,
        },
        timestamp: new Date().toISOString(),
      };

      return reply.code(500).send(apiError);
    }
  });

  // show the crowd favorites
  fastify.get('/popular', {
    schema: {
      description: 'Get popular quotes based on likes',
      tags: ['quotes'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'string', pattern: '^\\d+$' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  quoteId: { type: 'string' },
                  likes: { type: 'number' },
                },
              },
            },
            count: { type: 'number' },
            timestamp: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = z.object({
        limit: z.string().regex(/^\d+$/).transform(Number).optional(),
      }).parse(request.query);

      const limit = query.limit || 10;
      const popularQuotes = quoteService.getPopularQuotes(limit);

      return reply.code(200).send({
        success: true,
        data: popularQuotes,
        count: popularQuotes.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const apiError: ApiError = {
        success: false,
        error: {
          code: 'POPULAR_QUOTES_ERROR',
            message: error instanceof Error ? error.message : 'Something went wrong',
          details: error,
        },
        timestamp: new Date().toISOString(),
      };

      return reply.code(500).send(apiError);
    }
  });
}
