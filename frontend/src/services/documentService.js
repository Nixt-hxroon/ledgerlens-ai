import api from './api';

export const documentService = {
  async uploadSingle(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await api.post('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return res.data;
  },

  async uploadBatch(files, onProgress) {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const res = await api.post('/documents/batch', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });
    return res.data;
  },

  async getDocuments(params = {}) {
    const res = await api.get('/documents', { params });
    return res.data;
  },

  async getDocumentById(id) {
    const res = await api.get(`/documents/${id}`);
    return res.data;
  },

  async reprocessDocument(id) {
    const res = await api.post(`/documents/${id}/process`);
    return res.data;
  },

  async updateExtractedData(id, data) {
    const res = await api.patch(`/documents/${id}`, data);
    return res.data;
  },

  async deleteDocument(id) {
    const res = await api.delete(`/documents/${id}`);
    return res.data;
  },

  async getDocumentSheetData(id) {
    const res = await api.get(`/documents/${id}/sheet-data`);
    return res.data;
  },

  async getDocumentInvoice(id) {
    const res = await api.get(`/documents/${id}/invoice`);
    return res.data;
  },

  async getArrangedInvoices(params = {}) {
    const res = await api.get('/documents/invoices/arranged', { params });
    return res.data;
  },
};

