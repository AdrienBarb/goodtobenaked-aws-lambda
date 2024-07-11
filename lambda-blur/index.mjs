import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const s3 = new S3Client({ region: "eu-west-3" });
const sns = new SNSClient({ region: "eu-west-3" });

const blurImage = async (userId, fileName, mediaType) => {
  try {
    const bucket = "processed-media-gtbn-prod";
    const posterKey = `poster/${userId}/${fileName}${
      mediaType === "images" ? "" : "_thumbnail.0000000"
    }.jpg`;

    console.log("Poster key ", posterKey);

    const params = { Bucket: bucket, Key: posterKey };
    const command = new GetObjectCommand(params);
    const data = await s3.send(command);

    const streamToBuffer = (stream) =>
      new Promise((resolve, reject) => {
        const chunks = [];
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve(Buffer.concat(chunks)));
        stream.on("error", reject);
      });

    const imageBuffer = await streamToBuffer(data.Body);

    // Création de l'image floutée
    const blurredImage = await sharp(imageBuffer)
      .blur(500)
      .jpeg({ quality: 80 })
      .toBuffer();

    const newKey = `blurred/${userId}/${fileName}.jpg`;

    // Sauvegarde de l'image floutée dans S3
    const uploadParams = {
      Bucket: "processed-media-gtbn-prod",
      Key: newKey,
      Body: blurredImage,
      ContentType: "image/jpeg",
    };
    const putCommand = new PutObjectCommand(uploadParams);
    await s3.send(putCommand);

    const snsParams = {
      TopicArn: process.env.SNS_TOPIC_ARN,
      Message: JSON.stringify({
        userId: userId,
        key: fileName,
        status: "ready",
      }),
    };
    await sns.send(new PublishCommand(snsParams));

    return {
      statusCode: 200,
      status: "SUCCESS",
    };
  } catch (error) {
    console.error("Error processing image:", error);
    return {
      statusCode: 500,
      status: "FAILED",
      error: error.message,
    };
  }
};

export const handler = async (event) => {
  console.log("Event: ", event);

  const { userId, fileName, mediaType } = event;
  const response = await blurImage(userId, fileName, mediaType);

  return response;
};
