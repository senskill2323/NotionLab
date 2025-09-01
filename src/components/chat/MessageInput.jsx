import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send, Loader2, Bold, Underline } from 'lucide-react';

const FormattingToolbar = ({ onApplyFormatting }) => (
  <div className="flex items-center gap-1 p-1 border-b mb-1">
    <Button type="button" variant="ghost" size="icon" onClick={() => onApplyFormatting('**')} className="h-6 w-6">
      <Bold className="w-4 h-4" />
    </Button>
    <Button type="button" variant="ghost" size="icon" onClick={() => onApplyFormatting('_')} className="h-6 w-6">
      <Underline className="w-4 h-4" />
    </Button>
  </div>
);

const MessageInput = ({
  input,
  setInput,
  handleSendMessage,
  handleFileSelect,
  uploading,
  disabled
}) => {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);

  const applyFormatting = (syntax) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = input.substring(start, end);
    const newText = `${input.substring(0, start)}${syntax}${selectedText}${syntax}${input.substring(end)}`;

    setInput(newText);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + syntax.length;
      textarea.selectionEnd = end + syntax.length;
    }, 0);
  };
  
  return (
    <div className="p-2 border-t">
      <FormattingToolbar onApplyFormatting={applyFormatting} />
      <form onSubmit={handleSendMessage} className="flex gap-2 items-start">
        <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current.click()} disabled={uploading || disabled}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
        </Button>
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Votre message..."
          className="flex-grow resize-none text-sm p-1.5"
          rows={1}
          disabled={uploading || disabled}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
        />
        <Button type="submit" className="notion-gradient text-white" size="icon" disabled={!input.trim() || uploading || disabled}>
          <Send className="w-4 h-4" />
        </Button>
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/jpeg,image/png,image/gif,application/pdf,application/zip,text/plain" />
      </form>
    </div>
  );
};

export default MessageInput;