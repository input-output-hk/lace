e2eNotificationsCenter = {
  add: async (notification) => {
    const topics = await firstValueFrom(notificationsCenterApi.topics.topics$);

    if (topics.length === 0) throw new Error('No topics found, call init with some topics first');

    const result = e2eNotificationsCenter.validateNotification(notification, topics);

    if (result) throw new Error(result);

    await notificationsCenterApi.test.add(notification);
  },

  dump: async () => {
    const [notifications, topics] = await Promise.all([
      firstValueFrom(notificationsCenterApi.notifications.notifications$),
      firstValueFrom(notificationsCenterApi.topics.topics$)
    ]);

    return { notifications, topics };
  },

  init: async (topics, notifications) => {
    if (!(topics instanceof Array)) throw new Error('topics must be an array');

    for (let index = 0; index < topics.length; index++) {
      const result = e2eNotificationsCenter.validateTopic(topics[index]);

      if (result) throw new Error(`topics[${index}]: ${result}`);
    }

    if (!(notifications instanceof Array)) throw new Error('notifications must be an array');

    for (let index = 0; index < notifications.length; index++) {
      const result = e2eNotificationsCenter.validateNotification(notifications[index], topics);

      if (result) throw new Error(`notification[${index}]: ${result}`);
    }

    await notificationsCenterApi.test.init({ topics, notifications });

    return 'e2eNotificationsCenter init ok';
  },

  validateNotification: (notification, topics) => {
    if (typeof notification !== 'object' || notification === null) return 'notification must be an object';

    if (typeof notification.message !== 'object' || notification.message === null)
      return 'notification.message must be an object';

    for (const key in notification)
      if (!['message', 'read'].includes(key)) return `Unknown attribute in notification: ${key}`;

    for (const key in notification.message)
      if (!['id', 'title', 'body', 'publisher', 'chain', 'format', 'topicId'].includes(key))
        return `Unknown attribute in notification.message: ${key}`;

    const { message } = notification;

    if (typeof message.id !== 'string') return 'notification.message.id must be a string';
    if (typeof message.title !== 'string') return 'notification.message.title must be a string';
    if (typeof message.body !== 'string') return 'notification.message.body must be a string';
    if (typeof message.publisher !== 'string') return 'notification.message.publisher must be a string';
    if (typeof message.chain !== 'string') return 'notification.message.chain must be a string';
    if (typeof message.format !== 'string') return 'notification.message.format must be a string';
    if (typeof message.topicId !== 'string') return 'notification.message.topicId must be a string';

    const topic = topics.find((t) => t.id === message.topicId);

    if (!topic)
      return (
        'notification.message.topicId must be a valid topic id; available topics: ' +
        topics.map((t) => '"' + t.id + '"').join(', ')
      );

    if (notification.read !== undefined && typeof notification.read !== 'boolean')
      return 'notification.read must be a boolean';
  },

  validateTopic: (topic) => {
    if (typeof topic !== 'object' || topic === null) return 'topic must be an object';

    for (const key in topic)
      if (!['id', 'name', 'isSubscribed'].includes(key)) return `Unknown attribute in topic: ${key}`;

    if (typeof topic.id !== 'string') return 'topic.id must be a string';
    if (typeof topic.name !== 'string') return 'topic.name must be a string';
    if (topic.isSubscribed !== undefined && typeof topic.isSubscribed !== 'boolean')
      return 'topic.isSubscribed must be a boolean';
  }
};
