// Supabase Client for Authentication and Cloud Saves
// Uses magic link (passwordless email) authentication

class SupabaseClient {
    constructor() {
        // Supabase configuration - will be set via init()
        this.supabaseUrl = null;
        this.supabaseKey = null;
        this.supabase = null;
        this.user = null;
        this.session = null;
        this.initialized = false;

        // Session management for single-device enforcement
        this.localSessionId = sessionStorage.getItem('battlePanicSessionId') || null;
        this.SESSION_TIMEOUT_HOURS = 2; // Auto-takeover after 2 hours
    }

    // Initialize with Supabase credentials
    init(url, anonKey) {
        this.supabaseUrl = url;
        this.supabaseKey = anonKey;

        // Check if supabase-js is loaded
        if (typeof supabase !== 'undefined' && supabase.createClient) {
            this.supabase = supabase.createClient(url, anonKey);
            this.initialized = true;

            // Check for existing session
            this.checkSession();

            // Listen for auth state changes
            this.supabase.auth.onAuthStateChange((event, session) => {
                console.log('Auth state changed:', event);
                this.session = session;
                this.user = session?.user || null;

                // Capture guest data BEFORE switching save key (for first-time migration)
                let guestData = null;
                if (this.user && saveSystem.isGuestSave()) {
                    guestData = saveSystem.load();
                    console.log('Captured guest data for potential migration');
                }

                // Switch save key based on login status
                if (this.user) {
                    saveSystem.setUserSaveKey(this.user.id);
                } else {
                    saveSystem.setUserSaveKey(null); // Back to guest
                }

                // Dispatch custom event for game to react (include guest data for migration)
                window.dispatchEvent(new CustomEvent('authStateChanged', {
                    detail: { event, user: this.user, guestData }
                }));
            });

            return true;
        } else {
            console.warn('Supabase JS library not loaded');
            return false;
        }
    }

