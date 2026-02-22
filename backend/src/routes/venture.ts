import { Router, Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { ventures, ventureModels } from "../db";
import { generateVentureModel } from "../gemini";
import type { Venture, VentureModel, TeamMember } from "../types";

const router = Router();

// ─── POST /api/venture ────────────────────────────────────────────────────────

router.post(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const {
        ideaText, market, revenueModel,
        deadlineDays, runwayMonths, team,
      } = req.body as {
        ideaText: string;
        market: string;
        revenueModel: string;
        deadlineDays: number;
        runwayMonths: number;
        team: TeamMember[];
      };

      if (!ideaText?.trim()) { res.status(400).json({ error: "ideaText is required" }); return; }
      if (!market?.trim())   { res.status(400).json({ error: "market is required" }); return; }
      if (!revenueModel?.trim()) { res.status(400).json({ error: "revenueModel is required" }); return; }
      if (!Array.isArray(team) || team.length === 0) {
        res.status(400).json({ error: "team must be a non-empty array" }); return;
      }

      const parsedDeadline = Math.max(7,  Number(deadlineDays) || 90);
      const parsedRunway   = Math.max(1,  Number(runwayMonths) || 6);
      const ventureId      = uuidv4();

      // Save venture
      const ventureDoc: Venture = {
        _id: ventureId,
        createdAt: new Date(),
        ideaText:     ideaText.trim(),
        market:       market.trim(),
        revenueModel: revenueModel.trim(),
        deadlineDays: parsedDeadline,
        runwayMonths: parsedRunway,
        team,
      };
      await ventures().insertOne(ventureDoc as Venture & { _id: string });
      console.log(`[venture] saved ${ventureId}`);

      // Generate venture model via Gemini
      console.log(`[venture] calling Gemini...`);
      const raw = await generateVentureModel({
        ideaText:     ventureDoc.ideaText,
        market:       ventureDoc.market,
        revenueModel: ventureDoc.revenueModel,
        deadlineDays: parsedDeadline,
        runwayMonths: parsedRunway,
        team,
      });

      const ventureModelId  = uuidv4();
      const ventureModelDoc: VentureModel = {
        _id:         ventureModelId,
        ventureId,
        createdAt:   new Date(),
        summary:     raw.summary,
        assumptions: raw.assumptions,
        globalRisks: raw.globalRisks,
        modules:     raw.modules,
      };
      await ventureModels().insertOne(ventureModelDoc as VentureModel & { _id: string });
      console.log(`[venture] ventureModel saved ${ventureModelId} — ${raw.modules.length} modules`);

      res.status(201).json({ ventureId, ventureModelId, ventureModel: ventureModelDoc });
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /api/venture/model/:ventureModelId ───────────────────────────────────

router.get(
  "/model/:ventureModelId",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ventureModelId } = req.params;
      const doc = await ventureModels().findOne(
        { _id: ventureModelId } as unknown as { _id: string }
      );
      if (!doc) {
        res.status(404).json({ error: `VentureModel ${ventureModelId} not found` });
        return;
      }
      res.json(doc);
    } catch (err) {
      next(err);
    }
  }
);

export default router;