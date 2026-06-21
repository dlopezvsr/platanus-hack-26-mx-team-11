import type { AgentKey, Org, Role, Rule, User } from "@/lib/types";

const now = Date.now();

export const DEMO_ORG_ID = "org_demo";
export const DEMO_ADMIN_ID = "u_cto";

export const seededOrg: Org = {
  id: DEMO_ORG_ID,
  name: "Acme Inc.",
  createdAt: now,
};

export const seededRoles: Role[] = [
  {
    id: "role_finance",
    orgId: DEMO_ORG_ID,
    name: "Finance Vibe Coder",
    description: "Builds internal finance workflows and reports.",
    ruleIds: ["rule_pii_export", "rule_prod_db", "rule_external_api", "rule_policy_bypass"],
  },
  {
    id: "role_support",
    orgId: DEMO_ORG_ID,
    name: "Support Vibe Coder",
    description: "Builds support tools and customer operations workflows.",
    ruleIds: ["rule_pii_export", "rule_external_api", "rule_policy_bypass"],
  },
];

export const seededUsers: User[] = [
  {
    id: DEMO_ADMIN_ID,
    orgId: DEMO_ORG_ID,
    email: "cto@acme.test",
    name: "Acme CTO",
    kind: "cto_admin",
  },
  {
    id: "u_finance",
    orgId: DEMO_ORG_ID,
    roleId: "role_finance",
    email: "finance.employee@acme.test",
    name: "Finance Employee",
    kind: "vibe_coder",
  },
  {
    id: "u_support",
    orgId: DEMO_ORG_ID,
    roleId: "role_support",
    email: "support.employee@acme.test",
    name: "Support Employee",
    kind: "vibe_coder",
  },
];

export const seededAgentKeys: AgentKey[] = [
  {
    id: "key_finance",
    orgId: DEMO_ORG_ID,
    userId: "u_finance",
    token: "cs_demo_finance",
    label: "Finance Employee Claude Code",
    status: "active",
  },
  {
    id: "key_support",
    orgId: DEMO_ORG_ID,
    userId: "u_support",
    token: "cs_demo_support",
    label: "Support Employee Claude Code",
    status: "active",
  },
];

export const seededRules: Rule[] = [
  {
    id: "rule_pii_export",
    orgId: DEMO_ORG_ID,
    scope: "global",
    name: "No customer personal data export",
    category: "personal_data",
    severity: "critical",
    action: "require_approval",
    patterns: ["export all customers", "customer csv", "email customer data", "dump users", "customer data"],
    explanation: "The request appears to export customer or employee personal data.",
    suggestedFix: "Use an approved report, anonymized test data, or an admin-approved export workflow.",
    version: 1,
    enabled: true,
  },
  {
    id: "rule_prod_db",
    orgId: DEMO_ORG_ID,
    scope: "role",
    targetId: "role_finance",
    name: "No production database writes",
    category: "unsafe_code",
    severity: "critical",
    action: "block",
    patterns: ["prod database", "production db", "delete table", "drop table", "truncate"],
    explanation: "The request touches production database writes or destructive operations.",
    suggestedFix: "Use a staging database, read-only access, or a reviewed migration plan.",
    version: 1,
    enabled: true,
  },
  {
    id: "rule_external_api",
    orgId: DEMO_ORG_ID,
    scope: "global",
    name: "Warn on unapproved external APIs",
    category: "company_policy",
    severity: "medium",
    action: "warn",
    patterns: ["send to slack", "post to webhook", "call external api", "upload to s3", "webhook"],
    explanation: "The request sends company data to an external service.",
    suggestedFix: "Use an approved integration or ask an admin to approve the destination.",
    version: 1,
    enabled: true,
  },
  {
    id: "rule_policy_bypass",
    orgId: DEMO_ORG_ID,
    scope: "global",
    name: "Flag policy bypass / unsafe instructions",
    category: "company_policy",
    severity: "high",
    action: "flag",
    patterns: ["ignore previous instructions", "bypass policy", "disable auth"],
    explanation: "The request attempts to bypass policy or remove a safety control.",
    suggestedFix: "Keep policy and auth controls enabled, then request an approved exception if needed.",
    version: 1,
    enabled: true,
  },
];

