import {
  MediaConvertClient,
  GetJobCommand,
} from "@aws-sdk/client-mediaconvert";

const mediaConvert = new MediaConvertClient({
  region: "eu-west-3",
  endpoint: process.env.MEDIA_CONVERT_ENDPOINT,
});

export const handler = async (event) => {
  try {
    const { jobId, userId, fileName, mediaType } = event;

    const command = new GetJobCommand({
      Id: jobId,
    });

    const job = await mediaConvert.send(command);

    if (job.Job.Status === "COMPLETE") {
      return {
        statusCode: 200,
        status: "COMPLETE",
        userId,
        fileName,
        mediaType,
      };
    } else if (job.Job.Status === "ERROR") {
      return {
        statusCode: 500,
        status: "ERROR",
      };
    } else {
      return { status: "IN_PROGRESS", jobId };
    }
  } catch (error) {
    return {
      statusCode: 500,
      status: "ERROR",
      message: error,
    };
  }
};
