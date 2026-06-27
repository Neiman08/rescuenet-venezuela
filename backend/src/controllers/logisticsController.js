import { LogisticsService } from "../services/LogisticsService.js";
import { asyncHandler } from "../utils/AppError.js";

export const logisticsController = {
  overview: asyncHandler(async (_req, res) => {
    res.json(await LogisticsService.overview());
  }),
};
