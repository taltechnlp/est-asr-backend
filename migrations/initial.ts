export const createTable =
`
CREATE TABLE IF NOT EXISTS public.workflows
(
    run_id text COLLATE pg_catalog."default",
    status text COLLATE pg_catalog."default" NOT NULL,
    succeeded_count numeric,
    running_count numeric,
    pending_count numeric,
    failed_count numeric,
    progress_length numeric,
    running_task_id numeric,
    request_id text COLLATE pg_catalog."default" NOT NULL,
    location text COLLATE pg_catalog."default" NOT NULL,
    extension text COLLATE pg_catalog."default",
    name text COLLATE pg_catalog."default" NOT NULL,
    created_at_utc timestamp with time zone,
    updated_at_utc timestamp with time zone,
    task_name text COLLATE pg_catalog."default",
    task_status text COLLATE pg_catalog."default",
    result_location text COLLATE pg_catalog."default",
    result_sent boolean,
    CONSTRAINT workflows_pkey PRIMARY KEY (request_id)
)

TABLESPACE pg_default;
`