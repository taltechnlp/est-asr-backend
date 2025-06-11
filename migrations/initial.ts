export const createTable =
`
CREATE TABLE IF NOT EXISTS workflows (
    run_id text,
    status text NOT NULL,
    succeeded_count integer,
    running_count integer,
    pending_count integer,
    failed_count integer,
    progress_length integer,
    running_task_id integer,
    request_id text NOT NULL,
    location text NOT NULL,
    extension text,
    name text NOT NULL,
    created_at_utc text,
    updated_at_utc text,
    task_name text,
    task_status text,
    result_location text,
    result_sent boolean
)
`