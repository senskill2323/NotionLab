import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Loader2,
  Quote,
  Star,
} from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const FALLBACK_REVIEWS = Object.freeze([
  {
    id: 'preview-1',
    authorName: 'Marie Dupont',
    rating: 5,
    text:
      'Une experience fluide et des formations tres utiles. La plateforme est belle et pratique, et le suivi client est excellent.',
    relativeTimeDescription: 'il y a 1 mois',
    profilePhotoUrl:
      'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=96&q=80',
  },
  {
    id: 'preview-2',
    authorName: 'Alexandre Martin',
    rating: 5,
    text:
      'NotionLab a transforme notre maniere de collaborer. Les ressources et les conseils sont pertinents et faciles a appliquer.',
    relativeTimeDescription: 'il y a 3 semaines',
    profilePhotoUrl:
      'https://images.unsplash.com/photo-1529665253569-6d01c0eaf7b6?auto=format&fit=crop&w=96&q=80',
  },
  {
    id: 'preview-3',
    authorName: 'Sonia Leroy',
    rating: 4,
    text:
      'Des contenus de qualite et un accompagnement reactif. Le module d onboarding nous a fait gagner un temps precieux.',
    relativeTimeDescription: 'il y a 2 semaines',
    profilePhotoUrl:
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=96&q=80',
  },
]);

const clampLimit = (value, min = 1, max = 10) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
};

const GoogleLogo = ({ className = 'h-6 w-6' }) => (
  <svg
    aria-hidden="true"
    className={className}
    viewBox="0 0 24 24"
    role="img"
  >
    <title>Google</title>
    <path
      fill="#4285F4"
      d="M23.52 12.27c0-.82-.07-1.64-.21-2.44H12v4.62h6.47a5.52 5.52 0 0 1-2.4 3.62v3h3.87c2.27-2.09 3.58-5.17 3.58-8.8z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.96-1.07 7.94-2.94l-3.87-3c-1.08.74-2.47 1.18-4.07 1.18-3.13 0-5.78-2.11-6.74-4.95H1.26v3.11A12 12 0 0 0 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.26 14.29A7.2 7.2 0 0 1 4.88 12c0-.8.14-1.57.38-2.29V6.6H1.26A12 12 0 0 0 0 12c0 1.92.46 3.73 1.26 5.4l4-3.11z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.76 0 3.35.6 4.6 1.78l3.4-3.4A11.93 11.93 0 0 0 12 0 12 12 0 0 0 1.26 6.6l4 3.11C6.22 6.87 8.87 4.75 12 4.75z"
    />
  </svg>
);

