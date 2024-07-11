import {
  MediaConvertClient,
  CreateJobCommand,
} from "@aws-sdk/client-mediaconvert";

const mediaConvert = new MediaConvertClient({
  region: "eu-west-3",
  endpoint: process.env.MEDIA_CONVERT_ENDPOINT,
});

export const handler = async (event) => {
  console.log("Event ", event);
  try {
    const { bucket, key, userId, fileName, mediaType } = event;
    const inputPath = `s3://${bucket}/${key}`;
    const outputPathVideo = `s3://processed-media-gtbn-prod/converted/${userId}/`;
    const outputPathThumbnail = `s3://processed-media-gtbn-prod/poster/${userId}/`;

    const params = {
      Role: "arn:aws:iam::429226243664:role/MediaConvertRole-gtbn-prod",
      Settings: {
        Inputs: [
          {
            FileInput: inputPath,
            VideoSelector: {
              Rotate: "AUTO",
            },
            AudioSelectors: {
              "Audio Selector 1": {
                Offset: 0,
                DefaultSelection: "DEFAULT",
                SelectorType: "TRACK",
                ProgramSelection: 1,
              },
            },
          },
        ],
        OutputGroups: [
          {
            Name: "Video File Group",
            Outputs: [
              {
                ContainerSettings: {
                  Container: "MP4",
                },
                VideoDescription: {
                  CodecSettings: {
                    Codec: "H_264",
                    H264Settings: {
                      MaxBitrate: 5000000,
                      CodecLevel: "AUTO",
                      CodecProfile: "MAIN",
                      InterlaceMode: "PROGRESSIVE",
                      NumberReferenceFrames: 3,
                      FramerateControl: "INITIALIZE_FROM_SOURCE",
                      GopSize: 90,
                      GopBReference: "ENABLED",
                      RateControlMode: "QVBR",
                      QvbrSettings: {
                        QvbrQualityLevel: 7,
                      },
                    },
                  },
                },
                AudioDescriptions: [
                  {
                    AudioSourceName: "Audio Selector 1",
                    CodecSettings: {
                      Codec: "AAC",
                      AacSettings: {
                        Bitrate: 128000,
                        CodingMode: "CODING_MODE_2_0",
                        SampleRate: 48000,
                      },
                    },
                  },
                ],
              },
            ],
            OutputGroupSettings: {
              Type: "FILE_GROUP_SETTINGS",
              FileGroupSettings: {
                Destination: outputPathVideo,
              },
            },
          },
          {
            Name: "Thumbnail File Group",
            Outputs: [
              {
                ContainerSettings: {
                  Container: "RAW",
                },
                VideoDescription: {
                  Width: 1920,
                  Height: 1080,
                  CodecSettings: {
                    Codec: "FRAME_CAPTURE",
                    FrameCaptureSettings: {
                      FramerateNumerator: 1,
                      FramerateDenominator: 60,
                      MaxCaptures: 1,
                      Quality: 80,
                    },
                  },
                },
                Extension: "jpg",
                NameModifier: `_thumbnail`,
              },
            ],
            OutputGroupSettings: {
              Type: "FILE_GROUP_SETTINGS",
              FileGroupSettings: {
                Destination: outputPathThumbnail,
              },
            },
          },
        ],
      },
    };

    const data = await mediaConvert.send(new CreateJobCommand(params));

    return {
      statusCode: 200,
      status: "SUCCESS",
      jobId: data.Job.Id,
      userId,
      fileName,
      mediaType,
    };
  } catch (error) {
    return {
      statusCode: 500,
      status: "FAILED",
      error: error.message,
    };
  }
};
