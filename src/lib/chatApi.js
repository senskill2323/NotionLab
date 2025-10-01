import { supabase } from '@/lib/customSupabaseClient';
import { v4 as uuidv4 } from 'uuid';
const STAFF_USER_TYPES = ['owner', 'admin', 'prof'];
const ADMIN_RECIPIENT_TYPES = new Set([...STAFF_USER_TYPES, 'client']);

const BROADCAST_MESSAGE_EVENT = 'message';
const BROADCAST_CONVERSATION_EVENT = 'conversation';
const ADMIN_BROADCAST_TOPIC = 'chat-live-admin';
const BROADCAST_SUBSCRIBE_TIMEOUT_MS = 15000;

const MESSAGE_SELECT_FIELDS = '*, resource:resources(id, name, url, file_path)';

const slugifyGuestName = (value) => {
  if (!value) return '';
  try {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  } catch (_error) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
};

const buildFallbackGuestEmail = (guestName) => {
  const slug = slugifyGuestName(guestName);
  if (!slug) return null;
  return `${slug}@chat.guest`;
};

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
      // Do not block on subscribe ack; proceed anyway
      console.warn('Broadcast channel subscribe timeout', { topic: channel.topic });
      finish();
    }, 700);

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
  if (!payload || typeof payload !== 'object') {
    console.warn('Skipped broadcast due to invalid payload', { topic, event, payloadType: typeof payload, payload });
    return;
  }
  console.info('[broadcast] send', { topic, event, payload });
  const channel = acquireBroadcastChannel(topic);
  if (!channel) return;
  try {
    // Try to subscribe briefly but don't block the caller
    await Promise.race([ensureChannelSubscribed(channel), new Promise((r) => setTimeout(r, 300))]);
    // Send with a safety timeout so UI isn't blocked by acks
    const sendPromise = channel.send({ type: 'broadcast', event, payload });
    const timeout = new Promise((resolve) => setTimeout(resolve, 1500));
    const result = await Promise.race([sendPromise, timeout]);
    console.info('[broadcast] result', { topic, event, result });
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
  if (guestId) {
    parts.push(guestId);
    return parts.join('-');
  }
  if (guestEmail) {
    parts.push(String(guestEmail).trim().toLowerCase());
    return parts.join('-');
  }
  return null;
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


const sanitizeMessageContent = (value) => {
  if (value === null || typeof value === 'undefined') return '';
  if (typeof value !== 'string') {
    return String(value);
  }
  return value.trim();
};

const buildMessageInsertPayload = ({ conversationId, senderRole, content, overrides = {} }) => ({
  conversation_id: conversationId,
  sender: senderRole,
  content,
  ...overrides,
});

const insertMessageRecord = async ({ payload, previous = null, buildErrorMessage, eventType = 'INSERT' }) => {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert(payload)
    .select(MESSAGE_SELECT_FIELDS)
    .single();

  if (error) {
    console.error('insertMessageRecord failed', { error, payload });
    const message =
      typeof buildErrorMessage === 'function'
        ? buildErrorMessage(error)
        : "Impossible d'enregistrer le message.";
    throw new Error(message);
  }

  await broadcastMessageChange({ eventType, record: data, previous });
  return data;
};

const hydrateMessageRecord = async (messageId) => {
  if (!messageId) return null;

  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select(MESSAGE_SELECT_FIELDS)
      .eq('id', messageId)
      .single();

    if (error) {
      console.error('hydrateMessageRecord failed', { messageId, error });
      return null;
    }

    return data;
  } catch (error) {
    console.error('hydrateMessageRecord threw', { messageId, error });
    return null;
  }
};

const shouldHydrateMessage = (message) => {
  if (!message) return false;
  if (message.resource_id && typeof message.resource === 'undefined') return true;
  if (message.file_url && typeof message.file_type === 'undefined') return true;
  return false;
};

