import { supabase } from '@/lib/customSupabaseClient';
import { v4 as uuidv4 } from 'uuid';

export const getOrCreateConversation = async (user) => {
  if (!user) throw new Error("Utilisateur non authentifié.");

  let { data, error } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('guest_email', user.email)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) throw new Error("Impossible de récupérer la conversation.");

  if (data && data.length > 0 && data[0].status !== 'resolu' && data[0].status !== 'abandonne') {
    return data[0];
  }

  const { data: newConvData, error: newConvError } = await supabase
    .from('chat_conversations')
    .insert({ guest_id: uuidv4(), guest_email: user.email, status: 'ouvert' })
    .select()
    .single();

  if (newConvError) throw new Error(`Impossible de démarrer le chat: ${newConvError.message}`);
  
  return newConvData;
};

getOrCreateConversation.subscribeToMessages = (conversationId, callback) => {
  const channel = supabase
    .channel(`chat_messages:conversation_id=eq.${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
      async (payload) => {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*, resource:resources(id, name, url, file_path)')
          .eq('id', payload.new.id)
          .single();
        if (!error && data) {
          callback(data);
        }
      }
    )
    .subscribe();
  
  return channel;
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
    throw new Error("Impossible de r�cup�rer le statut du chat.");
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
    throw new Error("Impossible de mettre � jour le statut de lecture du chat.");
  }
};

export const subscribeToClientChatMessages = (conversationId, callback) => {
  if (!conversationId) return null;

  const channel = supabase
    .channel(`client-chat-messages-${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}` },
      async (payload) => {
        let enrichedPayload = payload;
        const messageId = payload?.new?.id;

        if (messageId) {
          const { data, error } = await supabase
            .from('chat_messages')
            .select('*, resource:resources(id, name, url, file_path)')
            .eq('id', messageId)
            .single();

          if (!error && data) {
            enrichedPayload = {
              ...payload,
              new: data,
            };
          } else if (error) {
            console.error('subscribeToClientChatMessages enrichment failed', error);
          }
        }

        if (typeof callback === 'function') {
          callback(enrichedPayload);
        }
      }
    )
    .subscribe();

  return channel;
};

export const subscribeToClientConversations = (params, callback) => {
  const filters = [];
  const nameParts = ['client-chat-conversations'];

  if (params?.guestId) {
    filters.push({ type: 'guest_id', value: params.guestId });
    nameParts.push(params.guestId);
  }

  if (params?.guestEmail) {
    filters.push({ type: 'guest_email', value: params.guestEmail });
    nameParts.push(params.guestEmail);
  }

  if (filters.length === 0) return null;

  const channel = supabase.channel(nameParts.join('-'));

  filters.forEach(({ type, value }) => {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_conversations', filter: `${type}=eq.${value}` },
      (payload) => {
        if (typeof callback === 'function') {
          callback(payload);
        }
      }
    );
  });

  channel.subscribe();

  return channel;
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
  const { error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      sender: getSenderRole(isAdmin),
      content: content,
    });

  if (error) throw new Error(`Votre message n'a pas pu être envoyé: ${error.message}`);
};

export const sendFile = async (file, conversation, isAdmin) => {
  const fileName = `${uuidv4()}-${file.name}`;
  const filePath = `${conversation.guest_id}/${fileName}`;

  const { error: uploadError } = await supabase.storage.from('chat_attachments').upload(filePath, file);
  if (uploadError) throw new Error(`Échec de l'envoi du fichier: ${uploadError.message}`);

  const { data: { publicUrl } } = supabase.storage.from('chat_attachments').getPublicUrl(filePath);

  const { error: messageError } = await supabase.from('chat_messages').insert({
    conversation_id: conversation.id,
    sender: getSenderRole(isAdmin),
    content: file.type.startsWith('image/') ? '' : file.name,
    file_url: publicUrl,
    file_type: file.type,
  });

  if (messageError) throw new Error(`Échec de l'enregistrement du message: ${messageError.message}`);
};

export const sendResource = async (resource, conversationId, isAdmin) => {
  const { error } = await supabase.from('chat_messages').insert({
    conversation_id: conversationId,
    sender: getSenderRole(isAdmin),
    content: `Ressource partagée : ${resource.name}`,
    resource_id: resource.id,
  });

  if (error) throw new Error("Impossible de partager la ressource.");
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

