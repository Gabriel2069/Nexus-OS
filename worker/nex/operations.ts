import { dateKey, civilDate, shiftDate } from "../../src/lib/dates.ts";
import {
  operation,
  operationKinds,
  uuidPattern,
  type NexOperation,
} from "../../src/lib/nex-tools.ts";
import { body, db, Fault, json, type Env, type Identity } from "./core.ts";
import { createGoogle, importCalendar } from "./google.ts";
export async function preview(env: Env, who: Identity, raw: unknown) {
  const op = operation(raw);
  if (!op) throw new Fault(400, "Proposta inválida. Revise os campos.");
  let before: unknown = null;
  const table =
    op.kind === "project.edit"
      ? "projects"
      : op.kind.startsWith("mission.")
        ? "missions"
        : op.kind === "checkin.save"
          ? "daily_checkins"
          : op.kind === "review.save"
            ? "weekly_reviews"
            : null;
  if (table) {
    const filter =
      table === "daily_checkins"
        ? "checkin_date=eq." + dateKey()
        : table === "weekly_reviews"
          ? "week_start=eq." +
            dateKey(
              shiftDate(
                civilDate(dateKey()),
                -((civilDate(dateKey()).getUTCDay() + 6) % 7),
              ),
              "UTC",
            )
          : "id=eq." + op.payload.id;
    const rows = (await db(
      env,
      who,
      table + "?user_id=eq." + who.id + "&" + filter + "&select=*&limit=1",
    )) as Record<string, unknown>[];
    before = rows[0] ?? null;
    if ((table === "projects" || table === "missions") && !before)
      throw new Fault(404, "Registro não encontrado na sua conta.");
    if (rows[0]) op.payload.expected_updated_at = String(rows[0].updated_at);
    else delete op.payload.expected_updated_at;
  }
  if (op.payload.project_id) {
    const rows = (await db(
      env,
      who,
      "projects?user_id=eq." +
        who.id +
        "&id=eq." +
        op.payload.project_id +
        "&select=id&limit=1",
    )) as unknown[];
    if (!rows.length)
      throw new Fault(404, "Projeto não encontrado na sua conta.");
  }
  return {
    operation: op,
    before,
    label: operationKinds[op.kind],
    warning:
      op.kind === "mission.complete"
        ? "Conclui com as recompensas do motor existente. Não há desfazer automático."
        : op.kind === "finance.create"
          ? "Registra no app; não movimenta dinheiro."
          : op.kind.startsWith("google.")
            ? "Opera apenas no serviço autorizado. Resultado incerto bloqueia repetição automática."
            : "Revise os campos antes de confirmar.",
  };
}
export async function operations(
  request: Request,
  env: Env,
  who: Identity,
  path: string,
) {
  if (path.endsWith("/history") && request.method === "GET")
    return json(
      await db(env, who, "rpc/nex_operation_history", {
        method: "POST",
        body: "{}",
      }),
    );
  if (request.method !== "POST") throw new Fault(405, "Método inválido.");
  const input = (await body(request)) as {
    operation?: unknown;
    id?: unknown;
    confirmed?: unknown;
  };
  if (path.endsWith("/preview"))
    return json(await preview(env, who, input.operation));
  if (
    !path.endsWith("/execute") ||
    input.confirmed !== true ||
    typeof input.id !== "string" ||
    !uuidPattern.test(input.id)
  )
    throw new Fault(400, "Confirme uma operação válida.");
  const op = operation(input.operation);
  if (!op) throw new Fault(400, "Proposta inválida.");
  if (op.kind === "google.calendar.import")
    return json(await importCalendar(env, who, input.id));
  if (op.kind.startsWith("google."))
    return json(await createGoogle(env, who, input.id, op));
  return json(await apply(env, who, input.id, op));
}
export async function apply(
  env: Env,
  who: Identity,
  id: string,
  op: NexOperation,
) {
  return db(env, who, "rpc/nex_apply_operation", {
    method: "POST",
    body: JSON.stringify({ p_id: id, p_kind: op.kind, p_payload: op.payload }),
  });
}
