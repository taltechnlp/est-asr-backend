import { IWeblog } from "../types.ts";
import { db } from "../sqlite.ts";

interface WorkflowRecord {
  name: string;
  request_id: string;
  run_id?: string;
  status?: string;
  failed_count?: number;
  result_location?: string;
}

const PIPELINE_DIR = Deno.env.get("PIPELINE_DIR");
const NEXTFLOW_PATH = Deno.env.get("NEXTFLOW_PATH") || "nextflow";
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
      if (workflow.metadata) {
        const updatedAtUtc = new Date(workflow.utcTime).toISOString();
        // First try to find by run_id
        let matchingWorkflow = db.prepare(`SELECT name, request_id FROM workflows WHERE run_id = ?`).get(workflow.runId) as WorkflowRecord | undefined;
        
        // If not found and this is a resume run (name contains _resume_), try to find by the original run_id
        if (!matchingWorkflow && workflow.runName.includes('_resume_')) {
          const originalRunId = workflow.runName.split('_resume_')[0];
          matchingWorkflow = db.prepare(`SELECT name, request_id FROM workflows WHERE run_id = ?`).get(originalRunId) as WorkflowRecord | undefined;
        }

        if (matchingWorkflow) {
          // Delete temp files from work directory
          const command = new Deno.Command(NEXTFLOW_PATH, {
            args: ["clean", workflow.runId, "-k", "-f"],
            cwd: PIPELINE_DIR
          });
          await command.output();
          
          // Save event
          db.prepare(`UPDATE workflows SET 
                        "status" = ?,
                        "updated_at_utc" = ?,
                        "succeeded_count" = ?,
                        "running_count" = ?,
                        "pending_count" = ?,
                        "failed_count" = ?,
                        "progress_length" = ?,
                        "run_id" = ?
                        WHERE "request_id" = ?`).run(
                          workflow.event,
                          updatedAtUtc,
                          workflow.metadata?.workflow.stats.succeededCount,
                          workflow.metadata?.workflow.stats.runningCount,
                          workflow.metadata?.workflow.stats.pendingCount,
                          workflow.metadata?.workflow.stats.failedCount,
                          workflow.metadata?.workflow.stats.progressLength,
                          workflow.runId,
                          matchingWorkflow.request_id
                        );
        } else {
          db.prepare(`UPDATE workflows SET 
          "run_id" = ?,
          "status" = ?,
          "updated_at_utc" = ?,
          "succeeded_count" = ?,
          "running_count" = ?,
          "pending_count" = ?,
          "failed_count" = ?,
          "progress_length" = ?
          WHERE "name" = ?`).run(
            workflow.runId,
            workflow.event,
            updatedAtUtc,
            workflow.metadata?.workflow.stats.succeededCount,
            workflow.metadata?.workflow.stats.runningCount,
            workflow.metadata?.workflow.stats.pendingCount,
            workflow.metadata?.workflow.stats.failedCount,
            workflow.metadata?.workflow.stats.progressLength,
            workflow.runName
          );
        }
      } else if (workflow.trace) {
        const updatedAtUtc = new Date(workflow.utcTime).toISOString();
        // First try to find by run_id
        let matchingWorkflow = db.prepare(`SELECT name, request_id FROM workflows WHERE run_id = ?`).get(workflow.runId) as WorkflowRecord | undefined;
        
        // If not found and this is a resume run (name contains _resume_), try to find by the original run_id
        if (!matchingWorkflow && workflow.runName.includes('_resume_')) {
          const originalRunId = workflow.runName.split('_resume_')[0];
          matchingWorkflow = db.prepare(`SELECT name, request_id FROM workflows WHERE run_id = ?`).get(originalRunId) as WorkflowRecord | undefined;
        }

        if (matchingWorkflow) {
          db.prepare(`UPDATE workflows SET 
            task_name = ?,
            "running_task_id" = ?, 
            "task_status" = ?, 
            "updated_at_utc" = ?,
            "run_id" = ?
            WHERE "request_id" = ?`).run(
              workflow.trace.name,
              workflow.trace.task_id,
              workflow.event,
              updatedAtUtc,
              workflow.runId,
              matchingWorkflow.request_id
            );
        } else {
          db.prepare(`UPDATE workflows SET 
          "run_id" = ?,
          task_name = ?,
          "running_task_id" = ?, 
          "task_status" = ?, 
          "updated_at_utc" = ?
          WHERE "name" = ?`).run(
            workflow.runId,
            workflow.trace.name,
            workflow.trace.task_id,
            workflow.event,
            updatedAtUtc,
            workflow.runName
          );
        }
      }

      response.status = 201;
      response.body = {
        success: true,
        data: workflow.runId,
      };
    } catch (error: unknown) {
      response.status = 500;
      response.body = {
        success: false,
        msg: error instanceof Error ? error.message : String(error),
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
    const result = db.prepare(`SELECT running_task_id, status, task_status, task_name, failed_count FROM workflows WHERE request_id = ?`).get(params.requestId);
    
    const totalStatuses = db.prepare(`SELECT status, COUNT (status) as count FROM workflows WHERE status='queued' OR status='started' GROUP BY status`).all();
    
    const totalQueued = totalStatuses.find(
      (element) => element.status === "queued",
    );
    const count = totalQueued ? totalQueued.count : 0;
    let totalStarted: any = totalStatuses.find(
      (element) => element.status === "started",
    );
    totalStarted = totalStarted ? totalStarted.count : 0;
    
    const workflow: any = result;
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
    const result = db.prepare(`SELECT running_task_id, status, task_status, task_name, failed_count FROM workflows WHERE request_id = ?`).get(params.requestId);

    const totalStatuses = db.prepare(`SELECT status, COUNT (status) as count FROM workflows WHERE status='queued' OR status='started' GROUP BY status`).all();
    
    const queued = totalStatuses.find(
      (element) => element.status === "queued",
    );
    const totalQueued = queued ? Number(queued.count) : 0;
    const started = totalStatuses.find(
      (element) => element.status === "started",
    );
    const totalStarted = started ? Number(started.count) : 0;
    
    const workflow: any = result;
    if (workflow) {
      const taskId: number = workflow.running_task_id
        ? workflow.running_task_id
        : 0;
      const taskName = workflow.task_name ? workflow.task_name : "";
      const progressPerc = ((taskId / TOTAL_TASKS) * 100).toFixed(1);
      const status = workflow.status;
      const taskStatus = workflow.task_status;
      
      if (status === "completed") {
        response.body = {
          done: true,
          success: true,
          requestId: params.requestId,
        };
      } else if (workflow.failed_count && workflow.failed_count > 0) {
        response.body = {
          done: true,
          success: false,
          requestId: params.requestId,
          errorCode: 0,
          errorMessage: "processingFailed",
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
          totalJobsQueued: totalQueued,
          totalJobsStarted: totalStarted,
        };
      }
    } else {
      response.status = 404;
      response.body = {
        requestId: params.requestId,
        errorCode: 1,
      };
    }
  } else {
    response.status = 400;
  }
};

