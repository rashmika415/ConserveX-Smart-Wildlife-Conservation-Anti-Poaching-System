export function errorHandler(error, _req, res, _next) {
  let status = error.status || 500;
  let message = error.message;
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    status = 400;
    message =
      error.name === 'CastError'
        ? 'Invalid record ID or field value'
        : Object.values(error.errors)
            .map((item) => item.message)
            .join('; ');
  }
  if (error.code === 11000) {
    status = 409;
    message = 'This record conflicts with an existing record';
  }
  if (error.name === 'MulterError') {
    status = 400;
    message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'Photo must be smaller than 5 MB'
        : 'Upload one photograph only';
  }
  if (error instanceof SyntaxError && error.status === 400)
    message = 'Invalid JSON body';
  if (status >= 500) {
    console.error(error.name, error.message);
    message = 'The server could not complete the request. Please try again.';
  }
  res.status(status).json({ success: false, message, data: null });
}
