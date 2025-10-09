import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Upload, Crop, Loader2, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const ImageUpload = ({
  onImageSelected = () => {},
  currentImageUrl = '',
  bucketName = 'block-images',
  maxSizeMB = 5,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  cropAspectRatio = 16 / 9,
  compact = false,
  allowAspectRatioAdjustment = false,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const cropContainerRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const cropStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [originalImage, setOriginalImage] = useState(null);
  const [cropData, setCropData] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(cropAspectRatio || 16 / 9);

  const maxCropWidth = useMemo(() => {
    if (!originalImage) return 0;
    return Math.min(originalImage.width, originalImage.height * aspectRatio);
  }, [originalImage, aspectRatio]);

  const minCropWidth = useMemo(() => {
    if (!originalImage || !maxCropWidth) return 0;
    const suggested = maxCropWidth * 0.35;
    return Math.max(64, Math.min(maxCropWidth, suggested));
  }, [originalImage, maxCropWidth]);

  const cropSizePercent = useMemo(() => {
    if (!originalImage || !maxCropWidth) return 100;
    return Math.round((cropData.width / maxCropWidth) * 100);
  }, [cropData.width, originalImage, maxCropWidth]);

  const imageAspectRatio = useMemo(() => {
    if (!originalImage || !originalImage.height) return null;
    return originalImage.width / originalImage.height;
  }, [originalImage]);

  const baseAspectRatio = useMemo(() => {
    if (cropAspectRatio) return cropAspectRatio;
    if (imageAspectRatio) return imageAspectRatio;
    return aspectRatio || 1;
  }, [cropAspectRatio, imageAspectRatio, aspectRatio]);

  const minAspectRatio = useMemo(() => {
    if (!allowAspectRatioAdjustment) return baseAspectRatio;
    const lowerBound = Math.max(0.5, baseAspectRatio * 0.6);
    return Math.min(baseAspectRatio, lowerBound);
  }, [allowAspectRatioAdjustment, baseAspectRatio]);

  const maxAspectRatio = useMemo(() => {
    if (!allowAspectRatioAdjustment) return baseAspectRatio;
    const imageBound = imageAspectRatio ? Math.max(imageAspectRatio, 1) : baseAspectRatio;
    return Math.max(4, baseAspectRatio * 2.5, imageBound);
  }, [allowAspectRatioAdjustment, baseAspectRatio, imageAspectRatio]);

  const aspectRatioRange = useMemo(() => Math.max(0.0001, maxAspectRatio - minAspectRatio), [maxAspectRatio, minAspectRatio]);

  const aspectSliderValue = useMemo(() => {
    if (!allowAspectRatioAdjustment) return 0;
    const raw = ((aspectRatio - minAspectRatio) / aspectRatioRange) * 100;
    return Math.round(clamp(raw, 0, 100));
  }, [allowAspectRatioAdjustment, aspectRatio, aspectRatioRange, minAspectRatio]);

  useEffect(() => {
    const stopDrag = () => setIsDraggingCrop(false);
    window.addEventListener('pointerup', stopDrag);
    return () => window.removeEventListener('pointerup', stopDrag);
  }, []);

  const clampCropPosition = useCallback(
    (x, y, width, height) => {
      if (!originalImage) {
        return { x, y };
      }
      const maxX = originalImage.width - width;
      const maxY = originalImage.height - height;
      return {
        x: clamp(x, 0, Math.max(0, maxX)),
        y: clamp(y, 0, Math.max(0, maxY)),
      };
    },
    [originalImage],
  );

  const validateFile = (file) => {
    if (!acceptedTypes.includes(file.type)) {
      toast({
        title: 'Format non supporte',
        description: `Formats acceptes: ${acceptedTypes.map((t) => t.split('/')[1]).join(', ')}`,
        variant: 'destructive',
      });
      return false;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: 'Fichier trop volumineux',
        description: `Taille maximale: ${maxSizeMB}MB`,
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleFileSelection = (file) => {
    if (!validateFile(file)) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setOriginalImage({ file, dataUrl: e.target.result, width: img.width, height: img.height });
        setShowCropper(true);

        const initialAspectRatio = cropAspectRatio || (img.width && img.height ? img.width / img.height : aspectRatio || 1);
        setAspectRatio(initialAspectRatio);

        const targetWidth = Math.min(img.width, img.height * initialAspectRatio);
        const targetHeight = targetWidth / initialAspectRatio;
        const initialCrop = {
          x: (img.width - targetWidth) / 2,
          y: (img.height - targetHeight) / 2,
          width: targetWidth,
          height: targetHeight,
        };

        setCropData(initialCrop);
        cropStartRef.current = initialCrop;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      setIsDragOver(false);
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) {
        handleFileSelection(files[0]);
      }
    },
    [],
  );

  const applyCrop = useCallback(async () => {
    if (!originalImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = async () => {
      canvas.width = cropData.width;
      canvas.height = cropData.height;

      ctx.drawImage(
        img,
        cropData.x,
        cropData.y,
        cropData.width,
        cropData.height,
        0,
        0,
        cropData.width,
        cropData.height,
      );

      canvas.toBlob(async (blob) => {
        if (blob) {
          await uploadToSupabase(blob);
        }
      }, 'image/webp', 0.9);
    };

    img.src = originalImage.dataUrl;
  }, [cropData, originalImage]);

  const uploadToSupabase = async (blob) => {
    setIsUploading(true);

    try {
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileName = `block-image-${timestamp}-${randomId}.webp`;

      const { error: uploadError } = await supabase.storage.from(bucketName).upload(fileName, blob, {
        contentType: 'image/webp',
        cacheControl: '3600',
      });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucketName).getPublicUrl(fileName);

      toast({
        title: 'Image telechargee',
        description: "L'image a ete telechargee avec succes.",
      });

      onImageSelected(publicUrl);
      setShowCropper(false);
      setOriginalImage(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erreur de telechargement',
        description: error.message || "Impossible de telecharger l'image.",
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getPointerPosition = useCallback(
    (event) => {
      if (!cropContainerRef.current || !originalImage) {
        return { x: 0, y: 0 };
      }
      const rect = cropContainerRef.current.getBoundingClientRect();
      const relativeX = ((event.clientX - rect.left) / rect.width) * originalImage.width;
      const relativeY = ((event.clientY - rect.top) / rect.height) * originalImage.height;
      return { x: relativeX, y: relativeY };
    },
    [originalImage],
  );

  const handleCropDragStart = useCallback(
    (event) => {
      if (!originalImage) return;
      event.preventDefault();
      const position = getPointerPosition(event);
      dragStartRef.current = position;
      cropStartRef.current = {
        x: cropData.x,
        y: cropData.y,
        width: cropData.width,
        height: cropData.height,
      };
      setIsDraggingCrop(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    },
    [cropData, getPointerPosition, originalImage],
  );

  const handleCropDragMove = useCallback(
    (event) => {
      if (!isDraggingCrop || !originalImage) return;
      event.preventDefault();
      const position = getPointerPosition(event);
      const deltaX = position.x - dragStartRef.current.x;
      const deltaY = position.y - dragStartRef.current.y;

      const target = clampCropPosition(
        cropStartRef.current.x + deltaX,
        cropStartRef.current.y + deltaY,
        cropStartRef.current.width,
        cropStartRef.current.height,
      );

      setCropData((prev) => ({
        ...prev,
        x: target.x,
        y: target.y,
      }));
    },
    [clampCropPosition, getPointerPosition, isDraggingCrop, originalImage],
  );

  const handleCropDragEnd = useCallback((event) => {
    if (event?.currentTarget?.releasePointerCapture) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDraggingCrop(false);
  }, []);

  const applyAspectRatio = useCallback(
    (ratio, preserveSize = true) => {
      if (!originalImage) return;
      const safeRatio = Math.max(0.1, ratio);
      setAspectRatio(safeRatio);
      setCropData((prev) => {
        const nextMaxWidth = Math.min(originalImage.width, originalImage.height * safeRatio);
        const nextMinWidth = Math.max(64, Math.min(nextMaxWidth, nextMaxWidth * 0.35));

        if (!preserveSize || !prev.width || !prev.height) {
          const width = nextMaxWidth;
          const height = width / safeRatio;
          const x = (originalImage.width - width) / 2;
          const y = (originalImage.height - height) / 2;
          cropStartRef.current = { x, y, width, height };
          return { x, y, width, height };
        }

        const centerX = prev.x + prev.width / 2;
        const centerY = prev.y + prev.height / 2;
        const width = clamp(prev.width, nextMinWidth, nextMaxWidth);
        const height = width / safeRatio;
        const target = clampCropPosition(centerX - width / 2, centerY - height / 2, width, height);
        cropStartRef.current = {
          x: target.x,
          y: target.y,
          width,
          height,
        };
        return {
          x: target.x,
          y: target.y,
          width,
          height,
        };
      });
    },
    [clampCropPosition, originalImage],
  );

  useEffect(() => {
    if (!allowAspectRatioAdjustment || !originalImage) return;
    const clampedRatio = clamp(aspectRatio, minAspectRatio, maxAspectRatio);
    if (Math.abs(clampedRatio - aspectRatio) > 0.001) {
      applyAspectRatio(clampedRatio);
    }
  }, [allowAspectRatioAdjustment, applyAspectRatio, aspectRatio, maxAspectRatio, minAspectRatio, originalImage]);

  const handleCropSizeChange = useCallback(
    (event) => {
      if (!originalImage || !maxCropWidth) return;
      const nextPercent = Number(event.target.value);
      const ratio = clamp(nextPercent / 100, 0.1, 1);
      const nextWidth = clamp(maxCropWidth * ratio, minCropWidth || maxCropWidth * 0.1, maxCropWidth);
      const nextHeight = nextWidth / aspectRatio;

      setCropData((prev) => {
        const target = clampCropPosition(prev.x, prev.y, nextWidth, nextHeight);
        cropStartRef.current = {
          x: target.x,
          y: target.y,
          width: nextWidth,
          height: nextHeight,
        };
        return {
          ...prev,
          x: target.x,
          y: target.y,
          width: nextWidth,
          height: nextHeight,
        };
      });
    },
    [aspectRatio, clampCropPosition, maxCropWidth, minCropWidth, originalImage],
  );

  const handleAspectRatioSliderChange = useCallback(
    (event) => {
      if (!allowAspectRatioAdjustment) return;
      const value = clamp(Number(event.target.value), 0, 100);
      const nextRatio = minAspectRatio + (value / 100) * aspectRatioRange;
      applyAspectRatio(nextRatio);
    },
    [allowAspectRatioAdjustment, applyAspectRatio, aspectRatioRange, minAspectRatio],
  );

  const renderCropperDialog = () => (
    <Dialog open={showCropper} onOpenChange={setShowCropper}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Recadrer l'image</DialogTitle>
        </DialogHeader>

        {originalImage && (
          <div className="space-y-5">
            <div
              ref={cropContainerRef}
              className="relative max-h-[70vh] w-full overflow-hidden rounded border bg-black/60"
              onPointerMove={handleCropDragMove}
              onPointerLeave={(event) => {
                if (isDraggingCrop) {
                  handleCropDragEnd(event);
                }
              }}
              onPointerUp={handleCropDragEnd}
            >
              <img
                src={originalImage.dataUrl}
                alt="A recadrer"
                className="block h-auto w-full select-none"
                draggable={false}
              />
              <div
                className={`absolute cursor-move border-2 border-primary bg-primary/20 ${isDraggingCrop ? 'bg-primary/30' : ''}`}
                style={{
                  left: `${(cropData.x / originalImage.width) * 100}%`,
                  top: `${(cropData.y / originalImage.height) * 100}%`,
                  width: `${(cropData.width / originalImage.width) * 100}%`,
                  height: `${(cropData.height / originalImage.height) * 100}%`,
                }}
                onPointerDown={handleCropDragStart}
              />
            </div>

            {allowAspectRatioAdjustment && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Etirer la selection</label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={aspectSliderValue}
                  onChange={handleAspectRatioSliderChange}
                  className="w-full accent-primary"
                  disabled={aspectRatioRange <= 0.001}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{`${minAspectRatio.toFixed(2)}:1`}</span>
                  <span>{`${aspectRatio.toFixed(2)}:1`}</span>
                  <span>{`${maxAspectRatio.toFixed(2)}:1`}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ajustez le ratio largeur/hauteur pour couvrir toute l'image.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Taille du cadre</label>
              <input
                type="range"
                min={minCropWidth && maxCropWidth ? Math.round((minCropWidth / maxCropWidth) * 100) : 10}
                max={100}
                value={cropSizePercent}
                onChange={handleCropSizeChange}
                className="w-full accent-primary"
                disabled={!maxCropWidth || maxCropWidth === minCropWidth}
              />
              <p className="text-xs text-muted-foreground">
                Ajustez la taille puis faites glisser le cadre sur la zone a conserver.
              </p>
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowCropper(false)} disabled={isUploading}>
                Annuler
              </Button>
              <Button onClick={applyCrop} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Telechargement...
                  </>
                ) : (
                  <>
                    <Crop className="mr-2 h-4 w-4" />
                    Recadrer et telecharger
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );

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
            <ImageIcon className="mr-2 h-4 w-4" />
            {currentImageUrl ? "Changer l'image" : 'Parcourir...'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={(event) => event.target.files?.[0] && handleFileSelection(event.target.files[0])}
            className="hidden"
          />
        </div>

        {renderCropperDialog()}
      </>
    );
  }

  return (
    <>
      <div
        className={`relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={(event) => event.target.files?.[0] && handleFileSelection(event.target.files[0])}
          className="hidden"
        />

        {currentImageUrl ? (
          <div className="space-y-3">
            <img src={currentImageUrl} alt="Current" className="mx-auto h-12 w-20 rounded object-cover" />
            <p className="text-sm text-muted-foreground">Cliquez ou glissez une nouvelle image pour remplacer</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Telecharger une image</p>
              <p className="text-xs text-muted-foreground">
                Glissez-deposez ou cliquez - Max {maxSizeMB}MB - {acceptedTypes.map((t) => t.split('/')[1]).join(', ')}
              </p>
            </div>
          </div>
        )}
      </div>

      {renderCropperDialog()}
    </>
  );
};

export default ImageUpload;
