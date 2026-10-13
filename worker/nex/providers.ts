import { db, external, Fault, type Env, type Identity } from "./core.ts";
export const models = {
  groq: "openai/gpt-oss-20b",
  gemini: "gemini-2.5-flash-lite",
  workers: "@cf/google/gemma-4-26b-a4b-it",
  whisper: "whisper-large-v3-turbo",
};
export function enabled(env: Env) {
  return {
    groq: !!env.GROQ_API_KEY && env.NEX_GROQ_FREE_ONLY === "true",
    gemini: !!env.GEMINI_API_KEY && env.NEX_GEMINI_FREE_ONLY === "true",
    workers: !!env.AI && env.NEX_WORKERS_FREE_ONLY === "true",
  };
}
export async function reserve(
  env: Env,
  who: Identity,
  provider: string,
  units: number,
) {
  const ok = await db(env, who, "rpc/nex_reserve", {
    method: "POST",
    body: JSON.stringify({ p_provider: provider, p_units: units }),
  });
  if (ok !== true)
    throw new Fault(
      429,
      "Cota preventiva atingida. Aguarde; nenhum provedor pago será utilizado.",
    );
}
type Message = { role: "system" | "user" | "assistant"; content: string };
export async function complete(env: Env, who: Identity, messages: Message[]) {
  const providers = enabled(env);
  const units =
    new TextEncoder().encode(JSON.stringify(messages)).length + 1024;
  if (units > 7000)
    throw new Fault(413, "Contexto muito grande. Reduza a mensagem.");
  for (const provider of ["groq", "gemini", "workers"] as const) {
    if (!providers[provider]) continue;
    // Reserve first, including failed calls. Never refund an uncertain external call.
    await reserve(env, who, provider, units);
    let output: unknown;
    if (provider === "workers") {
      try {
        output = await env.AI!.run(models.workers, {
          messages,
          max_completion_tokens: 512,
          stream: false,
        });
      } catch {
        throw new Fault(503, "Contingência indisponível. Tente mais tarde.");
      }
    } else {
      const url =
        provider === "groq"
          ? "https://api.groq.com/openai/v1/chat/completions"
          : `https://generativelanguage.googleapis.com/v1beta/models/${models.gemini}:generateContent`;
      const payload =
        provider === "groq"
          ? {
              model: models.groq,
              messages,
              max_completion_tokens: 512,
              reasoning_effort: "low",
              stream: false,
            }
          : {
              systemInstruction: {
                parts: [
                  {
                    text: messages
                      .filter((m) => m.role === "system")
                      .map((m) => m.content)
                      .join("\n"),
                  },
                ],
              },
              contents: messages
                .filter((m) => m.role !== "system")
                .map((m) => ({
                  role: m.role === "assistant" ? "model" : "user",
                  parts: [{ text: m.content }],
                })),
              generationConfig: {
                maxOutputTokens: 512,
                thinkingConfig: { thinkingBudget: 0 },
              },
            };
      let r: Response;
      try {
        r = await external(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(provider === "groq"
              ? { Authorization: `Bearer ${env.GROQ_API_KEY}` }
              : { "x-goog-api-key": env.GEMINI_API_KEY! }),
          },
          body: JSON.stringify(payload),
        });
      } catch {
        continue;
      }
      // A quota/auth/billing failure stops the chain, rather than evading the limit.
      if ([401, 402, 403, 429].includes(r.status))
        throw new Fault(
          r.status === 429 ? 429 : 503,
          "Provedor bloqueou a chamada. Confira plano gratuito e cotas; fallback interrompido.",
        );
      if (!r.ok) {
        if (r.status >= 500) continue;
        throw new Fault(
          503,
          "Modelo indisponível ou pedido recusado. Revise a configuração.",
        );
      }
      try {
        output = await r.json();
      } catch {
        throw new Fault(503, "Resposta inválida do provedor.");
      }
    }
    const data = output as {
      choices?: { message?: { content?: unknown } }[];
      response?: unknown;
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const content =
      provider === "gemini"
        ? data.candidates?.[0]?.content?.parts
            ?.map((p) => p.text ?? "")
            .join("")
        : (data.choices?.[0]?.message?.content ?? data.response);
    if (typeof content !== "string" || !content.trim())
      throw new Fault(503, "Provedor não retornou uma resposta utilizável.");
    return { provider, model: models[provider], text: content.slice(0, 8000) };
  }
  throw new Fault(
    503,
    "Nenhum provedor gratuito disponível. Configure o plano gratuito e habilite o N.E.X no Worker.",
  );
}
