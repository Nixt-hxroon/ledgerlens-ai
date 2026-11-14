import api from './api';

export const comparisonService = {
  async compareDocuments({ invoice_id, purchase_order_id }) {
    const res = await api.post('/comparisons', { invoice_id, purchase_order_id });
    return res.data;
  },

  async getComparisons() {
    const res = await api.get('/comparisons');
    return res.data;
  },

  async getComparisonById(id) {
    const res = await api.get(`/comparisons/${id}`);
    return res.data;
  },

  async getCandidates(invoiceId) {
    const res = await api.get('/comparisons/candidates', {
      params: { invoice_id: invoiceId },
    });
    return res.data;
  },
};
