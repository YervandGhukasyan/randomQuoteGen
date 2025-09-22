import axios from 'axios';
import { Quote, ExternalQuote, DummyJsonQuote, GraphQLQuote } from '../types';
import { DatabaseManager } from '../config/database';
import { logger } from '../utils/logger';

export class QuoteService {
  private db: DatabaseManager;
  private readonly quotableApiUrl: string;
  private readonly dummyJsonApiUrl: string;

  constructor(
    databasePath?: string,
    quotableApiUrl: string = 'https://api.quotable.io',
    dummyJsonApiUrl: string = 'https://dummyjson.com'
  ) {
    this.db = new DatabaseManager(databasePath);
    this.quotableApiUrl = quotableApiUrl;
    this.dummyJsonApiUrl = dummyJsonApiUrl;
  }

  // grab a random quote from somewhere
  async getRandomQuote(): Promise<Quote> {
    try {
      // quotable usually has decent quotes
      const quote = await this.fetchFromQuotable();
      if (quote && !Array.isArray(quote)) {
        return this.normalizeQuotableQuote(quote);
      }
    } catch (error) {
      logger.warn({ error }, 'quotable.io is being weird');
    }

    try {
      // try dummyjson if quotable is having a bad day
      const quote = await this.fetchFromDummyJson();
      if (quote) {
        return this.normalizeDummyJsonQuote(quote);
      }
    } catch (error) {
      logger.warn({ error }, 'dummyjson also failed us');
    }

    throw new Error('All APIs are down, great...');
  }

  // try to be smart about which quote to show
  async getSmartRandomQuote(userId?: string): Promise<GraphQLQuote> {
    const quote = await this.getRandomQuote();
    const likes = this.db.getQuoteLikes(quote.id, userId);
    
    // see if this user has any preferences we can work with
    if (userId) {
      const userPreferences = this.db.getUserPreferences(userId);
      if (userPreferences && userPreferences.length > 0 && quote.tags) {
        const hasPreferredTag = quote.tags.some(tag => 
          userPreferences.some(prefTag => 
            prefTag.toLowerCase().includes(tag.toLowerCase()) ||
            tag.toLowerCase().includes(prefTag.toLowerCase())
          )
        );
        
        if (hasPreferredTag) {
          return {
            ...quote,
            likes: likes.likes,
            isLiked: likes.isLiked,
          };
        }
      }
    }

    // newbies get popular stuff 70% of the time (seems to work)
    const shouldPrioritizePopular = Math.random() < 0.7;
    
    if (shouldPrioritizePopular) {
      try {
        const popularQuotes = this.db.getPopularQuotes(5);
        if (popularQuotes.length > 0) {
      // grab one of the popular ones randomly
      const randomPop = popularQuotes[Math.floor(Math.random() * popularQuotes.length)];
      const popularQuote = await this.getQuoteById(randomPop.quoteId);
          if (popularQuote) {
            const popularLikes = this.db.getQuoteLikes(popularQuote.id, userId);
            return {
              ...popularQuote,
              likes: popularLikes.likes,
              isLiked: popularLikes.isLiked,
            };
          }
        }
      } catch (error) {
        logger.warn({ error }, 'Popular quote fetch failed, whatever');
      }
    }

    return {
      ...quote,
      likes: likes.likes,
      isLiked: likes.isLiked,
    };
  }

