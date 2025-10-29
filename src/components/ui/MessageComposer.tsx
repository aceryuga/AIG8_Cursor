import React, { useState, useRef, useEffect } from 'react';
import { X, Bold, Italic, Underline, Send } from 'lucide-react';
import { Button } from '../webapp-ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { MessageInsert, MessageWebhookPayload } from '../../types/messages';
import { WEBHOOKS } from '../../config/webhooks';

interface MessageComposerProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName: string;
  tenantId?: string;
  tenantName?: string;
  tenantEmail?: string;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  isOpen,
  onClose,
  propertyId,
  propertyName,
  tenantId,
  tenantName,
  tenantEmail,
}) => {
  const [messageBody, setMessageBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Focus editor when opened
  useEffect(() => {
    if (isOpen && editorRef.current) {
      editorRef.current.focus();
    }
  }, [isOpen]);

  const handleCancel = () => {
    if (messageBody.trim() && !window.confirm('Are you sure you want to discard this message?')) {
      return;
    }
    setMessageBody('');
    onClose();
  };

  const applyFormat = (command: string) => {
    document.execCommand(command, false);
    editorRef.current?.focus();
  };

  const handleSend = async () => {
    if (!messageBody.trim()) {
      alert('Please enter a message');
      return;
    }

    if (!user?.id) {
      alert('You must be logged in to send messages');
      return;
    }

    setIsSending(true);

    try {
      // Get the HTML content from the editor
      const htmlContent = editorRef.current?.innerHTML || messageBody;

      // Prepare message data with proper typing
      const messageData: MessageInsert = {
        property_id: propertyId,
        sender_id: user.id,
        recipient_id: null, // Will be implemented when tenant users are added
        tenant_id: tenantId || null,
        message_body: htmlContent,
        status: 'sent',
        sent_at: new Date().toISOString(),
      };

      // Save message to Supabase
      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      console.log('Message saved successfully to Supabase:', data);

      // POST to n8n webhook for notification delivery
      try {
        const webhookPayload: MessageWebhookPayload = {
          messageId: data.id,
          propertyId,
          propertyName,
          tenantName: tenantName || 'Unknown Tenant',
          tenantEmail: tenantEmail || '',
          messageBody: htmlContent,
          senderName: user.name || 'Unknown Sender',
          senderEmail: user.email || '',
          sentAt: data.sent_at,
        };

        const webhookResponse = await fetch(WEBHOOKS.MESSAGING_WEBHOOK, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
        });

        if (!webhookResponse.ok) {
          console.warn('Webhook notification failed:', webhookResponse.statusText);
          // Continue anyway - message was saved to database
        } else {
          console.log('Webhook notification sent successfully');
        }
      } catch (webhookError) {
        console.error('Error calling webhook:', webhookError);
        // Continue anyway - message was saved to database
      }

      // POST to n8n webhook for message sending (separate workflow)
      try {
        const webhookPayload = {
          tenant_id: tenantId || '',
          tenant_email: tenantEmail || '',
          property_id: propertyId,
          property_name: propertyName,
          message: htmlContent,
        };

        const webhookResponse = await fetch(WEBHOOKS.MESSAGE_SEND_WEBHOOK, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
        });

        if (!webhookResponse.ok) {
          console.warn('Message send webhook failed:', webhookResponse.statusText);
          // Continue anyway - message was saved to database
        } else {
          console.log('Message send webhook sent successfully');
        }
      } catch (webhookError) {
        console.error('Error calling message send webhook:', webhookError);
        // Continue anyway - message was saved to database
      }
      
      // Success notification
      alert('Message sent successfully!');
      
      // Reset and close
      setMessageBody('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
      onClose();
    } catch (error: any) {
      console.error('Error sending message:', error);
      alert(`Failed to send message: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-50 transition-opacity"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="glass-card rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col pointer-events-auto shadow-2xl glow"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white border-opacity-20">
            <div>
              <h2 className="text-2xl font-bold text-glass">Compose Message</h2>
              <p className="text-sm text-glass-muted mt-1">
                To: {tenantName || 'Tenant'} • Property: {propertyName}
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 rounded-lg hover:bg-white hover:bg-opacity-10 transition-colors"
            >
              <X size={24} className="text-glass" />
            </button>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 p-4 border-b border-white border-opacity-20 bg-white bg-opacity-5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => applyFormat('bold')}
              className="p-2"
              title="Bold (Ctrl+B)"
            >
              <Bold size={16} />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => applyFormat('italic')}
              className="p-2"
              title="Italic (Ctrl+I)"
            >
              <Italic size={16} />
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => applyFormat('underline')}
              className="p-2"
              title="Underline (Ctrl+U)"
            >
              <Underline size={16} />
            </Button>

            <div className="ml-auto text-xs text-glass-muted">
              Rich text formatting enabled
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 overflow-y-auto p-6">
            <div
              ref={editorRef}
              contentEditable
              className="min-h-[300px] p-4 glass rounded-lg text-glass focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
              style={{
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
              }}
              onInput={(e) => {
                setMessageBody(e.currentTarget.innerHTML);
              }}
              placeholder="Type your message here..."
              data-placeholder="Type your message here..."
            />
            <style>{`
              [contenteditable][data-placeholder]:empty:before {
                content: attr(data-placeholder);
                color: #9CA3AF;
                pointer-events: none;
              }
              [contenteditable] {
                outline: none;
              }
            `}</style>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-white border-opacity-20 bg-white bg-opacity-5">
            <p className="text-xs text-glass-muted">
              {messageBody.length > 0 ? `${messageBody.length} characters` : 'Start typing...'}
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSend}
                disabled={isSending || !messageBody.trim()}
                className="flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Message
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

