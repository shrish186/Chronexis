import { Router, Request, Response, NextFunction } from "express";
import { simRuns } from "../db";

const router = Router();

// ─── GET /api/results/:simRunId ───────────────────────────────────────────────

router.get(
  "/:simRunId",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { simRunId } = req.params;

      if (!simRunId?.trim()) {
        res.status(400).json({ error: "simRunId is required" }); return;
      }

      const doc = await simRuns().findOne(
        { _id: simRunId } as unknown as { _id: string }
      );

      if (!doc) {
        res.status(404).json({ error: `SimRun ${simRunId} not found` }); return;
      }

      res.json(doc);
    } catch (err) {
      next(err);
    }
  }
);

export default router;