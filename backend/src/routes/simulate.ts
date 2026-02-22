import { Router, Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { ventures, ventureModels, simRuns } from "../db";
import { generateInsights } from "../gemini";
import { runSimulation } from "../simulation";
import type { SimRun } from "../types";

const router = Router();

// ─── POST /api/simulate ───────────────────────────────────────────────────────

router.post(
  "/",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { ventureId, ventureModelId, nRuns, seed } = req.body as {
        ventureId: string;
        ventureModelId: string;
        nRuns?: number;
        seed?: number;
      };

      if (!ventureId?.trim()) {
        res.status(400).json({ error: "ventureId is required" }); return;
      }
      if (!ventureModelId?.trim()) {
        res.status(400).json({ error: "ventureModelId is required" }); return;
      }

      const parsedNRuns = Math.min(Math.max(Number(nRuns) || 800, 100), 2000);
      const parsedSeed = (Number(seed) >>> 0) || 42;

      // ── Load venture + model ──────────────────────────────────────────────
      const venture = await ventures().findOne(
        { _id: ventureId } as unknown as { _id: string }
      );
      if (!venture) {
        res.status(404).json({ error: `Venture ${ventureId} not found` }); return;
      }

      const model = await ventureModels().findOne(
        { _id: ventureModelId } as unknown as { _id: string }
      );
      if (!model) {
        res.status(404).json({ error: `VentureModel ${ventureModelId} not found` }); return;
      }

      // ── Run Monte Carlo simulation ────────────────────────────────────────
      console.log(`[simulate] running ${parsedNRuns} runs, seed=${parsedSeed}...`);
      const simStart = Date.now();

      const simResult = runSimulation(
        model,
        venture.team,
        venture.deadlineDays,
        venture.runwayMonths,
        parsedSeed,
        parsedNRuns
      );

      console.log(`[simulate] done in ${Date.now() - simStart}ms — onTime=${(simResult.onTimeProbability * 100).toFixed(1)}%`);

      // ── Generate AI insights ──────────────────────────────────────────────
      console.log(`[simulate] calling Gemini for insights...`);
      const insights = await generateInsights({
        ventureModel: model,
        deadlineDays: venture.deadlineDays,
        runwayMonths: venture.runwayMonths,
        onTimeProbability: simResult.onTimeProbability,
        withinRunwayProbability: simResult.withinRunwayProbability,
        p50Days: simResult.p50Days,
        p90Days: simResult.p90Days,
        topFailureModes: simResult.topFailureModes,
        topBottlenecks: simResult.topBottlenecks,
        roleOverload: simResult.roleOverload,
      });

      // ── Save simRun ───────────────────────────────────────────────────────
      const simRunId = uuidv4();
      const simRunDoc: SimRun = {
        _id: simRunId,
        ventureId,
        ventureModelId,
        createdAt: new Date(),
        nRuns: parsedNRuns,
        deadlineDays: venture.deadlineDays,
        runwayMonths: venture.runwayMonths,
        seed: parsedSeed,
        onTimeProbability: simResult.onTimeProbability,
        withinRunwayProbability: simResult.withinRunwayProbability,
        p50Days: simResult.p50Days,
        p90Days: simResult.p90Days,
        meanDays: simResult.meanDays,
        finishDays: simResult.finishDays,
        topBottlenecks: simResult.topBottlenecks,
        topFailureModes: simResult.topFailureModes,
        roleOverload: simResult.roleOverload,
        insights,
      };

      await simRuns().insertOne(simRunDoc as SimRun & { _id: string });
      console.log(`[simulate] simRun saved: ${simRunId}`);

      res.status(201).json(simRunDoc);
    } catch (err) {
      next(err);
    }
  }
);

export default router;