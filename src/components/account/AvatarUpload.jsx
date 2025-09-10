import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast.js';
import { Upload, Camera, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabasClient';

const AvatarUpload = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const getUserInitials = () => {
    const name = user.profile?.full_name || user.email || '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validation du fichier
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier image",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast({
        title: "Erreur",
        description: "L'image ne doit pas dépasser 5MB",
        variant: "destructive",
      });
      return;
    }

    // Créer une preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);

    // Upload du fichier
    uploadAvatar(file);
  };

  const uploadAvatar = async (file) => {
    setIsUploading(true);
    
    try {
      console.log('Starting avatar upload for user:', user.id);
      
      // Générer un nom de fichier unique
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      console.log('Generated filename:', fileName);

      // Supprimer l'ancien avatar s'il existe
      if (user.profile?.avatar_url) {
        const oldFileName = user.profile.avatar_url.split('/').pop();
        console.log('Removing old avatar:', oldFileName);
        const { error: removeError } = await supabase.storage
          .from('avatars')
          .remove([oldFileName]);
        
        if (removeError) {
          console.warn('Could not remove old avatar:', removeError);
        }
      }

      // Upload du nouveau fichier
      console.log('Uploading new file...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      console.log('Upload successful:', uploadData);

      // Obtenir l'URL publique
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      console.log('Generated public URL:', publicUrl);
      // Mettre à jour l'aperçu avec l'URL publique finale pour éviter d'avoir à rafraîchir
      setPreviewUrl(publicUrl);

      // Mettre à jour le profil
      console.log('Updating profile with new avatar URL...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error(`Profile update failed: ${updateError.message}`);
      }

      console.log('Profile updated successfully');
      await refreshUser();
      
      toast({
        title: "Avatar mis à jour",
        description: "Votre photo de profil a été mise à jour avec succès",
      });

    } catch (error) {
      console.error('Complete error details:', error);
      
      let errorMessage = "Impossible de mettre à jour votre avatar";
      
      if (error.message?.includes('JWT')) {
        errorMessage = "Session expirée. Veuillez vous reconnecter.";
      } else if (error.message?.includes('not found')) {
        errorMessage = "Le bucket 'avatars' n'existe pas.";
      } else if (error.message?.includes('permission') || error.message?.includes('policy')) {
        errorMessage = "Permissions insuffisantes pour uploader l'avatar.";
      } else if (error.message?.includes('size')) {
        errorMessage = "Fichier trop volumineux (max 5MB).";
      } else if (error.message) {
        errorMessage = `Erreur: ${error.message}`;
      }
      
      toast({
        title: "Erreur d'upload",
        description: errorMessage,
        variant: "destructive",
      });
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const removeAvatar = async () => {
    setIsUploading(true);
    
    try {
      console.log('Starting avatar removal for user:', user.id);
      
      // Supprimer le fichier du storage
      if (user.profile?.avatar_url) {
        const fileName = user.profile.avatar_url.split('/').pop();
        console.log('Removing file:', fileName);
        
        const { error: removeError } = await supabase.storage
          .from('avatars')
          .remove([fileName]); // Pas de préfixe avatars/ car c'est déjà le nom du bucket
        
        if (removeError) {
          console.warn('Could not remove file from storage:', removeError);
        } else {
          console.log('File removed successfully from storage');
        }
      }

      // Mettre à jour le profil
      console.log('Updating profile to remove avatar_url...');
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (error) {
        console.error('Profile update error:', error);
        throw new Error(`Profile update failed: ${error.message}`);
      }

      console.log('Profile updated successfully');
      await refreshUser();
      setPreviewUrl(null);
      
      toast({
        title: "Avatar supprimé",
        description: "Votre photo de profil a été supprimée",
      });

    } catch (error) {
      console.error('Complete removal error:', error);
      
      let errorMessage = "Impossible de supprimer votre avatar";
      
      if (error.message?.includes('JWT')) {
        errorMessage = "Session expirée. Veuillez vous reconnecter.";
      } else if (error.message?.includes('permission') || error.message?.includes('policy')) {
        errorMessage = "Permissions insuffisantes pour supprimer l'avatar.";
      } else if (error.message) {
        errorMessage = `Erreur: ${error.message}`;
      }
      
      toast({
        title: "Erreur de suppression",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-6">
      <div className="relative">
        <Avatar className="h-24 w-24">
          <AvatarImage 
            src={previewUrl || user.profile?.avatar_url} 
            alt="Avatar utilisateur" 
          />
          <AvatarFallback className="text-lg font-medium">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
        
        {isUploading && (
          <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 text-white animate-spin mb-1" />
            <span className="text-xs text-white font-medium">Upload...</span>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3">
        <div>
          <h3 className="font-medium">Photo de profil</h3>
          <p className="text-sm text-muted-foreground">
            Formats acceptés: JPG, PNG, GIF (max 5MB)
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            size="sm"
            className="relative"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Upload...
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                {user.profile?.avatar_url ? 'Changer' : 'Ajouter'}
              </>
            )}
          </Button>
          
          {user.profile?.avatar_url && (
            <Button
              onClick={removeAvatar}
              disabled={isUploading}
              variant="outline"
              size="sm"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Supprimer
            </Button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default AvatarUpload;
