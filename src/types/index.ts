import { z } from 'zod';

// validation schemas for quotes
export const QuoteSchema = z.object({
  id: z.string(),
  content: z.string(),
  author: z.string(),
  tags: z.array(z.string()).optional(),
  length: z.number().optional(),
  dateAdded: z.string().optional(),
  dateModified: z.string().optional(),
  likes: z.number().optional(),
  isLiked: z.boolean().optional(),
});

export const ExternalQuoteSchema = z.object({
  _id: z.string(),
  content: z.string(),
  author: z.string(),
  tags: z.array(z.string()).optional(),
  authorSlug: z.string().optional(),
  length: z.number().optional(),
  dateAdded: z.string().optional(),
  dateModified: z.string().optional(),
});

export const DummyJsonQuoteSchema = z.object({
  id: z.number(),
  quote: z.string(),
  author: z.string(),
});

// schemas for API responses
export const QuoteResponseSchema = z.object({
  success: z.boolean(),
  data: QuoteSchema,
  timestamp: z.string(),
});

export const QuoteListResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(QuoteSchema),
  count: z.number(),
  timestamp: z.string(),
});

export const LikeResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    quoteId: z.string(),
    likes: z.number(),
    isLiked: z.boolean(),
  }),
  timestamp: z.string(),
});

// graphql-specific schemas
export const GraphQLQuoteSchema = z.object({
  id: z.string(),
  content: z.string(),
  author: z.string(),
  tags: z.array(z.string()).optional(),
  length: z.number().optional(),
  likes: z.number().optional(),
  isLiked: z.boolean().optional(),
  similarQuotes: z.array(QuoteSchema).optional(),
});

// database record schemas
export const LikeRecordSchema = z.object({
  id: z.number(),
  quoteId: z.string(),
  userId: z.string().optional(),
  createdAt: z.string(),
});

export const UserPreferenceSchema = z.object({
  id: z.number(),
  userId: z.string().optional(),
  likedTags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// export all the types we defined above
export type Quote = z.infer<typeof QuoteSchema>;
export type ExternalQuote = z.infer<typeof ExternalQuoteSchema>;
export type DummyJsonQuote = z.infer<typeof DummyJsonQuoteSchema>;
export type QuoteResponse = z.infer<typeof QuoteResponseSchema>;
export type QuoteListResponse = z.infer<typeof QuoteListResponseSchema>;
export type LikeResponse = z.infer<typeof LikeResponseSchema>;
export type GraphQLQuote = z.infer<typeof GraphQLQuoteSchema>;
export type LikeRecord = z.infer<typeof LikeRecordSchema>;
export type UserPreference = z.infer<typeof UserPreferenceSchema>;

// error response structure
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}
