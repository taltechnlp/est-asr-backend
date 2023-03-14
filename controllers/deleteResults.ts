import { v4 } from "https://deno.land/std@0.97.0/uuid/mod.ts";
import { dbPool, RESULTS_DIR } from "../database.ts";
const PIPELINE_DIR = Deno.env.get("PIPELINE_DIR");
const NEXTFLOW_PATH =
  (Deno.env.get("NEXTFLOW_PATH")
    ? Deno.env.get("NEXTFLOW_PATH")
    : "nextflow") as string;
const UPLOAD_DIR = Deno.env.get("UPLOAD_DIR");
const APP_HOST = Deno.env.get("APP_HOST");
const APP_PORT = Deno.env.get("APP_PORT");

const deleteResults = async ({
  response,
  params,
}: {
  response: any;
  params: any;
}) => {
  if (params && params.requestId) {
    const dbClient = await dbPool.connect();
    const result = await dbClient.queryObject<{
      result_location: string;
    }>(
      `SELECT result_location FROM public.workflows WHERE request_id = '${params.requestId}'`,
    );
    await dbClient.release();
    if (result.rowCount && result.rowCount > 0) {
      const workflow = result.rows[0];
      const command = [
        "rm",
        workflow.result_location,
        "-dr",
      ];
      console.log(command, PIPELINE_DIR);
      const logFile = await Deno.open("deno_delete.log", {
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
      const deleteResult = await cmd.status();
      console.log("Tried to delete results", deleteResult, params.requestId)
      cmd.close();
      response.body = {
        success: deleteResult.success,
        requestId: params.requestId,
      };
    } else {
      response.status = 404;
      response.body = {
        requestId: params.requestId,
      };
    }
  } else {
    response.status = 400;
      response.body = {
        requestId: params.requestId,
      };
  }
};
export { deleteResults };
