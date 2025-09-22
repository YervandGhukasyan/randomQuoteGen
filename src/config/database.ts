import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync } from 'fs';
import { LikeRecord, UserPreference } from '../types';
import { logger } from '../utils/logger';

export class DatabaseManager {
  private db: Database.Database;

  constructor(databasePath: string = './data/quotes.db') {
    // create data folder if it's not there
    const dataDir = join(process.cwd(), 'data');
    mkdirSync(dataDir, { recursive: true });

    const fullPath = join(process.cwd(), databasePath);
    this.db = new Database(fullPath);
    this.initializeTables();
  }

  private initializeTables(): void {
    // create our tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        quote_id TEXT NOT NULL,
        user_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(quote_id, user_id)
      )
    `);

    // table for user preferences
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        liked_tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // add some indexes so queries don't suck
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_likes_quote_id ON likes(quote_id);
      CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
    `);
  }

  // handle likes and unlikes
  likeQuote(quoteId: string, userId?: string): { likes: number; isLiked: boolean } {
    try {
      // add the like, skip if they already liked it
      this.db.prepare(`
        INSERT OR IGNORE INTO likes (quote_id, user_id) 
        VALUES (?, ?)
      `).run(quoteId, userId);

      // Get total likes for this quote
      const totalLikes = this.db.prepare(`
        SELECT COUNT(*) as count FROM likes WHERE quote_id = ?
      `).get(quoteId) as { count: number };

      // Check if current user liked this quote
      const userLiked = userId ? this.db.prepare(`
        SELECT COUNT(*) as count FROM likes WHERE quote_id = ? AND user_id = ?
      `).get(quoteId, userId) as { count: number } : { count: 0 };

      return {
        likes: totalLikes.count,
        isLiked: userLiked.count > 0,
      };
    } catch (error) {
      logger.error({ error }, 'Error liking quote');
      throw new Error('Failed to like quote');
    }
  }

  unlikeQuote(quoteId: string, userId?: string): { likes: number; isLiked: boolean } {
    try {
      // delete their like
      this.db.prepare(`
        DELETE FROM likes WHERE quote_id = ? AND user_id = ?
      `).run(quoteId, userId);

      // Get total likes for this quote
      const totalLikes = this.db.prepare(`
        SELECT COUNT(*) as count FROM likes WHERE quote_id = ?
      `).get(quoteId) as { count: number };

      return {
        likes: totalLikes.count,
        isLiked: false,
      };
    } catch (error) {
      logger.error({ error }, 'Error unliking quote');
      throw new Error('Failed to unlike quote');
    }
  }

  getQuoteLikes(quoteId: string, userId?: string): { likes: number; isLiked: boolean } {
    try {
      // Get total likes for this quote
      const totalLikes = this.db.prepare(`
        SELECT COUNT(*) as count FROM likes WHERE quote_id = ?
      `).get(quoteId) as { count: number };

      // Check if current user liked this quote
      const userLiked = userId ? this.db.prepare(`
        SELECT COUNT(*) as count FROM likes WHERE quote_id = ? AND user_id = ?
      `).get(quoteId, userId) as { count: number } : { count: 0 };

      return {
        likes: totalLikes.count,
        isLiked: userLiked.count > 0,
      };
    } catch (error) {
      logger.error({ error }, 'Error getting quote likes');
      throw new Error('Failed to get quote likes');
    }
  }

  getPopularQuotes(limit: number = 10): Array<{ quoteId: string; likes: number }> {
    try {
      const popularQuotes = this.db.prepare(`
        SELECT quote_id as quoteId, COUNT(*) as likes
        FROM likes
        GROUP BY quote_id
        ORDER BY likes DESC
        LIMIT ?
      `).all(limit) as Array<{ quoteId: string; likes: number }>;

      return popularQuotes;
    } catch (error) {
      logger.error({ error }, 'Error getting popular quotes');
      throw new Error('Failed to get popular quotes');
    }
  }

  // manage what users like
  updateUserPreferences(userId: string, likedTags: string[]): void {
    try {
      const tagsJson = JSON.stringify(likedTags);
      this.db.prepare(`
        INSERT OR REPLACE INTO user_preferences (user_id, liked_tags, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `).run(userId, tagsJson);
    } catch (error) {
      logger.error({ error }, 'Error updating user preferences');
      throw new Error('Failed to update user preferences');
    }
  }

  getUserPreferences(userId: string): string[] {
    try {
      const preferences = this.db.prepare(`
        SELECT liked_tags FROM user_preferences WHERE user_id = ?
      `).get(userId) as { liked_tags: string } | undefined;

      if (!preferences) {
        return [];
      }

      return JSON.parse(preferences.liked_tags) as string[];
    } catch (error) {
      logger.error({ error }, 'Error getting user preferences');
      return [];
    }
  }

  // find all quotes this user has liked
  getUserLikedQuotes(userId: string): Array<{ quoteId: string; createdAt: string }> {
    try {
      const likedQuotes = this.db.prepare(`
        SELECT quote_id as quoteId, created_at as createdAt
        FROM likes
        WHERE user_id = ?
        ORDER BY created_at DESC
      `).all(userId) as Array<{ quoteId: string; createdAt: string }>;

      return likedQuotes;
    } catch (error) {
      logger.error({ error }, 'Error getting user liked quotes');
      throw new Error('Failed to get user liked quotes');
    }
  }

  close(): void {
    this.db.close();
  }
}
