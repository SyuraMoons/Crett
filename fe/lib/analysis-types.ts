export interface SubScore {
  score: number
  reasoning: string
}

export interface RiskFlag {
  severity: "critical" | "high" | "medium" | "low"
  label: string
  detail: string
}

export interface WorkflowAnalysis {
  overall_score: number
  sub_scores: {
    cre_compliance: SubScore
    code_quality: SubScore
    runtime_safety: SubScore
  }
  risk_flags: RiskFlag[]
  one_line_verdict: string
  improvements: string[]
  deploy_ready: boolean
}
