export function formatApiError(error) {
  if (!error) return 'Something went wrong';
  if (typeof error === 'string') return error;

  if (error instanceof Error) {
    if (/fetch|network|ENOTFOUND|MongoServerSelection/i.test(error.message)) {
      return 'Unable to reach the server. Your changes are saved locally.';
    }
    return error.message || 'Something went wrong';
  }

  if (typeof error === 'object') {
    if (Array.isArray(error.formErrors) && error.formErrors.length) {
      return String(error.formErrors[0]);
    }

    const fieldErrors = error.fieldErrors ? Object.values(error.fieldErrors).flat() : [];
    if (fieldErrors.length) return String(fieldErrors[0]);

    if (typeof error.message === 'string') return error.message;
    if (typeof error.error === 'string') return error.error;
  }

  return 'Something went wrong';
}
