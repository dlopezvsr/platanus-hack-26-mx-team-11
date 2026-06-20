# CodeSentinel Product Flows

This document maps the main user flows for CodeSentinel. It is written for team feedback, so some details are intentionally marked as assumptions.

## Actors

- **Vibe coder**: employee using an AI coding agent to build an internal tool.
- **CTO / admin**: company owner or technical leader configuring CodeSentinel.
- **AI coding agent**: Claude Code, Cursor, Copilot, or another coding assistant.
- **CodeSentinel**: product layer that observes sessions, applies rules, and shows risk in the dashboard.

## Flow 1: Vibe Coder Starts Vibecoding

Goal: a vibe coder lands on the product, logs in, connects a product link or project context, and starts coding with their agent.

```text
+--------------------------------------------------------------+
|                       LANDING PAGE                           |
|                                                              |
|  CodeSentinel                                                |
|  AI coding security for teams using vibe coding tools.       |
|                                                              |
|  [ Start vibecoding ]        [ CTO / Admin setup ]           |
+------------------------------+-------------------------------+
                               |
                               v
+--------------------------------------------------------------+
|                    VIBE CODER PROMPT STEP                    |
|                                                              |
|  Paste product link or project context                       |
|  +--------------------------------------------------------+  |
|  | https://company.notion.site/refund-tool-spec           |  |
|  +--------------------------------------------------------+  |
|                                                              |
|  What do you want your agent to build?                       |
|  +--------------------------------------------------------+  |
|  | Build an internal refund dashboard for support.        |  |
|  +--------------------------------------------------------+  |
|                                                              |
|                              [ Continue ]                    |
+------------------------------+-------------------------------+
                               |
                               v
+--------------------------------------------------------------+
|                         LOGIN PAGE                           |
|                                                              |
|  Sign in with company account                                |
|                                                              |
|  [ Continue with Google / SSO ]                              |
|                                                              |
|  CodeSentinel will apply your company's AI coding rules.     |
+------------------------------+-------------------------------+
                               |
                               v
+--------------------------------------------------------------+
|                       VIBECODE SESSION                       |
|                                                              |
|  Vibe coder -> AI agent                                      |
|                                                              |
|  "Build an internal refund dashboard using this product doc" |
|                                                              |
|  CodeSentinel watches:                                      |
|  - user prompt                                               |
|  - agent response                                            |
|  - code changes                                              |
|  - tool calls                                                |
+--------------------------------------------------------------+
```

Description:

The vibe coder starts from the landing page, provides a product link or project context, signs in, and begins a coding session. CodeSentinel sits around the agent session and uses the company's configured rules to evaluate prompts, generated code, and tool usage.

Open question:

- Does the product link get pasted into CodeSentinel first, or directly into the AI coding agent?

## Flow 2: CTO Creates Account

Goal: the CTO creates the company account and becomes the first admin.

```text
+--------------------------------------------------------------+
|                       LANDING PAGE                           |
|                                                              |
|  CodeSentinel                                                |
|                                                              |
|  [ Create company account ]                                  |
+------------------------------+-------------------------------+
                               |
                               v
+--------------------------------------------------------------+
|                       SIGNUP PAGE                            |
|                                                              |
|  Work email                                                  |
|  +--------------------------------------------------------+  |
|  | cto@company.com                                       |  |
|  +--------------------------------------------------------+  |
|                                                              |
|  Company name                                                |
|  +--------------------------------------------------------+  |
|  | Acme Inc.                                             |  |
|  +--------------------------------------------------------+  |
|                                                              |
|  [ Create account ]                                          |
+------------------------------+-------------------------------+
                               |
                               v
+--------------------------------------------------------------+
|                    CTO ADMIN DASHBOARD                       |
|                                                              |
|  Welcome, CTO                                                |
|                                                              |
|  Setup checklist                                             |
|  [ ] Add company rules                                       |
|  [ ] Invite vibe coders                                      |
|  [ ] Create roles                                            |
|  [ ] Connect AI coding tools                                 |
+--------------------------------------------------------------+
```

Description:

The CTO signs up, creates the organization, and lands in the admin dashboard. From there, the CTO configures global rules, roles, users, and integrations.

## Flow 3: CTO Adds Rules

Goal: the CTO defines rules that decide what is risky during vibe coding.

