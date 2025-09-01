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