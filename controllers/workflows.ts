import { IWeblog } from "../types.ts";
import { dbPool } from "../database.ts";

const TOTAL_TASKS = 13;

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
    console.log("POST failed");
    response.body = {
      success: false,
      msg: "No data",
    };
  } else {
    try {
      const body = await request.body();
      /* const result1: string = JSON.stringify(await body.value)
            write.then(() => console.log(`File written ./log_1${a}.txt`)); */
      // console.log(workflow.runId, workflow.event, workflow.utcTime)
      const workflow: IWeblog = await body.value;
      /* Deno.writeTextFile(`./log_1${a}.txt`, JSON.stringify(workflow));
            a++; */
      const dbClient = await dbPool.connect();
      if (workflow.metadata) {
        const updatedAtUtc = new Date(workflow.utcTime);
        const res = await dbClient.queryArray`UPDATE public.workflows SET 
                        "run_id" = ${workflow.runId},
                        "status" = ${workflow.event}, 
                        "updated_at_utc" = ${updatedAtUtc},
                        "succeeded_count" = ${workflow.metadata?.workflow.stats.succeededCount},
                        "running_count" = ${workflow.metadata?.workflow.stats.runningCount},
                        "pending_count" = ${workflow.metadata?.workflow.stats.pendingCount},
                        "failed_count" = ${workflow.metadata?.workflow.stats.failedCount},
                        "progress_length" = ${workflow.metadata?.workflow.stats.progressLength}
                        WHERE "name" = ${workflow.runName}`;
      } else if (workflow.trace) {
        const updatedAtUtc = new Date(workflow.utcTime);
        await dbClient.queryArray`UPDATE public.workflows SET 
                        "run_id" = ${workflow.runId},
                        task_name = ${workflow.trace.name},
                        "running_task_id" = ${workflow.trace.task_id}, 
                        "task_status" = ${workflow.event}, 
                        "updated_at_utc" = ${updatedAtUtc}
                        WHERE "name" = ${workflow.runName}`;
      }

      // TODO onComplete handler: https://www.nextflow.io/docs/latest/metadata.html

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
    const totalQueued = totalStatuses.rows.find(
      (element) => element.status === "queued",
    );
    let count = totalQueued ? totalQueued.count : 0;
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
      if (workflow.failed_count && workflow.failed_count > 0) {
        response.body = {
          done: true,
          success: false,
          requestId: params.requestId,
          errorCode: 0,
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
          totalJobsQueued: Number(count),
          totalJobsStarted: Number(totalStarted),
        };
      }
    } else {
      response.headers.set("Content-Type", "text/html; charset=utf-8");
      response.body = {
        done: true,
        success: false,
        requestId: params.requestId,
        errorCode: 1,
      };
      response.status = 404;
    }
  } else {
    response.status = 400;
    response.body = {
      done: true,
      success: false,
      requestId: params.requestId,
      errorCode: 2,
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
      `SELECT result_location, status FROM public.workflows WHERE request_id = '${params.requestId}'`,
    );
    await dbClient.release();
    // deno-lint-ignore no-explicit-any
    const workflow: any = result.rows[0];
    if (workflow) {
      const status = workflow.status;
      const resultLocation: string = workflow.result_location;
      console.log("reading", resultLocation);
      if (workflow.failed_count && workflow.failed_count > 0) {
        response.body = {
          done: true,
          success: false,
          requestId: params.requestId,
          errorCode: 0,
        };
      } else if (status === "completed") {
        response.headers.set("Content-Type", "application/json");
        response.body = Deno.readFileSync(resultLocation);
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
