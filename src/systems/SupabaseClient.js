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

                // Switch save key based on login status
                if (this.user) {
                    saveSystem.setUserSaveKey(this.user.id);
                } else {
                    saveSystem.setUserSaveKey(null); // Back to guest
                }

                // Dispatch custom event for game to react
                window.dispatchEvent(new CustomEvent('authStateChanged', {
                    detail: { event, user: this.user }
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
                    emailRedirectTo: window.location.origin
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
}

// Global instance
const supabaseClient = new SupabaseClient();
