import { lookupMemberByToken } from "@/lib/auth/tokens";
import { buildSettings, buildGuardScript } from "@/lib/policy/generate";
import { POLICIES } from "@/lib/policy/catalog";
import { resolvePolicies } from "@/lib/policy/generate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Per-member one-line installer:  curl -fsSL <app>/api/install/<token> | sh
 * Returns a POSIX shell script that merges Sentinel's hooks + the member's role
 * policies into ~/.claude/settings.json. Token is embedded so there's no env step.
 */
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const member = await lookupMemberByToken(token);
  if (!member) {
    return new Response("# Sentinel: invalid or revoked token\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const origin = new URL(req.url).origin;
  const settings = buildSettings({
    endpoint: origin,
    policies: resolvePolicies(POLICIES, member.policyIds),
    auth: { kind: "token", token },
  });

  const payload = Buffer.from(JSON.stringify(settings), "utf8").toString("base64");
  const guard = Buffer.from(buildGuardScript(origin, { kind: "token", token }), "utf8").toString("base64");

  return new Response(installScript(payload, guard, member.memberName), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

/** A small, auditable installer. Merges (never blindly overwrites) settings.json
 *  and drops the live policy guard script. */
function installScript(payloadB64: string, guardB64: string, name: string): string {
  const merge = [
    'const fs=require("fs"),f=process.argv[1];',
    'const inc=JSON.parse(Buffer.from(process.argv[2],"base64").toString("utf8"));',
    'let cur={};try{cur=JSON.parse(fs.readFileSync(f,"utf8"))}catch(e){}',
    "cur.hooks={...(cur.hooks||{}),...inc.hooks};",
    "const p=inc.permissions||{},cp=cur.permissions||{};",
    "cur.permissions={...cp,...p};",
    'fs.writeFileSync(f,JSON.stringify(cur,null,2));',
  ].join("");

  return `#!/bin/sh
# Sentinel installer for ${name}. Inspect freely — it edits ~/.claude/settings.json
# and installs the live policy guard at ~/.claude/codesentinel-guard.sh.
set -e
DIR="$HOME/.claude"; F="$DIR/settings.json"; G="$DIR/codesentinel-guard.sh"
mkdir -p "$DIR"
[ -f "$F" ] && cp "$F" "$F.sentinel-bak" && echo "Backed up existing settings to $F.sentinel-bak"
command -v node >/dev/null 2>&1 || { echo "Sentinel needs Node.js (it ships with Claude Code)."; exit 1; }
node -e '${merge}' "$F" "${payloadB64}"
printf '%s' "${guardB64}" | (base64 --decode 2>/dev/null || base64 -d) > "$G"
chmod +x "$G"
echo "✓ Sentinel is watching this machine. Policies refresh live on every tool call."
`;
}
