import { supabase } from '@/lib/customSupabaseClient';
import { v4 as uuidv4 } from 'uuid';
const STAFF_USER_TYPES = ['owner', 'admin', 'prof'];
const ADMIN_RECIPIENT_TYPES = new Set([...STAFF_USER_TYPES, 'client']);

const BROADCAST_MESSAGE_EVENT = 'message';
const BROADCAST_CONVERSATION_EVENT = 'conversation';
const ADMIN_BROADCAST_TOPIC = 'chat-live-admin';
const BROADCAST_SUBSCRIBE_TIMEOUT_MS = 15000;

const createBroadcastChannel = (topic) =>
  supabase.channel(topic, { config: { broadcast: { self: true, ack: true } } });

const broadcastChannelRegistry = new Map();

const acquireBroadcastChannel = (topic) => {
  if (!topic) return null;
  const existing = broadcastChannelRegistry.get(topic);
  if (existing) {
    existing.refCount += 1;
    return existing.channel;
  }
  const channel = createBroadcastChannel(topic);
  broadcastChannelRegistry.set(topic, { channel, refCount: 1 });
  return channel;
};

const releaseBroadcastChannel = (channel) => {
  if (!channel) return;
  const topic = channel.topic;
  if (!topic) return;
  const entry = broadcastChannelRegistry.get(topic);
  if (!entry) {
    try {
      supabase.removeChannel(channel);
    } catch (releaseError) {
      console.warn('Broadcast channel cleanup failed', { topic, error: releaseError });
    }
    return;
  }
  entry.refCount -= 1;
  if (entry.refCount <= 0) {
    broadcastChannelRegistry.delete(topic);
    try {
      if (typeof channel.unsubscribe === 'function') {
        channel.unsubscribe();
      }
    } catch (unsubscribeError) {
      console.warn('Broadcast channel unsubscribe failed', { topic, error: unsubscribeError });
    }
    try {
      supabase.removeChannel(channel);
    } catch (removeError) {
      console.warn('Broadcast channel remove failed', { topic, error: removeError });
    }
  }
};

const ensureChannelSubscribed = async (channel) => {
  if (!channel) return null;
  if (channel.state === 'joined') return channel;

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(channel);
    };

    const timeoutId = setTimeout(() => {
      console.warn('Broadcast channel subscribe timeout', { topic: channel.topic });
      finish();
    }, BROADCAST_SUBSCRIBE_TIMEOUT_MS);

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        clearTimeout(timeoutId);
        finish();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        clearTimeout(timeoutId);
        finish();
      }
    });
  });
};

const sendBroadcastToTopic = async (topic, event, payload) => {
  if (!topic) return;
  const channel = acquireBroadcastChannel(topic);
  if (!channel) return;
  try {
    await ensureChannelSubscribed(channel);
    const result = await channel.send({ type: 'broadcast', event, payload });
    if (result?.error) {
      console.error('Broadcast send failed', { topic, event, error: result.error });
    }
  } catch (error) {
    console.error('Broadcast send threw', { topic, event, error });
  } finally {
    releaseBroadcastChannel(channel);
  }
};

const getMessageChannelTopic = (conversationId) => (conversationId ? `client-chat-messages-${conversationId}` : null);

const getClientConversationChannelTopic = ({ guestId, guestEmail }) => {
  const parts = ['client-chat-conversations'];
  if (guestId) parts.push(guestId);
  if (guestEmail) parts.push(guestEmail);
  return parts.length > 1 ? parts.join('-') : null;
};

const normalizeConversationForBroadcast = (conversation) => {
  if (!conversation) return null;
  return {
    ...conversation,
    client_archived:
      typeof conversation.client_archived === 'boolean'
        ? conversation.client_archived
        : Boolean(conversation.client_archived),
    admin_archived:
      typeof conversation.admin_archived === 'boolean'
        ? conversation.admin_archived
        : conversation.admin_archived === null
          ? null
          : Boolean(conversation.admin_archived),
    has_unread:
      typeof conversation.has_unread === 'boolean'
        ? conversation.has_unread
        : conversation.has_unread === null || typeof conversation.has_unread === 'undefined'
          ? conversation.has_unread ?? null
          : Boolean(conversation.has_unread),
  };
};

const broadcastMessageChange = async ({ eventType, record, previous = null }) => {
  const payload = {
    eventType,
    new: record || null,
    old: previous || null,
  };
  const conversationId = record?.conversation_id || previous?.conversation_id;
  if (!conversationId) return;
  await Promise.all([
    sendBroadcastToTopic(getMessageChannelTopic(conversationId), BROADCAST_MESSAGE_EVENT, payload),
    sendBroadcastToTopic(ADMIN_BROADCAST_TOPIC, BROADCAST_MESSAGE_EVENT, payload),
  ]);
};

