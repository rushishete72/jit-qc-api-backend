// utils/asyncHandler.js (NEW FILE)
/**
 * Express async route handler wrapper. 
 * This utility function automatically catches errors from asynchronous functions 
 * and passes them to the Express error handling middleware (next).
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};


module.exports = asyncHandler;