import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, Star, Crown, Zap, Heart, Trophy, Gift, Gem, Shield, Rocket, Upload, Camera,
  Award, Bookmark, CheckCircle, Clock, Diamond, Flame, Flag, Globe, Lightbulb, Lock, Mail, MapPin, Music, Target
} from 'lucide-react';
import ImageUpload from '@/components/ui/image-upload';

const CozySpaceSectionWithUpload = ({ content = {}, previewMode = 'desktop', onImageChange }) => {
  const [showImageUpload, setShowImageUpload] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.3, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 },
    },
  };

  // Provide dynamic content with safe fallbacks (backward compatible)
  const badgeText = content.badgeText ?? 'Votre Espace Privilégié';
  const badgeIconName = content.badgeIcon ?? 'Sparkles';
  const titleText = content.title ?? 'Installez-vous confortablement dans votre espace de formation';
  const descriptionText = content.description ?? "J'ai mis le paquet sur votre espace personnel. Contrairement à d'autres plateformes, ici, tout est pensé pour être une extension de votre propre espace de travail. C'est un lieu pour apprendre, expérimenter et interagir, sans jamais vous sentir perdu.";
  const imageUrl = content.imageUrl ?? 'https://images.unsplash.com/photo-1590177600178-c2597bd63ea7';
  const imageAlt = content.imageAlt ?? "Un espace de travail moderne et confortable avec un ordinateur portable ouvert sur une application de formation";
  const showBadge = content.showBadge !== false; // default true
  const ctaText = content.ctaText ?? 'Découvrir maintenant';
  const ctaUrl = content.ctaUrl ?? '#';
  const showCta = content.showCta ?? false;
  const backgroundColor = content.backgroundColor ?? '';
  const useDefaultBackground = content.useDefaultBackground !== false;
  const isPreviewDesktop = previewMode === 'desktop';

  // Map icon name to component
  const iconMap = {
    Sparkles, Star, Crown, Zap, Heart, Trophy, Gift, Gem, Shield, Rocket,
    Award, Bookmark, CheckCircle, Clock, Diamond, Fire: Flame, Flag, Globe, Lightbulb, Lock, Mail, MapPin, Music, Target
  };
  const BadgeIcon = iconMap[badgeIconName] || Sparkles;

  const titleSizeClass = isPreviewDesktop ? 'text-5xl' : 'text-4xl';
  const imageMinH = isPreviewDesktop ? 'min-h-[400px]' : 'min-h-[300px]';

  // Determine background style
  const backgroundStyle = useDefaultBackground 
    ? {} 
    : { backgroundColor: backgroundColor || '#1f2937' };
  
  const backgroundClass = useDefaultBackground 
    ? 'bg-gray-900' 
    : '';

  return (
    <section 
      className={`py-20 ${isPreviewDesktop ? 'md:py-32' : ''} ${backgroundClass} text-white overflow-hidden relative`}
      style={backgroundStyle}
    >
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      <div className="absolute inset-0 bg-gradient-to-bl from-secondary/20 via-transparent to-transparent"></div>
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          className={`grid ${isPreviewDesktop ? 'md:grid-cols-2' : ''} gap-12 items-center`}
        >
          <motion.div variants={itemVariants}>
            {showBadge && (
              <div className="mb-4">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-secondary/50 text-white border border-secondary/30">
                  <BadgeIcon className="w-5 h-5 mr-2" />
                  {badgeText}
                </span>
              </div>
            )}
            <h2 className={`${titleSizeClass} font-extrabold mb-6 leading-tight`}>
              {titleText}
            </h2>
            <div 
              className="text-xl text-gray-300 mb-8 prose prose-invert prose-xl max-w-none"
              dangerouslySetInnerHTML={{ __html: descriptionText }}
            />
            {showCta && (
              <div className="mt-8">
                <a
                  href={ctaUrl}
                  className="inline-flex items-center px-8 py-4 bg-secondary hover:bg-secondary/90 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
                >
                  {ctaText}
                </a>
              </div>
            )}
          </motion.div>

          <motion.div variants={itemVariants} className={`relative h-full ${imageMinH} group`}>
            <img
              alt={imageAlt}
              className="w-full h-full object-cover rounded-3xl shadow-2xl shadow-secondary/20"
              src={imageUrl}
            />
            
            {/* Hover overlay for image upload */}
            <div 
              className="absolute inset-0 bg-black/50 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center cursor-pointer"
              onClick={() => setShowImageUpload(true)}
            >
              <div className="text-center">
                <Camera className="w-8 h-8 mx-auto mb-2 text-white" />
                <p className="text-white text-sm font-medium">Changer l'image</p>
              </div>
            </div>

            {/* Image upload modal/overlay */}
            {showImageUpload && (
              <div className="absolute inset-0 bg-black/80 rounded-3xl flex items-center justify-center z-10">
                <div className="bg-white rounded-lg p-4 max-w-sm w-full mx-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Changer l'image</h3>
                  <ImageUpload
                    currentImageUrl={imageUrl}
                    onImageSelected={(url) => {
                      onImageChange(url);
                      setShowImageUpload(false);
                    }}
                    bucketName="block-images"
                    cropAspectRatio={16/9}
                  />
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setShowImageUpload(false)}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default CozySpaceSectionWithUpload;
