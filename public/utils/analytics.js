import { pool } from '../db.js';

class AnalyticsService {
  static async trackUserAction(userId, action, metadata = {}) {
    try {
      await pool.query(
        `INSERT INTO user_analytics (user_id, action, metadata)
         VALUES ($1, $2, $3)`,
        [userId, action, JSON.stringify(metadata)]
      );
    } catch (error) {
      console.error('Analytics tracking error:', error);
      // Don't throw error to avoid breaking main functionality
    }
  }

  static async getDashboardMetrics(timeRange = '30d') {
    const timeClause = this.getTimeClause(timeRange);
    
    const queries = {
      totalUsers: `
        SELECT COUNT(*) as count FROM users 
        WHERE created_at >= NOW() - INTERVAL '${timeClause}'
      `,
      activeListings: `
        SELECT COUNT(*) as count FROM coffee_lots 
        WHERE status = 'published' 
        AND updated_at >= NOW() - INTERVAL '${timeClause}'
      `,
      totalVolume: `
        SELECT COALESCE(SUM(quantity_bags), 0) as volume 
        FROM contracts 
        WHERE created_at >= NOW() - INTERVAL '${timeClause}'
        AND status = 'completed'
      `,
      totalValue: `
        SELECT COALESCE(SUM(total_value), 0) as value 
        FROM contracts 
        WHERE created_at >= NOW() - INTERVAL '${timeClause}'
        AND status = 'completed'
      `
    };

    const results = {};
    
    for (const [key, query] of Object.entries(queries)) {
      const result = await pool.query(query);
      results[key] = result.rows[0];
    }

    return results;
  }

  static getTimeClause(timeRange) {
    const ranges = {
      '7d': '7 days',
      '30d': '30 days',
      '90d': '90 days',
      '1y': '1 year'
    };
    
    return ranges[timeRange] || '30 days';
  }
}

export default AnalyticsService;