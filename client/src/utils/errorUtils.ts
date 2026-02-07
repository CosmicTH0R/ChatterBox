/**
 * Extracts a user-friendly error message from API error responses.
 * Handles validation errors with detailed field messages.
 */
export const getErrorMessage = (error: any, fallback: string = 'An error occurred'): string => {
  const data = error?.response?.data;
  
  if (!data) {
    return fallback;
  }

  // If there's a validation errors array, format them nicely
  if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
    // Return just the first error message for toast notifications
    // This keeps toasts short while still showing the actual problem
    const firstError = data.errors[0];
    if (firstError.message) {
      return firstError.message;
    }
    if (firstError.field && firstError.message) {
      return `${firstError.field}: ${firstError.message}`;
    }
  }

  // Fall back to the general message
  if (data.message) {
    return data.message;
  }

  return fallback;
};

/**
 * Gets all validation error messages as an array.
 * Useful for displaying multiple errors at once.
 */
export const getAllErrorMessages = (error: any): string[] => {
  const data = error?.response?.data;
  
  if (!data?.errors || !Array.isArray(data.errors)) {
    return data?.message ? [data.message] : [];
  }

  return data.errors.map((err: { field?: string; message: string }) => 
    err.message || `${err.field}: Invalid value`
  );
};
