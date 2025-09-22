import pino from 'pino';

// set up our logging with pino
let loggerConfig: any = {
  level: process.env.LOG_LEVEL || 'info'
};

// only use pretty printing in development AND if pino-pretty is available
if (process.env.NODE_ENV === 'development') {
  try {
    // check if pino-pretty is available (it's a dev dependency)
    require.resolve('pino-pretty');
    loggerConfig.transport = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    };
  } catch {
    // pino-pretty not available, use plain JSON logging
    console.log('pino-pretty not found, using JSON logging');
  }
}

const logger = pino(loggerConfig);

export { logger };
