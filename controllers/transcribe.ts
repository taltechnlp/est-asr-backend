import { v4 } from "https://deno.land/std@0.97.0/uuid/mod.ts";
import { dbPool, RESULTS_DIR } from "../database.ts";
const NEXTFLOW_PATH = Deno.env.get("NEXTFLOW_PATH");

interface FormDataFile {
    content: string;
    contentType: string;
    name: string;
    filename: string;
    originalName: string;
}

const MAX_SIZE_BYTES = 2000000000;
const DEFAULT_RESULT_TYPE = "json";

// deno-lint-ignore no-explicit-any
const uploadFile = async ({
    request,
    response,
}: {
    request: any;
    response: any;
    params: any;
}) => {
    if (request.hasBody) {
        if (parseInt(request.headers.get("content-length")) > MAX_SIZE_BYTES) {
            response.status = 422;
            response.body = {
                success: false,
                data: `Maximum upload size exceeded, size: ${request.headers.get(
                    "content-length"
                )} bytes, maximum: ${MAX_SIZE_BYTES} bytes. `,
            };
        } else {
            const body = await request.body({ type: "form-data" });
            // The outPath folder has to exist
            const outPath = "uploads";
            const formData = await body.value.read({
                maxFileSize: MAX_SIZE_BYTES,
                outPath,
            });
            const requestId = v4.generate();
            const workflowName = Array.from(requestId)
                .map(increaseAscii)
                .join("");
            const dbClient = await dbPool.connect();
            const time = new Date().toISOString().split(".")[0] + "Z";
            const fileName = formData.files[0].filename;
            // TODO: validate format
            const doMusicDetection =
                formData.fields.do_music_detection === "true"
                    ? "true"
                    : "false";
            const doLanguageId =
                formData.fields.do_language_id === "true" ? "true" : "false";
            const doSpeakerId =
                formData.fields.do_speaker_id === "true" ? "true" : "false";
            const filePath = Deno.cwd() + "/" + fileName;
            const extension = getFileExtension(filePath);
            const resultFileName = removeFileExtension(
                fileName,
                extension
            ).replace(outPath + "/", "");
            // The location of the transcription from current project
            const resultsDir = RESULTS_DIR || "";
            const nextflowPath = NEXTFLOW_PATH || "./";
            const resultLocation =
                nextflowPath + resultsDir + resultFileName + "/result.json";
            await dbClient.queryArray(`
                INSERT INTO public.workflows
                (request_id, name, created_at_utc, status, location, result_location) 
                VALUES ('${requestId}', '${workflowName}', '${time}', 'queued', '${filePath}', '${resultLocation}')`);
            await dbClient.release();

            response.status = 201;
            response.body = {
                success: true,
                data: "ok",
                requestId: requestId,
            };
            runNextflow(
                filePath,
                workflowName,
                resultsDir,
                doMusicDetection,
                doSpeakerId,
                doLanguageId
            );
            response.redirect("/progress/" + requestId);
        }
    } else {
        response.status = 400;
        response.body = {
            success: false,
            msg: "No data included.",
        };
    }
};
// deno-lint-ignore no-explicit-any
const getUploadForm = ({ response }: { response: any }) => {
    response.headers.set("Content-Type", "text/html; charset=utf-8");
    response.body = `
    <h2>Upload a recording</h2>
    <form action="/upload" enctype="multipart/form-data" method="post" >
      <label for="do_music_detection">Do music detection?</label>
      <input type="checkbox" id="do_music_detection" name="do_music_detection" value="yes" checked><br>
      <label for="do_speaker_id">Do speaker identification?</label>
      <input type="checkbox" id="do_speaker_id" name="do_speaker_id" value="yes" checked><br>
      <label for="do_language_id">Do language identification?</label>
      <input type="checkbox" id="do_language_id" name="do_language_id" value="yes" checked><br>
      <div>File: <input type="file" name="singleFile"/></div>
      <input type="submit" value="Upload" />
    </form>
  `;
};

const runNextflow = async (
    filePath: string,
    workflowName: string,
    resultsDir: string,
    doMusicDetection: string,
    doSpeakerId: string,
    doLanguageId: string
) => {
    const logFile = await Deno.open("deno.log", {
        read: true,
        write: true,
        create: true,
    });
    const cmd = Deno.run({
        cmd: [
            "nextflow",
            "run",
            "transcribe.nf",
            "-name",
            workflowName,
            "-with-weblog",
            "http://localhost:7700/process/",
            "--in",
            filePath,
            "--out_dir",
            resultsDir,
            "--do_music_detection",
            doMusicDetection,
            "--do_punctuation",
            "true",
            "--do_speaker_id",
            doSpeakerId,
            "--do_language_id",
            doLanguageId,
        ],
        cwd: NEXTFLOW_PATH,
        stdout: logFile.rid,
        stderr: logFile.rid,
    });
    await cmd.status();
    cmd.close();
};

const increaseAscii = (char: string) => {
    const ascii = char.charCodeAt(0);
    if (ascii <= 57) {
        return String.fromCharCode(ascii + 60);
    } else return char;
};

function getFileExtension(filename: string) {
    const ext = /^.+\.([^.]+)$/.exec(filename);
    return ext == null ? "" : ext[1];
}

function removeFileExtension(filePath: string, extension: string) {
    return filePath.slice(0, -1 * (extension.length + 1));
}

export { uploadFile, getUploadForm };

// extensions: ['wav', 'mp3', 'ogg', 'mp2', 'm4a', 'mp4', 'flac', 'amr', 'mpg'], MAX_SIZE_BYTES: 400000000, maxFileSizeBytes: 200000000 }
