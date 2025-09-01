import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const RichTextRenderer = ({ content }) => {
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/;

  const renderers = {
    p: ({ children }) => {
      const child = children[0];
      if (typeof child === 'string') {
        const match = child.match(youtubeRegex);
        if (match && match[1]) {
          const videoId = match[1];
          return (
            <div className="my-2 aspect-video">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${videoId}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="rounded-lg"
              ></iframe>
            </div>
          );
        }
      }
      return <p className="text-sm whitespace-pre-wrap">{children}</p>;
    },
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">
        {children}
      </a>
    ),
    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>, // Default markdown is italic, we can use it for underline
    u: ({ children }) => <u className="underline">{children}</u>,
  };

  // Custom plugin to handle underline syntax `_text_`
  const underlinePlugin = (options) => {
    function locator(value, fromIndex) {
      return value.indexOf('_', fromIndex);
    }

    function tokenizer(eat, value, silent) {
      const match = /^_([^_]+)_/.exec(value);
      if (match) {
        if (silent) {
          return true;
        }
        return eat(match[0])({
          type: 'underline',
          children: this.parse(match[1], {}),
        });
      }
    }
    tokenizer.locator = locator;

    const Parser = this.Parser;
    const tokenizers = Parser.prototype.inlineTokenizers;
    const methods = Parser.prototype.inlineMethods;
    tokenizers.underline = tokenizer;
    methods.splice(methods.indexOf('emphasis'), 0, 'underline');
  };

  return (
    <ReactMarkdown
      components={renderers}
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[]}
    >
      {content}
    </ReactMarkdown>
  );
};

export default RichTextRenderer;