const createMessageSubscription = ({
  conversationId = null,
  includeConversationChannel = false,
  includeAdminBroadcast = false,
  callback,
  context = 'messageSubscription',
  onFallback = null,
}) => {
  const activeChannels = new Set();
  let active = true;

  const cleanup = () => {
    if (!active) return;
    active = false;
    activeChannels.forEach((channel) => releaseBroadcastChannel(channel));
    activeChannels.clear();
  };

  const triggerFallback = async (reason, payload) => {
    if (typeof onFallback !== 'function') return;
    try {
      await onFallback({ reason, payload, conversationId, context });
    } catch (error) {
      console.error('messageSubscription fallback failed', { context, reason, error });
    }
  };

  const emit = async (payload) => {
    if (!active) return;
    if (!payload) {
      await triggerFallback('empty-payload', null);
      if (typeof callback === 'function') {
        callback(null);
      }
      return;
    }

    const eventType = payload?.eventType || payload?.type || null;
    const message = payload?.new || null;
    const previous = payload?.old || null;
    const conversationFilter = conversationId || null;
    const conversationRef = message?.conversation_id ?? previous?.conversation_id ?? null;

    if (conversationFilter) {
      if (!conversationRef) {
        await triggerFallback('missing-conversation-id', payload);
        return;
      }
      if (conversationRef !== conversationFilter) {
        return;
      }
    }

    if (!message) {
      if (eventType === 'DELETE' && previous?.id) {
        if (typeof callback === 'function') {
          callback(payload);
        }
        return;
      }
      await triggerFallback('missing-message', payload);
      return;
    }

    let enrichedPayload = payload;
    if (message.id && shouldHydrateMessage(message)) {
      const hydrated = await hydrateMessageRecord(message.id);
      if (hydrated) {
        enrichedPayload = { ...payload, new: hydrated };
      } else {
        await triggerFallback('hydrate-failed', payload);
        return;
      }
    }

    if (typeof callback === 'function') {
      callback(enrichedPayload);
    }
  };

  const subscribeChannel = (channel, label) => {
    if (!channel) return;
    activeChannels.add(channel);
    ensureChannelSubscribed(channel).catch((error) => {
      console.error(`${label} subscribe failed`, { topic: channel.topic, error });
      triggerFallback('subscribe-failed', { error, topic: channel.topic, label });
    });
  };

  if (includeConversationChannel && conversationId) {
    const topic = getMessageChannelTopic(conversationId);
    if (topic) {
      const channel = acquireBroadcastChannel(topic);
      if (channel) {
        const postgresFilter = `conversation_id=eq.${conversationId}`;
        channel.on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'chat_messages', filter: postgresFilter },
          (event) => {
            if (!active) return;
            const eventType = event?.eventType || event?.type || null;
            const payload = event
              ? { eventType, new: event.new ?? null, old: event.old ?? null }
              : null;
            emit(payload);
          }
        );

        channel.on('broadcast', { event: BROADCAST_MESSAGE_EVENT }, (event) => {
          if (!active) return;
          emit(event?.payload ?? null);
        });

        subscribeChannel(channel, context);
      } else {
        triggerFallback('channel-unavailable', { topic, conversationId, context });
      }
    } else if (includeConversationChannel) {
      triggerFallback('topic-unavailable', { conversationId, context });
    }
  }

  if (includeAdminBroadcast) {
    const adminChannel = acquireBroadcastChannel(ADMIN_BROADCAST_TOPIC);
    if (adminChannel) {
      adminChannel.on('broadcast', { event: BROADCAST_MESSAGE_EVENT }, (event) => {
        if (!active) return;
        emit(event?.payload ?? null);
      });

      subscribeChannel(adminChannel, context);
    } else {
      triggerFallback('admin-channel-unavailable', { topic: ADMIN_BROADCAST_TOPIC, context });
    }
  }

  if (activeChannels.size === 0) {
    triggerFallback('no-active-channels', { conversationId, context });
    return null;
  }

  return {
    unsubscribe: cleanup,
  };
};


const uploadChatAttachment = async ({ file, conversation }) => {
  if (!file) {
    throw new Error('Fichier manquant.');
  }
  if (!conversation?.id) {
    throw new Error('Identifiant de conversation manquant.');
  }

  const guestReference =
    conversation.guest_id ||
    conversation.guestId ||
    conversation.guest_email ||
    conversation.id ||
    'conversation';
  const safeGuestReference = String(guestReference || 'conversation').trim() || 'conversation';
  const originalName = file.name || 'piece-jointe';
  const normalizedOriginalName = originalName.replace(/\s+/g, '-');
  const fileName = `${uuidv4()}-${normalizedOriginalName}`;
  const filePath = `${safeGuestReference}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('chat_attachments')
    .upload(filePath, file, { cacheControl: '3600', upsert: false });

  if (uploadError) {
    console.error('uploadChatAttachment failed', { uploadError, filePath });
    throw new Error(`Echec de l'envoi du fichier: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from('chat_attachments').getPublicUrl(filePath);
  const fileUrl = publicUrlData?.publicUrl;
  if (!fileUrl) {
    throw new Error("Impossible de recuperer l'URL publique du fichier.");
  }

  return {
    fileUrl,
    filePath,
    fileType: file.type || null,
    originalName,
  };
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

const unwrapConversationRow = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] : null;
  }
  return value;
};

