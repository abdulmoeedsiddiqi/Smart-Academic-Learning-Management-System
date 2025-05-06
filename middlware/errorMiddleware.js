const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  // Sometimes you might get an error with a status code of 200, default to 500
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message;

  // Handle specific error types if needed (e.g., Mongoose bad ObjectId)
  // if (err.name === 'CastError' && err.kind === 'ObjectId') {
  //   statusCode = 404;
  //   message = 'Resource not found';
  // }

  res.status(statusCode);

  // Check if the request accepts HTML (browser request) or JSON (API request)
  if (req.accepts('html')) {
    res.render('error', {
      title: `Error ${statusCode}`,
      message: message,
      statusCode: statusCode, // Pass the statusCode here
      // Only pass the stack trace in development mode
      error: process.env.NODE_ENV === 'development' ? err : {},
      layout: 'layouts/main' // Ensure layout is specified if needed, or remove if using default
    });
  } else {
    // Respond with JSON for API requests
    res.json({
      message: message,
      // Only include stack trace in development mode for API responses
      stack: process.env.NODE_ENV === 'development' ? err.stack : null,
    });
  }
};

module.exports = { notFound, errorHandler };