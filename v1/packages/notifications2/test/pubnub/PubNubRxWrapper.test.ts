/* eslint-disable no-magic-numbers */
import PubNub from 'pubnub';
import { lastValueFrom } from 'rxjs';
import { PubNubRxWrapper } from '../../src/PubNubProviders/PubNubRxWrapper';
import { ErrorDiscriminator, NetworkError, UnknownError } from '../../src/errors';
import { NotificationsLogger } from '../../src/types';

describe('PubNubRxWrapper', () => {
  let mockPubNub: {
    fetchMessages: jest.Mock;
    objects: {
      getAllChannelMetadata: jest.Mock;
    };
  };
  let mockErrorClassifier: jest.Mocked<ErrorDiscriminator<unknown>>;
  let mockLogger: jest.Mocked<NotificationsLogger>;
  let wrapper: PubNubRxWrapper;

  beforeEach(() => {
    // Create mock PubNub instance
    mockPubNub = {
      fetchMessages: jest.fn(),
      objects: {
        getAllChannelMetadata: jest.fn()
      }
    };

    // Create mock error classifier
    mockErrorClassifier = {
      throwForStatus: jest.fn()
    };

    // Create mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    wrapper = new PubNubRxWrapper(mockPubNub as unknown as PubNub, mockErrorClassifier, mockLogger);
  });

  describe('fetchHistory', () => {
    const channels = ['channel1', 'channel2'];
    const end = '1234567890';
    const mockResponse: PubNub.History.FetchMessagesResponse = {
      channels: {
        channel1: [
          {
            channel: 'channel1',
            message: { id: '1', body: 'test', title: 'Test', timestamp: '123', topicId: 'channel1' },
            timetoken: '1234567890',
            uuid: 'user1'
          }
        ]
      }
    };

    it('should fetch message history successfully', async () => {
      mockPubNub.fetchMessages.mockResolvedValue(mockResponse);

      const result = await lastValueFrom(wrapper.fetchHistory(channels, end));

      expect(result).toEqual(mockResponse);
      expect(mockPubNub.fetchMessages).toHaveBeenCalledWith({
        channels,
        count: 100,
        end
      });
      expect(mockPubNub.fetchMessages).toHaveBeenCalledTimes(1);
    });

    it('should pass correct parameters to PubNub fetchMessages', async () => {
      mockPubNub.fetchMessages.mockResolvedValue(mockResponse);

      await lastValueFrom(wrapper.fetchHistory(['channel1'], '9876543210'));

      expect(mockPubNub.fetchMessages).toHaveBeenCalledWith({
        channels: ['channel1'],
        count: 100,
        end: '9876543210'
      });
    });

    it('should handle multiple channels', async () => {
      const multiChannelResponse: PubNub.History.FetchMessagesResponse = {
        channels: {
          channel1: [
            {
              channel: 'channel1',
              message: { id: '1', body: 'test1', title: 'Test 1', timestamp: '123', topicId: 'channel1' },
              timetoken: '123',
              uuid: 'user1'
            }
          ],
          channel2: [
            {
              channel: 'channel2',
              message: { id: '2', body: 'test2', title: 'Test 2', timestamp: '456', topicId: 'channel2' },
              timetoken: '456',
              uuid: 'user2'
            }
          ]
        }
      };
      mockPubNub.fetchMessages.mockResolvedValue(multiChannelResponse);

      const result = await lastValueFrom(wrapper.fetchHistory(['channel1', 'channel2'], end));

      expect(result).toEqual(multiChannelResponse);
      expect(result.channels).toHaveProperty('channel1');
      expect(result.channels).toHaveProperty('channel2');
    });

    it('should throw NetworkError when PubNub fails with network error', async () => {
      const networkError = new NetworkError(undefined, 'Network timeout');
      mockPubNub.fetchMessages.mockRejectedValue(new Error('Network timeout'));
      mockErrorClassifier.throwForStatus.mockRejectedValue(networkError);

      await expect(lastValueFrom(wrapper.fetchHistory(channels, end))).rejects.toThrow(NetworkError);
      expect(mockErrorClassifier.throwForStatus).toHaveBeenCalled();
    });

    it('should throw UnknownError when PubNub fails with unknown error', async () => {
      const unknownError = new UnknownError(500, 'Internal Server Error');
      mockPubNub.fetchMessages.mockRejectedValue(new Error('Internal Server Error'));
      mockErrorClassifier.throwForStatus.mockRejectedValue(unknownError);

      await expect(lastValueFrom(wrapper.fetchHistory(channels, end))).rejects.toThrow(UnknownError);
      expect(mockErrorClassifier.throwForStatus).toHaveBeenCalled();
    });

    it('should pass error to errorClassifier for classification', async () => {
      const originalError = new Error('PubNub error');
      mockPubNub.fetchMessages.mockRejectedValue(originalError);
      mockErrorClassifier.throwForStatus.mockRejectedValue(new NetworkError(undefined, 'PubNub error'));

      await expect(lastValueFrom(wrapper.fetchHistory(channels, end))).rejects.toThrow(NetworkError);
      expect(mockErrorClassifier.throwForStatus).toHaveBeenCalledWith(originalError);
    });

    it('should handle empty response', async () => {
      const emptyResponse: PubNub.History.FetchMessagesResponse = {
        channels: {}
      };
      mockPubNub.fetchMessages.mockResolvedValue(emptyResponse);

      const result = await lastValueFrom(wrapper.fetchHistory(channels, end));

      expect(result).toEqual(emptyResponse);
      expect(result.channels).toEqual({});
    });
  });

  describe('fetchTopics', () => {
    const mockChannelMetadata: PubNub.AppContext.ChannelMetadataObject<PubNub.AppContext.CustomData>[] = [
      {
        id: 'channel1',
        name: 'Channel 1',
        custom: {
          autoSubscribe: true,
          chain: 'mainnet',
          publisher: 'Publisher 1'
        },
        description: 'Test channel 1',
        updated: '2024-01-01T00:00:00Z',
        eTag: 'etag1'
      },
      {
        id: 'channel2',
        name: 'Channel 2',
        custom: {
          autoSubscribe: false,
          chain: 'testnet',
          publisher: 'Publisher 2'
        },
        description: 'Test channel 2',
        updated: '2024-01-02T00:00:00Z',
        eTag: 'etag2'
      }
    ];

    const mockPubNubResponse = {
      data: mockChannelMetadata,
      status: 200
    };

    it('should fetch topics successfully', async () => {
      mockPubNub.objects.getAllChannelMetadata.mockResolvedValue(mockPubNubResponse);

      const result = await lastValueFrom(wrapper.fetchTopics());

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'channel1',
        name: 'Channel 1',
        autoSubscribe: true,
        chain: 'mainnet',
        publisher: 'Publisher 1'
      });
      expect(result[1]).toEqual({
        id: 'channel2',
        name: 'Channel 2',
        autoSubscribe: false,
        chain: 'testnet',
        publisher: 'Publisher 2'
      });
    });

    it('should call getAllChannelMetadata with correct parameters', async () => {
      mockPubNub.objects.getAllChannelMetadata.mockResolvedValue(mockPubNubResponse);

      await lastValueFrom(wrapper.fetchTopics());

      expect(mockPubNub.objects.getAllChannelMetadata).toHaveBeenCalledWith({
        include: {
          customFields: true
        }
      });
      expect(mockPubNub.objects.getAllChannelMetadata).toHaveBeenCalledTimes(1);
    });

    it('should handle channels with missing custom properties', async () => {
      const channelWithoutCustom: PubNub.AppContext.ChannelMetadataObject<PubNub.AppContext.CustomData>[] = [
        {
          id: 'channel3',
          name: 'Channel 3',
          description: 'Test channel 3',
          updated: '2024-01-03T00:00:00Z',
          eTag: 'etag3'
        }
      ];
      mockPubNub.objects.getAllChannelMetadata.mockResolvedValue({
        data: channelWithoutCustom,
        status: 200
      });

      const result = await lastValueFrom(wrapper.fetchTopics());

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'channel3',
        name: 'Channel 3',
        autoSubscribe: false,
        chain: '',
        publisher: 'Channel 3'
      });
    });

    it('should handle channels with invalid custom properties and log warnings', async () => {
      const channelWithInvalidCustom: PubNub.AppContext.ChannelMetadataObject<PubNub.AppContext.CustomData>[] = [
        {
          id: 'channel4',
          name: 'Channel 4',
          custom: {
            autoSubscribe: 'invalid' as unknown as boolean,
            chain: 123 as unknown as string,
            // eslint-disable-next-line unicorn/no-null
            publisher: null as unknown as string
          },
          description: 'Test channel 4',
          updated: '2024-01-04T00:00:00Z',
          eTag: 'etag4'
        }
      ];
      mockPubNub.objects.getAllChannelMetadata.mockResolvedValue({
        data: channelWithInvalidCustom,
        status: 200
      });

      const result = await lastValueFrom(wrapper.fetchTopics());

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'channel4',
        name: 'Channel 4',
        autoSubscribe: false,
        chain: '',
        publisher: 'Channel 4'
      });
      expect(mockLogger.warn).toHaveBeenCalledTimes(3);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'PubNubProvider: Got a channel with an invalid autoSubscribe: using false instead',
        expect.any(Object)
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'PubNubProvider: Got a channel with an invalid chain: using empty chain instead',
        expect.any(Object)
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'PubNubProvider: Got a channel with an invalid publisher: using channel name as publisher instead',
        expect.any(Object),
        'Channel 4'
      );
    });

    it('should filter out invalid channels with missing id', async () => {
      const channelsWithInvalidId: PubNub.AppContext.ChannelMetadataObject<PubNub.AppContext.CustomData>[] = [
        {
          id: 'channel1',
          name: 'Valid Channel',
          custom: { autoSubscribe: true, chain: 'mainnet', publisher: 'Publisher 1' },
          description: 'Valid channel',
          updated: '2024-01-01T00:00:00Z',
          eTag: 'etag1'
        },
        {
          id: undefined as unknown as string,
          name: 'Invalid Channel',
          custom: {},
          description: 'Invalid channel',
          updated: '2024-01-02T00:00:00Z',
          eTag: 'etag2'
        }
      ];
      mockPubNub.objects.getAllChannelMetadata.mockResolvedValue({
        data: channelsWithInvalidId,
        status: 200
      });

      const result = await lastValueFrom(wrapper.fetchTopics());

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('channel1');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'PubNubProvider: Got a channel with an invalid ID: omitting it',
        expect.any(Object)
      );
    });

    it('should filter out completely invalid channels', async () => {
      const channelsWithNull = [
        {
          id: 'channel1',
          name: 'Valid Channel',
          custom: { autoSubscribe: true, chain: 'mainnet', publisher: 'Publisher 1' },
          description: 'Valid channel',
          updated: '2024-01-01T00:00:00Z',
          eTag: 'etag1'
        },
        // eslint-disable-next-line unicorn/no-null, unicorn/no-useless-undefined
        undefined,
        'not an object'
      ] as unknown as PubNub.AppContext.ChannelMetadataObject<PubNub.AppContext.CustomData>[];
      mockPubNub.objects.getAllChannelMetadata.mockResolvedValue({
        data: channelsWithNull,
        status: 200
      });

      const result = await lastValueFrom(wrapper.fetchTopics());

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('channel1');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'PubNubProvider: Got an invalid channel: omitting it',
        // eslint-disable-next-line unicorn/no-useless-undefined
        undefined
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'PubNubProvider: Got an invalid channel: omitting it',
        'not an object'
      );
    });

    it('should handle channels with missing name', async () => {
      const channelWithoutName: PubNub.AppContext.ChannelMetadataObject<PubNub.AppContext.CustomData>[] = [
        {
          id: 'channel5',
          name: undefined as unknown as string,
          custom: { autoSubscribe: true, chain: 'mainnet', publisher: 'Publisher 5' },
          description: 'Test channel 5',
          updated: '2024-01-05T00:00:00Z',
          eTag: 'etag5'
        }
      ];
      mockPubNub.objects.getAllChannelMetadata.mockResolvedValue({
        data: channelWithoutName,
        status: 200
      });

      const result = await lastValueFrom(wrapper.fetchTopics());

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'channel5',
        name: '',
        autoSubscribe: true,
        chain: 'mainnet',
        publisher: 'Publisher 5'
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'PubNubProvider: Got a channel with an invalid name: using empty name instead',
        expect.any(Object)
      );
    });

    it('should handle custom as non-object and log warning', async () => {
      const channelWithInvalidCustomType: PubNub.AppContext.ChannelMetadataObject<PubNub.AppContext.CustomData>[] = [
        {
          id: 'channel6',
          name: 'Channel 6',
          custom: 'invalid' as unknown as PubNub.AppContext.CustomData,
          description: 'Test channel 6',
          updated: '2024-01-06T00:00:00Z',
          eTag: 'etag6'
        }
      ];
      mockPubNub.objects.getAllChannelMetadata.mockResolvedValue({
        data: channelWithInvalidCustomType,
        status: 200
      });

      const result = await lastValueFrom(wrapper.fetchTopics());

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'channel6',
        name: 'Channel 6',
        autoSubscribe: false,
        chain: '',
        publisher: 'Channel 6'
      });
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "PubNubProvider: Got a channel with invalid custom: can't set them",
        'invalid'
      );
    });

    it('should handle empty response', async () => {
      mockPubNub.objects.getAllChannelMetadata.mockResolvedValue({
        data: [],
        status: 200
      });

      const result = await lastValueFrom(wrapper.fetchTopics());

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should throw NetworkError when getAllChannelMetadata fails with network error', async () => {
      const networkError = new NetworkError(undefined, 'Network timeout');
      mockPubNub.objects.getAllChannelMetadata.mockRejectedValue(new Error('Network timeout'));
      mockErrorClassifier.throwForStatus.mockRejectedValue(networkError);

      await expect(lastValueFrom(wrapper.fetchTopics())).rejects.toThrow(NetworkError);
      expect(mockErrorClassifier.throwForStatus).toHaveBeenCalled();
    });

    it('should throw UnknownError when getAllChannelMetadata fails with unknown error', async () => {
      const unknownError = new UnknownError(500, 'Internal Server Error');
      mockPubNub.objects.getAllChannelMetadata.mockRejectedValue(new Error('Internal Server Error'));
      mockErrorClassifier.throwForStatus.mockRejectedValue(unknownError);

      await expect(lastValueFrom(wrapper.fetchTopics())).rejects.toThrow(UnknownError);
      expect(mockErrorClassifier.throwForStatus).toHaveBeenCalled();
    });

    it('should pass error to errorClassifier for classification', async () => {
      const originalError = new Error('PubNub error');
      mockPubNub.objects.getAllChannelMetadata.mockRejectedValue(originalError);
      mockErrorClassifier.throwForStatus.mockRejectedValue(new NetworkError(undefined, 'PubNub error'));

      await expect(lastValueFrom(wrapper.fetchTopics())).rejects.toThrow(NetworkError);
      expect(mockErrorClassifier.throwForStatus).toHaveBeenCalledWith(originalError);
    });

    it('should handle partial custom data with some valid properties', async () => {
      const channelWithPartialCustom: PubNub.AppContext.ChannelMetadataObject<PubNub.AppContext.CustomData>[] = [
        {
          id: 'channel7',
          name: 'Channel 7',
          custom: {
            autoSubscribe: true,
            chain: 'mainnet'
            // publisher is missing
          },
          description: 'Test channel 7',
          updated: '2024-01-07T00:00:00Z',
          eTag: 'etag7'
        }
      ];
      mockPubNub.objects.getAllChannelMetadata.mockResolvedValue({
        data: channelWithPartialCustom,
        status: 200
      });

      const result = await lastValueFrom(wrapper.fetchTopics());

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'channel7',
        name: 'Channel 7',
        autoSubscribe: true,
        chain: 'mainnet',
        publisher: 'Channel 7' // Falls back to channel name
      });
    });

    it('should handle autoSubscribe missing from custom data', async () => {
      const channelWithMissingAutoSubscribe: PubNub.AppContext.ChannelMetadataObject<PubNub.AppContext.CustomData>[] = [
        {
          id: 'channel8',
          name: 'Channel 8',
          custom: {
            chain: 'mainnet',
            publisher: 'Publisher 8'
          },
          description: 'Test channel 8',
          updated: '2024-01-08T00:00:00Z',
          eTag: 'etag8'
        }
      ];
      mockPubNub.objects.getAllChannelMetadata.mockResolvedValue({
        data: channelWithMissingAutoSubscribe,
        status: 200
      });

      const result = await lastValueFrom(wrapper.fetchTopics());

      expect(result).toHaveLength(1);
      expect(result[0].autoSubscribe).toBe(false);
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('constructor', () => {
    it('should use default PubNubErrorDiscriminator if not provided', () => {
      const wrapperWithDefaults = new PubNubRxWrapper(
        mockPubNub as unknown as PubNub,
        undefined as unknown as ErrorDiscriminator<unknown>,
        mockLogger
      );
      expect(wrapperWithDefaults).toBeInstanceOf(PubNubRxWrapper);
    });

    it('should accept custom error classifier', () => {
      const customClassifier: ErrorDiscriminator<unknown> = {
        throwForStatus: jest.fn()
      };
      const wrapperWithCustomClassifier = new PubNubRxWrapper(
        mockPubNub as unknown as PubNub,
        customClassifier,
        mockLogger
      );
      expect(wrapperWithCustomClassifier).toBeInstanceOf(PubNubRxWrapper);
    });
  });
});
