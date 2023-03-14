import { IWeblog } from "../types.ts";
import { dbPool } from "../database.ts";
const PIPELINE_DIR = Deno.env.get("PIPELINE_DIR");
const NEXTFLOW_PATH =
  (Deno.env.get("NEXTFLOW_PATH")
    ? Deno.env.get("NEXTFLOW_PATH")
    : "nextflow") as string;
const TOTAL_TASKS = 13;
const errorCodes = {
    0: "processingFailed",
    1: "notFound",
    2: "invalidRequest"
}
type TASK_STATUS = "started"|"process_submitted"|"process_started"|"process_completed"|"error"|"completed"|"queued"
// let a = 0
// Add a Nextflow weblog
const addWeblog = async ({
  request,
  response,
}: {
  // deno-lint-ignore no-explicit-any
  request: any;
  // deno-lint-ignore no-explicit-any
  response: any;
}) => {
  if (!request.hasBody) {
    response.status = 400;
    console.log("Nextflow sent an empty POST message.");
    response.body = {
      success: false,
      msg: "No data",
    };
  } else {
    try {
      const body = await request.body();
      const workflow: IWeblog = await body.value;
      console.log(workflow.runId, workflow.event, workflow.utcTime)
      /* Deno.writeTextFile(`./log_1${a}.json`, JSON.stringify(workflow));
      a++; */
      const dbClient = await dbPool.connect();
      if (workflow.metadata) {
        const updatedAtUtc = new Date(workflow.utcTime);
        // Check whether a run_id already exists (is not the first weblog message to arrive.)
        const matchingWorkflow = await dbClient.queryObject<{
          name: string;
          count: number;
        }>(`SELECT name
            FROM public.workflows WHERE run_id = '${workflow.runId}'`);
        let res;
        // Workflow has a runId
        if (matchingWorkflow.rowCount && matchingWorkflow.rowCount > 0) {
          // Delete temp files from work directory
        const command = [
          NEXTFLOW_PATH,
          "clean",
          workflow.runId,
          "-k",
          "-f"
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
        console.log(await cmd.status());
        cmd.close();
          // Save event
          res = await dbClient.queryArray`UPDATE public.workflows SET 
                        "status" = ${workflow.event},
                        "updated_at_utc" = ${updatedAtUtc},
                        "succeeded_count" = ${workflow.metadata?.workflow.stats.succeededCount},
                        "running_count" = ${workflow.metadata?.workflow.stats.runningCount},
                        "pending_count" = ${workflow.metadata?.workflow.stats.pendingCount},
                        "failed_count" = ${workflow.metadata?.workflow.stats.failedCount},
                        "progress_length" = ${workflow.metadata?.workflow.stats.progressLength}
                        WHERE "run_id" = ${workflow.runId}`;
        } else {
          res = await dbClient.queryArray`UPDATE public.workflows SET 
          "run_id" = ${workflow.runId},
          "status" = ${workflow.event},
          "updated_at_utc" = ${updatedAtUtc},
          "succeeded_count" = ${workflow.metadata?.workflow.stats.succeededCount},
          "running_count" = ${workflow.metadata?.workflow.stats.runningCount},
          "pending_count" = ${workflow.metadata?.workflow.stats.pendingCount},
          "failed_count" = ${workflow.metadata?.workflow.stats.failedCount},
          "progress_length" = ${workflow.metadata?.workflow.stats.progressLength}
          WHERE "name" = ${workflow.runName}`;
        }
        res.handleCommandComplete = (e => console.log(e))
      } else if (workflow.trace) {
        // Check whether a run_id already exists (is not the first weblog message to arrive.)
        const matchingWorkflow = await dbClient.queryObject<{
          name: string;
          count: number;
        }>(`SELECT name
            FROM public.workflows WHERE run_id = '${workflow.runId}'`);
        const updatedAtUtc = new Date(workflow.utcTime);
        let res;
        if (matchingWorkflow.rowCount && matchingWorkflow.rowCount > 0) {
          res = await dbClient.queryArray`UPDATE public.workflows SET 
            task_name = ${workflow.trace.name},
            "running_task_id" = ${workflow.trace.task_id}, 
            "task_status" = ${workflow.event}, 
            "updated_at_utc" = ${updatedAtUtc}
            WHERE "run_id" = ${workflow.runId}`;
        } else {
          res = await dbClient.queryArray`UPDATE public.workflows SET 
          "run_id" = ${workflow.runId},
          task_name = ${workflow.trace.name},
          "running_task_id" = ${workflow.trace.task_id}, 
          "task_status" = ${workflow.event}, 
          "updated_at_utc" = ${updatedAtUtc}
          WHERE "name" = ${workflow.runName}`;
        }
        res.handleCommandComplete = (e => console.log(e))
      }

      await dbClient.release();
      response.status = 201;
      response.body = {
        success: true,
        data: workflow.runId,
      };
    } catch (err) {
      response.status = 500;
      response.body = {
        success: false,
        msg: err.toString(),
      };
    }
  }
};

// This function is for testing only as the results are returned as HTML
// deno-lint-ignore no-explicit-any
const getWorkflowProgressHtml = async ({
  response,
  params,
}: {
  response: any;
  params: any;
}) => {
  if (params && params.requestId) {
    const dbClient = await dbPool.connect();
    const result = await dbClient.queryObject(
      `SELECT running_task_id, status, task_status, task_name, failed_count FROM public.workflows WHERE request_id = '${params.requestId}'`,
    );
    const totalStatuses = await dbClient.queryObject<{
      status: string;
      count: number;
    }>(`SELECT status, COUNT (status)
        FROM public.workflows WHERE status='queued' OR status='started' GROUP BY status`);
    await dbClient.release();
    const totalQueued = totalStatuses.rows.find(
      (element) => element.status === "queued",
    );
    const count = totalQueued ? totalQueued.count : 0;
    let totalStarted: any = totalStatuses.rows.find(
      (element) => element.status === "started",
    );
    totalStarted = totalStarted ? totalStarted.count : 0;
    // deno-lint-ignore no-explicit-any
    const workflow: any = result.rows[0];
    if (workflow) {
      const taskId: number = workflow.running_task_id
        ? workflow.running_task_id
        : 0;
      const taskName = workflow.task_name ? workflow.task_name : "";
      const progressPerc = ((taskId / TOTAL_TASKS) * 100).toFixed(1);
      const status = workflow.status;
      const taskStatus = workflow.task_status ? workflow.task_status : "";
      response.headers.set("Content-Type", "text/html; charset=utf-8");
      if (workflow.failed_count && workflow.failed_count > 0) {
        response.body = `
                <h2>Transcription failed!</h2>
                `;
      } else if (status === "completed") {
        response.body = `
                <h2>Transcription completed!</h2>
                <a href="/result/${params.requestId}">Download results</a>
                `;
      } else {
        response.body = `
                <h2>Transcription progress: ${progressPerc}%</h2>
                <p>Status: ${status}</p>    
                <p>Task number: ${taskId} / 14</p>
                <p>Task name: ${taskName}</p>
                <p>Task status: ${taskStatus}</p>
                </br>
                <h3>Queue status</h3>
                <p>Total in progress: ${totalStarted}</p>
                <p>Total queued: ${count}</p>
                <script>
                setTimeout(function(){
                    window.location.reload(1);
                }, 5000);
                </script>
                `;
      }
    } else {
      response.headers.set("Content-Type", "text/html; charset=utf-8");
      response.body = `
                <h2>404</h2>
                <p>Invalid requestId</p>
            `;
      response.status = 404;
    }
  } else {
    response.status = 400;
  }
};

const getWorkflowProgress = async ({
  response,
  params,
}: {
  response: any;
  params: any;
}) => {
  if (params && params.requestId) {
    const dbClient = await dbPool.connect();
    const result = await dbClient.queryObject(
      `SELECT running_task_id, status, task_status, task_name, failed_count FROM public.workflows WHERE request_id = '${params.requestId}'`,
    );
    const totalStatuses = await dbClient.queryObject<{
      status: string;
      count: number;
    }>(`SELECT status, COUNT (status)
        FROM public.workflows WHERE status='queued' OR status='started' GROUP BY status`);
    await dbClient.release();
    const queued = totalStatuses.rows.find(
      (element) => element.status === "queued",
    );
    const totalQueued = queued ? Number(queued.count) : 0;
    const started = totalStatuses.rows.find(
      (element) => element.status === "started",
    );
    const totalStarted = started ? Number(started.count) : 0;
    // deno-lint-ignore no-explicit-any
    const workflow: any = result.rows[0];
    if (workflow) {
      const taskId: number = workflow.running_task_id
        ? workflow.running_task_id
        : 0;
      const taskName = workflow.task_name ? workflow.task_name : "";
      const progressPerc = ((taskId / TOTAL_TASKS) * 100).toFixed(1);
      const status = workflow.status;
      const taskStatus = workflow.task_status ? workflow.task_status : "";
      if (workflow.failed_count && workflow.failed_count > 0) {
        response.body = {
          done: true,
          success: false,
          requestId: params.requestId,
          errorCode: 0,
          errorMessage: errorCodes[0]
        };
      } else if (status === "completed") {
        response.body = {
          done: true,
          success: true,
          requestId: params.requestId,
        };
      } else {
        response.body = {
          done: false,
          requestId: params.requestId,
          progressPercentage: progressPerc,
          jobStatus: status,
          currentTaskNumber: taskId,
          currentTaskName: taskName,
          currentTaskStatus: taskStatus,
          totalJobsQueued: Number(totalQueued),
          totalJobsStarted: Number(totalStarted),
        };
      }
    } else {
      response.headers.set("Content-Type", "text/html; charset=utf-8");
      response.body = {
        requestId: params.requestId,
        errorCode: 1,
        errorMessage: errorCodes[1]
      };
      response.status = 404;
    }
  } else {
    response.status = 400;
    response.body = {
      requestId: params.requestId,
      errorCode: 2,
      errorMessage: errorCodes[2]
    };
  }
};

// deno-lint-ignore no-explicit-any
const getResult = async ({
  response,
  params,
}: {
  response: any;
  params: any;
}) => {
  if (params && params.requestId) {
    const dbClient = await dbPool.connect();
    const result = await dbClient.queryObject(
      `SELECT result_location, status, run_id FROM public.workflows WHERE request_id = '${params.requestId}'`,
    );
    await dbClient.release();
    // deno-lint-ignore no-explicit-any
    const workflow: any = result.rows[0];
    if (workflow) {
      const status = workflow.status;
      const resultLocation: string = workflow.result_location + "/result.json";
      if (workflow.failed_count && workflow.failed_count > 0) {
        response.body = {
          done: true,
          success: false,
          requestId: params.requestId,
          errorCode: 0,
        };
      } else if (status === "completed") {
        response.headers.set("Content-Type", "application/json");
        const decoder = new TextDecoder("utf-8");
        const result = JSON.parse(decoder.decode(Deno.readFileSync(resultLocation)));
        response.body = {
          done: true,
          success: true,
          requestId: params.requestId,
          result: result
        };
      } else {
        response.body = {
          done: false,
          requestId: params.requestId,
        };
      }
    } else {
      response.headers.set("Content-Type", "text/html; charset=utf-8");
      response.status = 404;
    }
  } else {
    response.status = 400;
  }
};

export { addWeblog, getResult, getWorkflowProgress, getWorkflowProgressHtml };
