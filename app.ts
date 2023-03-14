import { Application, Context } from "https://deno.land/x/oak@v10.1.0/mod.ts";
import router from "./routes.ts";
import { dotEnvConfig } from "./deps.ts";
import { dbPool } from "./database.ts";
import { v4 } from "https://deno.land/std@0.97.0/uuid/mod.ts";

dotEnvConfig({ export: true, safe: true });

const HOST = Deno.env.get("APP_HOST");
const PORT = Deno.env.get("APP_PORT");

// Check on unfinished transcription workflows after restart
const PIPELINE_DIR = Deno.env.get("PIPELINE_DIR");
const NEXTFLOW_PATH =
  (Deno.env.get("NEXTFLOW_PATH")
    ? Deno.env.get("NEXTFLOW_PATH")
    : "nextflow") as string;
const dbClient = await dbPool.connect();
const unfinished = await dbClient.queryObject<{
  status: string;
  request_id: string;
  run_id: string;
  location: string;
  result_location: string;
}>(`SELECT status, request_id, run_id, location, result_location
    FROM public.workflows WHERE status='queued' OR status='started' GROUP BY request_id`);
const resumeNextflow = async (
  sessionId: string,
  location: string,
  resultLocation: string,
) => {
  const command = [
    NEXTFLOW_PATH,
    "run",
    "transcribe.nf",
    "-resume",
    sessionId,
    "-with-weblog",
    `http://${HOST}:${PORT}/process/`,
    "--in",
    location,
    "--out_dir",
    resultLocation,
  ];
  console.log(command, PIPELINE_DIR);
  const logFile = await Deno.open("deno.log", {
    read: true,
    write: true,
    create: true,
  });
  const cmd = Deno.run({
    cmd: command,
    cwd: PIPELINE_DIR,
    stdout: logFile.rid,
    stderr: logFile.rid,
  });
  await cmd.status();
  cmd.close();
};

if (unfinished.rows.length > 0) {
  unfinished.rows.forEach((workflow) => {
    // TODO if no run_id, fail or start
    console.log("Resuming", workflow.request_id, workflow.run_id);
    resumeNextflow(
      workflow.run_id,
      workflow.location,
      workflow.result_location,
    );
  });
}
await dbClient.release();

const app: Application = new Application();

// Logger
// deno-lint-ignore no-explicit-any
app.use(async (ctx: Context, next: any) => {
  const rt = ctx.request.headers.get("user-agent");
  console.log(`${ctx.request.method} ${ctx.request.url} - ${rt}`);
  await next();
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log(`Listening on ${HOST}:${PORT} ...`);
await app.listen(`${HOST}:${PORT}`);
