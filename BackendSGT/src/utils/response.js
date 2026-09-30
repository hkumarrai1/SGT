export function success(res, message, data = {}) {
  return res.status(200).json({ success: true, message, ...data });
}

export function created(res, message, data = {}) {
  return res.status(201).json({ success: true, message, ...data });
}
