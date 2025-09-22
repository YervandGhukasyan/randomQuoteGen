import { QuoteService } from '../services/quoteService';
import { GraphQLQuote } from '../types';
import { logger } from '../utils/logger';

export class GraphQLResolvers {
  private quoteService: QuoteService;

  constructor(
    databasePath?: string,
    quotableApiUrl?: string,
    dummyJsonApiUrl?: string
  ) {
    this.quoteService = new QuoteService(databasePath, quotableApiUrl, dummyJsonApiUrl);
  }

  getResolvers() {
    return {
      Query: {
        randomQuote: async (
          _parent: unknown,
          args: { smart?: boolean },
          context: any
        ): Promise<GraphQLQuote> => {
          try {
            if (args.smart) {
              return await this.quoteService.getSmartRandomQuote(context.userId);
            } else {
              const quote = await this.quoteService.getRandomQuote();
              const likes = this.quoteService.getQuoteLikes(quote.id, context.userId);
              return {
                ...quote,
                likes: likes.likes,
                isLiked: likes.isLiked,
              };
            }
          } catch (error) {
            throw new Error(`Failed to fetch random quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        },

        similarQuotes: async (
          _parent: unknown,
          args: { quoteId: string; limit?: number },
          _context: unknown
        ): Promise<GraphQLQuote[]> => {
          try {
            const quotes = await this.quoteService.getSimilarQuotes(args.quoteId, args.limit || 5);
            return quotes.map(quote => ({
              ...quote,
              likes: 0, // skip likes for similar quotes to keep it simple
              isLiked: false,
            }));
          } catch (error) {
            throw new Error(`Failed to fetch similar quotes: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        },

        popularQuotes: async (
          _parent: unknown,
          args: { limit?: number },
          _context: unknown
        ) => {
          try {
            return this.quoteService.getPopularQuotes(args.limit || 10);
          } catch (error) {
            throw new Error(`Failed to fetch popular quotes: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        },
      },

      Mutation: {
        likeQuote: async (
          _parent: unknown,
          args: { quoteId: string },
          context: any
        ) => {
          try {
            const result = this.quoteService.likeQuote(args.quoteId, context.userId);
            
            // learn what they like if we know who they are
            if (context.userId) {
              this.quoteService.updateUserPreferences(context.userId);
            }

            return {
              quoteId: args.quoteId,
              likes: result.likes,
              isLiked: result.isLiked,
            };
          } catch (error) {
            throw new Error(`Failed to like quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        },

        unlikeQuote: async (
          _parent: unknown,
          args: { quoteId: string },
          context: any
        ) => {
          try {
            const result = this.quoteService.unlikeQuote(args.quoteId, context.userId);
            return {
              quoteId: args.quoteId,
              likes: result.likes,
              isLiked: result.isLiked,
            };
          } catch (error) {
            throw new Error(`Failed to unlike quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        },
      },

      Quote: {
        similarQuotes: async (
          parent: GraphQLQuote,
          args: { limit?: number },
          _context: unknown
        ): Promise<GraphQLQuote[]> => {
          try {
            const quotes = await this.quoteService.getSimilarQuotes(parent.id, args.limit || 3);
            return quotes.map(quote => ({
              ...quote,
              likes: 0, // skip likes for similar quotes to keep it simple
              isLiked: false,
            }));
          } catch (error) {
            // oh well, no similar quotes found
            logger.warn({ error, quoteId: parent.id }, `Couldn't get similar quotes`);
            return [];
          }
        },
      },
    };
  }

  close(): void {
    this.quoteService.close();
  }
}
