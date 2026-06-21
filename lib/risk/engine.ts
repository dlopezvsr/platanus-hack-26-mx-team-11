import type { DomainEvent, RiskAction, RiskFlag, Rule, Severity } from "@/lib/types";

const severityRank: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const actionRank: Record<RiskAction, number> = { flag: 1, warn: 2, require_approval: 3, block: 4 };

const idSafe = (value: string) => value.replace(/[^a-z0-9]+/gi, "_").toLowerCase();

export function scoreForSeverity(severity: Severity) {
  if (severity === "critical") return 95;
  if (severity === "high") return 70;
  if (severity === "medium") return 35;
  return 10;
}

export function strictestAction(flags: RiskFlag[]): RiskAction | null {
  return flags.reduce<RiskAction | null>((winner, flag) => {
    if (!winner) return flag.action;
    return actionRank[flag.action] > actionRank[winner] ? flag.action : winner;
  }, null);
}

export function highestSeverity(flags: RiskFlag[]): Severity | null {
  return flags.reduce<Severity | null>((winner, flag) => {
    if (!winner) return flag.severity;
    return severityRank[flag.severity] > severityRank[winner] ? flag.severity : winner;
  }, null);
}

export function analyzeEvent(event: DomainEvent, rules: Rule[]): RiskFlag[] {
  const haystack = event.content.toLowerCase();
  return rules.flatMap((rule) => {
    const matched = rule.patterns.some((pattern) => haystack.includes(pattern.toLowerCase()));
    if (!matched) return [];
    return [{
      id: `${event.id}:${idSafe(rule.id)}`,
      category: rule.category,
      severity: rule.severity,
      action: rule.action,
      title: rule.name,
      explanation: rule.explanation,
      suggestedFix: rule.suggestedFix,
      confidence: 0.9,
      ruleId: rule.id,
      ruleVersion: rule.version,
    }];
  });
}

