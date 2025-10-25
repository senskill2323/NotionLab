import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Quote, Star } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const FALLBACK_TESTIMONIALS = Object.freeze([
  {
    id: 'preview-1',
    authorName: 'Marie Dupont',
    authorRole: 'Fondatrice, Studio Lueur',
    rating: 5,
    text:
      'Une experience fluide et un accompagnement tres humain. Le module de formation nous a permis de structurer toute notre activite en quelques jours.',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'preview-2',
    authorName: 'Alexandre Martin',
    authorRole: 'COO, HexaTech',
    rating: 5,
    text:
      'NotionLab a transforme notre maniere de collaborer. Les playbooks sont concrets et directement actionnables par toute l equipe.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 21).toISOString(),
  },
  {
    id: 'preview-3',
    authorName: 'Sonia Leroy',
    authorRole: 'Responsable Ops, Nova Conseil',
    rating: 4,
    text:
      'Des contenus de tres grande qualite et une equipe reactive. Nous avons collecte des retours clients x2 en un mois.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
  },
  {
    id: 'preview-4',
    authorName: 'Thomas Bernard',
    authorRole: 'Product Manager, CreativLab',
    rating: 5,
    text:
      'Le builder de formation est ultra intuitif. Nous avons mis en ligne notre parcours en un week-end, avec un feedback client incroyable.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
  },
]);

const clampLimit = (value, min = 1, max = 10) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
};

const formatRelativeTime = (timestamp, locale = 'fr') => {
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return null;
    const diffMs = Date.now() - date.getTime();
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const minutes = Math.round(diffMs / 60000);
    if (Math.abs(minutes) < 60) {
      return rtf.format(-minutes, 'minute');
    }
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) {
      return rtf.format(-hours, 'hour');
    }
    const days = Math.round(hours / 24);
    if (Math.abs(days) < 30) {
      return rtf.format(-days, 'day');
    }
    const months = Math.round(days / 30);
    if (Math.abs(months) < 12) {
      return rtf.format(-months, 'month');
    }
    const years = Math.round(days / 365);
    return rtf.format(-years, 'year');
  } catch {
    return null;
  }
};

const ReviewStars = ({ rating = 0, color = '#38BDF8' }) => {
  const filledStars = Math.round(rating);
  return (
    <div className="flex items-center gap-1 text-amber-400" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className="h-4 w-4"
          style={{ color }}
          fill={index < filledStars ? color : 'none'}
        />
      ))}
    </div>
  );
};

const RatingSelector = ({ value, onChange, color }) => (
  <div className="flex items-center gap-1" role="radiogroup">
    {Array.from({ length: 5 }).map((_, index) => {
      const score = index + 1;
      const active = score <= value;
      return (
        <button
          key={score}
          type="button"
          role="radio"
          aria-checked={active}
          className="group rounded-full p-1 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
          onClick={() => onChange(score)}
        >
          <Star
            className="h-6 w-6"
            style={{
              color: active ? color : '#cbd5f5',
            }}
            fill={active ? color : 'none'}
          />
        </button>
      );
    })}
  </div>
);

const createDefaultFormState = (user) => ({
  authorName:
    typeof user?.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : '',
  authorRole: '',
  content: '',
  rating: 5,
});

