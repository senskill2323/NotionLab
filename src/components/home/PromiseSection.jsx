import React from 'react';
import { motion } from 'framer-motion';
import { Users, CalendarDays, Zap, Heart, Star, Crown, Sparkles, Target, Shield, Award, CheckCircle, Clock, Globe, Lightbulb, Rocket, Settings, Smartphone, Tablet, Wifi, Camera, Mail, Phone, MapPin, Search, Filter, Download, Upload, Share, Edit, Trash2, Plus, Minus, ArrowRight, ArrowLeft, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const iconMap = { 
  Users, CalendarDays, Zap, Heart, Star, Crown, Sparkles, Target, Shield, Award, 
  CheckCircle, Clock, Globe, Lightbulb, Rocket, Settings, Smartphone, Tablet, 
  Wifi, Camera, Mail, Phone, MapPin, Search, Filter, Download, Upload, Share, 
  Edit, Trash2, Plus, Minus, ArrowRight, ArrowLeft, ArrowUp, ArrowDown 
};

const PromiseSection = ({ content = {} }) => {
  const title = content.pr_title || content.title || 'Ma promesse,';
  const titleSuffix = content.pr_titleSuffix || content.titleSuffix || 'simple.';
  const items = Array.isArray(content.pr_items) && content.pr_items.length > 0
    ? content.pr_items.map(item => ({
        ...item,
        text: item.description || item.text // Support both 'description' and 'text' for backward compatibility
      }))
    : [
        { icon: 'Users', title: 'La passion avant-tout', text: "Je suis juste un passionné de systèmes, et un passionné de Notion. je suis bon pédagogue, et j'ai faim de vous apprendre! " },
        { icon: 'CalendarDays', title: 'Premier rendez-vous gratuit', text: "Lancez-vous : aujourd'hui je suis seul, demain l'équipe grandit — mon envie ? Vous former. Le labo est prêt à acceuillir des modérateurs et d'autres experts Notion comme moi. " },
        { icon: 'Zap', title: 'Support Notion éclair ⚡', text: "Décrivez votre souci, je réponds dans la journée.  Assignéez votre demande à un ticket, un message ou même au forum! Vous aurez de quoi venir les réponses! " },
      ];

  const showCta = content.pr_showCta || content.showCta || false;
  const ctaText = content.pr_ctaText || content.ctaText || "Découvrir maintenant";
  const ctaUrl = content.pr_ctaUrl || content.ctaUrl || "#";
  const useBackgroundImage = (content.pr_useBackgroundImage ?? content.useBackgroundImage) || false;
  const backgroundImage = content.pr_backgroundImage || content.backgroundImage || "";
  const backgroundOpacity = content.pr_backgroundOpacity || content.backgroundOpacity || 0.5;

  const useDefaultBackground =
    (content.pr_useDefaultBackground ?? content.useDefaultBackground ?? true) !== false;

  const rawMode = (content.pr_backgroundMode || content.backgroundMode || '').toLowerCase();
  let legacyColor = content.pr_backgroundColor || content.backgroundColor || '';
  let legacyGradient = content.pr_gradient || content.gradient || '';

  if (!legacyColor && rawMode.startsWith('#')) {
    legacyColor = rawMode;
  }
  if (!legacyGradient && rawMode.includes('gradient')) {
    legacyGradient = rawMode;
  }
  let backgroundMode;

  if (rawMode === 'solid' || rawMode === 'gradient') {
    backgroundMode = rawMode;
  } else if (legacyGradient) {
    backgroundMode = 'gradient';
  } else if (legacyColor) {
    backgroundMode = 'solid';
  } else {
    backgroundMode = 'gradient';
  }

  const solidColor =
    content.pr_solidColor ||
    content.solidColor ||
    legacyColor ||
    '#1f2937';

  const gradient =
    content.pr_gradient ||
    content.gradient ||
    legacyGradient ||
    'linear-gradient(135deg, #4338ca 0%, #1d4ed8 50%, #0f172a 100%)';

  const getGridCols = () => {
    const count = items.length;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'md:grid-cols-2';
    if (count === 3) return 'md:grid-cols-3';
    if (count === 4) return 'md:grid-cols-2 lg:grid-cols-4';
    return 'md:grid-cols-2 lg:grid-cols-3';
  };

  const sectionStyle = {};

  if (useBackgroundImage && backgroundImage) {
    sectionStyle.backgroundImage = `url(${backgroundImage})`;
    sectionStyle.backgroundSize = 'cover';
    sectionStyle.backgroundPosition = 'center';
    sectionStyle.backgroundRepeat = 'no-repeat';
  } else if (!useDefaultBackground) {
    if (backgroundMode === 'solid') {
      sectionStyle.backgroundColor = solidColor;
    } else {
      sectionStyle.background = gradient;
    }
  }

  const sectionClassName = [
    'py-20',
    'relative',
    useDefaultBackground && !useBackgroundImage ? 'bg-background/70' : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section 
      className={sectionClassName}
      style={sectionStyle}
    >
      {useBackgroundImage && backgroundImage && (
        <div 
          className="absolute inset-0 bg-black"
          style={{ opacity: 1 - backgroundOpacity }}
        />
      )}
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {title.split('**').map((part, index) => (
              <span 
                key={index}
                className={index % 2 === 1 ? "gradient-text" : ""}
              >
                {part}
              </span>
            ))}
          </h2>
        </div>

        <div className={`grid ${getGridCols()} gap-8 mb-12`}>
          {items.map((it, idx) => {
            const Icon = iconMap[it.icon] || Users;
            const animationProps = [
              { initial: { opacity: 0, x: -30 } },
              { initial: { opacity: 0, y: 30 } },
              { initial: { opacity: 0, x: 30 } },
              { initial: { opacity: 0, y: -30 } },
              { initial: { opacity: 0, x: -30 } },
            ][idx] || { initial: { opacity: 0, y: 30 } };
            const delay = idx * 0.2;
            return (
              <motion.div
                key={idx}
                {...animationProps}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.6, delay }}
                className="text-center"
              >
                <div className="w-16 h-16 mx-auto mb-6 notion-gradient rounded-full flex items-center justify-center">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4">{it.title}</h3>
                <p className="text-muted-foreground">{it.text}</p>
              </motion.div>
            );
          })}
        </div>

        {showCta && ctaText && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
            viewport={{ once: true, amount: 0.5 }}
            className="text-center"
          >
            <Button 
              asChild
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 text-lg font-medium rounded-full"
            >
              <a href={ctaUrl} target={ctaUrl.startsWith('http') ? '_blank' : '_self'}>
                {ctaText}
              </a>
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default PromiseSection;
