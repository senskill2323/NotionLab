import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import DOMPurify from 'dompurify';
import { Loader2, AlertTriangle } from 'lucide-react';

import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePermissions } from '@/contexts/PermissionsContext';
import { useLayoutPreferences } from '@/contexts/LayoutPreferencesContext';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const canPreviewDraft = (user, hasPermission) => {
  if (!user || !user.profile) return false;
  if (['owner', 'admin', 'prof'].includes(user.profile.user_type)) return true;
  if (hasPermission && hasPermission('admin:manage_static_pages')) return true;
  return false;
};

const StaticPage = () => {
  const { slug } = useParams();
  const { user, authReady } = useAuth();
  const { hasPermission } = usePermissions();
  const { setFooterVisible, resetLayout } = useLayoutPreferences();

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadPage = async () => {
      if (!slug) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const { data, error: fetchError } = await supabase
          .from('static_pages')
          .select('*')
          .eq('slug', slug)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            if (isMounted) {
              setNotFound(true);
            }
            return;
          }
          throw fetchError;
        }

        if (!isMounted) return;

        const draft = data.status !== 'published';
        const previewAllowed = draft && canPreviewDraft(user, hasPermission);

        if (draft && !previewAllowed) {
          setNotFound(true);
          return;
        }

        setIsPreview(Boolean(previewAllowed));
        setPage(data);
        setFooterVisible(data?.options?.show_footer !== false);
      } catch (fetchErr) {
        console.error('Error loading static page:', fetchErr);
        if (!isMounted) return;
        setError('Impossible de charger cette page statique.');
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    if (authReady) {
      loadPage();
    }

    return () => {
      isMounted = false;
      resetLayout();
    };
  }, [slug, authReady, user, hasPermission, setFooterVisible, resetLayout]);

  const sanitizedContent = useMemo(() => {
    if (!page?.content) return '';
    return DOMPurify.sanitize(page.content);
  }, [page?.content]);

  const pageTitle = page?.title || 'Page statique';
  const metaDescription = page?.seo_description || undefined;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin mb-4" />
        <span>Chargement de la page...</span>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-muted-foreground">
        <AlertTriangle className="h-10 w-10 mb-4" />
        <p>Cette page n'existe pas ou n'est pas accessible.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-destructive">
        <AlertTriangle className="h-10 w-10 mb-4" />
        <p>{error}</p>
      </div>
    );
  }

  const showTitle = page?.options?.show_title !== false;
  const showRightColumn = page?.options?.show_right_column !== false;
  const visibleOffline = page?.options?.visible_offline === true;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        {metaDescription && <meta name="description" content={metaDescription} />}
      </Helmet>
      <div className="container mx-auto px-4 py-10 lg:py-16">
        <div className="flex items-center gap-3 mb-8">
          {page.status === 'published' ? (
            <Badge variant="default">Publie</Badge>
          ) : (
            <Badge variant="secondary">Brouillon</Badge>
          )}
          {visibleOffline && <Badge variant="outline">Disponible hors connexion</Badge>}
          {isPreview && <Badge variant="destructive">Previsualisation admin</Badge>}
        </div>
        <div className={`grid gap-8 ${showRightColumn ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]' : ''}`}>
          <article>
            {showTitle && (
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-6">
                {page.title}
              </h1>
            )}
            <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
          </article>
          {showRightColumn && (
            <aside className="space-y-4">
              <Card>
                <CardContent className="space-y-3 p-5 text-sm text-muted-foreground">
                  <div>
                    <p className="font-medium text-foreground">Derniere mise a jour</p>
                    <p>{page.updated_at ? new Date(page.updated_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Non renseigne'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Slug</p>
                    <p>{page.slug}</p>
                  </div>
                  {page.seo_description && (
                    <div>
                      <p className="font-medium text-foreground">Meta description</p>
                      <p className="leading-relaxed">{page.seo_description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </aside>
          )}
        </div>
      </div>
    </>
  );
};

export default StaticPage;