const broadcastAndNormalizeConversation = async ({ record, previous = null, eventType = 'INSERT', perspective = 'client' }) => {
  if (!record) return null;

  await broadcastConversationChange({ eventType, record, previous });

  if (perspective === 'admin') {
    return normalizeAdminConversation(record);
  }

  return normalizeClientConversation(record);
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

export const ensureClientConversation = async ({ guestId = null, guestEmail = null, guestName = '', forceNew = false } = {}) => {
  let conversation = null;
  try {
    conversation = await startClientConversation({ forceNew });
  } catch (error) {
    if (!String(error?.message || '').toLowerCase().includes('utilisateur non authentifie')) {
      console.warn('ensureClientConversation startClientConversation fallback', { forceNew, error });
    }
  }

  if (conversation) {
    return conversation;
  }

  const normalizedGuestId = guestId ? String(guestId).trim() : null;
  const normalizedGuestEmail = guestEmail ? String(guestEmail).trim().toLowerCase() : null;
  const fallbackEmail = buildFallbackGuestEmail(guestName);
  const effectiveGuestEmail = normalizedGuestEmail || fallbackEmail || null;

  if (!normalizedGuestId && !effectiveGuestEmail) {
    throw new Error('Impossible de determiner le profil du visiteur.');
  }

  if (!forceNew) {
    let query = supabase
      .from('chat_conversations')
      .select('*')
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);

    if (normalizedGuestId) {
      query = query.eq('guest_id', normalizedGuestId);
    } else if (effectiveGuestEmail) {
      query = query.eq('guest_email', effectiveGuestEmail);
    }

    const { data: existingData, error: existingError } = await query;
    if (existingError) {
      console.error('ensureClientConversation lookup failed', { guestId: normalizedGuestId, guestEmail: effectiveGuestEmail, error: existingError });
      throw new Error('Impossible de recuperer la conversation.');
    }

    const existingRecord = unwrapConversationRow(existingData);
    if (existingRecord) {
      const shouldResetStatus = ['resolu', 'abandonne'].includes(existingRecord.status || '');
      const shouldUpdateGuestId = Boolean(normalizedGuestId && existingRecord.guest_id !== normalizedGuestId);
      const shouldUpdateGuestEmail = Boolean(
        effectiveGuestEmail && (!existingRecord.guest_email || existingRecord.guest_email.toLowerCase() !== effectiveGuestEmail)
      );
      const shouldClearArchive = Boolean(existingRecord.client_archived);

      if (shouldResetStatus || shouldUpdateGuestId || shouldUpdateGuestEmail || shouldClearArchive) {
        const updates = {
          updated_at: new Date().toISOString(),
          client_archived: false,
        };
        if (shouldResetStatus) {
          updates.status = 'ouvert';
        }
        if (shouldUpdateGuestId) {
          updates.guest_id = normalizedGuestId;
        }
        if (shouldUpdateGuestEmail) {
          updates.guest_email = effectiveGuestEmail;
        }

        const { data: reopenedData, error: reopenError } = await supabase
          .from('chat_conversations')
          .update(updates)
          .eq('id', existingRecord.id)
          .select('*')
          .single();

        if (reopenError) {
          console.error('ensureClientConversation reopen failed', { conversationId: existingRecord.id, updates, error: reopenError });
          throw new Error('Impossible de reouvrir la conversation.');
        }

        const reopenedRecord = unwrapConversationRow(reopenedData);
        return broadcastAndNormalizeConversation({
          record: reopenedRecord,
          previous: existingRecord,
          eventType: 'UPDATE',
          perspective: 'client',
        });
      }

      return normalizeClientConversation(existingRecord);
    }
  }

  const insertPayload = {
    guest_id: normalizedGuestId || uuidv4(),
    guest_email: effectiveGuestEmail,
    status: 'ouvert',
    client_archived: false,
    admin_archived: false,
  };

  const { data: insertedData, error: insertError } = await supabase
    .from('chat_conversations')
    .insert(insertPayload)
    .select('*')
    .single();

  if (insertError) {
    console.error('ensureClientConversation insert failed', { payload: insertPayload, error: insertError });
    throw new Error('Impossible de creer la conversation.');
  }

  const insertedRecord = unwrapConversationRow(insertedData);
  return broadcastAndNormalizeConversation({
    record: insertedRecord,
    eventType: 'INSERT',
    perspective: 'client',
  });
};

