import { QuoteService } from '../services/quoteService';
import axios from 'axios';
import { DatabaseManager } from '../config/database';

// fake axios for testing
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// fake database for testing
jest.mock('../config/database');
const MockedDatabaseManager = DatabaseManager as jest.MockedClass<typeof DatabaseManager>;

describe('QuoteService', () => {
  let quoteService: QuoteService;
  let mockDb: jest.Mocked<DatabaseManager>;

  beforeEach(() => {
    // clean up mocks between tests
    jest.clearAllMocks();
    
    // set up fake database responses
    mockDb = {
      likeQuote: jest.fn(),
      unlikeQuote: jest.fn(),
      getQuoteLikes: jest.fn(),
      getPopularQuotes: jest.fn(),
      updateUserPreferences: jest.fn(),
      getUserPreferences: jest.fn(),
      getUserLikedQuotes: jest.fn(),
      close: jest.fn(),
    } as any;

    MockedDatabaseManager.mockImplementation(() => mockDb);

    quoteService = new QuoteService();
  });

  afterEach(() => {
    quoteService.close();
  });

  describe('getRandomQuote', () => {
    it('should return a quote from quotable.io', async () => {
      const mockQuote = {
        _id: 'test-id',
        content: 'Test quote content',
        author: 'Test Author',
        tags: ['test', 'example'],
        length: 18,
        dateAdded: '2023-01-01',
        dateModified: '2023-01-01',
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: mockQuote,
      });

      const result = await quoteService.getRandomQuote();

      expect(result).toEqual({
        id: 'test-id',
        content: 'Test quote content',
        author: 'Test Author',
        tags: ['test', 'example'],
        length: 18,
        dateAdded: '2023-01-01',
        dateModified: '2023-01-01',
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.quotable.io/random',
        expect.objectContaining({
          timeout: 5000,
          headers: {
            'User-Agent': 'RandomQuoteGenerator/1.0',
          },
        })
      );
    });

    it('should fallback to dummyjson.com when quotable.io fails', async () => {
      const mockDummyQuote = {
        id: 1,
        quote: 'Test dummy quote',
        author: 'Dummy Author',
      };

      // make quotable.io fail
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Quotable API error'))
        .mockResolvedValueOnce({
          data: mockDummyQuote,
        });

      const result = await quoteService.getRandomQuote();

      expect(result).toEqual({
        id: 'dummy_1',
        content: 'Test dummy quote',
        author: 'Dummy Author',
        tags: [],
        length: 16,
      });

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should throw error when both APIs fail', async () => {
      mockedAxios.get
        .mockRejectedValueOnce(new Error('Quotable API error'))
        .mockRejectedValueOnce(new Error('DummyJSON API error'));

      await expect(quoteService.getRandomQuote()).rejects.toThrow(
        'All APIs are down, great...'
      );
    });
  });

  describe('getSmartRandomQuote', () => {
    it('should return quote with like information', async () => {
      const mockQuote = {
        _id: 'test-id',
        content: 'Test quote content',
        author: 'Test Author',
        tags: ['test'],
        length: 18,
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: mockQuote,
      });

      mockDb.getQuoteLikes.mockReturnValue({
        likes: 5,
        isLiked: true,
      });

      const result = await quoteService.getSmartRandomQuote('user123');

      expect(result).toEqual({
        id: 'test-id',
        content: 'Test quote content',
        author: 'Test Author',
        tags: ['test'],
        length: 18,
        likes: 5,
        isLiked: true,
      });

      expect(mockDb.getQuoteLikes).toHaveBeenCalledWith('test-id', 'user123');
    });

    it('should prioritize quotes with user preferred tags', async () => {
      const mockQuote = {
        _id: 'test-id',
        content: 'Test quote content',
        author: 'Test Author',
        tags: ['inspirational'],
        length: 18,
      };

      mockedAxios.get.mockResolvedValueOnce({
        data: mockQuote,
      });

      mockDb.getQuoteLikes.mockReturnValue({
        likes: 3,
        isLiked: false,
      });

      mockDb.getUserPreferences.mockReturnValue(['inspirational', 'motivational']);

      const result = await quoteService.getSmartRandomQuote('user123');

      expect(result.tags).toContain('inspirational');
      expect(mockDb.getUserPreferences).toHaveBeenCalledWith('user123');
    });
  });

  describe('likeQuote', () => {
    it('should like a quote and return updated counts', () => {
      mockDb.likeQuote.mockReturnValue({
        likes: 1,
        isLiked: true,
      });

      const result = quoteService.likeQuote('quote123', 'user123');

      expect(result).toEqual({
        likes: 1,
        isLiked: true,
      });

      expect(mockDb.likeQuote).toHaveBeenCalledWith('quote123', 'user123');
    });
  });

  describe('unlikeQuote', () => {
    it('should unlike a quote and return updated counts', () => {
      mockDb.unlikeQuote.mockReturnValue({
        likes: 0,
        isLiked: false,
      });

      const result = quoteService.unlikeQuote('quote123', 'user123');

      expect(result).toEqual({
        likes: 0,
        isLiked: false,
      });

      expect(mockDb.unlikeQuote).toHaveBeenCalledWith('quote123', 'user123');
    });
  });

  describe('getSimilarQuotes', () => {
    it('should return similar quotes based on tags', async () => {
      const originalQuote = {
        _id: 'original-id',
        content: 'Original quote',
        author: 'Original Author',
        tags: ['wisdom'],
        length: 13,
      };

      const similarQuote = {
        _id: 'similar-id',
        content: 'Similar quote',
        author: 'Similar Author',
        tags: ['wisdom'],
        length: 13,
      };

      // fake the getQuoteById method
      jest.spyOn(quoteService, 'getQuoteById').mockResolvedValue({
        id: 'original-id',
        content: 'Original quote',
        author: 'Original Author',
        tags: ['wisdom'],
        length: 13,
      });

      mockedAxios.get.mockResolvedValueOnce({
        data: [similarQuote],
      });

      const result = await quoteService.getSimilarQuotes('original-id', 3);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'similar-id',
        content: 'Similar quote',
        author: 'Similar Author',
        tags: ['wisdom'],
        length: 13,
      });
    });

    it('should throw error when original quote not found', async () => {
      jest.spyOn(quoteService, 'getQuoteById').mockResolvedValue(null);

      await expect(quoteService.getSimilarQuotes('non-existent-id')).rejects.toThrow(
        'Quote not found'
      );
    });
  });

  describe('getPopularQuotes', () => {
    it('should return popular quotes from database', () => {
      const mockPopularQuotes = [
        { quoteId: 'quote1', likes: 10 },
        { quoteId: 'quote2', likes: 8 },
        { quoteId: 'quote3', likes: 5 },
      ];

      mockDb.getPopularQuotes.mockReturnValue(mockPopularQuotes);

      const result = quoteService.getPopularQuotes(5);

      expect(result).toEqual(mockPopularQuotes);
      expect(mockDb.getPopularQuotes).toHaveBeenCalledWith(5);
    });
  });
});