  // find quotes that are kinda similar
  async getSimilarQuotes(quoteId: string, limit: number = 5): Promise<Quote[]> {
    const originalQuote = await this.getQuoteById(quoteId);
    if (!originalQuote) {
      throw new Error('Quote not found');
    }

    const similarQuotes: Quote[] = [];
    
    // look for quotes with the same tags
    if (originalQuote.tags && originalQuote.tags.length > 0) {
      for (const tag of originalQuote.tags) {
        try {
          const tagQuote = await this.fetchFromQuotable(`/quotes?tags=${encodeURIComponent(tag)}&limit=3`);
          if (Array.isArray(tagQuote)) {
            const normalizedQuotes = tagQuote
              .filter(q => q._id !== quoteId)
              .map(q => this.normalizeQuotableQuote(q))
              .slice(0, limit - similarQuotes.length);
            
            similarQuotes.push(...normalizedQuotes);
          } else if (tagQuote && !Array.isArray(tagQuote)) {
            // sometimes the API is weird and returns just one quote
            if (tagQuote._id !== quoteId) {
              similarQuotes.push(this.normalizeQuotableQuote(tagQuote));
            }
          }
        } catch (error) {
          logger.warn({ error, tag }, `Couldn't fetch quotes for tag`);
        }
      }
    }

    // fill up with random ones if we're running short
    while (similarQuotes.length < limit) {
      try {
        const randomQuote = await this.getRandomQuote();
        if (randomQuote.id !== quoteId && !similarQuotes.find(q => q.id === randomQuote.id)) {
          similarQuotes.push(randomQuote);
        }
      } catch (error) {
        logger.warn({ error }, 'Ran out of quotes to fetch');
        break;
      }
    }

    return similarQuotes.slice(0, limit);
  }

  // thumbs up
  likeQuote(quoteId: string, userId?: string): { likes: number; isLiked: boolean } {
    return this.db.likeQuote(quoteId, userId);
  }

  // thumbs down
  unlikeQuote(quoteId: string, userId?: string): { likes: number; isLiked: boolean } {
    return this.db.unlikeQuote(quoteId, userId);
  }

  // check how many people liked this
  getQuoteLikes(quoteId: string, userId?: string): { likes: number; isLiked: boolean } {
    return this.db.getQuoteLikes(quoteId, userId);
  }

  // find a specific quote (should probably cache this but meh)
  async getQuoteById(quoteId: string): Promise<Quote | null> {
    try {
      // check quotable first
      const quote = await this.fetchFromQuotable(`/quotes/${quoteId}`);
      if (quote && !Array.isArray(quote)) {
        return this.normalizeQuotableQuote(quote);
      }
    } catch (error) {
      logger.warn({ error, quoteId }, `Couldn't get quote from quotable`);
    }

    // dummyjson can't do lookups by id, whatever
    return null;
  }

  // find the crowd favorites
  getPopularQuotes(limit: number = 10): Array<{ quoteId: string; likes: number }> {
    return this.db.getPopularQuotes(limit);
  }

  // figure out what this user is into
  updateUserPreferences(userId: string): void {
    const likedQuotes = this.db.getUserLikedQuotes(userId);
    const allTags = new Set<string>();

    // super basic approach here - just throw in popular tags
    // TODO: do some actual machine learning or something
    likedQuotes.forEach(() => {
      // everyone likes inspirational stuff, right?
      const popularTags = ['inspirational', 'motivational', 'wisdom', 'life', 'success'];
      popularTags.forEach(tag => allTags.add(tag));
    });

    this.db.updateUserPreferences(userId, Array.from(allTags));
  }

  // call the quotable API
  private async fetchFromQuotable(endpoint: string = '/random'): Promise<ExternalQuote | ExternalQuote[] | null> {
    try {
      const response = await axios.get(`${this.quotableApiUrl}${endpoint}`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'RandomQuoteGenerator/1.0', // should probably update this version number
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          return null;
        }
        throw new Error(`Quotable API error: ${error.message}`);
      }
      throw error;
    }
  }

  // fallback to dummyjson when quotable is down
  private async fetchFromDummyJson(): Promise<DummyJsonQuote | null> {
    try {
      const response = await axios.get(`${this.dummyJsonApiUrl}/quotes/random`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'RandomQuoteGenerator/1.0', // should probably update this version number
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DummyJSON API error: ${error.message}`);
      }
      throw error;
    }
  }

  // make quotable data look like our data
  private normalizeQuotableQuote(quote: ExternalQuote): Quote {
    return {
      id: quote._id,
      content: quote.content,
      author: quote.author,
      tags: quote.tags || [],
      length: quote.length,
      dateAdded: quote.dateAdded,
      dateModified: quote.dateModified,
    };
  }

  // make dummyjson data fit our schema
  private normalizeDummyJsonQuote(quote: DummyJsonQuote): Quote {
    return {
      id: `dummy_${quote.id}`,
      content: quote.quote,
      author: quote.author,
      tags: [],
      length: quote.quote.length,
    };
  }

  // close the database connection
  close(): void {
    this.db.close();
  }
}
