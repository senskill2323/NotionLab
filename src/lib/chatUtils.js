export const groupMessagesByMinute = (messages = []) => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }

  const groups = [];

  const formatKey = (createdAt) => {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) {
      return String(createdAt);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  messages.forEach((message, index) => {
    const minuteKey = formatKey(message.created_at);
    const senderKey = message.sender;
    const lastGroup = groups[groups.length - 1];

    if (
      lastGroup &&
      lastGroup.sender === senderKey &&
      lastGroup.minuteKey === minuteKey
    ) {
      lastGroup.messages.push(message);
      lastGroup.updatedAt = message.created_at;
    } else {
      const fallbackId = `${minuteKey}-${senderKey}-${index}`;
      groups.push({
        id: String(message.id ?? fallbackId),
        sender: senderKey,
        minuteKey,
        createdAt: message.created_at,
        updatedAt: message.created_at,
        messages: [message],
      });
    }
  });

  return groups;
};
