export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const success = (
  res,
  data,
  message = 'Request successful',
  status = 200,
) => res.status(status).json({ success: true, message, data });
export const requireRecord = (record, label = 'Record') => {
  if (!record) throw new ApiError(404, `${label} not found`);
  return record;
};
