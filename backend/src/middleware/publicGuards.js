import rateLimit from "express-rate-limit";

export const publicSubmissionRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export function antiSpam(req, res, next) {
  if (req.body?.website || req.body?.url) {
    return res.status(400).json({ error: { code: "SPAM_REJECTED", message: "Submission rejected" } });
  }
  req.captcha = { required: false, placeholder: true, status: "prepared" };
  return next();
}
