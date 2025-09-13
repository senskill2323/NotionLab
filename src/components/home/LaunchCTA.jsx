import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Heart, Send, Sparkles, Star, Crown, Zap, Trophy, Gift, Gem, Shield, Rocket, 
  Award, Bookmark, CheckCircle, Clock, Flame, Flag, Globe, Lightbulb, Lock, 
  Mail, MapPin, Music, Target, Users, CalendarDays, Settings 
} from 'lucide-react';

// Icon mapping for the top icon
const iconMap = {
  Heart, Sparkles, Star, Crown, Zap, Trophy, Gift, Gem, Shield, Rocket,
  Award, Bookmark, CheckCircle, Clock, Flame, Flag, Globe, Lightbulb, Lock,
  Mail, MapPin, Music, Target, Users, CalendarDays, Settings
};

// Helper function to convert hex to HSL and generate gradient
const generateGradient = (hexColor) => {
  if (!hexColor || !hexColor.startsWith('#')) return null;
  
  try {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16) / 255;
    const g = parseInt(hexColor.slice(3, 5), 16) / 255;
    const b = parseInt(hexColor.slice(5, 7), 16) / 255;
    
    // Convert RGB to HSL
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    // Create gradient with lighter and darker variants
    const lighterL = Math.min(l + 0.15, 0.9);
    const darkerL = Math.max(l - 0.15, 0.1);
    
    const hslToHex = (h, s, l) => {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
      const g = Math.round(hue2rgb(p, q, h) * 255);
      const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
      
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    };
    
    const lighterColor = hslToHex(h, s, lighterL);
    const darkerColor = hslToHex(h, s, darkerL);
    
    return `linear-gradient(135deg, ${lighterColor} 0%, ${hexColor} 50%, ${darkerColor} 100%)`;
  } catch (error) {
    console.warn('Error generating gradient:', error);
    return null;
  }
};

const LaunchCTA = ({ content = {} }) => {
  const displayDate = content.displayDate || new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date('2025-09-01'));

  const heading = content.heading || "Je démarre mon activité et j'ai faim de vous présenter mon outil !";
  const subText = content.subText || "Alors s'il vous plaît, n'hésitez pas, faites quelques heures de formation, contactez-moi !";
  const buttonText = content.buttonText || 'Contactez-moi !';
  const buttonLink = content.buttonLink || '/contact';
  const showCta = content.showCta !== false; // Default to true
  const iconName = content.iconName || 'Heart';
  const useDefaultBackground = content.useDefaultBackground !== false; // Default to true
  const backgroundColor = content.backgroundColor;
  const useDefaultGradient = content.useDefaultGradient !== false; // Default to true
  const backgroundGradient = content.backgroundGradient;

  // Resolve icon component
  const IconComponent = iconMap[iconName] || Heart;

  // Generate background style (priority: custom gradient > color)
  const backgroundStyle = useDefaultBackground
    ? {}
    : (!useDefaultGradient && backgroundGradient)
      ? { background: backgroundGradient }
      : (backgroundColor
          ? { background: generateGradient(backgroundColor) || `linear-gradient(135deg, ${backgroundColor} 0%, ${backgroundColor} 100%)` }
          : {});

  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      {/* Background layer - conditional based on useDefaultBackground */}
      <div 
        className={useDefaultBackground ? "absolute inset-0 bg-gradient-to-br from-red-500 via-orange-500 to-amber-400 opacity-80" : "absolute inset-0 opacity-80"}
        style={useDefaultBackground ? {} : backgroundStyle}
      ></div>
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')" }}
      ></div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="max-w-3xl mx-auto text-center bg-white/10 backdrop-blur-lg rounded-2xl p-8 md:p-12 border border-white/20 shadow-2xl"
        >
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <IconComponent className="w-16 h-16 mx-auto mb-6 text-white drop-shadow-lg" />
          </motion.div>

          <p className="text-lg font-medium text-white/90 mb-4">
            Nous sommes le {displayDate},
          </p>

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6 leading-tight" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
            {heading}
          </h2>

          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            {subText}
          </p>

          {showCta && (
            <Link to={buttonLink}>
              <Button
                size="lg"
                className="bg-white text-orange-600 hover:bg-white/90 hover:text-orange-700 transition-all duration-300 transform hover:scale-105 text-lg font-bold shadow-lg pulse-glow-white"
              >
                {buttonText}
                <Send className="ml-3 w-5 h-5" />
              </Button>
            </Link>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default LaunchCTA;