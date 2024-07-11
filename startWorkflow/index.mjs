import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const sqsClient = new SQSClient({ region: "eu-west-3" });

export const handler = async (event) => {
  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );

  const parts = key.split("/");

  if (parts.length >= 3) {
    const userId = parts[0];
    const mediaType = parts[1];
    const fileNameWithExtension = parts.slice(2).join("/");
    const fileName = fileNameWithExtension.split(".").slice(0, -1).join(".");

    const params = {
      QueueUrl: process.env.SQS_QUEUE_URL,
      MessageBody: JSON.stringify({
        bucket,
        key,
        userId,
        mediaType,
        fileName,
      }),
    };

    try {
      const command = new SendMessageCommand(params);
      const r = await sqsClient.send(command);

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Message sent to SQS successfully.",
        }),
      };
    } catch (error) {
      console.error("Error sending message to SQS:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Error sending message to SQS.",
          details: error.message,
        }),
      };
    }
  } else {
    console.error("Invalid key format:", key);
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Invalid key format.",
        key: key,
      }),
    };
  }
};
