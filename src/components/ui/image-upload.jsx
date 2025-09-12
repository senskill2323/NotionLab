import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Crop, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

import { Input } from '@/components/ui/input';

const ImageUpload = ({ 
  onImageSelected, 
  currentImageUrl = '', 
  bucketName = 'block-images',
  maxSizeMB = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  cropAspectRatio = 16/9, 
  compact = false
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);
  const [cropData, setCropData] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Drag & Drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  }, []);

  // File validation
  const validateFile = (file) => {
    if (!acceptedTypes.includes(file.type)) {
      toast({
        title: 'Format non supporté',
        description: `Formats acceptés: ${acceptedTypes.map(t => t.split('/')[1]).join(', ')}`,
        variant: 'destructive'
      });
      return false;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: 'Fichier trop volumineux',
        description: `Taille maximale: ${maxSizeMB}MB`,
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  // Handle file selection (drag/drop or click)
  const handleFileSelection = (file) => {
    if (!validateFile(file)) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setOriginalImage({ file, dataUrl: e.target.result, width: img.width, height: img.height });
        setShowCropper(true);
        
        // Set initial crop to center with aspect ratio
        const targetWidth = Math.min(img.width, img.height * cropAspectRatio);
        const targetHeight = targetWidth / cropAspectRatio;
        setCropData({
          x: (img.width - targetWidth) / 2,
          y: (img.height - targetHeight) / 2,
          width: targetWidth,
          height: targetHeight
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Canvas-based cropping
  const applyCrop = useCallback(async () => {
    if (!originalImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = async () => {
      // Set canvas size to crop dimensions
      canvas.width = cropData.width;
      canvas.height = cropData.height;
      
      // Draw cropped image
      ctx.drawImage(
        img,
        cropData.x, cropData.y, cropData.width, cropData.height,
        0, 0, cropData.width, cropData.height
      );
      
      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (blob) {
          await uploadToSupabase(blob);
        }
      }, 'image/webp', 0.9);
    };
    
    img.src = originalImage.dataUrl;
  }, [originalImage, cropData]);

  // Upload to Supabase Storage
  const uploadToSupabase = async (blob) => {
    setIsUploading(true);
    
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileName = `block-image-${timestamp}-${randomId}.webp`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, blob, {
          contentType: 'image/webp',
          cacheControl: '3600'
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      toast({
        title: 'Image téléchargée',
        description: 'L\'image a été téléchargée avec succès.'
      });

      onImageSelected(publicUrl);
      setShowCropper(false);
      setOriginalImage(null);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erreur de téléchargement',
        description: error.message || 'Impossible de télécharger l\'image.',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
    }
  };

    if (compact) {
    return (
      <>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex-grow"
          >
            <ImageIcon className="h-4 w-4 mr-2" />
            {currentImageUrl ? 'Changer l\'image' : 'Parcourir...'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
            className="hidden"
          />
        </div>

        {/* Cropping Dialog */}
        <Dialog open={showCropper} onOpenChange={setShowCropper}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Recadrer l'image</DialogTitle>
            </DialogHeader>
            
            {originalImage && (
              <div className="space-y-4">
                <div className="relative max-h-96 overflow-hidden rounded border">
                  <img 
                    src={originalImage.dataUrl} 
                    alt="À recadrer"
                    className="max-w-full h-auto"
                  />
                  <div 
                    className="absolute border-2 border-primary bg-primary/10"
                    style={{
                      left: `${(cropData.x / originalImage.width) * 100}%`,
                      top: `${(cropData.y / originalImage.height) * 100}%`,
                      width: `${(cropData.width / originalImage.width) * 100}%`,
                      height: `${(cropData.height / originalImage.height) * 100}%`
                    }}
                  />
                </div>
                
                <canvas ref={canvasRef} className="hidden" />
                
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowCropper(false)}
                    disabled={isUploading}
                  >
                    Annuler
                  </Button>
                  <Button 
                    onClick={applyCrop}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Téléchargement...
                      </>
                    ) : (
                      <>
                        <Crop className="w-4 h-4 mr-2" />
                        Recadrer et télécharger
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      {/* Upload Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
          className="hidden"
        />
        
        {currentImageUrl ? (
          <div className="space-y-3">
            <img 
              src={currentImageUrl} 
              alt="Current" 
              className="w-20 h-12 object-cover rounded mx-auto"
            />
            <p className="text-sm text-muted-foreground">
              Cliquez ou glissez une nouvelle image pour remplacer
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Télécharger une image</p>
              <p className="text-xs text-muted-foreground">
                Glissez-déposez ou cliquez • Max {maxSizeMB}MB • {acceptedTypes.map(t => t.split('/')[1]).join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Cropping Dialog */}
      <Dialog open={showCropper} onOpenChange={setShowCropper}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Recadrer l'image</DialogTitle>
          </DialogHeader>
          
          {originalImage && (
            <div className="space-y-4">
              {/* Simple crop preview - in a real app you'd use react-image-crop or similar */}
              <div className="relative max-h-96 overflow-hidden rounded border">
                <img 
                  src={originalImage.dataUrl} 
                  alt="À recadrer"
                  className="max-w-full h-auto"
                />
                <div 
                  className="absolute border-2 border-primary bg-primary/10"
                  style={{
                    left: `${(cropData.x / originalImage.width) * 100}%`,
                    top: `${(cropData.y / originalImage.height) * 100}%`,
                    width: `${(cropData.width / originalImage.width) * 100}%`,
                    height: `${(cropData.height / originalImage.height) * 100}%`
                  }}
                />
              </div>
              
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowCropper(false)}
                  disabled={isUploading}
                >
                  Annuler
                </Button>
                <Button 
                  onClick={applyCrop}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Téléchargement...
                    </>
                  ) : (
                    <>
                      <Crop className="w-4 h-4 mr-2" />
                      Recadrer et télécharger
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImageUpload;
