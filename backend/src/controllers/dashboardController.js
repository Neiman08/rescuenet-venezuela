import { DashboardService } from "../services/DashboardService.js";
import { asyncHandler } from "../utils/AppError.js";

export const dashboardController = {
  overview: asyncHandler(async (_req, res) => {
    res.json(await DashboardService.overview());
  }),
  stats: asyncHandler(async (_req, res) => {
    res.json(await DashboardService.stats());
  }),
};