export const resolveClientConversation = async (conversationId) => {
  if (!conversationId) throw new Error('ID de conversation manquant.');

  let previousRecord = null;
  try {
    const { data: previousData } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    previousRecord = unwrapConversationRow(previousData);
  } catch (error) {
    console.warn('resolveClientConversation previous fetch failed', { conversationId, error });
  }

  const updates = {
    status: 'resolu',
    client_archived: true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('chat_conversations')
    .update(updates)
    .eq('id', conversationId)
    .select('*')
    .single();

  if (error) {
    console.error('resolveClientConversation failed', { conversationId, error });
    throw new Error('Impossible de fermer la conversation.');
  }

  const record = unwrapConversationRow(data);
  return broadcastAndNormalizeConversation({
    record,
    previous: previousRecord,
    eventType: 'UPDATE',
    perspective: 'client',
  });
};

export const listAdminConversations = async ({ view = 'active', limit = 100, offset = 0 } = {}) => {
  const isArchivedView = view === 'archived';

  const { data, error } = await supabase.rpc('admin_get_chat_conversations_with_details', {
    p_archived: isArchivedView ? null : false,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error('listAdminConversations failed', error);
    throw new Error(error?.message || error?.details || 'Impossible de charger les conversations admin.');
  }

  const normalized = (Array.isArray(data) ? data : []).map(normalizeAdminConversation);
  if (isArchivedView) {
    return normalized.filter((conversation) => Boolean(conversation?.admin_archived));
  }
  return normalized.filter((conversation) => !conversation?.admin_archived);
};

export const markConversationViewedByAdmin = async (conversationId) => {
  if (!conversationId) throw new Error('ID de conversation manquant.');

  let previousRecord = null;
  try {
    const { data: previousData } = await supabase
      .from('chat_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    previousRecord = unwrapConversationRow(previousData);
  } catch (error) {
    console.warn('markConversationViewedByAdmin previous fetch failed', { conversationId, error });
  }

  const updates = { admin_last_viewed_at: new Date().toISOString() };
  const { data, error } = await supabase
    .from('chat_conversations')
    .update(updates)
    .eq('id', conversationId)
    .select('*')
    .single();

  if (error) {
    console.error('markConversationViewedByAdmin failed', { conversationId, error });
    throw new Error('Impossible de mettre a jour le statut de lecture.');
  }

  const record = unwrapConversationRow(data);
  return broadcastAndNormalizeConversation({
    record,
    previous: previousRecord,
    eventType: 'UPDATE',
    perspective: 'admin',
  });
};

export const getOrCreateConversation = async (user) => {
  if (!user) throw new Error("Utilisateur non authentifie.");

  let { data, error } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('guest_email', user.email)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error("Impossible de recuperer la conversation.");

  if (data && data.length > 0 && data[0].status !== 'resolu' && data[0].status !== 'abandonne') {
    return data[0];
  }

  const { data: newConvData, error: newConvError } = await supabase
    .from('chat_conversations')
    .insert({ guest_id: uuidv4(), guest_email: user.email, status: 'ouvert' })
    .select()
    .single();

  if (newConvError) throw new Error(`Impossible de demarrer le chat: ${newConvError.message}`);
  
  return newConvData;
};

getOrCreateConversation.subscribeToMessages = (conversationId, callback) => {
  if (!conversationId) return null;

  const topic = getMessageChannelTopic(conversationId);
  if (!topic) return null;

  const channel = acquireBroadcastChannel(topic);
  if (!channel) return null;

  let active = true;
  const postgresFilter = `conversation_id=eq.${conversationId}`;

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

  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'chat_messages', filter: postgresFilter },
    (event) => {
      if (!active) return;
      const eventType = event?.eventType || event?.type || null;
      const payload = event
        ? { eventType, new: event.new ?? null, old: event.old ?? null }
        : null;
      handlePayload(payload);
    }
  );

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
    throw new Error("Impossible de recuperer le statut du chat.");
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
    throw new Error("Impossible de mettre a jour le statut de lecture du chat.");
  }

  return true;
};

