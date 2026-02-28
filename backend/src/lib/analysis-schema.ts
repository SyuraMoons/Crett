import { z } from "zod"

const SubScoreSchema = z.object({
  score: z.number().min(0).max(100),
  reasoning: z.string(),
})

const RiskFlagSchema = z.object({
  severity: z.enum(["critical", "high", "medium", "low"]),
  label: z.string(),
  detail: z.string(),
})

export const WorkflowAnalysisSchema = z.object({
  overall_score: z.number().min(0).max(100),
  sub_scores: z.object({
    cre_compliance: SubScoreSchema,
    code_quality: SubScoreSchema,
    runtime_safety: SubScoreSchema,
  }),
  risk_flags: z.array(RiskFlagSchema),
  one_line_verdict: z.string(),
  improvements: z.array(z.string()).max(4),
  deploy_ready: z.boolean(),
})

export type WorkflowAnalysis = z.infer<typeof WorkflowAnalysisSchema>
