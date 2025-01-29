export const createTable =
`
CREATE TABLE IF NOT EXISTS workflows (
    run_id text,
    status text NOT NULL,
    succeeded_count numeric,
    running_count numeric,
    pending_count numeric,
    failed_count numeric,
    progress_length numeric,
    running_task_id numeric,
    request_id text NOT NULL,
    location text NOT NULL,
    extension text,
    name text NOT NULL,
    created_at_utc timestamp with time zone,
    updated_at_utc timestamp with time zone,
    task_name text,
    task_status text,
    result_location text,
    result_sent boolean
)
`