    // Check for existing session on load
    async checkSession() {
        if (!this.initialized) return null;

        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();
            if (error) throw error;

            this.session = session;
            this.user = session?.user || null;

            // Capture guest data BEFORE switching (for first-time migration)
            if (this.user && saveSystem.isGuestSave()) {
                this.pendingGuestData = saveSystem.load();
                console.log('checkSession: Captured guest data for migration');
            }

            // Switch to user save key if logged in
            if (this.user) {
                saveSystem.setUserSaveKey(this.user.id);
            }

            return this.user;
        } catch (error) {
            console.error('Error checking session:', error);
            return null;
        }
    }

    // Send magic link to email
    async sendMagicLink(email) {
        if (!this.initialized) {
            return { success: false, error: 'Supabase not initialized' };
        }

        try {
            const { data, error } = await this.supabase.auth.signInWithOtp({
                email: email,
                options: {
                    emailRedirectTo: window.location.origin + '/callback.html'
                }
            });

            if (error) throw error;

            return { success: true, message: 'Check your email for the login link!' };
        } catch (error) {
            console.error('Magic link error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get current user
    getUser() {
        return this.user;
    }

    // Check if logged in
    isLoggedIn() {
        return this.user !== null;
    }

    // Get and clear pending guest data (for first-time migration)
    getPendingGuestData() {
        const data = this.pendingGuestData;
        this.pendingGuestData = null; // Clear after retrieval
        return data;
    }

    // Get user display name (from metadata or email)
    getDisplayName() {
        if (!this.user) return null;
        return this.user.user_metadata?.display_name ||
               this.user.email?.split('@')[0] ||
               'Player';
    }

    // Update display name
    async updateDisplayName(newName) {
        if (!this.initialized || !this.user) {
            return { success: false, error: 'Not logged in' };
        }

        try {
            const { data, error } = await this.supabase.auth.updateUser({
                data: { display_name: newName }
            });

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Update display name error:', error);
            return { success: false, error: error.message };
        }
    }

    // Logout
    async logout() {
        if (!this.initialized) return;

        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;

            this.user = null;
            this.session = null;
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    }

    // Save game data to cloud
    async saveToCloud(saveData) {
        if (!this.initialized || !this.user) {
            return { success: false, error: 'Not logged in' };
        }

        try {
            const { data, error } = await this.supabase
                .from('saves')
                .upsert({
                    user_id: this.user.id,
                    save_data: saveData,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (error) throw error;

            return { success: true, updatedAt: new Date().toISOString() };
        } catch (error) {
            console.error('Cloud save error:', error);
            return { success: false, error: error.message };
        }
    }

    // Load game data from cloud
    async loadFromCloud() {
        if (!this.initialized || !this.user) {
            return { success: false, error: 'Not logged in' };
        }

        try {
            const { data, error } = await this.supabase
                .from('saves')
                .select('save_data, updated_at')
                .eq('user_id', this.user.id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No save found - not an error
                    return { success: true, saveData: null };
                }
                throw error;
            }

            return {
                success: true,
                saveData: data.save_data,
                updatedAt: data.updated_at
            };
        } catch (error) {
            console.error('Cloud load error:', error);
            return { success: false, error: error.message };
        }
    }

    // Get leaderboard
    async getLeaderboard(limit = 100) {
        if (!this.initialized) {
            return { success: false, error: 'Supabase not initialized' };
        }

        try {
            const { data, error } = await this.supabase
                .from('leaderboard')
                .select('*')
                .order('highest_wave', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return { success: true, leaderboard: data };
        } catch (error) {
            console.error('Leaderboard error:', error);
            return { success: false, error: error.message };
        }
    }

    // Update leaderboard entry
    async updateLeaderboard(highestWave, totalKills) {
        if (!this.initialized || !this.user) {
            return { success: false, error: 'Not logged in' };
        }

        try {
            const { data, error } = await this.supabase
                .from('leaderboard')
                .upsert({
                    user_id: this.user.id,
                    display_name: this.getDisplayName(),
                    highest_wave: highestWave,
                    total_kills: totalKills,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id'
                });

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Leaderboard update error:', error);
            return { success: false, error: error.message };
        }
    }

    // Create Stripe checkout session for XP purchase
    async createCheckoutSession(xpAmount, priceInCents) {
        if (!this.initialized || !this.user) {
            return { success: false, error: 'Please log in to purchase XP' };
        }

        try {
            const { data, error } = await this.supabase.functions.invoke('create-checkout', {
                body: {
                    user_id: this.user.id,
                    xp_amount: xpAmount,
                    price_cents: priceInCents,
                    success_url: window.location.origin + '?payment=success',
                    cancel_url: window.location.origin + '?payment=cancelled'
                }
            });

            if (error) throw error;

            if (data?.url) {
                return { success: true, url: data.url };
            } else {
                throw new Error('No checkout URL returned');
            }
        } catch (error) {
            console.error('Checkout session error:', error);
            return { success: false, error: error.message };
        }
    }

    // === Session Management Methods ===

    // Generate a unique session ID
    generateSessionId() {
        return 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Start a new session (called after successful login or takeover)
    async startSession() {
        console.log('startSession called, initialized:', this.initialized, 'user:', !!this.user);
        if (!this.initialized || !this.user) {
            console.error('startSession failed: not initialized or no user');
            return false;
        }

        this.localSessionId = this.generateSessionId();
        sessionStorage.setItem('battlePanicSessionId', this.localSessionId);
        console.log('Session ID saved to sessionStorage:', this.localSessionId);
        const now = new Date().toISOString();

        try {
            const { error } = await this.supabase.auth.updateUser({
                data: {
                    session_id: this.localSessionId,
                    session_started_at: now
                }
            });

            if (error) throw error;
            console.log('Session started:', this.localSessionId);
            return true;
        } catch (error) {
            console.error('Failed to start session:', error);
            return false;
        }
    }

    // Get the cloud session info from user metadata
    async getCloudSession() {
        if (!this.initialized || !this.user) return null;

        try {
            const { data: { user }, error } = await this.supabase.auth.getUser();
            if (error) throw error;

            return {
                sessionId: user.user_metadata?.session_id || null,
                startedAt: user.user_metadata?.session_started_at || null
            };
        } catch (error) {
            console.error('Failed to get cloud session:', error);
            return null;
        }
    }

    // Validate current session against cloud
    // Returns: { valid, reason, canAutoTakeover, cloudSession }
    async validateSession() {
        if (!this.initialized || !this.user) {
            return { valid: false, reason: 'not_logged_in' };
        }

        const cloudSession = await this.getCloudSession();

        // No session in cloud - this is a new session
        if (!cloudSession || !cloudSession.sessionId) {
            return { valid: true, reason: 'new_session', cloudSession };
        }

        // Session matches - we're good
        if (this.localSessionId && this.localSessionId === cloudSession.sessionId) {
            return { valid: true, reason: 'session_match', cloudSession };
        }

        // Session mismatch - check if we can auto-takeover
        if (cloudSession.startedAt) {
            const sessionAge = Date.now() - new Date(cloudSession.startedAt).getTime();
            const hoursOld = sessionAge / (1000 * 60 * 60);

            if (hoursOld >= this.SESSION_TIMEOUT_HOURS) {
                return { valid: false, reason: 'auto_takeover_stale', canAutoTakeover: true, cloudSession };
            }
        }

        // Session conflict - another device is active recently
        return { valid: false, reason: 'session_conflict', canAutoTakeover: false, cloudSession };
    }

    // Take over session from another device
    async takeoverSession() {
        const started = await this.startSession();
        return started;
    }

    // Check if we have a valid local session
    hasValidLocalSession() {
        return this.localSessionId !== null;
    }
}

// Global instance
const supabaseClient = new SupabaseClient();