```text
+--------------------------------------------------------------+
|                         RULES PAGE                           |
|                                                              |
|  Scope                                                       |
|  (x) Global rules                                            |
|  ( ) Role-specific rules                                     |
|  ( ) User-specific rules                                     |
|                                                              |
|  Risk level                                                  |
|  [ Low ]  [ Medium ]  [ High ]  [ Critical ]                 |
|                                                              |
|  Rule type                                                   |
|  [ PII ] [ Secrets ] [ Production DB ] [ External API ]      |
|  [ Insecure code ] [ Prompt injection ] [ Custom ]           |
|                                                              |
|  Action                                                      |
|  (x) Flag only                                               |
|  ( ) Warn user                                               |
|  ( ) Require approval                                        |
|  ( ) Block                                                   |
|                                                              |
|  [ Save rule ]                                               |
+------------------------------+-------------------------------+
                               |
                               v
+--------------------------------------------------------------+
|                      CUSTOM RULE BUILDER                     |
|                                                              |
|  Rule name                                                   |
|  +--------------------------------------------------------+  |
|  | Do not export customer data                            |  |
|  +--------------------------------------------------------+  |
|                                                              |
|  Plain English policy                                       |
|  +--------------------------------------------------------+  |
|  | Vibe coders cannot export customer PII unless an       |  |
|  | approved admin request exists.                         |  |
|  +--------------------------------------------------------+  |
|                                                              |
|  Severity: [ Critical ]    Action: [ Require approval ]      |
|                                                              |
|  [ Save custom rule ]                                       |
+--------------------------------------------------------------+
```

Description:

The CTO can create global rules for the whole company, choose risk levels, and customize behavior. The rules become part of the policy context that CodeSentinel applies when analyzing a vibe coding session.

## Flow 4: CTO Adds Users

Goal: the CTO invites employees and assigns roles.

```text
+--------------------------------------------------------------+
|                         TEAM PAGE                            |
|                                                              |
|  Invite team member                                          |
|                                                              |
|  Email                                                       |
|  +--------------------------------------------------------+  |
|  | employee@company.com                                  |  |
|  +--------------------------------------------------------+  |
|                                                              |
|  Role                                                        |
|  +----------------------+                                   |
|  | Support Vibe Coder v |                                   |
|  +----------------------+                                   |
|                                                              |
|  Permissions preview                                         |
|  - Can start vibe coding sessions                            |
|  - Can use approved integrations                             |
|  - Cannot access production data                             |
|                                                              |
|  [ Send invite ]                                             |
+------------------------------+-------------------------------+
                               |
                               v
+--------------------------------------------------------------+
|                        INVITE SENT                           |
|                                                              |
|  employee@company.com has been invited as:                   |
|                                                              |
|  Support Vibe Coder                                          |
|                                                              |
|  Status: pending                                             |
+--------------------------------------------------------------+
```

Description:

The CTO adds a vibe coder by email and assigns a role. That role decides which rules are applied to the employee's sessions.

## Flow 5: CTO Creates Role And Adds Rules

Goal: the CTO creates a reusable role and attaches rules to that role.

```text
+--------------------------------------------------------------+
|                         ROLES PAGE                           |
|                                                              |
|  Roles                                                       |
|  +----------------------+  +----------------------+          |
|  | Support Vibe Coder   |  | Finance Vibe Coder   |          |
|  | 6 rules              |  | 9 rules              |          |
|  +----------------------+  +----------------------+          |
|                                                              |
|  [ Create role ]                                             |
+------------------------------+-------------------------------+
                               |
                               v
+--------------------------------------------------------------+
|                       CREATE ROLE                            |
|                                                              |
|  Role name                                                   |
|  +--------------------------------------------------------+  |
|  | Marketing Vibe Coder                                  |  |
|  +--------------------------------------------------------+  |
|                                                              |
|  Role description                                            |
|  +--------------------------------------------------------+  |
|  | Can build internal marketing dashboards and scripts.   |  |
|  +--------------------------------------------------------+  |
|                                                              |
|  Attach rules                                                |
|  [x] No customer PII exports                                 |
|  [x] No production database writes                           |
|  [x] Flag unapproved external APIs                           |
|  [ ] Require approval for public website changes             |
|                                                              |
|  [ Save role ]                                               |
+------------------------------+-------------------------------+
                               |
                               v
+--------------------------------------------------------------+
|                     ROLE RULE SUMMARY                        |
|                                                              |
|  Marketing Vibe Coder                                        |
|                                                              |
|  Applied to: 12 users                                        |
|  Rules: 3 active                                             |
|                                                              |
|  New sessions from these users will include these rules      |
|  inside the CodeSentinel policy context.                     |
+--------------------------------------------------------------+
```

Description:

The CTO creates roles that bundle rules and permissions. When a user with that role starts vibecoding, CodeSentinel uses those role rules to evaluate the session.

## Assumptions To Confirm

- The CTO is the first admin for the company account.
- Rules can be global, role-specific, and user-specific.
- Rules can either flag, warn, require approval, or block.
- The vibe coder login happens before the AI coding session is tracked.
- The product link can be used as session context for the AI agent and CodeSentinel.
- The dashboard should show both live sessions and historical session replay.
