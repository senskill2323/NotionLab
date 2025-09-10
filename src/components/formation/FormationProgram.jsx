import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BookOpen, AlertTriangle, Clock } from 'lucide-react';

// Normalise une description en convertissant les puces "•", "–", "—" en listes Markdown
// et en forçant un retour à la ligne entre chaque point.
const normalizeDescription = (text) => {
  if (!text || typeof text !== 'string') return '';
  let t = text.trim();

  // Cas: puces "•" en une seule ligne ("• a • b • c") -> transformer en liste Markdown
  if (t.includes('•') && !/\r?\n/.test(t)) {
    const items = t.split('•').map(s => s.trim()).filter(Boolean);
    if (items.length > 1) {
      return items.map(i => `- ${i}`).join('\n');
    }
  }

  // Convertir les débuts de ligne en puces Markdown
  t = t.replace(/^\s*•\s+/gm, '- ');
  t = t.replace(/^\s*[–—]\s+/gm, '- ');
  t = t.replace(/^\s*·\s+/gm, '- ');

  // Si plusieurs lignes non vides et aucune n'est une puce Markdown, les transformer en liste
  const lines = t.split(/\r?\n/);
  const nonEmpty = lines.filter(l => l.trim().length > 0);
  const hasMdBullets = nonEmpty.some(l => /^\s*([-*+]\s+|\d+\.\s+)/.test(l));
  if (!hasMdBullets && nonEmpty.length >= 2) {
    t = nonEmpty.map(l => `- ${l.trim()}`).join('\n');
  }

  return t;
};

const FormationProgram = ({ modules }) => {
  if (!modules || modules.length === 0) {
    return (
      <Card className="glass-effect border-border">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-medium text-foreground flex items-center">
            <BookOpen className="w-4 h-4 mr-2 text-primary" />
            Liste des Modules de la formation :
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center text-muted-foreground">
            <AlertTriangle className="w-4 h-4 mr-2 text-yellow-500" />
            <p className="text-sm">Le programme de cette formation n'est pas encore disponible.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-effect border-border">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium text-foreground flex items-center">
          <BookOpen className="w-4 h-4 mr-2 text-primary" />
          Liste des Modules de la formation :
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {modules.map((module, index) => {
            const normalizedDescription = normalizeDescription(module.description || '');
            return (
              <div key={index}>
                <div className="border-l-2 border-primary/20 pl-4 pb-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-medium text-foreground leading-tight">
                      {module.title}
                    </h3>
                    {module.duration > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground ml-4 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>{module.duration} min</span>
                      </div>
                    )}
                  </div>
                  {normalizedDescription && (
                    <div className="text-sm leading-relaxed text-foreground/90">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          ul: ({ children }) => (
                            <ul className="list-disc pl-4 space-y-1 my-2">{children}</ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="list-decimal pl-4 space-y-1 my-2">{children}</ol>
                          ),
                          li: ({ children }) => (
                            <li className="text-foreground/90 leading-relaxed">{children}</li>
                          ),
                          p: ({ children }) => (
                            <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                          ),
                          strong: ({ children }) => (
                            <strong className="font-medium text-foreground">{children}</strong>
                          ),
                          em: ({ children }) => (
                            <em className="italic text-foreground/80">{children}</em>
                          ),
                          br: () => <br />
                        }}
                      >
                        {normalizedDescription}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                {index < modules.length - 1 && (
                  <Separator className="my-4" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default FormationProgram;