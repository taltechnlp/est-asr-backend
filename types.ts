interface IWeblog {
    runName: string;
    runId: string;
    event:
        | "started"
        | "process_submitted"
        | "process_started"
        | "process_completed"
        | "error"
        | "completed";
    utcTime: string;
    // trace is only provided for the following events: process_submitted, process_started, process_completed, error
    trace?: {
        task_id: number;
        process: string;
        name: string;
        time: string;
        submit: string;
        start: string;
        complete: string;
        duration: string;
        realtime: string;
        queue: string;
    };
    // metadata is only provided for the following events: started, completed
    metadata?: {
        parameters: Record<string, unknown>;
        workflow: {
            stats: {
                succeededCount: number;
                runningCount: number;
                pendingCount: number;
                failedCount: number;
                progressLength: number;
            };
        };
    };
}

export type { IWeblog };