const broadcastConversationChange = async ({ eventType, record, previous = null }) => {
  const normalizedNew = normalizeConversationForBroadcast(record);
  const normalizedOld = normalizeConversationForBroadcast(previous);
  if (!normalizedNew && !normalizedOld) return;

  const payload = {
    eventType,
    new: normalizedNew,
    old: normalizedOld,
  };

  const targets = new Set([ADMIN_BROADCAST_TOPIC]);
  const reference = normalizedNew || normalizedOld;
  const clientTopic = getClientConversationChannelTopic({
    guestId: reference?.guest_id || null,
    guestEmail: reference?.guest_email || null,
  });
  if (clientTopic) targets.add(clientTopic);

  await Promise.all(
    Array.from(targets).map((topic) => sendBroadcastToTopic(topic, BROADCAST_CONVERSATION_EVENT, payload))
  );
};

const normalizeAdminConversation = (conversation) => {
  if (!conversation) return conversation;
  return {
    ...conversation,
    client_archived: Boolean(conversation.client_archived),
    admin_archived: Boolean(conversation.admin_archived),
  };
};

const normalizeClientConversation = (conversation) => {
  if (!conversation) return conversation;
  return {
    ...conversation,
    client_archived: Boolean(conversation.client_archived),
    has_unread: Boolean(conversation.has_unread),
    staff_user_id: conversation.staff_user_id || null,
    staff_user_type: conversation.staff_user_type || null,
    staff_first_name: conversation.staff_first_name || null,
    staff_last_name: conversation.staff_last_name || null,
  };
};
const findLatestConversationForRecipient = async ({ guestId, guestEmail }) => {
  let query = supabase
    .from('chat_conversations')
    .select('*')
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);

  if (guestId) {
    query = query.eq('guest_id', guestId);
  }

  if (guestEmail) {
    query = query.eq('guest_email', guestEmail);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return Array.isArray(data) && data.length > 0 ? data[0] : null;
};


export const getClientGuestIdentifiers = (user) => {
  const profile = user?.profile ?? {};
  const guestId = profile?.chat_guest_id || user?.id || null;
  const guestEmail = user?.email || null;
  const guestKey = guestId || guestEmail || null;
  return { guestId, guestEmail, guestKey };
};

export const listClientConversations = async (user) => {
  const { guestId, guestEmail } = getClientGuestIdentifiers(user);
  if (!guestId && !guestEmail) {
    throw new Error('Utilisateur non authentifie.');
  }

  const { data, error } = await supabase.rpc('get_chat_conversations_with_details');
  if (error) {
    console.error('listClientConversations failed', error);
    throw new Error(error?.message || error?.details || 'Impossible de charger les conversations.');
  }

  return (Array.isArray(data) ? data : []).map(normalizeClientConversation);
};

export const listChatStaffUsers = async () => {
  const { data, error } = await supabase.rpc('client_list_chat_staff_users');
  if (error) {
    console.error('listChatStaffUsers failed', error);
    throw new Error('Impossible de charger les destinataires.');
  }

  const staffList = Array.isArray(data) ? data : [];
  return staffList.map((staff) => ({
    ...staff,
    user_type: staff?.user_type || null,
  }));
};

export const archiveClientConversation = async (conversationId, archived) => {
  if (!conversationId) throw new Error('ID de conversation manquant.');

  const { data, error } = await supabase.rpc('client_chat_set_archived', {
    p_conversation_id: conversationId,
    p_archived: !!archived,
  });

  if (error) {
    console.error('archiveClientConversation failed', error);
    throw new Error("Impossible de mettre a jour l'archivage de la conversation.");
  }

  const normalized = normalizeClientConversation(data);
  await broadcastConversationChange({ eventType: 'UPDATE', record: normalized });

  return normalized;
};

export const getOrCreateConversation = async (user) => {
  if (!user) throw new Error("Utilisateur non authentifiÃƒÂ©.");

  let { data, error } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('guest_email', user.email)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error("Impossible de rÃƒÂ©cupÃƒÂ©rer la conversation.");

  if (data && data.length > 0 && data[0].status !== 'resolu' && data[0].status !== 'abandonne') {
    return data[0];
  }

  const { data: newConvData, error: newConvError } = await supabase
    .from('chat_conversations')
    .insert({ guest_id: uuidv4(), guest_email: user.email, status: 'ouvert' })
    .select()
    .single();

  if (newConvError) throw new Error(`Impossible de dÃƒÂ©marrer le chat: ${newConvError.message}`);
  
  return newConvData;
};

