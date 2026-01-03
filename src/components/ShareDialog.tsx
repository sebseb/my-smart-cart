import React, { useState } from 'react';
import { Copy, Check, Link2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'list' | 'recipe';
  id: string;
  name: string;
  shareToken?: string;
  onGenerateShareLink: () => Promise<string | null>;
}

export function ShareDialog({
  open,
  onOpenChange,
  type,
  id,
  name,
  shareToken,
  onGenerateShareLink,
}: ShareDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentToken, setCurrentToken] = useState(shareToken);

  const shareUrl = currentToken
    ? `${window.location.origin}/shared/${type}/${currentToken}`
    : null;

  const handleGenerateLink = async () => {
    setIsGenerating(true);
    try {
      const token = await onGenerateShareLink();
      if (token) {
        setCurrentToken(token);
        toast.success('Share link generated!');
      } else {
        toast.error('Failed to generate share link. Are you connected to the server?');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share {type === 'list' ? 'Shopping List' : 'Recipe'}
          </DialogTitle>
          <DialogDescription>
            Anyone with the link can view and edit "{name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {shareUrl ? (
            <div className="flex items-center gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="flex-1 bg-muted font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-primary" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-light flex items-center justify-center">
                <Link2 className="w-8 h-8 text-primary" />
              </div>
              <p className="text-muted-foreground mb-4">
                Generate a shareable link to collaborate in real-time
              </p>
              <Button
                onClick={handleGenerateLink}
                disabled={isGenerating}
              >
                {isGenerating ? 'Generating...' : 'Generate Share Link'}
              </Button>
            </div>
          )}

          {shareUrl && (
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Changes sync in real-time with all viewers
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
