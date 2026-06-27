import { MapService } from "../services/MapService.js";
import { asyncHandler } from "../utils/AppError.js";

export const mapController = {
  live: asyncHandler(async (_req, res) => {
    res.json(await MapService.liveMap());
  }),
};