const ReviewStars = ({ rating = 0, color = '#fbbc04' }) => {
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

const GoogleReviewsSection = ({ content = {}, isPreview = false }) => {
  const normalized = useMemo(() => {
    const limit = clampLimit(content.limit ?? 6);
    const placeId =
      typeof content.placeId === 'string' ? content.placeId.trim() : '';
    const locale =
      typeof content.locale === 'string' && content.locale.trim()
        ? content.locale.trim()
        : 'fr';

    const backgroundVariant =
      content.backgroundVariant === 'light' ? 'light' : 'dark';

    return {
      title:
        typeof content.title === 'string' && content.title.trim()
          ? content.title.trim()
          : 'Ils parlent de nous sur Google',
      subtitle:
        typeof content.subtitle === 'string' && content.subtitle.trim()
          ? content.subtitle.trim()
          : 'Des avis authentiques d entrepreneurs et d equipes qui utilisent NotionLab au quotidien.',
      ctaLabel:
        typeof content.ctaLabel === 'string' && content.ctaLabel.trim()
          ? content.ctaLabel.trim()
          : 'Laisser un avis',
      ctaHref:
        typeof content.ctaHref === 'string' && content.ctaHref.trim()
          ? content.ctaHref.trim()
          : 'https://g.page/r/CXKl03Z0yiEFEAI/review',
      placeId,
      limit,
      locale,
      highlightColor:
        typeof content.highlightColor === 'string' && content.highlightColor.trim()
          ? content.highlightColor.trim()
          : '#4285F4',
      backgroundVariant,
      showRatingSummary: content.showRatingSummary !== false,
    };
  }, [content]);

  const [reviews, setReviews] = useState([]);
  const [metadata, setMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);
  const activeIndexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchReviews = useCallback(async () => {
    if (!normalized.placeId) {
      if (isMountedRef.current) {
        setReviews([]);
        setMetadata(null);
      }
      return;
    }
    if (!isMountedRef.current) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke(
        'google-avis',
        {
          body: {
            placeId: normalized.placeId,
            limit: normalized.limit,
            locale: normalized.locale,
          },
        },
      );
      if (invokeError) {
        throw invokeError;
      }
      if (!data || data.error) {
        throw new Error(data?.error || 'Erreur lors du chargement des avis.');
      }

      if (!isMountedRef.current) return;

      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      setMetadata(data.metadata ?? null);
      setActiveIndex(0);
      activeIndexRef.current = 0;
    } catch (invokeError) {
      console.error('Error loading Google reviews', invokeError);
      if (!isMountedRef.current) return;
      setError(
        invokeError instanceof Error
          ? invokeError.message
          : 'Impossible de recuperer les avis Google.',
      );
      setReviews([]);
      setMetadata(null);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [normalized.limit, normalized.locale, normalized.placeId]);

  useEffect(() => {
    if (!normalized.placeId) {
      if (isMountedRef.current) {
        setReviews([]);
        setMetadata(null);
      }
      return;
    }
    fetchReviews();
  }, [fetchReviews, normalized.placeId]);

  useEffect(() => {
    setActiveIndex(0);
    activeIndexRef.current = 0;
  }, [normalized.placeId, normalized.limit, normalized.locale]);

  const displayReviews = useMemo(() => {
    if (reviews.length > 0) {
      return reviews.slice(0, normalized.limit);
    }
    if (isPreview) {
      return FALLBACK_REVIEWS.slice(0, normalized.limit);
    }
    return [];
  }, [isPreview, normalized.limit, reviews]);

  useEffect(() => {
    setActiveIndex((previous) =>
      displayReviews.length === 0
        ? 0
        : Math.min(previous, displayReviews.length - 1),
    );
    activeIndexRef.current = 0;
  }, [displayReviews.length]);

  useEffect(() => {
    if (displayReviews.length <= 1) return undefined;
    const timer = setInterval(() => {
      setActiveIndex((current) => {
        const next = (current + 1) % displayReviews.length;
        activeIndexRef.current = next;
        return next;
      });
    }, 8000);
    return () => clearInterval(timer);
  }, [displayReviews.length]);

  const handlePrevious = useCallback(() => {
    setActiveIndex((current) => {
      const next =
        (current - 1 + displayReviews.length) % Math.max(displayReviews.length, 1);
      activeIndexRef.current = next;
      return next;
    });
  }, [displayReviews.length]);

  const handleNext = useCallback(() => {
    setActiveIndex((current) => {
      const next = (current + 1) % Math.max(displayReviews.length, 1);
      activeIndexRef.current = next;
      return next;
    });
  }, [displayReviews.length]);

  const formattedAverage = useMemo(() => {
    if (metadata?.averageRating) return Number(metadata.averageRating).toFixed(1);
    if (metadata?.rating) return Number(metadata.rating).toFixed(1);
    if (displayReviews.length === 0) return null;
    const sum = displayReviews.reduce(
      (total, item) => total + (Number(item.rating) || 0),
      0,
    );
    if (sum === 0) return null;
    return (sum / displayReviews.length).toFixed(1);
  }, [displayReviews, metadata]);

  const sectionClasses =
    normalized.backgroundVariant === 'light'
      ? 'relative overflow-hidden py-20 md:py-28 bg-white text-slate-900'
      : 'relative overflow-hidden py-20 md:py-28 bg-slate-950 text-white';

  const accentStyle = { color: normalized.highlightColor };

  return (
    <section className={sectionClasses}>
      <div
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          background: normalized.backgroundVariant === 'light'
            ? `radial-gradient(circle at top right, ${normalized.highlightColor}33, transparent 55%), radial-gradient(circle at bottom left, #34a85322, transparent 50%)`
            : `radial-gradient(circle at top right, ${normalized.highlightColor}44, transparent 55%), radial-gradient(circle at bottom left, #34a85322, transparent 50%)`,
        }}
      />
      <div className="container relative z-10 mx-auto px-4">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-md"
              style={
                normalized.backgroundVariant === 'light'
                  ? { borderColor: '#e2e8f0', color: '#1f2937', background: '#f8fafc' }
                  : undefined
              }
            >
              <GoogleLogo className="h-5 w-5" />
              Avis Google verifies
            </div>
            <h2 className="text-3xl font-extrabold md:text-4xl">
              {normalized.title}
            </h2>
            <p className="text-lg text-white/80 md:text-xl"
              style={normalized.backgroundVariant === 'light' ? { color: '#475569' } : undefined}
            >
              {normalized.subtitle}
            </p>
            {normalized.showRatingSummary && formattedAverage ? (
              <div
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-base backdrop-blur-md"
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
                <ReviewStars rating={Number(formattedAverage)} color="#fbbc04" />
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-semibold" style={accentStyle}>
                    {formattedAverage}
                  </span>
                  <span className="text-sm uppercase tracking-wide text-white/60"
                    style={normalized.backgroundVariant === 'light' ? { color: '#64748b' } : undefined}
                  >
                    / 5
                  </span>
                </div>
                <span className="text-sm text-white/60"
                  style={normalized.backgroundVariant === 'light' ? { color: '#64748b' } : undefined}
                >
                  {metadata?.totalReviews
                    ? `${metadata.totalReviews} avis`
                    : 'Avis recents selectionnes'}
                </span>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-3 pt-2">
              <a
                href={normalized.ctaHref}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-black/10 transition hover:translate-y-0.5 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                rel="noopener noreferrer"
                target="_blank"
              >
                <ExternalLink className="h-4 w-4" />
                {normalized.ctaLabel}
              </a>
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
            </div>
            {error ? (
              <p className="text-sm text-red-400">
                {error}
              </p>
            ) : null}
          </div>
          <div className="relative">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl md:p-8"
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
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-sm text-white/70"
                  style={normalized.backgroundVariant === 'light' ? { color: '#64748b' } : undefined}
                >
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Chargement des avis...
                </div>
              ) : displayReviews.length === 0 ? (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 text-center text-sm text-white/60"
                  style={normalized.backgroundVariant === 'light' ? { color: '#94a3b8' } : undefined}
                >
                  Aucun avis a afficher pour le moment.
                </div>
              ) : (
                <div className="relative min-h-[320px]">
                  <AnimatePresence initial={false} mode="wait">
                    {displayReviews.map((review, index) =>
                      index === activeIndex ? (
                        <motion.article
                          key={review.id ?? index}
                          className="absolute inset-0 flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-white shadow-xl shadow-black/20 md:p-8"
                          initial={{ opacity: 0, y: 12, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -12, scale: 0.98 }}
                          transition={{ duration: 0.4, ease: 'easeOut' }}
                          style={
                            normalized.backgroundVariant === 'light'
                              ? {
                                  background: '#0f172a',
                                  color: '#f8fafc',
                                  borderColor: '#1e293b',
                                }
                              : undefined
                          }
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <img
                                  alt={review.authorName ?? 'Client Google'}
                                  className="h-12 w-12 rounded-full object-cover"
                                  src={
                                    review.profilePhotoUrl ||
                                    'https://www.gstatic.com/images/branding/product/1x/avatar_circle_blue_120dp.png'
                                  }
                                />
                                <Quote
                                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-white/10 p-1 text-white"
                                  style={
                                    normalized.backgroundVariant === 'light'
                                      ? {
                                          background: '#38bdf833',
                                          color: '#38bdf8',
                                        }
                                      : undefined
                                  }
                                />
                              </div>
                              <div>
                                <p className="font-semibold">
                                  {review.authorName ?? 'Client Google'}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-white/60"
                                  style={normalized.backgroundVariant === 'light' ? { color: '#cbd5f5' } : undefined}
                                >
                                  <ReviewStars
                                    rating={Number(review.rating) || 5}
                                    color={normalized.highlightColor}
                                  />
                                  <span>
                                    {review.relativeTimeDescription ??
                                      new Intl.DateTimeFormat(normalized.locale, {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                      }).format(
                                        review.time
                                          ? review.time * 1000
                                          : Date.now(),
                                      )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <p className="mt-6 text-lg leading-relaxed text-white/90"
                            style={normalized.backgroundVariant === 'light' ? { color: '#e2e8f0' } : undefined}
                          >
                            {review.text ?? ''}
                          </p>
                          <div className="mt-8 flex items-center justify-between">
                            <a
                              className="inline-flex items-center gap-2 text-sm font-medium text-white transition hover:opacity-80"
                              href={
                                review.authorUrl ??
                                'https://maps.google.com/?q=' + encodeURIComponent(normalized.placeId || 'NotionLab')
                              }
                              rel="noopener noreferrer"
                              target="_blank"
                              style={accentStyle}
                            >
                              Voir sur Google
                              <ExternalLink className="h-4 w-4" />
                            </a>
                            <div className="flex items-center gap-2">
                              <button
                                aria-label="Avis precedent"
                                className="rounded-full border border-white/20 p-2 text-white transition hover:border-white hover:text-white"
                                onClick={handlePrevious}
                                type="button"
                              >
                                <ArrowLeft className="h-4 w-4" />
                              </button>
                              <button
                                aria-label="Avis suivant"
                                className="rounded-full border border-white/20 p-2 text-white transition hover:border-white hover:text-white"
                                onClick={handleNext}
                                type="button"
                              >
                                <ArrowRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </motion.article>
                      ) : null,
                    )}
                  </AnimatePresence>
                </div>
              )}
              {displayReviews.length > 1 ? (
                <div className="mt-6 flex items-center justify-center gap-2">
                  {displayReviews.map((review, index) => (
                    <button
                      key={review.id ?? index}
                      aria-label={`Afficher l'avis ${index + 1}`}
                      className="h-2.5 rounded-full transition"
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
        </div>
      </div>
    </section>
  );
};

export default GoogleReviewsSection;