const getResult = async ({
  response,
  params,
}: {
  response: any;
  params: any;
}) => {
  if (params && params.requestId) {
    const workflow = db.prepare(`SELECT status, result_location, failed_count FROM workflows WHERE request_id = ?`).get(params.requestId) as WorkflowRecord | undefined;

    if (workflow) {
      if (workflow.failed_count && workflow.failed_count > 0) {
        response.body = {
          done: true,
          success: false,
          requestId: params.requestId,
          errorCode: 0,
          errorMessage: "processingFailed"
        };
      }
      else if (workflow.status === "completed") {
        const resultPath = `${workflow.result_location}/result.json`;
        try {
          const file = await Deno.readFile(resultPath);
          const decoder = new TextDecoder("utf-8");
          const result = JSON.parse(decoder.decode(file));
          response.body = {
            done: true,
            success: true,
            requestId: params.requestId,
            result: result
          };
          response.headers.set("Content-Type", "application/json");
        } catch (_e) {
          response.status = 500;
          response.body = {
            done: true,
            success: false,
            requestId: params.requestId,
            errorCode: 0,
            errorMessage: "Result file not found.",
          };
        }
      } else {
        response.body = {
          done: false,
          requestId: params.requestId,
        };
      }
    } else {
      response.status = 404;
      response.body = {
        requestId: params.requestId,
        errorCode: 1,
      };
    }
  } else {
    response.status = 400;
    response.body = {
      requestId: params.requestId,
      errorCode: 2,
    };
  }
};

export { addWeblog, getWorkflowProgress, getWorkflowProgressHtml, getResult };