getOrCreateConversation.subscribeToMessages = (conversationId, callback) => {
  if (!conversationId) return null;

  const topic = getMessageChannelTopic(conversationId);
  if (!topic) return null;

  const channel = acquireBroadcastChannel(topic);
  if (!channel) return null;

  let active = true;

  const handlePayload = async (payload) => {
    if (!active) return;
    if (!payload) return;

    let message = payload.new;
    const messageId = payload?.new?.id;

    if (messageId) {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*, resource:resources(id, name, url, file_path)')
          .eq('id', messageId)
          .single();

        if (!error && data) {
          message = data;
        }
      } catch (error) {
        console.error('subscribeToMessages enrichment failed', error);
      }
    }

    if (message && typeof callback === 'function') {
      callback(message);
    }
  };

  channel.on('broadcast', { event: BROADCAST_MESSAGE_EVENT }, (event) => {
    handlePayload(event?.payload ?? null);
  });

  ensureChannelSubscribed(channel).catch((error) => {
    console.error('subscribeToMessages subscribe failed', { topic, error });
  });

  return {
    unsubscribe: () => {
      active = false;
      releaseBroadcastChannel(channel);
    },
  };
};

export const getClientChatStatus = async ({ guestId, guestEmail }) => {
  if (!guestId && !guestEmail) throw new Error("Identifiant client manquant.");

  let query = supabase
    .from('chat_conversations')
    .select(`
      id,
      status,
      client_last_viewed_at,
      chat_messages(
        sender,
        created_at
      )
    `)
    .neq('status', 'resolu')
    .neq('status', 'abandonne');

  if (guestId) {
    query = query.eq('guest_id', guestId);
  }

  if (guestEmail) {
    query = query.eq('guest_email', guestEmail);
  }

  query = query.order('created_at', { foreignTable: 'chat_messages', ascending: false });
  query = query.limit(1, { foreignTable: 'chat_messages' });

  const { data, error } = await query;

  if (error) {
    console.error('getClientChatStatus failed', error);
    throw new Error("Impossible de rÃ©cupÃ©rer le statut du chat.");
  }

  const conversations = (data || []).map((conversation) => {
    const latestMessage = Array.isArray(conversation.chat_messages) ? conversation.chat_messages[0] : null;
    return {
      id: conversation.id,
      status: conversation.status,
      clientLastViewedAt: conversation.client_last_viewed_at,
      latestMessageAt: latestMessage?.created_at || null,
      latestMessageSender: latestMessage?.sender || null,
    };
  });

  const hasUnread = conversations.some((conversation) => {
    if (conversation.latestMessageSender !== 'admin') return false;
    if (!conversation.latestMessageAt || !conversation.clientLastViewedAt) return false;
    try {
      return new Date(conversation.latestMessageAt).getTime() > new Date(conversation.clientLastViewedAt).getTime();
    } catch (_) {
      return false;
    }
  });

  return { conversations, hasUnread };
};

export const markConversationViewedByClient = async (conversationId) => {
  if (!conversationId) throw new Error("ID de conversation non fourni.");

  const { error } = await supabase
    .from('chat_conversations')
    .update({ client_last_viewed_at: new Date().toISOString() })
    .eq('id', conversationId);

  if (error) {
    throw new Error("Impossible de mettre Ã  jour le statut de lecture du chat.");
  }
};

export const subscribeToClientChatMessages = (conversationId, callback) => {
  if (!conversationId) return null;

  const topic = getMessageChannelTopic(conversationId);
  if (!topic) return null;

  const channel = acquireBroadcastChannel(topic);
  if (!channel) return null;

  let active = true;

  const handlePayload = async (payload) => {
    if (!active) return;
    if (!payload) return;
    let enrichedPayload = payload;
    const messageId = payload?.new?.id;

    if (messageId) {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*, resource:resources(id, name, url, file_path)')
          .eq('id', messageId)
          .single();

        if (!error && data) {
          enrichedPayload = { ...payload, new: data };
        } else if (error) {
          console.error('subscribeToClientChatMessages enrichment failed', error);
        }
      } catch (error) {
        console.error('subscribeToClientChatMessages enrichment threw', error);
      }
    }

    if (typeof callback === 'function') {
      callback(enrichedPayload);
    }
  };

  channel.on('broadcast', { event: BROADCAST_MESSAGE_EVENT }, (event) => {
    if (!active) return;
    handlePayload(event?.payload ?? null);
  });

  ensureChannelSubscribed(channel).catch((error) => {
    console.error('subscribeToClientChatMessages subscribe failed', { topic, error });
  });

  return {
    unsubscribe: () => {
      active = false;
      releaseBroadcastChannel(channel);
    },
  };
};