const TestimonialsSection = ({ content = {}, isPreview = false }) => {
  const { user, authReady, sessionReady } = useAuth();
  const { toast } = useToast();

  const normalized = useMemo(() => {
    const limit = clampLimit(content.limit ?? 6);
    const backgroundVariant =
      content.backgroundVariant === 'light' ? 'light' : 'dark';

    const locale =
      typeof content.locale === 'string' && content.locale.trim()
        ? content.locale.trim()
        : 'fr';

    return {
      title:
        typeof content.title === 'string' && content.title.trim()
          ? content.title.trim()
          : 'Ils parlent de NotionLab',
      subtitle:
        typeof content.subtitle === 'string' && content.subtitle.trim()
          ? content.subtitle.trim()
          : 'Des retours authentiques de nos membres et clients qui utilisent la plateforme au quotidien.',
      ctaLabel:
        typeof content.ctaLabel === 'string' && content.ctaLabel.trim()
          ? content.ctaLabel.trim()
          : 'Partager mon avis',
      limit,
      locale,
      highlightColor:
        typeof content.highlightColor === 'string' && content.highlightColor.trim()
          ? content.highlightColor.trim()
          : '#38BDF8',
      backgroundVariant,
      showRatingSummary: content.showRatingSummary !== false,
    };
  }, [content]);

  const [testimonials, setTestimonials] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState(createDefaultFormState(user));
  const isMountedRef = useRef(true);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshMetadataFrom = useCallback((entries) => {
    if (!Array.isArray(entries) || entries.length === 0) {
      setMetadata(null);
      return;
    }
    const totalRatings = entries.reduce(
      (total, item) => total + (Number(item.rating) || 0),
      0,
    );
    const average =
      entries.length > 0 ? totalRatings / entries.length : null;
    setMetadata({
      totalReviews: entries.length,
      averageRating: average,
    });
  }, []);

  const fetchTestimonials = useCallback(
    async (signal) => {
      if (isPreview) {
        if (isMountedRef.current) {
          const fallbackSlice = FALLBACK_TESTIMONIALS.slice(0, normalized.limit);
          setTestimonials(fallbackSlice);
          refreshMetadataFrom(fallbackSlice);
          setError(null);
        }
        return;
      }

      if (!isMountedRef.current) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError, count } = await supabase
          .from('testimonials')
          .select(
            'id, author_name, author_role, rating, content, created_at',
            { count: 'exact', head: false },
          )
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(Math.max(normalized.limit, 20));

        if (fetchError) {
          throw fetchError;
        }

        if (!isMountedRef.current || signal?.aborted) {
          return;
        }

        const safeEntries = Array.isArray(data) ? data : [];
        setTestimonials(safeEntries);
        const totalRatings = safeEntries.reduce(
          (total, item) => total + (Number(item.rating) || 0),
          0,
        );
        const average =
          safeEntries.length > 0 ? totalRatings / safeEntries.length : null;

        setMetadata({
          totalReviews:
            typeof count === 'number' && count >= 0
              ? count
              : safeEntries.length,
          averageRating: average,
        });
        setActiveIndex(0);
        activeIndexRef.current = 0;
      } catch (fetchError) {
        console.error('Error loading testimonials', fetchError);
        if (!isMountedRef.current || signal?.aborted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Impossible de recuperer les avis pour le moment.',
        );
        setTestimonials([]);
        setMetadata(null);
      } finally {
        if (isMountedRef.current && !signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [isPreview, normalized.limit, refreshMetadataFrom],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchTestimonials(controller.signal);
    return () => controller.abort();
  }, [fetchTestimonials]);

  useEffect(() => {
    if (isDialogOpen && user) {
      setFormData((current) => {
        if (current.authorName) return current;
        return createDefaultFormState(user);
      });
    }
  }, [isDialogOpen, user]);

  useEffect(() => {
    if (isPreview) {
      const fallbackSlice = FALLBACK_TESTIMONIALS.slice(0, normalized.limit);
      setTestimonials(fallbackSlice);
      refreshMetadataFrom(fallbackSlice);
      setActiveIndex(0);
      activeIndexRef.current = 0;
    }
  }, [isPreview, normalized.limit, refreshMetadataFrom]);

  const displayTestimonials = useMemo(() => {
    const source =
      testimonials.length > 0
        ? testimonials
        : FALLBACK_TESTIMONIALS;

    return source.slice(0, normalized.limit).map((item, index) => {
      const id = item.id ?? `testimonial-${index}`;
      const authorName =
        item.author_name ?? item.authorName ?? 'Membre NotionLab';
      const authorRole = item.author_role ?? item.authorRole ?? null;
      const rating = Number(item.rating ?? item.rating) || 5;
      const text = item.content ?? item.text ?? '';
      const createdAt = item.created_at ?? item.createdAt ?? null;

      return {
        id,
        authorName,
        authorRole,
        rating,
        text,
        createdAt,
        relativeTimeDescription:
          createdAt && formatRelativeTime(createdAt, normalized.locale),
      };
    });
  }, [testimonials, normalized.limit, normalized.locale]);

  useEffect(() => {
    if (displayTestimonials.length <= 1) return undefined;

    const interval = setInterval(() => {
      activeIndexRef.current =
        (activeIndexRef.current + 1) % displayTestimonials.length;
      setActiveIndex(activeIndexRef.current);
    }, 8000);

    return () => clearInterval(interval);
  }, [displayTestimonials]);

  const handleNext = useCallback(() => {
    if (displayTestimonials.length <= 1) return;
    const nextIndex = (activeIndex + 1) % displayTestimonials.length;
    setActiveIndex(nextIndex);
    activeIndexRef.current = nextIndex;
  }, [activeIndex, displayTestimonials.length]);

  const handlePrevious = useCallback(() => {
    if (displayTestimonials.length <= 1) return;
    const nextIndex =
      (activeIndex - 1 + displayTestimonials.length) %
      displayTestimonials.length;
    setActiveIndex(nextIndex);
    activeIndexRef.current = nextIndex;
  }, [activeIndex, displayTestimonials.length]);

  const handleDialogOpen = () => {
    setIsDialogOpen(true);
  };

  const handleDialogClose = (nextOpen) => {
    if (!nextOpen) {
      setIsDialogOpen(false);
      setSubmitting(false);
      setFormData(createDefaultFormState(user));
    } else {
      setIsDialogOpen(true);
    }
  };

  const handleSubmitTestimonial = async (event) => {
    event.preventDefault();
    if (!user || submitting) return;

    const trimmedContent = formData.content.trim();
    if (!trimmedContent) {
      toast({
        title: 'Contenu requis',
        description: 'Merci de nous laisser un message avant de valider.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        author_name: formData.authorName.trim()
          ? formData.authorName.trim()
          : user.user_metadata?.full_name ||
            user.email ||
            'Client NotionLab',
        author_role: formData.authorRole.trim()
          ? formData.authorRole.trim()
          : null,
        content: trimmedContent,
        rating: clampLimit(formData.rating, 1, 5),
        user_id: user.id,
      };

      const { error: insertError } = await supabase
        .from('testimonials')
        .insert(payload);

      if (insertError) {
        throw insertError;
      }

      toast({
        title: 'Merci pour votre avis !',
        description: 'Votre temoignage a bien ete enregistre.',
      });

      setIsDialogOpen(false);
      setFormData(createDefaultFormState(user));
      await fetchTestimonials();
    } catch (submitError) {
      console.error('Error submitting testimonial', submitError);
      toast({
        title: 'Impossible denregistrer votre avis',
        description:
          submitError instanceof Error
            ? submitError.message
            : 'Une erreur est survenue. Merci de reessayer.',
        variant: 'destructive',
      });
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  const formattedAverage = useMemo(() => {
    if (metadata?.averageRating) {
      return Number(metadata.averageRating).toFixed(1);
    }
    if (displayTestimonials.length === 0) return null;
    const sum = displayTestimonials.reduce(
      (total, item) => total + (Number(item.rating) || 0),
      0,
    );
    return displayTestimonials.length
      ? (sum / displayTestimonials.length).toFixed(1)
      : null;
  }, [displayTestimonials, metadata]);

  const accentStyle =
    normalized.backgroundVariant === 'light'
      ? {
          background: '#0f172a',
          color: '#ffffff',
          borderColor: '#0f172a',
        }
      : { background: '#ffffff', color: '#0f172a', borderColor: '#ffffff' };

  const sectionClasses =
    normalized.backgroundVariant === 'light'
      ? 'relative overflow-hidden py-20 md:py-28 bg-white text-slate-900'
      : 'relative overflow-hidden py-20 md:py-28 bg-slate-950 text-white';

  return (
    <>
      <section className={sectionClasses}>
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-purple-500/10" />
        <div className="container relative mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-8">
              <div
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm font-medium uppercase tracking-wide backdrop-blur-md"
                style={
                  normalized.backgroundVariant === 'light'
                    ? {
                        borderColor: '#e2e8f0',
                        background: '#f8fafc',
                        color: '#1f2937',
                      }
                    : undefined
                }
              >
                <span role="img" aria-hidden="true">
                  ⭐
                </span>
                Avis verifie sur NotionLab
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                  {normalized.title}
                </h2>
                <p
                  className="text-lg text-white/80 md:text-xl"
                  style={
                    normalized.backgroundVariant === 'light'
                      ? { color: '#475569' }
                      : undefined
                  }
                >
                  {normalized.subtitle}
                </p>
              </div>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                  <Button
                    type="button"
                    onClick={handleDialogOpen}
                    className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                    style={{
                      background: normalized.highlightColor,
                      borderColor: normalized.highlightColor,
                      color: '#0f172a',
                    }}
                  >
                    {normalized.ctaLabel}
                  </Button>
                  {displayTestimonials.length > 1 ? (
                    <button
                      className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      onClick={handleNext}
                      type="button"
                      style={
                        normalized.backgroundVariant === 'light'
                          ? {
                              borderColor: '#cbd5f5',
                              color: '#1f2937',
                              background: '#ffffff',
                            }
                          : undefined
                      }
                    >
                      Voir un autre avis
                    </button>
                  ) : null}
                </div>
                {error ? (
                  <p className="text-sm text-red-400">{error}</p>
                ) : null}
              </div>
            </div>
            <div className="relative">
              <div
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:p-8"
                style={
                  normalized.backgroundVariant === 'light'
                    ? {
                        borderColor: '#e2e8f0',
                        background: '#ffffff',
                        boxShadow: '0 25px 45px -20px rgba(15, 23, 42, 0.25)',
                      }
                    : undefined
                }
              >
                {loading ? (
                  <div
                    className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-sm text-white/70"
                    style={
                      normalized.backgroundVariant === 'light'
                        ? { color: '#64748b' }
                        : undefined
                    }
                  >
                    <Loader2 className="h-8 w-8 animate-spin" />
                    Chargement des avis...
                  </div>
                ) : displayTestimonials.length === 0 ? (
                  <div
                    className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center text-white/70"
                    style={
                      normalized.backgroundVariant === 'light'
                        ? { color: '#64748b' }
                        : undefined
                    }
                  >
                    <p>Aucun temoignage public n est disponible pour le moment.</p>
                    <p className="text-sm">
                      Soyez le premier a partager votre experience via le bouton ci-dessus.
                    </p>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    {displayTestimonials.map((review, index) =>
                      index === activeIndex ? (
                        <motion.article
                          key={review.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -12 }}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                          className="space-y-6"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div
                                className="relative h-12 w-12 overflow-hidden rounded-full border border-white/20 bg-white/10"
                                style={
                                  normalized.backgroundVariant === 'light'
                                    ? {
                                        background: '#e2e8f0',
                                        borderColor: '#cbd5f5',
                                      }
                                    : undefined
                                }
                              >
                                <Quote
                                  className="absolute inset-0 h-full w-full p-2 text-white/70"
                                  style={
                                    normalized.backgroundVariant === 'light'
                                      ? { color: '#0f172a' }
                                      : undefined
                                  }
                                />
                              </div>
                              <div>
                                <p className="font-semibold">
                                  {review.authorName}
                                </p>
                                {review.authorRole ? (
                                  <p
                                    className="text-sm text-white/60"
                                    style={
                                      normalized.backgroundVariant === 'light'
                                        ? { color: '#64748b' }
                                        : undefined
                                    }
                                  >
                                    {review.authorRole}
                                  </p>
                                ) : null}
                                <div
                                  className="mt-1 flex items-center gap-2 text-sm text-white/60"
                                  style={
                                    normalized.backgroundVariant === 'light'
                                      ? { color: '#94a3b8' }
                                      : undefined
                                  }
                                >
                                  <ReviewStars
                                    rating={Number(review.rating) || 5}
                                    color={normalized.highlightColor}
                                  />
                                  <span>
                                    {review.relativeTimeDescription ??
                                      new Intl.DateTimeFormat(
                                        normalized.locale,
                                        {
                                          day: '2-digit',
                                          month: 'short',
                                          year: 'numeric',
                                        },
                                      ).format(
                                        review.createdAt
                                          ? new Date(review.createdAt)
                                          : Date.now(),
                                      )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <p
                            className="text-lg leading-relaxed text-white/90"
                            style={
                              normalized.backgroundVariant === 'light'
                                ? { color: '#334155' }
                                : undefined
                            }
                          >
                            {review.text}
                          </p>
                          <div className="mt-8 flex items-center justify-between">
                            <div
                              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
                              style={{
                                borderColor: normalized.highlightColor,
                                color:
                                  normalized.backgroundVariant === 'light'
                                    ? '#0f172a'
                                    : normalized.highlightColor,
                                background:
                                  normalized.backgroundVariant === 'light'
                                    ? '#f8fafc'
                                    : normalized.highlightColor + '20',
                              }}
                            >
                              Avis verifie
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                aria-label="Avis precedent"
                                className="rounded-full border border-white/20 p-2 text-white transition hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                onClick={handlePrevious}
                                type="button"
                                style={
                                  normalized.backgroundVariant === 'light'
                                    ? {
                                        borderColor: '#e2e8f0',
                                        color: '#0f172a',
                                      }
                                    : undefined
                                }
                              >
                                <ArrowLeft className="h-4 w-4" />
                              </button>
                              <button
                                aria-label="Avis suivant"
                                className="rounded-full border border-white/20 p-2 text-white transition hover:border-white hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                                onClick={handleNext}
                                type="button"
                                style={
                                  normalized.backgroundVariant === 'light'
                                    ? {
                                        borderColor: '#e2e8f0',
                                        color: '#0f172a',
                                      }
                                    : undefined
                                }
                              >
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </motion.article>
                      ) : null,
                    )}
                  </AnimatePresence>
                )}
              </div>
              {displayTestimonials.length > 1 ? (
                <div className="mt-6 flex items-center justify-center gap-2">
                  {displayTestimonials.map((review, index) => (
                    <button
                      key={review.id ?? index}
                      aria-label={`Afficher l'avis ${index + 1}`}
                      className="h-2.5 rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      onClick={() => {
                        setActiveIndex(index);
                        activeIndexRef.current = index;
                      }}
                      style={{
                        width: activeIndex === index ? '2.5rem' : '1rem',
                        background:
                          activeIndex === index
                            ? normalized.highlightColor
                            : 'rgba(255,255,255,0.2)',
                      }}
                      type="button"
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          {normalized.showRatingSummary && formattedAverage ? (
            <div
              className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur-md"
              style={
                normalized.backgroundVariant === 'light'
                  ? {
                      borderColor: '#e2e8f0',
                      background: '#f8fafc',
                      color: '#1f2937',
                    }
                  : undefined
              }
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-bold">{formattedAverage}</span>
                  <ReviewStars
                    rating={Number(formattedAverage)}
                    color={normalized.highlightColor}
                  />
                </div>
                <span
                  className="text-sm text-white/70"
                  style={
                    normalized.backgroundVariant === 'light'
                      ? { color: '#64748b' }
                      : undefined
                  }
                >
                  {metadata?.totalReviews
                    ? `${metadata.totalReviews} avis`
                    : 'Avis recents selectionnes'}
                </span>
              </div>
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
                style={accentStyle}
              >
                Avis clients NotionLab
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Laisser un temoignage</DialogTitle>
            <DialogDescription>
              Partagez votre experience pour aider les futurs membres a se projeter.
            </DialogDescription>
          </DialogHeader>

          {(!authReady || !sessionReady) && !user ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verification de votre session...
            </div>
          ) : user ? (
            <form className="space-y-6" onSubmit={handleSubmitTestimonial}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="testimonial-name">Nom complet</Label>
                  <Input
                    id="testimonial-name"
                    value={formData.authorName}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        authorName: event.target.value,
                      }))
                    }
                    placeholder="Votre nom"
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="testimonial-role">
                    Role / Entreprise (optionnel)
                  </Label>
                  <Input
                    id="testimonial-role"
                    value={formData.authorRole}
                    onChange={(event) =>
                      setFormData((current) => ({
                        ...current,
                        authorRole: event.target.value,
                      }))
                    }
                    placeholder="Ex. COO, HexaTech"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Votre note</Label>
                <RatingSelector
                  value={formData.rating}
                  onChange={(value) =>
                    setFormData((current) => ({
                      ...current,
                      rating: value,
                    }))
                  }
                  color={normalized.highlightColor}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="testimonial-content">Votre avis</Label>
                <Textarea
                  id="testimonial-content"
                  value={formData.content}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                  placeholder="Decrivez ce que NotionLab vous a apporte, le contexte et le resultat obtenu."
                  rows={5}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Votre avis sera visible sur le site public NotionLab.
                </p>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Annuler
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  className="notion-gradient text-white hover:opacity-90"
                  disabled={submitting}
                >
                  {submitting ? 'Envoi en cours...' : 'Publier mon avis'}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-6 py-6">
              <p className="text-base font-medium text-center">
                Vous devez créer un compte pour laisser votre avis.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button asChild variant="outline">
                  <a href="/connexion">Se connecter</a>
                </Button>
                <Button asChild>
                  <a href="/inscription">Créer un compte</a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TestimonialsSection;
