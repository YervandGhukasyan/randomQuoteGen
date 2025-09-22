import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import mercurius from 'mercurius';
import { config } from 'dotenv';
import { quoteRoutes } from './routes/quotes';
import { GraphQLResolvers } from './graphql/resolvers';
import { typeDefs } from './graphql/schema';
import { logger } from './utils/logger';

config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

async function buildServer() {
  const fastify = Fastify({
    logger: NODE_ENV === 'development' ? {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true
        }
      }
    } : {
      level: 'info'
    },
  });

  // gotta have some security
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  });

  await fastify.register(cors, {
    origin: NODE_ENV === 'production' ? false : true,
    credentials: true,
  });

  await fastify.register(swagger, {
    swagger: {
      info: {
        title: 'Random Quote Generator API',
        description: 'A web service for serving random quotes with REST and GraphQL APIs',
        version: '1.0.0',
      },
      host: `localhost:${PORT}`,
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'quotes', description: 'Quote-related endpoints' },
      ],
      securityDefinitions: {
        ApiKey: {
          type: 'apiKey',
          name: 'x-user-id',
          in: 'header',
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
    },
    uiHooks: {
      onRequest: function (request, reply, next) {
        next();
      },
      preHandler: function (request, reply, next) {
        next();
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });

  // setting up graphql because why not
  const resolvers = new GraphQLResolvers(
    process.env.DATABASE_PATH,
    process.env.QUOTABLE_API_URL,
    process.env.DUMMYJSON_API_URL
  );

  await fastify.register(mercurius, {
    schema: typeDefs,
    resolvers: resolvers.getResolvers() as any,
    graphiql: NODE_ENV === 'development',
    path: '/graphql',
    context: (request: any) => {
      // grab user id if they bothered to send it
      return {
        userId: request.headers['x-user-id'] as string,
      };
    },
    errorFormatter: (execution: any) => {
      return {
        statusCode: 200,
        response: {
          data: execution.data,
          errors: execution.errors?.map((error: any) => ({
            message: error.message,
            locations: error.locations,
            path: error.path,
          })),
        },
      };
    },
  });

  // hook up the quote routes
  await fastify.register(quoteRoutes, { prefix: '/api/quotes' });

  // simple health check endpoint
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
            environment: { type: 'string' },
          },
        },
      },
    },
  }, async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: NODE_ENV,
    };
  });

  // home page that tells you what's here
  fastify.get('/', {
    schema: {
      description: 'API information and available endpoints',
      tags: ['info'],
      response: {
        200: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            version: { type: 'string' },
            description: { type: 'string' },
            endpoints: {
              type: 'object',
              properties: {
                rest: { type: 'string' },
                graphql: { type: 'string' },
                docs: { type: 'string' },
                health: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async () => {
    return {
      name: 'Random Quote Generator API',
      version: '1.0.0',
      description: 'A web service for serving random quotes with REST and GraphQL APIs',
      endpoints: {
        rest: '/api/quotes',
        graphql: '/graphql',
        docs: '/docs',
        health: '/health',
      },
    };
  });

  // deal with things when they go wrong
  fastify.setErrorHandler(async (error, request, reply) => {
    fastify.log.error(error);

    // they sent us garbage data
    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.validation,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // mercurius handles graphql errors for us
    if (request.url.startsWith('/graphql')) {
      return reply.status(500).send({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // catch-all for other stuff that breaks
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: NODE_ENV === 'development' ? error.message : 'Something broke',
        details: NODE_ENV === 'development' ? error : undefined,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // clean up our mess when exiting
  const gracefulShutdown = async (signal: string) => {
    fastify.log.info(`Got ${signal}, shutting down...`);
    
    try {
      resolvers.close();
      await fastify.close();
      fastify.log.info('All good, bye!');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Oops, shutdown failed');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return fastify;
}

async function start() {
  try {
    const server = await buildServer();
    
    await server.listen({ 
      port: PORT, 
      host: '0.0.0.0' 
    });

    logger.info(`Random Quote API is running on port ${PORT}!\n\n📚 Docs: http://localhost:${PORT}/docs\n🔍 GraphQL: http://localhost:${PORT}/graphql\n💚 Health: http://localhost:${PORT}/health\n🚀 API: http://localhost:${PORT}/api/quotes\n\nEnvironment: ${NODE_ENV}`);
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

// fire up the server
if (require.main === module) {
  start();
}

export { buildServer };
