import { analyticsService } from '../services/analytics.service.js';
import { successResponse } from '../utils/response.js';

export const analyticsController = {
  async getDashboard(req, res, next) {
    try {
      const data = await analyticsService.getDashboardMetrics(req.user.id);
      return successResponse(res, data);
    } catch (err) {
      next(err);
    }
  },

  async getSpending(req, res, next) {
    try {
      const data = await analyticsService.getDashboardMetrics(req.user.id);
      return successResponse(res, {
        monthly: data.charts.monthlyProcessing,
        totalSpend: data.summary.totalInvoiceValue,
      });
    } catch (err) {
      next(err);
    }
  },

  async getVendors(req, res, next) {
    try {
      const data = await analyticsService.getDashboardMetrics(req.user.id);
      return successResponse(res, data.charts.topVendors);
    } catch (err) {
      next(err);
    }
  },

  async getDocuments(req, res, next) {
    try {
      const data = await analyticsService.getDashboardMetrics(req.user.id);
      return successResponse(res, {
        total: data.summary.totalDocuments,
        categories: data.charts.categoryDistribution,
        statusBreakdown: {
          processed: data.summary.successfullyProcessed,
          pending: data.summary.pendingReview,
        },
      });
    } catch (err) {
      next(err);
    }
  },
};

