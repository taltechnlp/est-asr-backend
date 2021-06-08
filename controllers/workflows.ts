import { IWeblog } from "../types.ts";
import {dbPool} from "../database.ts";

// Add a Nextflow weblog
// deno-lint-ignore no-explicit-any
const addWeblog = async ({request, response}: {request: any; response: any}) => {
    if (!request.hasBody) {
        response.status = 400
        console.log("POST failed")
        response.body = {
            success: false,
            msg: 'No data'
        }
    } else {
        try {
            const body  = await request.body()
            /* const result1: string = JSON.stringify(await body.value)
            const write = Deno.writeTextFile(`./log_1${a}.txt`, result1);
            write.then(() => console.log(`File written ./log_1${a}.txt`));
            a++;
            console.log(workflow.runId, workflow.event, workflow.utcTime) */
            const workflow: IWeblog = await body.value
            const dbClient = await dbPool.connect();
            if (workflow.event === "started") {
                await dbClient.queryArray("INSERT INTO public.workflows VALUES ($1,$2,$3,$3,$4,$5,$6,$7,$8)", 
                    workflow.runId, 
                    workflow.event, 
                    workflow.utcTime,
                    workflow.metadata?.workflow.stats.succeededCount,
                    workflow.metadata?.workflow.stats.runningCount,
                    workflow.metadata?.workflow.stats.pendingCount,
                    workflow.metadata?.workflow.stats.failedCount,
                    workflow.metadata?.workflow.stats.progressLength
                )
            }
            else {            
                if (workflow.metadata) {
                    console.log(workflow.metadata?.workflow.stats.succeededCount)
                    console.log(workflow.metadata?.workflow.stats.runningCount)
                    console.log(workflow.metadata?.workflow.stats.pendingCount)
                    console.log(workflow.metadata?.workflow.stats.failedCount)
                    console.log(workflow.metadata?.workflow.stats.progressLength)
                    await dbClient.queryArray
                        `UPDATE public.workflows SET "status" = ${workflow.event}, 
                            "updatedAtUtc" = ${workflow.utcTime},
                            "succeededCount" = ${workflow.metadata?.workflow.stats.succeededCount   },
                            "runningCount" = ${workflow.metadata?.workflow.stats.runningCount},
                            "pendingCount" = ${workflow.metadata?.workflow.stats.pendingCount},
                            "failedCount" = ${workflow.metadata?.workflow.stats.failedCount},
                            "progressLength" = ${workflow.metadata?.workflow.stats.progressLength},
                            WHERE "runId" = ${workflow.runId}` 
                }
                // TODO kirjutada ainult siis kui on taskId on sama või suurem
                else if (workflow.trace) {
                    await dbClient.queryArray
                        `UPDATE public.workflows SET "runningTaskId" = ${workflow.trace.task_id}, 
                            "updatedAtUtc" = ${workflow.utcTime}
                            WHERE "runId" = ${workflow.runId}` 
                }
                else {
                    await dbClient.queryArray
                        `UPDATE public.workflows SET "status" = ${workflow.event}, 
                            "updatedAtUtc" = ${workflow.utcTime}
                            WHERE "runId" = ${workflow.runId}` 
                }
                // TODO onComplete handler: https://www.nextflow.io/docs/latest/metadata.html
            }
            await dbClient.release();
            response.status = 201
            response.body = {
                success: true,
                data: workflow.runId
            }
        } catch (err) {
            response.status = 500
            response.body = {
                success: false,
                msg: err.toString()
            }
        } 
    }
  }

export { addWeblog }