export const subscribeToClientChatMessages = (conversationId, callback, options = {}) => {
  if (!conversationId) return null;

  const normalizedOptions = options && typeof options === 'object' ? options : {};

  return createMessageSubscription({
    conversationId,
    includeConversationChannel: true,
    includeAdminBroadcast: false,
    callback,
    context: 'subscribeToClientChatMessages',
    onFallback: typeof normalizedOptions.onFallback === 'function' ? normalizedOptions.onFallback : null,
  });
};

export const subscribeToAdminChatMessages = (conversationIdOrCallback, maybeCallback = undefined, maybeOptions = undefined) => {
  let conversationId = conversationIdOrCallback;
  let callback = maybeCallback;
  let options = maybeOptions;

  if (typeof conversationId === 'function') {
    options = callback || {};
    callback = conversationId;
    conversationId = null;
  }

  if (!options || typeof options !== 'object') {
    options = {};
  }

  const includeConversationChannel = Boolean(conversationId);

  return createMessageSubscription({
    conversationId: includeConversationChannel ? conversationId : null,
    includeConversationChannel,
    includeAdminBroadcast: true,
    callback,
    context: 'subscribeToAdminChatMessages',
    onFallback: typeof options.onFallback === 'function' ? options.onFallback : null,
  });
};

const createConversationChannelSubscription = ({
  topic,
  onConversation = null,
  onMessage = null,
  context = 'conversationSubscription',
  onFallback = null,
}) => {
  const hasHandlers = typeof onConversation === 'function' || typeof onMessage === 'function';

  if (!topic) {
    if (typeof onFallback === 'function') {
      onFallback({ reason: 'topic-unavailable', payload: null, topic, context });
    }
    return null;
  }

  if (!hasHandlers) {
    console.warn('conversationSubscription without handlers', { topic, context });
    return null;
  }

  const channel = acquireBroadcastChannel(topic);
  if (!channel) {
    if (typeof onFallback === 'function') {
      onFallback({ reason: 'channel-unavailable', payload: null, topic, context });
    }
    return null;
  }

  let active = true;

  const cleanup = () => {
    if (!active) return;
    active = false;
    releaseBroadcastChannel(channel);
  };

  const triggerFallback = async (reason, payload) => {
    if (typeof onFallback !== 'function') return;
    try {
      await onFallback({ reason, payload, topic, context });
    } catch (error) {
      console.error('conversationSubscription fallback failed', { context, reason, error });
    }
  };

  const emit = async (type, handler, payload) => {
    if (!active || typeof handler !== 'function') return;
    if (!payload) {
      await triggerFallback(`${type}-empty-payload`, null);
      await handler(null);
      return;
    }
    try {
      await handler(payload);
    } catch (error) {
      console.error('conversationSubscription handler error', { context, type, error });
      await triggerFallback(`${type}-handler-error`, { payload, error });
    }
  };

  if (typeof onConversation === 'function') {
    channel.on('broadcast', { event: BROADCAST_CONVERSATION_EVENT }, async (event) => {
      await emit('conversation', onConversation, event?.payload ?? null);
    });
  }

  if (typeof onMessage === 'function') {
    channel.on('broadcast', { event: BROADCAST_MESSAGE_EVENT }, async (event) => {
      await emit('message', onMessage, event?.payload ?? null);
    });
  }

  ensureChannelSubscribed(channel).catch((error) => {
    console.error('conversationSubscription subscribe failed', { topic: channel.topic, context, error });
    triggerFallback('subscribe-failed', { error, topic: channel.topic, context });
  });

  return {
    unsubscribe: cleanup,
  };

};

export const subscribeToClientConversations = (params, callback, options = {}) => {
  const guestId = params?.guestId || null;
  const guestEmail = params?.guestEmail || null;
  const topic = getClientConversationChannelTopic({ guestId, guestEmail });
  const normalizedOptions = options && typeof options === 'object' ? options : {};

  return createConversationChannelSubscription({
    topic,
    context: 'subscribeToClientConversations',
    onConversation: typeof callback === 'function' ? callback : null,
    onMessage:
      typeof normalizedOptions.onMessage === 'function' ? normalizedOptions.onMessage : null,
    onFallback:
      typeof normalizedOptions.onFallback === 'function' ? normalizedOptions.onFallback : null,
  });
};

