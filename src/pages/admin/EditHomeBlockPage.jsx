 
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useForm, Controller } from 'react-hook-form';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import TiptapEditor from '@/components/admin/TiptapEditor';
import { ArrowLeft, CalendarPlus as CalendarIcon, Loader2, Upload, Eye, ChevronDown, ChevronUp, Sparkles, Star, Crown, Zap, Heart, Trophy, Gift, Gem, Shield, Rocket, Award, Bookmark, CheckCircle, Clock, Diamond, Flame, Flag, Globe, Lightbulb, Lock, Mail, MapPin, Music, Target, Users, CalendarDays, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import { Switch } from '@/components/ui/switch';
import CozySpaceSectionWithUpload from '@/components/admin/home-blocks/CozySpaceSectionWithUpload';
import MainHeroSection from '@/components/home/MainHeroSection';
import SystemsShowcase from '@/components/home/SystemsShowcase';
import StatsSection from '@/components/home/StatsSection';
import FormationsSection from '@/components/home/FormationsSection';
import SupportSection from '@/components/home/SupportSection';
import PromiseSection from '@/components/home/PromiseSection';
import PersonalQuoteSection from '@/components/home/PersonalQuoteSection';
import FinalCTA from '@/components/home/FinalCTA';
import LaunchCTA from '@/components/home/LaunchCTA';
import Footer from '@/components/Footer';

const EditHomeBlockPage = ({ blockId, onBack, onSave }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const isNew = !blockId;

  const [loading, setLoading] = useState(!isNew);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, control, reset, watch, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      content: '',
      status: 'draft',
      type: 'hero',
      block_type: 'html',
      layout: 'home.main_hero',
      order_index: 0,
      priority: 0,
      author_id: user?.id,
      publication_date: null,
      end_date: null,
      tags: [],
      audience_mode: 'public',
      visibility_authenticated: false,
      visibility_roles: [],
    }
  });

  const blockType = watch('block_type');
  const layout = watch('layout');
  const isFormationsLayout = false; // Editing enabled for all layouts now

  // Dynamic content state (same structure as template editor)
  const [dyn, setDyn] = useState({
    badgeText: 'Votre Espace Privilégié',
    badgeIcon: 'Sparkles',
    titleText: "Installez-vous confortablement dans votre espace de formation",
    descriptionText: "J'ai mis le paquet sur votre espace personnel. Contrairement à d'autres plateformes, ici, tout est pensé pour être une extension de votre propre espace de travail. C'est un lieu pour apprendre, expérimenter et interagir, sans jamais vous sentir perdu.",
    imageUrl: 'https://images.unsplash.com/photo-1590177600178-c2597bd63ea7',
    imageAlt: "Un espace de travail moderne et confortable avec un ordinateur portable ouvert sur une application de formation",
    showBadge: true,
    ctaText: '',
    ctaUrl: '#',
    showCta: false,
    backgroundColor: '',
    useDefaultBackground: true,
    // main_hero
    mh_imageUrl: 'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/2b4c9777bf94e4a5f5d5cffcc9da2f69.png',
    mh_overlayOpacity: 0.3,
    // systems_showcase
    ss_title: 'Un système ',
    ss_titleSuffix: 'rodé',
    ss_buttonText: 'Faites un tour du propriétaire',
    ss_buttonLink: '/mes-systemes',
    // stats
    stats_title: "La force d'une communauté",
    stats_subtitle: "Rejoignez une communauté grandissante et profitez d'un catalogue de formations riche et évolutif.",
    // support
    sup_badgeLabel: 'Votre Bouée de Sauvetage Notion',
    sup_title: 'Ne restez jamais bloqué.',
    sup_subtitle: "Le vrai \"plus\" de mon projet, c'est un système qui vous aide! Vous avez une ligne directe avec un expert Notion, et j'espère à la longue, plusieurs passionnés qui me rejoindront. Rejoignez des milliers d'utilisateurs qui ont déjà révolutionné leur organisation avec Notion. Economisez du temps et de l'énergie en recevant au minimum des astuces pour commencer proprement sur Notion.",
    sup_imageUrl: 'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/capture-daa-c-cran-2025-08-24-235707-02xTj.png',
    sup_imageAlt: 'Un expert Notion souriant, disponible pour aider via un chat',
    // promise
    pro_title: 'Ma promesse,',
    pro_titleSuffix: 'simple.',
    pro_1_icon: 'Users',
    pro_1_title: 'La passion avant-tout',
    pro_1_text: "Je suis juste un passionné de systèmes, et un passionné de Notion. je suis bon pédagogue, et j'ai faim de vous apprendre! ",
    pro_2_icon: 'CalendarDays',
    pro_2_title: 'Premier rendez-vous gratuit',
    pro_2_text: "Lancez-vous : aujourd’hui je suis seul, demain l’équipe grandit — mon envie ? Vous former. Le labo est prêt à acceuillir des modérateurs et d'autres experts Notion comme moi. ",
    pro_3_icon: 'Zap',
    pro_3_title: 'Support Notion éclair ⚡',
    pro_3_text: "Décrivez votre souci, je réponds dans la journée.  Assignéez votre demande à un ticket, un message ou même au forum! Vous aurez de quoi venir les réponses! ",
    // personal_quote
    pq_line1: "Cela fait une quinzaine d’années que je teste ce type d’outils — c’est mon métier.",
    pq_line2: "Mais depuis six ans, pas une seconde l’envie de quitter Notion. Aujourd'hui, je me lance, j'aimerais vous le présenter ✨✨✨",
    // final_cta
    fcta_title: 'Boostons vraiment votre productivité ensemble ?',
    fcta_description: "Rejoignez des milliers d'utilisateurs qui ont déjà révolutionné leur organisation avec Notion. Economisez du temps et de l'énergie en recevant au minimum des astuces pour commencer proprement sur Notion. Contrairement aux autres professeurs, comme il s'agit d'un axe technologiques, j'ai développé la technologie pour vous supporter pendant votre ascension. je vous promets, j'ai mis le paquet sur l'espace de formation... ",
    fcta_buttonText: 'Commencer maintenant',
    fcta_buttonLink: '/formations',
    // launch_cta
    lcta_displayDate: '1 septembre 2025',
    lcta_heading: "Je démarre mon activité et j'ai faim de vous présenter mon outil !",
    lcta_subText: "Alors s'il vous plaît, n'hésitez pas, faites quelques heures de formation, contactez-moi !",
    lcta_buttonText: 'Contactez-moi !',
    lcta_buttonLink: '/contact',
    lcta_showCta: true,
    lcta_iconName: 'Heart',
    lcta_useDefaultBackground: true,
    lcta_backgroundColor: '#ff6b35',
    // footer (global)
    foot_logoUrl: 'https://horizons-cdn.hostinger.com/33d72ce2-b6b0-4274-b8ce-63300e44633e/logo_clair-U67WQ.png',
    foot_address: '1315 La Sarraz, Suisse',
    foot_email: 'Vallottonyann@gmail.com',
    foot_phone: '079 576 52 24',
    foot_mapEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1151.3494205839254!2d6.516213008580243!3d46.658642866494915!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x478dcb21dc82f31b%3A0x4d82dcf171487de7!2sLa%20Sarraz!5e0!3m2!1sfr!2sch!4v1757538158313!5m2!1sfr!2sch',
    foot_mapLink: 'https://www.google.com/maps/place/La+Sarraz/@46.658643,6.516213,17z',
    // formations
    form_title: 'Mes ',
    form_titleSuffix: 'formations',
    form_subtitle: "Choisissez la formation qui correspond à votre niveau et vos objectifs. Chaque formation est conçue pour vous faire progresser rapidement.",
    form_backgroundImageUrl: 'https://images.unsplash.com/photo-1687754946970-5ff99224bd70'
  });
  const [showBadgeIcons, setShowBadgeIcons] = useState(false);

  // Icons library for badge (same as template editor)
  const badgeIcons = [
    { name: 'Sparkles', icon: Sparkles, label: 'Étincelles' },
    { name: 'Star', icon: Star, label: 'Étoile' },
    { name: 'Crown', icon: Crown, label: 'Couronne' },
    { name: 'Zap', icon: Zap, label: 'Éclair' },
    { name: 'Heart', icon: Heart, label: 'Cœur' },
    { name: 'Trophy', icon: Trophy, label: 'Trophée' },
    { name: 'Gift', icon: Gift, label: 'Cadeau' },
    { name: 'Gem', icon: Gem, label: 'Gemme' },
    { name: 'Shield', icon: Shield, label: 'Bouclier' },
    { name: 'Rocket', icon: Rocket, label: 'Fusée' },
    { name: 'Award', icon: Award, label: 'Récompense' },
    { name: 'Bookmark', icon: Bookmark, label: 'Marque-page' },
    { name: 'CheckCircle', icon: CheckCircle, label: 'Validation' },
    { name: 'Clock', icon: Clock, label: 'Horloge' },
    { name: 'Diamond', icon: Diamond, label: 'Diamant' },
    { name: 'Fire', icon: Flame, label: 'Feu' },
    { name: 'Flag', icon: Flag, label: 'Drapeau' },
    { name: 'Globe', icon: Globe, label: 'Globe' },
    { name: 'Lightbulb', icon: Lightbulb, label: 'Ampoule' },
    { name: 'Lock', icon: Lock, label: 'Cadenas' },
    { name: 'Mail', icon: Mail, label: 'Mail' },
    { name: 'MapPin', icon: MapPin, label: 'Épingle' },
    { name: 'Music', icon: Music, label: 'Musique' },
    { name: 'Target', icon: Target, label: 'Cible' },
  ];

  const handleDynChange = (field) => (e) => setDyn(prev => ({ ...prev, [field]: e.target.value }));
  const handleDynImageChange = (url) => setDyn(prev => ({ ...prev, imageUrl: url }));

  useEffect(() => {
    if (!isNew) {
      const fetchBlock = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('content_blocks')
          .select('*')
          .eq('id', blockId)
          .single();

        if (error) {
          toast({ title: 'Erreur', description: "Impossible de charger le bloc.", variant: 'destructive' });
          onBack();
        } else {
          reset({
            ...data,
            publication_date: data.publication_date ? new Date(data.publication_date) : null,
          });
          if (data.block_type === 'dynamic') {
            const c = data.content || {};
            setDyn(prev => ({
              ...prev,
              // cozy
              badgeText: c.badgeText ?? prev.badgeText,
              badgeIcon: c.badgeIcon ?? prev.badgeIcon,
              titleText: c.title ?? prev.titleText,
              descriptionText: c.description ?? prev.descriptionText,
              imageUrl: c.imageUrl ?? prev.imageUrl,
              imageAlt: c.imageAlt ?? prev.imageAlt,
              showBadge: c.showBadge !== undefined ? c.showBadge : prev.showBadge,
              ctaText: c.ctaText ?? prev.ctaText,
              ctaUrl: c.ctaUrl ?? prev.ctaUrl,
              showCta: c.showCta !== undefined ? c.showCta : prev.showCta,
              backgroundColor: c.backgroundColor ?? prev.backgroundColor,
              useDefaultBackground: c.useDefaultBackground !== undefined ? c.useDefaultBackground : prev.useDefaultBackground,
              // main_hero
              mh_imageUrl: c.imageUrl ?? prev.mh_imageUrl,
              mh_overlayOpacity: typeof c.overlayOpacity === 'number' ? c.overlayOpacity : prev.mh_overlayOpacity,
              // systems_showcase
              ss_title: c.title ?? prev.ss_title,
              ss_titleSuffix: c.titleSuffix ?? prev.ss_titleSuffix,
              ss_buttonText: c.buttonText ?? prev.ss_buttonText,
              ss_buttonLink: c.buttonLink ?? prev.ss_buttonLink,
              // stats
              stats_title: c.title ?? prev.stats_title,
              stats_subtitle: c.subtitle ?? prev.stats_subtitle,
              // formations
              form_title: c.title ?? prev.form_title,
              form_titleSuffix: c.titleSuffix ?? prev.form_titleSuffix,
              form_subtitle: c.subtitle ?? prev.form_subtitle,
              form_backgroundImageUrl: c.backgroundImageUrl ?? prev.form_backgroundImageUrl,
              // support
              sup_badgeLabel: c.badgeLabel ?? prev.sup_badgeLabel,
              sup_title: c.title ?? prev.sup_title,
              sup_subtitle: c.subtitle ?? prev.sup_subtitle,
              sup_imageUrl: c.imageUrl ?? prev.sup_imageUrl,
              sup_imageAlt: c.imageAlt ?? prev.sup_imageAlt,
              // promise
              pro_title: c.title ?? prev.pro_title,
              pro_titleSuffix: c.titleSuffix ?? prev.pro_titleSuffix,
              pro_1_icon: c.items?.[0]?.icon ?? prev.pro_1_icon,
              pro_1_title: c.items?.[0]?.title ?? prev.pro_1_title,
              pro_1_text: c.items?.[0]?.text ?? prev.pro_1_text,
              pro_2_icon: c.items?.[1]?.icon ?? prev.pro_2_icon,
              pro_2_title: c.items?.[1]?.title ?? prev.pro_2_title,
              pro_2_text: c.items?.[1]?.text ?? prev.pro_2_text,
              pro_3_icon: c.items?.[2]?.icon ?? prev.pro_3_icon,
              pro_3_title: c.items?.[2]?.title ?? prev.pro_3_title,
              pro_3_text: c.items?.[2]?.text ?? prev.pro_3_text,
              // personal_quote
              pq_line1: c.quoteLine1 ?? prev.pq_line1,
              pq_line2: c.quoteLine2 ?? prev.pq_line2,
              // final_cta
              fcta_title: c.title ?? prev.fcta_title,
              fcta_description: c.description ?? prev.fcta_description,
              fcta_buttonText: c.buttonText ?? prev.fcta_buttonText,
              fcta_buttonLink: c.buttonLink ?? prev.fcta_buttonLink,
              // launch_cta
              lcta_displayDate: c.displayDate ?? prev.lcta_displayDate,
              lcta_heading: c.heading ?? prev.lcta_heading,
              lcta_subText: c.subText ?? prev.lcta_subText,
              lcta_buttonText: c.buttonText ?? prev.lcta_buttonText,
              lcta_buttonLink: c.buttonLink ?? prev.lcta_buttonLink,
              lcta_showCta: c.showCta ?? prev.lcta_showCta,
              lcta_iconName: c.iconName ?? prev.lcta_iconName,
              lcta_useDefaultBackground: c.useDefaultBackground ?? prev.lcta_useDefaultBackground,
              lcta_backgroundColor: c.backgroundColor ?? prev.lcta_backgroundColor,
              // footer
              foot_logoUrl: c.logoUrl ?? prev.foot_logoUrl,
              foot_address: c.address ?? prev.foot_address,
              foot_email: c.email ?? prev.foot_email,
              foot_phone: c.phone ?? prev.foot_phone,
              foot_mapEmbedUrl: c.mapEmbedUrl ?? prev.foot_mapEmbedUrl,
              foot_mapLink: c.mapLink ?? prev.foot_mapLink,
            }));
          }
        }
        setLoading(false);
      };

      fetchBlock();
    }
  }, [blockId, isNew, toast, onBack]);

  const onSubmit = async (formData, status) => {
    setIsSubmitting(true);
    
    // Serialize dynamic content per layout
    const serializeDynamicContent = () => {
      switch (formData.layout) {
        case 'home.main_hero':
          return { imageUrl: dyn.mh_imageUrl, overlayOpacity: Number(dyn.mh_overlayOpacity) || 0.3 };
        case 'home.systems_showcase':
          return { title: dyn.ss_title, titleSuffix: dyn.ss_titleSuffix, buttonText: dyn.ss_buttonText, buttonLink: dyn.ss_buttonLink };
        case 'home.stats':
          return { title: dyn.stats_title, subtitle: dyn.stats_subtitle };
        case 'home.support':
          return { badgeLabel: dyn.sup_badgeLabel, title: dyn.sup_title, subtitle: dyn.sup_subtitle, imageUrl: dyn.sup_imageUrl, imageAlt: dyn.sup_imageAlt };
        case 'home.formations':
          return { title: dyn.form_title, titleSuffix: dyn.form_titleSuffix, subtitle: dyn.form_subtitle, backgroundImageUrl: dyn.form_backgroundImageUrl };
        case 'home.promise':
          return { title: dyn.pro_title, titleSuffix: dyn.pro_titleSuffix, items: [
            { icon: dyn.pro_1_icon, title: dyn.pro_1_title, text: dyn.pro_1_text },
            { icon: dyn.pro_2_icon, title: dyn.pro_2_title, text: dyn.pro_2_text },
            { icon: dyn.pro_3_icon, title: dyn.pro_3_title, text: dyn.pro_3_text },
          ]};
        case 'home.personal_quote':
          return { quoteLine1: dyn.pq_line1, quoteLine2: dyn.pq_line2 };
        case 'home.final_cta':
          return { title: dyn.fcta_title, description: dyn.fcta_description, buttonText: dyn.fcta_buttonText, buttonLink: dyn.fcta_buttonLink };
        case 'home.launch_cta':
          return { 
            displayDate: dyn.lcta_displayDate, 
            heading: dyn.lcta_heading, 
            subText: dyn.lcta_subText, 
            buttonText: dyn.lcta_buttonText, 
            buttonLink: dyn.lcta_buttonLink,
            showCta: dyn.lcta_showCta,
            iconName: dyn.lcta_iconName,
            useDefaultBackground: dyn.lcta_useDefaultBackground,
            backgroundColor: dyn.lcta_backgroundColor
          };
        case 'global.footer':
          return { logoUrl: dyn.foot_logoUrl, address: dyn.foot_address, email: dyn.foot_email, phone: dyn.foot_phone, mapEmbedUrl: dyn.foot_mapEmbedUrl, mapLink: dyn.foot_mapLink };
        case 'home.cozy_space':
        default:
          return {
            badgeText: dyn.badgeText,
            badgeIcon: dyn.badgeIcon,
            title: dyn.titleText,
            description: dyn.descriptionText,
            imageUrl: dyn.imageUrl,
            imageAlt: dyn.imageAlt,
            showBadge: dyn.showBadge,
            ctaText: dyn.ctaText,
            ctaUrl: dyn.ctaUrl,
            showCta: dyn.showCta,
            backgroundColor: dyn.backgroundColor,
            useDefaultBackground: dyn.useDefaultBackground,
          };
      }
    };

    const blockData = {
      title: formData.title,
      content: formData.block_type === 'html' ? formData.content : serializeDynamicContent(),
      status: status || formData.status,
      type: formData.type,
      block_type: formData.block_type,
      layout: formData.layout,
      order_index: formData.order_index,
      priority: formData.priority,
      author_id: user?.id,
      publication_date: formData.publication_date,
      tags: formData.tags,
      audience_mode: formData.audience_mode,
    };

    try {
      // Pour les nouveaux blocs HTML (non dynamiques), on bypass l'Edge Function
      // et on utilise la RPC transactionnelle dédiée afin d'éviter l'erreur non-2xx.
      if (isNew && blockData.block_type === 'html') {
        const { data: newId, error: rpcError } = await supabase.rpc('home_blocks_create_html', {
          p_title: blockData.title,
          p_content: blockData.content || '',
          p_layout: blockData.layout,
          p_type: blockData.type,
          p_status: status || formData.status,
          p_priority: blockData.priority ?? 0,
        });
        if (rpcError) throw rpcError;

        toast({ title: 'Succès', description: `Bloc sauvegardé en tant que ${status || formData.status}.` });
        onSave({ id: newId });
      } else {
        const { data, error } = await supabase.functions.invoke('manage-content-block', {
          body: { blockId: isNew ? null : blockId, blockData },
        });

        if (error) throw error;
        if (data.error) throw new Error(data.error);

        toast({ title: 'Succès', description: `Bloc sauvegardé en tant que ${status || formData.status}.` });
        onSave(data);
      }
 
     } catch (error) {
       toast({ title: 'Erreur', description: `Échec de la sauvegarde: ${error.message}`, variant: 'destructive' });
     } finally {
       setIsSubmitting(false);
     }
   };

  const handleAction = (action) => {
    toast({
      title: '🚧 Fonctionnalité en cours de développement',
      description: "Cette action n'est pas encore implémentée.",
    });
  };

  const renderPreview = () => {
    switch (layout) {
      case 'home.main_hero':
        return <MainHeroSection content={{ imageUrl: dyn.mh_imageUrl, overlayOpacity: Number(dyn.mh_overlayOpacity) || 0.3 }} />;
      case 'home.systems_showcase':
        return <SystemsShowcase content={{ title: dyn.ss_title, titleSuffix: dyn.ss_titleSuffix, buttonText: dyn.ss_buttonText, buttonLink: dyn.ss_buttonLink }} />;
      case 'home.stats':
        return <StatsSection content={{ title: dyn.stats_title, subtitle: dyn.stats_subtitle }} />;
      case 'home.formations':
        return <FormationsSection content={{ title: dyn.form_title, titleSuffix: dyn.form_titleSuffix, subtitle: dyn.form_subtitle, backgroundImageUrl: dyn.form_backgroundImageUrl }} />;
      case 'home.support':
        return <SupportSection content={{ badgeLabel: dyn.sup_badgeLabel, title: dyn.sup_title, subtitle: dyn.sup_subtitle, imageUrl: dyn.sup_imageUrl, imageAlt: dyn.sup_imageAlt }} />;
      case 'home.promise':
        return <PromiseSection content={{ title: dyn.pro_title, titleSuffix: dyn.pro_titleSuffix, items: [
          { icon: dyn.pro_1_icon, title: dyn.pro_1_title, text: dyn.pro_1_text },
          { icon: dyn.pro_2_icon, title: dyn.pro_2_title, text: dyn.pro_2_text },
          { icon: dyn.pro_3_icon, title: dyn.pro_3_title, text: dyn.pro_3_text },
        ]}} />;
      case 'home.cozy_space':
        return (
          <CozySpaceSectionWithUpload
            content={{
              badgeText: dyn.badgeText,
              badgeIcon: dyn.badgeIcon,
              title: dyn.titleText,
              description: dyn.descriptionText,
              imageUrl: dyn.imageUrl,
              imageAlt: dyn.imageAlt,
              showBadge: dyn.showBadge,
              ctaText: dyn.ctaText,
              ctaUrl: dyn.ctaUrl,
              showCta: dyn.showCta,
              backgroundColor: dyn.backgroundColor,
              useDefaultBackground: dyn.useDefaultBackground,
            }}
            previewMode={'desktop'}
            onImageChange={handleDynImageChange}
          />
        );
      case 'home.personal_quote':
        return <PersonalQuoteSection content={{ quoteLine1: dyn.pq_line1, quoteLine2: dyn.pq_line2 }} />;
      case 'home.final_cta':
        return <FinalCTA content={{ title: dyn.fcta_title, description: dyn.fcta_description, buttonText: dyn.fcta_buttonText, buttonLink: dyn.fcta_buttonLink }} />;
      case 'home.launch_cta':
        return <LaunchCTA content={{ 
          displayDate: dyn.lcta_displayDate, 
          heading: dyn.lcta_heading, 
          subText: dyn.lcta_subText, 
          buttonText: dyn.lcta_buttonText, 
          buttonLink: dyn.lcta_buttonLink,
          showCta: dyn.lcta_showCta,
          iconName: dyn.lcta_iconName,
          useDefaultBackground: dyn.lcta_useDefaultBackground,
          backgroundColor: dyn.lcta_backgroundColor
        }} />;
      case 'global.footer':
        return <Footer isPreview={true} content={{ logoUrl: dyn.foot_logoUrl, address: dyn.foot_address, email: dyn.foot_email, phone: dyn.foot_phone, mapEmbedUrl: dyn.foot_mapEmbedUrl, mapLink: dyn.foot_mapLink }} />;
      default:
        return <div className="p-4 text-sm text-muted-foreground">Prévisualisation non disponible pour ce layout.</div>;
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  // All layouts editable

  return (
    <>
      <Helmet>
        <title>{isNew ? 'Créer un bloc' : 'Modifier le bloc'} | Admin</title>
      </Helmet>
      <div>
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl font-bold">{isNew ? 'Proposer un bloque' : 'Modifier le bloque'}</h1>
          <div className="flex flex-col md:flex-row gap-2">
            <Button variant="ghost" onClick={onBack}>Annuler</Button>
            <Button variant="secondary" onClick={handleSubmit(d => onSubmit(d, 'draft'))} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sauver en brouillon
            </Button>
            <Button onClick={handleSubmit(d => onSubmit(d, 'published'))} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isNew ? 'Publier' : 'Mettre à jour'}
            </Button>
            <Button variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la gestion des bloques
            </Button>
          </div>
        </header>

        <Tabs defaultValue="details" className="w-full">
          <TabsList>
            <TabsTrigger value="details">Détail du bloque</TabsTrigger>
            <TabsTrigger value="gallery_images" disabled>Galerie des images</TabsTrigger>
            <TabsTrigger value="gallery_docs" disabled>Galerie des documents</TabsTrigger>
          </TabsList>
          <TabsContent value="details">
            <form>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div>
                        <Label htmlFor="title">Titre*</Label>
                        <Input id="title" {...register('title', { required: 'Le titre est requis' })} />
                        {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                      </div>
                      <div className="mt-4">
                        <Label>Corps du bloque</Label>
                        {blockType === 'html' ? (
                          <Controller
                            name="content"
                            control={control}
                            render={({ field }) => <TiptapEditor content={field.value} onChange={field.onChange} placeholder="Saisissez le contenu du bloque ici..." />}
                          />
                        ) : (
                          <div className="flex gap-6">
                            <div className="w-[24rem] flex-shrink-0 space-y-3">
                              {layout === 'home.cozy_space' ? (
                              <>
                              <div>
                                <Label>Badge</Label>
                                <div className="space-y-2">
                                  <div className="flex gap-2">
                                    <Input 
                                      value={dyn.badgeText} 
                                      onChange={handleDynChange('badgeText')} 
                                      className="flex-1"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setShowBadgeIcons(!showBadgeIcons)}
                                      className="px-2 py-1 h-auto"
                                      title="Choisir une icône"
                                    >
                                      {React.createElement(badgeIcons.find(icon => icon.name === dyn.badgeIcon)?.icon || Sparkles, { 
                                        className: "w-4 h-4" 
                                      })}
                                      {showBadgeIcons ? (
                                        <ChevronUp className="w-3 h-3 ml-1" />
                                      ) : (
                                        <ChevronDown className="w-3 h-3 ml-1" />
                                      )}
                                    </Button>
                                  </div>
                                  {showBadgeIcons && (
                                    <div className="border rounded-md p-3 bg-muted/30">
                                      <Label className="text-xs text-muted-foreground mb-2 block">Icône du badge</Label>
                                      <div className="grid grid-cols-5 gap-2">
                                        {badgeIcons.map((iconItem) => {
                                          const IconComponent = iconItem.icon;
                                          return (
                                            <button
                                              key={iconItem.name}
                                              type="button"
                                              onClick={() => {
                                                setDyn(prev => ({ ...prev, badgeIcon: iconItem.name }));
                                                setShowBadgeIcons(false);
                                              }}
                                              className={`
                                                p-2 rounded border-2 transition-colors flex items-center justify-center
                                                ${dyn.badgeIcon === iconItem.name 
                                                  ? 'border-primary bg-primary/10' 
                                                  : 'border-muted hover:border-primary/50'
                                                }
                                              `}
                                              title={iconItem.label}
                                            >
                                              <IconComponent className="w-4 h-4" />
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center justify-between">
                                <Label>Afficher le badge</Label>
                                <Switch checked={dyn.showBadge} onCheckedChange={(v) => setDyn(prev => ({ ...prev, showBadge: v }))} />
                              </div>
                              <div>
                                <Label>Titre affiché</Label>
                                <Input value={dyn.titleText} onChange={handleDynChange('titleText')} />
                              </div>
                              <div>
                                <Label>Paragraphe</Label>
                                <Textarea value={dyn.descriptionText} onChange={handleDynChange('descriptionText')} rows={6} />
                              </div>
                              <div>
                                <Label>Call-to-Action</Label>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-sm">Afficher le bouton CTA</Label>
                                    <Switch checked={dyn.showCta} onCheckedChange={(v) => setDyn(prev => ({ ...prev, showCta: v }))} />
                                  </div>
                                  {dyn.showCta && (
                                    <div className="space-y-2">
                                      <Input 
                                        value={dyn.ctaText} 
                                        onChange={handleDynChange('ctaText')} 
                                        placeholder="Texte du bouton"
                                      />
                                      <Input 
                                        value={dyn.ctaUrl} 
                                        onChange={handleDynChange('ctaUrl')} 
                                        placeholder="URL de destination"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <Label>Couleur de fond</Label>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label className="text-sm">Utiliser la couleur par défaut</Label>
                                    <Switch 
                                      checked={dyn.useDefaultBackground} 
                                      onCheckedChange={(v) => setDyn(prev => ({ ...prev, useDefaultBackground: v }))} 
                                    />
                                  </div>
                                  {!dyn.useDefaultBackground && (
                                    <div className="flex gap-2 items-center">
                                      <Input 
                                        type="color"
                                        value={dyn.backgroundColor || '#1f2937'} 
                                        onChange={handleDynChange('backgroundColor')}
                                        className="w-16 h-10 p-1 rounded cursor-pointer"
                                      />
                                      <Input 
                                        value={dyn.backgroundColor || '#1f2937'} 
                                        onChange={handleDynChange('backgroundColor')}
                                        placeholder="#1f2937"
                                        className="flex-1 font-mono text-sm"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <Label>Texte alternatif</Label>
                                <Input value={dyn.imageAlt} onChange={handleDynChange('imageAlt')} />
                              </div>
                              </>
                              ) : (
                                <>
                                  {layout === 'home.main_hero' && (
                                    <>
                                      <div>
                                        <Label>Image URL</Label>
                                        <Input value={dyn.mh_imageUrl} onChange={(e) => setDyn(prev => ({ ...prev, mh_imageUrl: e.target.value }))} />
                                      </div>
                                      <div>
                                        <Label>Opacité de l'overlay (0 à 1)</Label>
                                        <Input type="number" step="0.05" min="0" max="1" value={dyn.mh_overlayOpacity} onChange={(e) => setDyn(prev => ({ ...prev, mh_overlayOpacity: e.target.value }))} />
                                      </div>
                                    </>
                                  )}

                                  {layout === 'home.systems_showcase' && (
                                    <div className="space-y-3">
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <Label className="text-sm">Titre</Label>
                                          <Input 
                                            value={dyn.ss_title} 
                                            onChange={(e) => setDyn(prev => ({ ...prev, ss_title: e.target.value }))} 
                                            className="h-9"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-sm">Mot en dégradé</Label>
                                          <Input 
                                            value={dyn.ss_titleSuffix} 
                                            onChange={(e) => setDyn(prev => ({ ...prev, ss_titleSuffix: e.target.value }))} 
                                            className="h-9"
                                          />
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <Label className="text-sm">Texte du bouton</Label>
                                          <Input 
                                            value={dyn.ss_buttonText} 
                                            onChange={(e) => setDyn(prev => ({ ...prev, ss_buttonText: e.target.value }))} 
                                            className="h-9"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-sm">Lien du bouton</Label>
                                          <Input 
                                            value={dyn.ss_buttonLink} 
                                            onChange={(e) => setDyn(prev => ({ ...prev, ss_buttonLink: e.target.value }))} 
                                            className="h-9"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {layout === 'home.stats' && (
                                    <>
                                      <div>
                                        <Label>Titre</Label>
                                        <Input value={dyn.stats_title} onChange={(e) => setDyn(prev => ({ ...prev, stats_title: e.target.value }))} />
                                      </div>
                                      <div>
                                        <Label>Sous-titre</Label>
                                        <Textarea rows={3} value={dyn.stats_subtitle} onChange={(e) => setDyn(prev => ({ ...prev, stats_subtitle: e.target.value }))} />
                                      </div>
                                    </>
                                  )}

                                  {layout === 'home.support' && (
                                    <>
                                      <div>
                                        <Label>Badge</Label>
                                        <Input value={dyn.sup_badgeLabel} onChange={(e) => setDyn(prev => ({ ...prev, sup_badgeLabel: e.target.value }))} />
                                      </div>
                                      <div>
                                        <Label>Titre</Label>
                                        <Input value={dyn.sup_title} onChange={(e) => setDyn(prev => ({ ...prev, sup_title: e.target.value }))} />
                                      </div>
                                      <div>
                                        <Label>Description</Label>
                                        <Textarea rows={5} value={dyn.sup_subtitle} onChange={(e) => setDyn(prev => ({ ...prev, sup_subtitle: e.target.value }))} />
                                      </div>
                                      <div>
                                        <Label>Image URL</Label>
                                        <Input value={dyn.sup_imageUrl} onChange={(e) => setDyn(prev => ({ ...prev, sup_imageUrl: e.target.value }))} />
                                      </div>
                                      <div>
                                        <Label>Texte alternatif</Label>
                                        <Input value={dyn.sup_imageAlt} onChange={(e) => setDyn(prev => ({ ...prev, sup_imageAlt: e.target.value }))} />
                                      </div>
                                    </>
                                  )}

                                  {layout === 'home.promise' && (
                                    <>
                                      <div>
                                        <Label>Titre (avant le mot en dégradé)</Label>
                                        <Input value={dyn.pro_title} onChange={(e) => setDyn(prev => ({ ...prev, pro_title: e.target.value }))} />
                                      </div>
                                      <div>
                                        <Label>Mot en dégradé</Label>
                                        <Input value={dyn.pro_titleSuffix} onChange={(e) => setDyn(prev => ({ ...prev, pro_titleSuffix: e.target.value }))} />
                                      </div>
                                      {[1,2,3].map(i => (
                                        <div key={i} className="border rounded-md p-3 bg-muted/20 space-y-2">
                                          <Label>Icône {`{Users, CalendarDays, Zap}`}</Label>
                                          <Input value={dyn[`pro_${i}_icon`]} onChange={(e) => setDyn(prev => ({ ...prev, [`pro_${i}_icon`]: e.target.value }))} />
                                          <Label>Titre</Label>
                                          <Input value={dyn[`pro_${i}_title`]} onChange={(e) => setDyn(prev => ({ ...prev, [`pro_${i}_title`]: e.target.value }))} />
                                          <Label>Texte</Label>
                                          <Textarea rows={3} value={dyn[`pro_${i}_text`]} onChange={(e) => setDyn(prev => ({ ...prev, [`pro_${i}_text`]: e.target.value }))} />
                                        </div>
                                      ))}
                                    </>
                                  )}

                                  {layout === 'home.personal_quote' && (
                                    <>
                                      <div>
                                        <Label>Ligne 1</Label>
                                        <Textarea rows={2} value={dyn.pq_line1} onChange={(e) => setDyn(prev => ({ ...prev, pq_line1: e.target.value }))} />
                                      </div>
                                      <div>
                                        <Label>Ligne 2</Label>
                                        <Textarea rows={2} value={dyn.pq_line2} onChange={(e) => setDyn(prev => ({ ...prev, pq_line2: e.target.value }))} />
                                      </div>
                                    </>
                                  )}

                                  {layout === 'home.final_cta' && (
                                    <>
                                      <div>
                                        <Label>Titre</Label>
                                        <Input value={dyn.fcta_title} onChange={handleDynChange('fcta_title')} placeholder="Titre du CTA final" />
                                      </div>
                                      <div>
                                        <Label>Description</Label>
                                        <Textarea value={dyn.fcta_description} onChange={handleDynChange('fcta_description')} placeholder="Description du CTA final" rows={4} />
                                      </div>
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <Label>Texte du bouton</Label>
                                          <Input value={dyn.fcta_buttonText} onChange={handleDynChange('fcta_buttonText')} placeholder="Texte du bouton" />
                                        </div>
                                        <div>
                                          <Label>Lien du bouton</Label>
                                          <Input value={dyn.fcta_buttonLink} onChange={handleDynChange('fcta_buttonLink')} placeholder="/lien" />
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {layout === 'home.launch_cta' && (
                                    <>
                                      <div>
                                        <Label>Date d'affichage</Label>
                                        <Input value={dyn.lcta_displayDate} onChange={handleDynChange('lcta_displayDate')} placeholder="1 septembre 2025" />
                                      </div>
                                      <div>
                                        <Label>Titre principal</Label>
                                        <Textarea value={dyn.lcta_heading} onChange={handleDynChange('lcta_heading')} placeholder="Titre principal du CTA" rows={2} />
                                      </div>
                                      <div>
                                        <Label>Sous-texte</Label>
                                        <Textarea value={dyn.lcta_subText} onChange={handleDynChange('lcta_subText')} placeholder="Description sous le titre" rows={3} />
                                      </div>

                                      {/* CTA Button Section */}
                                      <div className="space-y-4 p-4 border rounded-lg">
                                        <div className="flex items-center space-x-2">
                                          <Switch 
                                            checked={dyn.lcta_showCta} 
                                            onCheckedChange={(checked) => setDyn(prev => ({ ...prev, lcta_showCta: checked }))}
                                          />
                                          <Label>Afficher le bouton CTA</Label>
                                        </div>
                                        {dyn.lcta_showCta && (
                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <Label>Texte du bouton</Label>
                                              <Input value={dyn.lcta_buttonText} onChange={handleDynChange('lcta_buttonText')} placeholder="Contactez-moi !" />
                                            </div>
                                            <div>
                                              <Label>Lien du bouton</Label>
                                              <Input value={dyn.lcta_buttonLink} onChange={handleDynChange('lcta_buttonLink')} placeholder="/contact" />
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Icon Selection */}
                                      <div>
                                        <Label>Icône du haut</Label>
                                        <div className="grid grid-cols-8 gap-2 mt-2 p-4 border rounded-lg max-h-48 overflow-y-auto">
                                          {[
                                            'Heart', 'Sparkles', 'Star', 'Crown', 'Zap', 'Trophy', 'Gift', 'Gem', 
                                            'Shield', 'Rocket', 'Award', 'Bookmark', 'CheckCircle', 'Clock', 
                                            'Flame', 'Flag', 'Globe', 'Lightbulb', 'Lock', 'Mail', 'MapPin', 
                                            'Music', 'Target', 'Users', 'CalendarDays', 'Settings'
                                          ].map(iconName => {
                                            const IconComponent = {
                                              Heart, Sparkles, Star, Crown, Zap, Trophy, Gift, Gem, Shield, Rocket,
                                              Award, Bookmark, CheckCircle, Clock, Flame, Flag, Globe, Lightbulb, Lock,
                                              Mail, MapPin, Music, Target, Users, CalendarDays: CalendarIcon, Settings
                                            }[iconName] || Heart;
                                            return (
                                              <button
                                                key={iconName}
                                                type="button"
                                                onClick={() => setDyn(prev => ({ ...prev, lcta_iconName: iconName }))}
                                                className={`p-2 rounded border hover:bg-gray-100 ${dyn.lcta_iconName === iconName ? 'bg-blue-100 border-blue-500' : ''}`}
                                              >
                                                <IconComponent className="w-5 h-5" />
                                              </button>
                                            );
                                          })}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">Icône sélectionnée: {dyn.lcta_iconName}</p>
                                      </div>

                                      {/* Background Color Section */}
                                      <div className="space-y-4 p-4 border rounded-lg">
                                        <div className="flex items-center space-x-2">
                                          <Switch 
                                            checked={dyn.lcta_useDefaultBackground} 
                                            onCheckedChange={(checked) => setDyn(prev => ({ ...prev, lcta_useDefaultBackground: checked }))}
                                          />
                                          <Label>Utiliser la couleur par défaut</Label>
                                        </div>
                                        {!dyn.lcta_useDefaultBackground && (
                                          <div>
                                            <Label>Couleur de base (génère un dégradé automatiquement)</Label>
                                            <div className="flex items-center space-x-2 mt-2">
                                              <input
                                                type="color"
                                                value={dyn.lcta_backgroundColor}
                                                onChange={(e) => setDyn(prev => ({ ...prev, lcta_backgroundColor: e.target.value }))}
                                                className="w-12 h-8 rounded border"
                                              />
                                              <Input 
                                                value={dyn.lcta_backgroundColor} 
                                                onChange={handleDynChange('lcta_backgroundColor')} 
                                                placeholder="#ff6b35" 
                                                className="flex-1"
                                              />
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                              Un dégradé sera généré automatiquement à partir de cette couleur
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}

                                  {layout === 'global.footer' && (
                                    <>
                                      <div>
                                        <Label>Logo URL</Label>
                                        <Input value={dyn.foot_logoUrl} onChange={(e) => setDyn(prev => ({ ...prev, foot_logoUrl: e.target.value }))} />
                                      </div>
                                      <div>
                                        <Label>Adresse</Label>
                                        <Input value={dyn.foot_address} onChange={(e) => setDyn(prev => ({ ...prev, foot_address: e.target.value }))} />
                                      </div>
                                      <div>
                                        <Label>Email</Label>
                                        <Input value={dyn.foot_email} onChange={(e) => setDyn(prev => ({ ...prev, foot_email: e.target.value }))} />
                                      </div>
                                      <div>
                                        <Label>Téléphone</Label>
                                        <Input value={dyn.foot_phone} onChange={(e) => setDyn(prev => ({ ...prev, foot_phone: e.target.value }))} />
                                      </div>
                                      <div>
                                        <Label>URL iframe Google Maps</Label>
                                        <Textarea rows={3} value={dyn.foot_mapEmbedUrl} onChange={(e) => setDyn(prev => ({ ...prev, foot_mapEmbedUrl: e.target.value }))} />
                                      </div>
                                      <div>
                                        <Label>Lien Google Maps</Label>
                                        <Input value={dyn.foot_mapLink} onChange={(e) => setDyn(prev => ({ ...prev, foot_mapLink: e.target.value }))} />
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                            <div className="flex-1 flex flex-col min-w-0">
                              <div className="flex-1 overflow-auto border rounded-xl bg-background">
                                <div className={`w-full h-full`}>
                                  {renderPreview()}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card>
                    <CardHeader><CardTitle>Paramètres</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="block_type">Type de contenu</Label>
                        <Controller name="block_type" control={control} render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="html">HTML</SelectItem>
                              <SelectItem value="dynamic">Dynamique</SelectItem>
                            </SelectContent>
                          </Select>
                        )} />
                      </div>
                      <div>
                        <Label>Période d’activation</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Controller name="publication_date" control={control} render={({ field }) => (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? new Date(field.value).toLocaleDateString('fr-CH') : <span>Début</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                            </Popover>
                          )} />
                           <Controller name="end_date" control={control} render={({ field }) => (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? new Date(field.value).toLocaleDateString('fr-CH') : <span>Fin (optionnel)</span>}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                            </Popover>
                          )} />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="type">Catégorie du bloque</Label>
                        <Controller name="type" control={control} render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="hero">Hero</SelectItem>
                              <SelectItem value="teaser">Teaser</SelectItem>
                              <SelectItem value="carousel">Carrousel</SelectItem>
                              <SelectItem value="cta">CTA</SelectItem>
                              <SelectItem value="article_list">Liste d’articles</SelectItem>
                              <SelectItem value="html">HTML libre</SelectItem>
                            </SelectContent>
                          </Select>
                        )} />
                      </div>
                      <div>
                        <Label htmlFor="layout">Emplacement (Layout)</Label>
                         <Controller name="layout" control={control} render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="home.main_hero">home.main_hero</SelectItem>
                              <SelectItem value="home.systems_showcase">home.systems_showcase</SelectItem>
                              <SelectItem value="home.stats">home.stats</SelectItem>
                              <SelectItem value="home.formations">home.formations</SelectItem>
                              <SelectItem value="home.support">home.support</SelectItem>
                              <SelectItem value="home.promise">home.promise</SelectItem>
                              <SelectItem value="home.cozy_space">home.cozy_space</SelectItem>
                              <SelectItem value="home.personal_quote">home.personal_quote</SelectItem>
                              <SelectItem value="home.final_cta">home.final_cta</SelectItem>
                              <SelectItem value="home.launch_cta">home.launch_cta</SelectItem>
                              <SelectItem value="global.footer">global.footer</SelectItem>
                            </SelectContent>
                          </Select>
                        )} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="order_index">Ordre d’affichage</Label>
                          <Input id="order_index" type="number" {...register('order_index', { valueAsNumber: true })} />
                        </div>
                        <div>
                          <Label htmlFor="priority">Priorité</Label>
                          <Input id="priority" type="number" {...register('priority', { valueAsNumber: true })} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {blockType === 'html' && (
                    <Card>
                      <CardHeader><CardTitle>Visuel principal</CardTitle></CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-center w-full">
                            <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                    <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Cliquez pour uploader</span> ou glissez-déposez</p>
                                </div>
                                <input id="dropzone-file" type="file" className="hidden" onChange={() => handleAction('upload')} />
                            </label>
                        </div>
                        <div className="mt-4 space-y-2">
                          <Button variant="outline" className="w-full" onClick={() => handleAction('crop')}>Recadrer</Button>
                          <Input placeholder="Texte alternatif (alt)" />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader><CardTitle>Conditions d’affichage</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                       <div className="flex items-center space-x-2">
                        <Controller name="visibility_authenticated" control={control} render={({ field }) => (
                          <Checkbox id="visibility_authenticated" checked={field.value} onCheckedChange={field.onChange} />
                        )} />
                        <Label htmlFor="visibility_authenticated">Utilisateur connecté</Label>
                      </div>
                      <div>
                        <Label>Rôles et permissions</Label>
                        <Button variant="outline" className="w-full mt-1" onClick={() => handleAction('select-roles')}>Sélectionner les rôles</Button>
                      </div>
                       <div>
                        <Label>Segments de groupes</Label>
                        <Button variant="outline" className="w-full mt-1" onClick={() => handleAction('select-segments')}>Sélectionner les segments</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Publication</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="status">Statut</Label>
                        <Controller name="status" control={control} render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Brouillon</SelectItem>
                              <SelectItem value="ready">Prêt pour publication</SelectItem>
                              <SelectItem value="published">Publié</SelectItem>
                              <SelectItem value="archived">Archivé</SelectItem>
                            </SelectContent>
                          </Select>
                        )} />
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => handleAction('preview')}>
                        <Eye className="h-4 w-4 mr-2" />
                        Prévisualiser
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default EditHomeBlockPage;