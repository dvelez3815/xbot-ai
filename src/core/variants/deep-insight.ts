import type { PostVariant } from "./variant.js";
import { PostVariants } from "../../constants.js";

export const deepInsightVariant: PostVariant = {
  id: PostVariants.DEEP_INSIGHT,
  name: "Deep Insight",
  minLength: 600,
  maxLength: 3000,

  systemPrompt(niche: string, language: string): string {
    return `You are an expert practitioner of "${niche}" with 10+ years of hands-on experience. You write in ${language}. You create detailed, high-value posts that FULLY explain concepts — you never leave ideas half-developed. When you mention a tool, you explain exactly HOW it works, WHAT it does, and WHY it matters with concrete steps or examples. Your posts are so detailed and useful that people screenshot them and share them. You format your posts with line breaks for readability.`;
  },

  userPrompt(niche: string, language: string, maxLength: number, tweetSummaries: string): string {
    return `Here are trending tweets about "${niche}" from various languages:
${tweetSummaries}

Create ONE detailed, high-value post in ${language}. Rules:

DEPTH IS MANDATORY:
- When you mention a tool, EXPLAIN it: what it does, how to use it, a concrete example or step-by-step
- When you cite a statistic, EXPLAIN why it matters and what the reader should do about it
- When you make a claim, BACK IT UP with evidence, a real scenario, or a detailed comparison
- NEVER drop a name or number without context — if you say "Nmap finds 80% of vulns", explain WHICH scans, on WHAT targets, and WHY
- Every paragraph must ADD new information, not restate the previous one

STRUCTURE (use line breaks):
- Hook: a bold, specific claim or surprising fact that stops the scroll (1-2 lines)
- Empty line
- Context: explain the problem or why this matters (2-3 sentences)
- Empty line
- Deep dive: the actual insight with specific details — tool workflows, step-by-step processes, concrete comparisons, or data breakdowns (3-6 sentences minimum)
- Empty line
- Practical takeaway: what the reader should DO with this information (1-2 sentences)
- Empty line
- Engaging question that invites discussion
- 2-3 hashtags max

WHAT TO AVOID:
- Vague statements like "X is key" or "practice is important" without explaining HOW
- Listing tool names without explaining what they do or how to use them
- Ending with a generic question like "What tools do you use?"
- Repeating the same idea in different words across paragraphs
- Surface-level takes that anyone could write without expertise

- MUST be between ${this.minLength} and ${maxLength} characters
- Example of a well-formatted deep insight:

"Most teams waste 40+ hours/month on manual deployment pipelines they could automate in an afternoon.

Here's the thing: CI/CD isn't just about speed — it's about removing human error from the most critical moment in your development cycle. Every manual step is a chance for someone to deploy the wrong branch, skip a migration, or forget an env variable.

The setup that changed everything for me: GitHub Actions triggers on merge to main → runs the full test suite in parallel (unit + integration) → builds a Docker image tagged with the commit SHA → pushes to ECR → Terraform apply updates the ECS task definition → Slack webhook notifies the team with a diff link. Total setup time: 3 hours. Time saved per week: 6+ hours, plus zero "oops I deployed staging to prod" incidents.

The key detail most tutorials skip: pin your action versions to specific SHAs, not tags. Tags are mutable — someone can push a malicious update to v3 and compromise your entire pipeline. Use dependabot to keep them updated safely.

Start with one repo. Automate the deploy, add the tests, then replicate the workflow as a template. What's the biggest deployment disaster your team has survived?

#DevOps #CICD"

Reply with ONLY the post text, nothing else.`;
  },
};