export const subscribeToClientConversations = (params, callback) => {
  const guestId = params?.guestId || null;
  const guestEmail = params?.guestEmail || null;
  const topic = getClientConversationChannelTopic({ guestId, guestEmail });
  if (!topic) return null;

  const channel = acquireBroadcastChannel(topic);
  if (!channel) return null;

  let active = true;

  channel.on('broadcast', { event: BROADCAST_CONVERSATION_EVENT }, (event) => {
    if (!active) return;
    const payload = event?.payload ?? null;
    if (typeof callback === 'function') {
      callback(payload);
    }
  });

  ensureChannelSubscribed(channel).catch((error) => {
    console.error('subscribeToClientConversations subscribe failed', { topic, error });
  });

  return {
    unsubscribe: () => {
      active = false;
      releaseBroadcastChannel(channel);
    },
  };
};

export const fetchMessages = async (conversationId) => {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*, resource:resources(id, name, url, file_path)')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
    
  if (error) throw new Error("Impossible de charger les messages.");
  return data || [];
};

const getSenderRole = (isAdmin) => (isAdmin ? 'admin' : 'user');

export const sendMessage = async (conversationId, content, isAdmin) => {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender: getSenderRole(isAdmin),
      content,
    })
    .select('*')
    .single();

  if (error) throw new Error(`Votre message n'a pas pu etre envoye: ${error.message}`);

  await broadcastMessageChange({ eventType: 'INSERT', record: data });

  return data;
};

export const sendFile = async (file, conversation, isAdmin) => {
  const fileName = `${uuidv4()}-${file.name}`;
  const filePath = `${conversation.guest_id}/${fileName}`;

  const { error: uploadError } = await supabase.storage.from('chat_attachments').upload(filePath, file);
  if (uploadError) throw new Error(`Echec de l'envoi du fichier: ${uploadError.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from('chat_attachments').getPublicUrl(filePath);

  const { data: message, error: messageError } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversation.id,
      sender: getSenderRole(isAdmin),
      content: file.type.startsWith('image/') ? '' : file.name,
      file_url: publicUrl,
      file_type: file.type,
    })
    .select('*')
    .single();

  if (messageError) throw new Error(`Echec de l'enregistrement du message: ${messageError.message}`);

  await broadcastMessageChange({ eventType: 'INSERT', record: message });

  return message;
};

export const sendResource = async (resource, conversationId, isAdmin) => {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender: getSenderRole(isAdmin),
      content: `Ressource partagee : ${resource.name}`,
      resource_id: resource.id,
    })
    .select('*')
    .single();

  if (error) throw new Error('Impossible de partager la ressource.');

  await broadcastMessageChange({ eventType: 'INSERT', record: data });

  return data;
};

export const startClientConversation = async ({ staffUserId = null, initialMessage = '' } = {}) => {
  const { data, error } = await supabase.rpc('client_start_chat_conversation', {
    p_staff_user_id: staffUserId,
  });

  if (error) {
    console.error('startClientConversation failed', error);
    throw new Error('Impossible de creer la conversation.');
  }

  const conversation = normalizeClientConversation(data);
  await broadcastConversationChange({ eventType: 'INSERT', record: conversation });

  const trimmedInitialMessage = initialMessage?.trim();
  if (trimmedInitialMessage) {
    try {
      await sendMessage(conversation.id, trimmedInitialMessage, false);
    } catch (messageError) {
      console.error('Initial message send failed', messageError);
      throw new Error("Conversation creee mais impossible d'envoyer le premier message.");
    }
  }

  return conversation;
};

export const listAdminChatRecipients = async () => {
  const { data, error } = await supabase.rpc('admin_list_chat_recipients');
  if (error) {
    console.error('listAdminChatRecipients failed', error);
    throw new Error('Impossible de charger les destinataires.');
  }

  const recipients = Array.isArray(data) ? data : [];
  return recipients
    .filter((recipient) => {
      const type = (recipient?.user_type || '').toLowerCase();
      return !type || ADMIN_RECIPIENT_TYPES.has(type);
    })
    .map((recipient) => ({
      ...recipient,
      chat_guest_id: recipient?.chat_guest_id || null,
      email: recipient?.email || null,
      first_name: recipient?.first_name || '',
      last_name: recipient?.last_name || '',
      user_type: recipient?.user_type || null,
      user_type_display_name: recipient?.user_type_display_name || null,
      status: recipient?.status || null,
    }));
};

