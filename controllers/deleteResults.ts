import { db } from "../sqlite.ts";
import { resolvePath } from "../utils/paths.ts";
import { v4 as uuidv4 } from "std/uuid/mod.ts";

interface WorkflowRecord {
  result_location?: string;
  location?: string;
}

const PIPELINE_DIR = resolvePath(Deno.env.get("PIPELINE_DIR") || "est-asr-pipeline");
const NEXTFLOW_PATH = Deno.env.get("NEXTFLOW_PATH") || "nextflow";
const UPLOAD_DIR = resolvePath(Deno.env.get("UPLOAD_DIR") || "uploads");
const APP_HOST = Deno.env.get("APP_HOST");
const APP_PORT = Deno.env.get("APP_PORT");

const deleteResults = async ({
  request,
  response,
  params,
}: {
  request: any;
  response: any;
  params: any;
}) => {
  const requestId = params.requestId;
  const workflow = db.prepare(`
        SELECT * FROM workflows
        WHERE request_id = ?
        `).get(requestId) as WorkflowRecord | undefined;

  if (workflow) {
    const resultLocation = workflow.result_location;
    const filePath = workflow.location;
    const resultsDir = resolvePath(resultLocation || "");
    const fileDir = resolvePath(filePath || "");

    try {
      await Deno.remove(resultsDir, { recursive: true });
      await Deno.remove(fileDir);
      db.prepare(`
            DELETE FROM workflows
            WHERE request_id = ?
            `).run(requestId);
      response.status = 200;
      response.body = {
        success: true,
        msg: "Results deleted successfully.",
      };
    } catch (error: unknown) {
      response.status = 500;
      response.body = {
        success: false,
        msg: "Error deleting results.",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  } else {
    response.status = 404;
    response.body = {
      success: false,
      msg: "Results not found.",
    };
  }
};
export { deleteResults };
