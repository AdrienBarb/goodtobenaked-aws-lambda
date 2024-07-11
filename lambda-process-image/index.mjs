import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";

const s3 = new S3Client({ region: "eu-west-3" });

const processImage = async (bucket, key, userId, fileName, mediaType) => {
  try {
    const params = { Bucket: bucket, Key: key };
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

    // Conversion de l'image au format JPG
    const jpgImage = await sharp(imageBuffer).rotate().jpeg().toBuffer();

    // Création de l'image optimisée pour un chargement rapide
    const optimizedImage = await sharp(imageBuffer)
      .rotate()
      .resize(800)
      .jpeg({ quality: 50 })
      .toBuffer();

    // Obtenir le nom de fichier sans l'extension
    const newKeyConverted = `converted/${userId}/${fileName}.jpg`;
    const newKeyPoster = `poster/${userId}/${fileName}.jpg`;

    // Sauvegarde des images converties et optimisées dans S3
    const putObject = async (key, body) => {
      const uploadParams = {
        Bucket: process.env.PROCESS_MEDIA_BUCKET,
        Key: key,
        Body: body,
        ContentType: "image/jpeg",
      };
      const command = new PutObjectCommand(uploadParams);
      await s3.send(command);
    };

    await putObject(newKeyConverted, jpgImage);
    await putObject(newKeyPoster, optimizedImage);

    return {
      statusCode: 200,
      status: "SUCCESS",
      userId,
      key,
      bucket,
      fileName,
      mediaType,
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
  const { bucket, key, userId, fileName, mediaType } = event;

  const response = await processImage(bucket, key, userId, fileName, mediaType);
  return response;
};