export const startAdminConversation = async ({ staffUserId, recipient, forceNew = true }) => {
  if (!staffUserId) {
    throw new Error('Administrateur non authentifie.');
  }
  if (!recipient || !recipient.id) {
    throw new Error('Destinataire invalide.');
  }

  const recipientType = (recipient.user_type || '').toLowerCase();
  if (recipientType && !ADMIN_RECIPIENT_TYPES.has(recipientType)) {
    throw new Error('Destinataire non autorise.');
  }

  const guestId = recipient.chat_guest_id || (recipientType === 'client' ? recipient.id : null);
  const guestEmail = recipient.email || null;

  if (!guestId && !guestEmail) {
    throw new Error('Impossible de determiner le destinataire.');
  }

const reuseExistingConversation = async () => {
  const existing = await findLatestConversationForRecipient({ guestId, guestEmail });
  if (!existing) return null;

  const previousNormalized = normalizeConversationForBroadcast(existing);

  const shouldResetStatus = ['resolu', 'abandonne'].includes(existing.status || '');
  const updates = {
    staff_user_id: staffUserId,
    admin_archived: false,
    client_archived: false,
    updated_at: new Date().toISOString(),
  };

  if (shouldResetStatus) {
    updates.status = 'ouvert';
  }
  if (guestId && existing.guest_id !== guestId) {
    updates.guest_id = guestId;
  }
  if (guestEmail && existing.guest_email !== guestEmail) {
    updates.guest_email = guestEmail;
  }

  const { data: updated, error: updateError } = await supabase
    .from('chat_conversations')
    .update(updates)
    .eq('id', existing.id)
    .select('*')
    .single();

  if (updateError) {
    throw updateError;
  }

  const broadcastRecord = normalizeConversationForBroadcast(updated);
  await broadcastConversationChange({ eventType: 'UPDATE', record: broadcastRecord, previous: previousNormalized });

  return normalizeAdminConversation(updated);
};

const createFreshConversation = async () => {
  const nowIso = new Date().toISOString();
  const payload = {
    guest_id: guestId,
    guest_email: guestEmail,
    staff_user_id: staffUserId,
    status: 'ouvert',
    admin_archived: false,
    client_archived: false,
    updated_at: nowIso,
  };

  const { data: inserted, error: insertError } = await supabase
    .from('chat_conversations')
    .insert(payload)
    .select('*')
    .single();

  if (insertError) {
    throw insertError;
  }

  const broadcastRecord = normalizeConversationForBroadcast(inserted);
  await broadcastConversationChange({ eventType: 'INSERT', record: broadcastRecord });

  return normalizeAdminConversation(inserted);
};

  try {
    if (forceNew) {
      try {
        return await createFreshConversation();
      } catch (insertError) {
        const code = insertError?.code || insertError?.cause?.code;
        const message = insertError?.message || '';
        if (code === '23505' || /duplicate key/i.test(message)) {
          const fallback = await reuseExistingConversation();
          if (fallback) {
            return fallback;
          }
        }
        throw insertError;
      }
    }

    const existing = await reuseExistingConversation();
    if (existing) {
      return existing;
    }

    return await createFreshConversation();
  } catch (error) {
    console.error('startAdminConversation failed', error);
    throw new Error('Impossible de creer la conversation.');
  }
};
export const setAdminConversationArchived = async (conversationId, archived) => {
  if (!conversationId) throw new Error('ID de conversation manquant.');

  const { data, error } = await supabase.rpc('admin_chat_set_archived', {
    p_id: conversationId,
    p_archived: !!archived,
  });

  if (error) {
    console.error('setAdminConversationArchived failed', error);
    throw error;
  }

  if (data) {
    const broadcastRecord = normalizeConversationForBroadcast(data);
    await broadcastConversationChange({ eventType: 'UPDATE', record: broadcastRecord });
    return normalizeAdminConversation(data);
  }

  return null;
};

export const clearChatHistory = async (conversationId) => {
  if (!conversationId) throw new Error("ID de conversation non fourni.");

  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('conversation_id', conversationId);

  if (error) {
    console.error("Error clearing chat history:", error);
    throw new Error("Impossible de vider l'historique du chat.");
  }
};
