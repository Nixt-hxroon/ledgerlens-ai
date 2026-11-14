import api from './api';

export const validationService = {
  async getValidationIssues(params = {}) {
    const res = await api.get('/validation', { params });
    return res.data;
  },

  async getDocumentValidation(documentId) {
    const res = await api.get(`/validation/${documentId}`);
    return res.data;
  },

  async reviewDocument(documentId, data) {
    const res = await api.post(`/validation/${documentId}/review`, data);
    return res.data;
  },

  async updateIssueStatus(issueId, status) {
    const res = await api.patch(`/validation/issue/${issueId}`, { status });
    return res.data;
  },
};