export const subscribeToAdminConversations = (callback, options = {}) => {
  const normalizedOptions = options && typeof options === 'object' ? options : {};

  return createConversationChannelSubscription({
    topic: ADMIN_BROADCAST_TOPIC,
    context: 'subscribeToAdminConversations',
    onConversation: typeof callback === 'function' ? callback : null,
    onMessage:
      typeof normalizedOptions.onMessage === 'function' ? normalizedOptions.onMessage : null,
    onFallback:
      typeof normalizedOptions.onFallback === 'function' ? normalizedOptions.onFallback : null,
  });
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
  if (!conversationId) throw new Error('ID de conversation manquant.');

  const payload = buildMessageInsertPayload({
    conversationId,
    senderRole: getSenderRole(isAdmin),
    content: sanitizeMessageContent(content),
  });

  return insertMessageRecord({
    payload,
    buildErrorMessage: (dbError) =>
      `Votre message n'a pas pu etre envoye: ${dbError.message || dbError.details || 'Erreur inconnue.'}`,
  });

};

export const sendFile = async (file, conversation, isAdmin) => {
  if (!conversation?.id) throw new Error('Identifiant de conversation manquant.');

  const attachment = await uploadChatAttachment({ file, conversation });
  const messageContent =
    attachment.fileType && attachment.fileType.startsWith('image/')
      ? ''
      : sanitizeMessageContent(attachment.originalName);

  const payload = buildMessageInsertPayload({
    conversationId: conversation.id,
    senderRole: getSenderRole(isAdmin),
    content: messageContent,
    overrides: {
      file_url: attachment.fileUrl,
      file_type: attachment.fileType,
    },
  });

  return insertMessageRecord({
    payload,
    buildErrorMessage: (dbError) =>
      `Echec de l'enregistrement du message: ${dbError.message || dbError.details || 'Erreur inconnue.'}`,
  });

};

export const sendResource = async (resource, conversationId, isAdmin) => {
  if (!conversationId) throw new Error('ID de conversation manquant.');
  if (!resource?.id) throw new Error('Ressource invalide.');

  const label = resource?.name
    ? `Ressource partagee : ${resource.name}`
    : 'Ressource partagee';

  const payload = buildMessageInsertPayload({
    conversationId,
    senderRole: getSenderRole(isAdmin),
    content: sanitizeMessageContent(label),
    overrides: {
      resource_id: resource.id,
    },
  });

  return insertMessageRecord({
    payload,
    buildErrorMessage: () => 'Impossible de partager la ressource.',
  });

};

export const listShareableResources = async ({ limit = 200 } = {}) => {
  const { data, error } = await supabase
    .from('resources')
    .select('id, name, type, format, url, file_path')
    .order('name', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('listShareableResources failed', { error });
    throw new Error('Impossible de charger les ressources.');
  }

  return Array.isArray(data) ? data : [];

};

export const getResourcePublicUrl = (filePath) => {
  if (!filePath) return null;
  try {
    const { data } = supabase.storage.from('resources').getPublicUrl(filePath);
    return data?.publicUrl || null;
  } catch (error) {
    console.error('getResourcePublicUrl failed', { filePath, error });
    return null;
  }
};


export const startClientConversation = async ({ staffUserId = null, initialMessage = '', forceNew = true } = {}) => {
  const { data, error } = await supabase.rpc('client_start_chat_conversation', {
    p_staff_user_id: staffUserId,
    p_force_new: forceNew,
  });

  if (error) {
    console.error('startClientConversation failed', error);
    throw new Error('Impossible de creer la conversation.');
  }

  const record = unwrapConversationRow(data);
  const conversation = await broadcastAndNormalizeConversation({
    record,
    eventType: 'INSERT',
    perspective: 'client',
  });

  const trimmedInitialMessage = sanitizeMessageContent(initialMessage);

  if (conversation?.id && trimmedInitialMessage) {
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

    const record = unwrapConversationRow(updated);

    return broadcastAndNormalizeConversation({
      record,
      previous: existing,
      eventType: 'UPDATE',
      perspective: 'admin',
    });
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

    const record = unwrapConversationRow(inserted);

    return broadcastAndNormalizeConversation({
      record,
      eventType: 'INSERT',
      perspective: 'admin',
    });
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

  if (Array.isArray(data) ? data.length > 0 : data) {
    const row = Array.isArray(data) ? data[0] : data;
    const broadcastRecord = normalizeConversationForBroadcast(row);
    await broadcastConversationChange({ eventType: 'UPDATE', record: broadcastRecord });
    return normalizeAdminConversation(row);
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

