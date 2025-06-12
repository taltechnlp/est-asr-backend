import { Application, Context } from "https://deno.land/x/oak@v10.1.0/mod.ts";
import router from "./routes.ts";
import { dotEnvConfig } from "./deps.ts";
import { db } from "./sqlite.ts";
import { resolvePath } from "./utils/paths.ts";

// Load .env.defaults first, then .env (which overrides defaults)
dotEnvConfig({ path: ".env.defaults", export: true });
dotEnvConfig({ path: ".env", export: true });

const HOST = Deno.env.get("APP_HOST");
const PORT = Deno.env.get("APP_PORT");

// Check on unfinished transcription workflows after restart
const PIPELINE_DIR = resolvePath(Deno.env.get("PIPELINE_DIR") || "est-asr-pipeline");
const NEXTFLOW_PATH = Deno.env.get("NEXTFLOW_PATH") || "nextflow";
    
const unfinished = db.prepare("SELECT status, request_id, run_id, location, result_location FROM workflows WHERE status='queued' OR status='started' GROUP BY request_id").all();

const resumeNextflow = async (
  sessionId: string,
  location: string,
  resultLocation: string,
) => {
  try {
    console.log("Using pipeline directory:", PIPELINE_DIR);
    const resumeName = `resume_${Date.now()}`;
    const command = new Deno.Command(NEXTFLOW_PATH, {
      args: [
      "run",
      "transcribe.nf",
      "-resume",
      sessionId,
      "-name",
      resumeName,
      "-with-weblog",
      `http://${HOST}:${PORT}/process/`,
      "--in",
      location,
      "--out_dir",
      resultLocation,
      ],
      stdin: "piped",
      stdout: "piped",
      cwd: PIPELINE_DIR
    });
    const child = command.spawn();
    const status = await child.status;
    console.log("Resumed workflow", sessionId, "with name", resumeName, "status", status);
  } catch (error) {
    if ((error as Error).message.includes("Failed to spawn") || (error as Error).message.includes("No such cwd")) {
      console.error("\n=== Nextflow Error ===");
      console.error("Nextflow could not be found or the pipeline directory is incorrect.");
      console.error("\nPlease ensure that:");
      console.error("1. Nextflow is installed and available in your PATH, or");
      console.error("2. Set the NEXTFLOW_PATH environment variable to the correct path");
      console.error("3. The pipeline directory exists at:", PIPELINE_DIR);
      console.error("\nInstallation instructions can be found in the est-asr-pipeline project README.");
      console.error("===================\n");
    }
    throw error;
  }
};

/* Commenting out resume functionality for now
if (unfinished.length > 0) {
  unfinished.forEach((workflow) => {
    if (!workflow.run_id) {
      console.log("Skipping workflow", workflow.request_id, "as it has no run_id");
      return;
    }
    console.log("Resuming", workflow.request_id, workflow.run_id);
    resumeNextflow(
      workflow.run_id,
      workflow.location,
      workflow.result_location,
    ).catch(error => {
      console.error("Failed to resume workflow:", error.message);
    });
  });
}
*/

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
