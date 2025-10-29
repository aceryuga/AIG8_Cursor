import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageCircle, Copy, Check, X, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '../webapp-ui/Button';

// TODO: Replace with your actual Telegram bot username
const TELEGRAM_BOT_USERNAME = '@Propertypro_tgBot'; // Change this to your bot username!

interface TelegramLink {
  telegram_username: string | null;
  telegram_first_name: string | null;
  is_active: boolean;
  linked_at: string | null;
}

export const TelegramLinking = () => {
  const [telegramLink, setTelegramLink] = useState<TelegramLink | null>(null);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingLinkStatus, setCheckingLinkStatus] = useState(false);

  useEffect(() => {
    fetchTelegramLink();
  }, []);

  // Poll for link status when token is active
  useEffect(() => {
    if (!linkToken) return;

    const pollInterval = setInterval(() => {
      checkLinkStatus();
    }, 5000); // Check every 5 seconds

    return () => clearInterval(pollInterval);
  }, [linkToken]);

  const fetchTelegramLink = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setInitialLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('telegram_users')
        .select('telegram_username, telegram_first_name, is_active, linked_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle(); // Use maybeSingle instead of single to avoid error when no rows

      if (fetchError) {
        console.error('Error fetching Telegram link:', fetchError);
        setError('Failed to load Telegram link status');
      } else {
        setTelegramLink(data);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('An unexpected error occurred');
    } finally {
      setInitialLoading(false);
    }
  };

  const checkLinkStatus = async () => {
    if (checkingLinkStatus) return; // Prevent multiple simultaneous checks
    
    setCheckingLinkStatus(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: fetchError } = await supabase
        .from('telegram_users')
        .select('telegram_username, telegram_first_name, is_active, linked_at')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking link status:', fetchError);
        return;
      }

      if (data && data.is_active) {
        // Link was successful!
        setTelegramLink(data);
        setLinkToken(null); // Clear the token display
        setError(null);
      }
    } catch (err) {
      console.error('Error checking link status:', err);
    } finally {
      setCheckingLinkStatus(false);
    }
  };

  const generateLinkToken = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Generate a more secure 8-character token using crypto API
      const array = new Uint8Array(6);
      crypto.getRandomValues(array);
      const token = Array.from(array, byte => byte.toString(36).toUpperCase()).join('').substring(0, 8);
      
      // Generate expiration timestamp in UTC (Supabase stores in UTC, JavaScript Date automatically converts)
      // Add 12 hours from now
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours from now in UTC
      const now = new Date(); // Current time in UTC

      console.log('✅ Token generation timestamps:', {
        token: token,
        nowUTC: now.toISOString(),
        expiresAtUTC: expiresAt.toISOString(),
        nowIST: now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        expiresAtIST: expiresAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        validFor: '12 hours',
        note: 'Supabase stores in UTC, timestamps are correct'
      });

      // Check if user already has a record (including inactive ones)
      const { data: existing, error: checkError } = await supabase
        .from('telegram_users')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle(); // Use maybeSingle to avoid error when no rows

      if (checkError) {
        throw new Error(`Failed to check existing link: ${checkError.message}`);
      }

      if (existing) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('telegram_users')
          .update({
            link_token: token,
            link_token_expires_at: expiresAt.toISOString(), // JavaScript Date.toISOString() returns UTC
            updated_at: now.toISOString()
          })
          .eq('user_id', user.id);

        if (updateError) throw new Error(`Failed to update token: ${updateError.message}`);
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from('telegram_users')
          .insert({
            user_id: user.id,
            link_token: token,
            link_token_expires_at: expiresAt.toISOString(), // JavaScript Date.toISOString() returns UTC
            is_active: false
          });

        if (insertError) throw new Error(`Failed to generate token: ${insertError.message}`);
      }

      setLinkToken(token);
    } catch (err: any) {
      console.error('Error generating link token:', err);
      setError(err.message || 'Failed to generate link token');
    } finally {
      setLoading(false);
    }
  };

  const unlinkTelegram = async () => {
    if (!confirm('Are you sure you want to unlink your Telegram account? You will no longer receive notifications via Telegram.')) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error: updateError } = await supabase
        .from('telegram_users')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) throw new Error(`Failed to unlink: ${updateError.message}`);

      setTelegramLink(null);
      setLinkToken(null);
    } catch (err: any) {
      console.error('Error unlinking Telegram:', err);
      setError(err.message || 'Failed to unlink Telegram');
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    if (linkToken) {
      navigator.clipboard.writeText(linkToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (initialLoading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-green-800 animate-spin" />
          <span className="ml-3 text-glass">Loading Telegram integration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 glass rounded-lg flex items-center justify-center glow">
          <MessageCircle className="w-6 h-6 text-green-800" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-glass">Telegram Integration</h2>
          <p className="text-glass-muted">Manage properties and receive notifications via Telegram</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 glass rounded-lg border-l-4 border-red-600 bg-red-50 bg-opacity-10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          </div>
        </div>
      )}

      {telegramLink ? (
        <div className="space-y-4">
          <div className="glass rounded-lg p-4 border-l-4 border-green-800 bg-green-50 bg-opacity-10">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-800 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-glass-muted mb-1">Linked Account</p>
                  <p className="text-glass font-medium text-lg">
                    {telegramLink.telegram_username ? `@${telegramLink.telegram_username}` : telegramLink.telegram_first_name}
                  </p>
                  {telegramLink.linked_at && (
                    <p className="text-xs text-glass-muted mt-1">
                      Linked on {new Date(telegramLink.linked_at).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={unlinkTelegram}
                disabled={loading}
                variant="ghost"
                className="text-red-600 hover:text-red-700"
              >
                <X className="w-4 h-4 mr-2" />
                Unlink
              </Button>
            </div>
          </div>
          
          <div className="glass rounded-lg p-4">
            <div className="text-sm text-glass-muted">
              <p className="font-medium text-glass mb-2">Your Telegram account is successfully linked!</p>
              <p className="mb-2">You can now use the Telegram bot to:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>Receive instant payment notifications</li>
                <li>Get lease expiry alerts</li>
                <li>View property summaries</li>
                <li>Manage your properties on the go</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {!linkToken ? (
            <>
              <div className="glass rounded-lg p-4">
                <p className="text-glass-muted mb-4">
                  Connect your Telegram account to receive instant notifications and manage your properties directly from Telegram.
                </p>
                <div className="space-y-2 text-sm text-glass-muted">
                  <p className="font-medium text-glass">Benefits:</p>
                  <ul className="list-disc list-inside ml-2 space-y-1">
                    <li>Real-time payment alerts</li>
                    <li>Lease expiry reminders</li>
                    <li>Quick property overview</li>
                    <li>24/7 access via mobile</li>
                  </ul>
                </div>
              </div>
              
              <Button
                onClick={generateLinkToken}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Generate Link Code
                  </>
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="glass rounded-lg p-4 border-l-4 border-green-800 bg-green-50 bg-opacity-5">
                <p className="text-sm text-glass-muted mb-3">
                  Your linking code <span className="font-medium text-glass">(valid for 12 hours)</span>:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-4 glass rounded-lg font-mono text-3xl text-green-800 tracking-wider text-center font-bold bg-white bg-opacity-5">
                    {linkToken}
                  </code>
                  <Button
                    onClick={copyToken}
                    variant="ghost"
                    className="shrink-0 p-3"
                    title="Copy code"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-800" />
                    ) : (
                      <Copy className="w-5 h-5 text-glass-muted" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="glass rounded-lg p-4">
                <p className="font-medium text-glass mb-3">Next steps:</p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-glass-muted ml-2">
                  <li>
                    Open Telegram and search for: <code className="px-2 py-1 glass rounded text-green-800 font-medium bg-white bg-opacity-5">{TELEGRAM_BOT_USERNAME}</code>
                  </li>
                  <li>
                    Click <strong className="text-glass">Start</strong> or send <code className="px-2 py-1 glass rounded text-green-800 font-medium bg-white bg-opacity-5">/start</code>
                  </li>
                  <li>
                    When prompted, send the code above
                  </li>
                  <li>
                    Your account will be linked automatically
                  </li>
                </ol>
              </div>

              {checkingLinkStatus && (
                <div className="glass rounded-lg p-3 border-l-4 border-green-800 bg-green-50 bg-opacity-5">
                  <div className="flex items-center gap-2 text-sm text-glass">
                    <RefreshCw className="w-4 h-4 animate-spin text-green-800" />
                    <span>Checking for link confirmation...</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setLinkToken(null);
                    setError(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={checkLinkStatus}
                  variant="ghost"
                  className="flex-1"
                  disabled={checkingLinkStatus}
                >
                  {checkingLinkStatus ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Status
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
