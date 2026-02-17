import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function askClaude(systemPrompt, userPrompt, { maxTokens = 4096 } = {}) {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content[0].text;

  // Try to parse as JSON, stripping markdown fences if present
  const stripped = text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
  try {
    return JSON.parse(stripped);
  } catch {
    // Return raw text if not JSON
    return text;
  }
}
