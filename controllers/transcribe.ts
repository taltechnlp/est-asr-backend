import { v4 } from "https://deno.land/std@0.97.0/uuid/mod.ts";
import { dbPool, RESULTS_DIR } from "../database.ts";

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
            console.log(formData);
            const requestId = v4.generate();
            const workflowName = Array.from(requestId)
                .map(increaseAscii)
                .join("");
            const dbClient = await dbPool.connect();
            const time = new Date().toISOString().split(".")[0] + "Z";
            const fileName = formData.files[0].filename;
            // TODO: validate format
            const resultFormat = formData.fields.formats
                ? formData.fields.formats
                : DEFAULT_RESULT_TYPE;
            const doMusicDetection =
                formData.fields.do_music_detection === "yes" ? "yes" : "no";
            const filePath = Deno.cwd() + "/" + fileName;
            const extension = getFileExtension(filePath);
            const resultFileName =
                removeFileExtension(fileName, extension).replace(
                    outPath + "/",
                    ""
                ) + resultFormat;
            const resultLocation = RESULTS_DIR + "/" + resultFileName;
            const result = await dbClient.queryArray(`
                INSERT INTO public.workflows
                (request_id, name, created_at_utc, status, location, extension, result_location) 
                VALUES ('${requestId}', '${workflowName}', '${time}', 'queued', '${filePath}', '${extension}', '${resultLocation}')`);
            console.log(result);
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
                extension,
                resultFileName,
                resultFormat,
                doMusicDetection
            );
            response.redirect("/progress/" + requestId);
        }
    } else {
        response.status = 400;
        console.log("POST failed");
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
      <label for="formats">Result file format:</label>
      <select name="formats" id="formats">
        <option value="json">JSON</option>
        <option value="trs">TRS</option>
        <option value="ctm">CTM</option>
        <option value="txt">TXT</option>
        <option value="srt">SRT</option>
      </select><br>
      <label for="do_music_detection">Do music detection?</label>
      <input type="checkbox" id="do_music_detection" name="do_music_detection" value="yes"><br>
      <div>File: <input type="file" name="singleFile"/></div>
      <input type="submit" value="Upload" />
    </form>
  `;
};

const runNextflow = async (
    filePath: string,
    workflowName: string,
    extension: string,
    resultFileName: string,
    resultFormat: string,
    doMusicDetection: string
) => {
    const logFile = await Deno.open("nextflow.log", {
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
            "-with-dag",
            "-with-docker",
            "nextflow",
            "-with-weblog",
            "http://localhost:7700/process/",
            "--in",
            filePath,
            "--file_ext",
            extension,
            "--out",
            resultFileName,
            "--out_format",
            resultFormat,
            "--do_music_detection",
            doMusicDetection,
            "--do_punctuation",
            "yes",
        ],
        cwd: "../kaldi-offline-transcriber-nextflow",
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
    return filePath.slice(0, -1 * extension.length);
}

export { uploadFile, getUploadForm };

// extensions: ['wav', 'mp3', 'ogg', 'mp2', 'm4a', 'mp4', 'flac', 'amr', 'mpg'], MAX_SIZE_BYTES: 400000000, maxFileSizeBytes: 200000000 }
