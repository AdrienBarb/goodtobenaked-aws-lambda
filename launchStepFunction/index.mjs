import pkg from "@aws-sdk/client-sfn";

const { SFNClient, StartExecutionCommand } = pkg;

const sfnClient = new SFNClient({ region: "eu-west-3" });

export const handler = async (event) => {
  try {
    const messages = event.Records;
    for (const message of messages) {
      const { bucket, key, userId, mediaType, fileName } = JSON.parse(
        message.body
      );

      const stepFunctionParams = {
        stateMachineArn:
          "arn:aws:states:eu-west-3:429226243664:stateMachine:MyStateMachine-i7syd375l",
        input: JSON.stringify({
          bucket,
          key,
          userId,
          mediaType,
          fileName,
        }),
      };

      try {
        const command = new StartExecutionCommand(stepFunctionParams);
        await sfnClient.send(command);
        console.log(
          `Step Function execution started for userId: ${userId}, mediaType: ${mediaType}, fileName: ${fileName}`
        );
      } catch (error) {
        console.error("Error starting Step Function execution:", error);
      }
    }
  } catch (error) {
    console.error("Error processing SQS messages:", error);
  }
};
