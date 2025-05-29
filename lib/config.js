const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Browser should use current path
    return window.location.origin;
  }
  // Server should use runtime config
  return process.env.NEXT_PUBLIC_VERCEL_URL || `http://localhost:${process.env.PORT || 3000}`;
};

module.exports = {
  getBaseUrl,
}; 