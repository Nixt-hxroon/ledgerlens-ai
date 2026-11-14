export const formatCurrency = (amount, currency = 'USD') => {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
    }).format(num);
  } catch (e) {
    return `$${num.toFixed(2)}`;
  }
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch (e) {
    return dateString;
  }
};

export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const getStatusBadgeStyle = (status) => {
  switch (status?.toLowerCase()) {
    case 'processed':
    case 'valid':
    case 'matched':
    case 'resolved':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
    case 'processing':
    case 'uploaded':
      return 'bg-blue-50 text-blue-700 border-blue-200/60';
    case 'warning':
    case 'partial match':
    case 'review required':
      return 'bg-amber-50 text-amber-700 border-amber-200/60';
    case 'critical issue':
    case 'discrepancy detected':
    case 'failed':
    case 'rejected':
      return 'bg-rose-50 text-rose-700 border-rose-200/60';
    default:
      return 'bg-zinc-100 text-zinc-700 border-zinc-200';
  }
};
