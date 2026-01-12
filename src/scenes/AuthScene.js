// Authentication Scene - Login/Profile UI
class AuthScene extends Phaser.Scene {
    constructor() {
        super({ key: 'AuthScene' });
    }

    create() {
        const { width, height } = this.scale;

        // Dark overlay background
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);

        // Check if user is logged in
        this.isLoggedIn = supabaseClient.isLoggedIn();

        if (this.isLoggedIn) {
            this.showProfilePanel();
        } else {
            this.showLoginPanel();
        }

        // Listen for auth state changes
        this.authListener = async (event) => {
            const { user } = event.detail;
            if (user && !this.isLoggedIn) {
                // User just logged in
                this.isLoggedIn = true;
                this.clearPanel();
                this.showProfilePanel();
                this.showMessage('Login successful!', '#4ade80');

                // Load cloud data for this user (separate from guest data)
                this.showMessage('Loading your data...', '#ffd700');
                const cloudResult = await supabaseClient.loadFromCloud();
                if (cloudResult.success && cloudResult.saveData) {
                    // Cloud data exists - save it locally for this user
                    const mergedData = saveSystem.mergeWithDefaults(cloudResult.saveData);
                    saveSystem.save(mergedData);
                    this.showMessage('Data loaded from cloud!', '#4ade80');
                    console.log('Loaded cloud save for user');
                } else {
                    // No cloud data - user starts fresh (or keeps existing local user data)
                    this.showMessage('Welcome!', '#4ade80');
                    console.log('No cloud save found, using local data');
                }
            }
        };
        window.addEventListener('authStateChanged', this.authListener);
    }

    showLoginPanel() {
        const { width, height } = this.scale;
        this.panelContainer = this.add.container(width / 2, height / 2);

        // Panel background
        const panelBg = this.add.rectangle(0, 0, 400, 350, 0x1a1a2e);
        panelBg.setStrokeStyle(3, 0x4169E1);
        this.panelContainer.add(panelBg);

        // Title
        const title = this.add.text(0, -140, 'Login', {
            fontSize: '32px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.panelContainer.add(title);

        // Email icon
        const emailIcon = this.add.text(0, -90, '📧', {
            fontSize: '40px'
        }).setOrigin(0.5);
        this.panelContainer.add(emailIcon);

        // Instructions
        const instructions = this.add.text(0, -45, 'Enter your email to receive\na magic login link:', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#aaaaaa',
            align: 'center'
        }).setOrigin(0.5);
        this.panelContainer.add(instructions);

        // Email input background
        const inputBg = this.add.rectangle(0, 10, 320, 45, 0x2a2a4e);
        inputBg.setStrokeStyle(2, 0x4a4a8e);
        this.panelContainer.add(inputBg);

        // Create HTML input for email
        this.createEmailInput();

        // Send button
        this.sendButton = this.createButton(0, 70, 'Send Magic Link', () => {
            this.sendMagicLink();
        });
        this.panelContainer.add(this.sendButton);

        // Status message
        this.statusText = this.add.text(0, 120, '', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#888888',
            align: 'center',
            wordWrap: { width: 350 }
        }).setOrigin(0.5);
        this.panelContainer.add(this.statusText);

        // Back button
        this.backButton = this.createButton(0, 145, 'Back to Menu', () => {
            this.goBack();
        }, 0x666666, 120, 35);
        this.panelContainer.add(this.backButton);
    }

    showCheckEmailPanel(email) {
        this.clearPanel();

        const { width, height } = this.scale;
        this.panelContainer = this.add.container(width / 2, height / 2);

        // Panel background
        const panelBg = this.add.rectangle(0, 0, 400, 300, 0x1a1a2e);
        panelBg.setStrokeStyle(3, 0x4ade80);
        this.panelContainer.add(panelBg);

        // Title
        const title = this.add.text(0, -110, 'Check Your Email!', {
            fontSize: '28px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#4ade80'
        }).setOrigin(0.5);
        this.panelContainer.add(title);

        // Email icon
        const emailIcon = this.add.text(0, -60, '✉️', {
            fontSize: '48px'
        }).setOrigin(0.5);
        this.panelContainer.add(emailIcon);

        // Message
        const message = this.add.text(0, 0, `We sent a login link to:\n${email}\n\nClick the link in your email to login.\nLink expires in 15 minutes.`, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#cccccc',
            align: 'center',
            lineSpacing: 6
        }).setOrigin(0.5);
        this.panelContainer.add(message);

        // Buttons row
        const resendBtn = this.createButton(-80, 90, 'Resend', () => {
            this.sendMagicLink(email);
        }, 0x4a4a8e, 100, 35);
        this.panelContainer.add(resendBtn);

        const cancelBtn = this.createButton(80, 90, 'Back', () => {
            this.clearPanel();
            this.showLoginPanel();
        }, 0x666666, 100, 35);
        this.panelContainer.add(cancelBtn);
    }

    showProfilePanel() {
        const { width, height } = this.scale;
        this.panelContainer = this.add.container(width / 2, height / 2);

        const user = supabaseClient.getUser();
        const displayName = supabaseClient.getDisplayName();

        // Panel background
        const panelBg = this.add.rectangle(0, 0, 400, 380, 0x1a1a2e);
        panelBg.setStrokeStyle(3, 0x4ade80);
        this.panelContainer.add(panelBg);

        // Title
        const title = this.add.text(0, -155, 'Profile', {
            fontSize: '28px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.panelContainer.add(title);

        // User icon
        const userIcon = this.add.text(0, -105, '👤', {
            fontSize: '40px'
        }).setOrigin(0.5);
        this.panelContainer.add(userIcon);

        // Display name
        const nameLabel = this.add.text(-160, -60, 'Display Name:', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#888888'
        }).setOrigin(0, 0.5);
        this.panelContainer.add(nameLabel);

        this.displayNameText = this.add.text(0, -35, displayName, {
            fontSize: '24px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffd700'
        }).setOrigin(0.5);
        this.panelContainer.add(this.displayNameText);

        // Email
        const emailLabel = this.add.text(-160, 5, 'Email:', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#888888'
        }).setOrigin(0, 0.5);
        this.panelContainer.add(emailLabel);

        const emailText = this.add.text(0, 30, user?.email || 'Unknown', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#aaaaaa'
        }).setOrigin(0.5);
        this.panelContainer.add(emailText);

        // Cloud sync status
        const syncIcon = this.add.text(-160, 75, '☁️', {
            fontSize: '20px'
        }).setOrigin(0, 0.5);
        this.panelContainer.add(syncIcon);

        this.syncStatusText = this.add.text(-130, 75, 'Cloud Save: Ready', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#4ade80'
        }).setOrigin(0, 0.5);
        this.panelContainer.add(this.syncStatusText);

        // Sync Now button
        const syncBtn = this.createButton(0, 115, 'Sync Now', async () => {
            await this.syncSaveData();
        }, 0x4a7aba, 140, 35);
        this.panelContainer.add(syncBtn);

        // Logout button
        const logoutBtn = this.createButton(0, 160, 'Logout', async () => {
            await this.logout();
        }, 0xc0392b, 140, 35);
        this.panelContainer.add(logoutBtn);

        // Back button
        const backBtn = this.createButton(0, 160, 'Back to Menu', () => {
            this.goBack();
        }, 0x666666, 140, 35);
        backBtn.y = 205;
        this.panelContainer.add(backBtn);
    }

    createButton(x, y, text, callback, bgColor = 0x4169E1, width = 200, height = 45) {
        const container = this.add.container(x, y);

        const bg = this.add.rectangle(0, 0, width, height, bgColor);
        bg.setStrokeStyle(2, 0xffffff, 0.3);
        container.add(bg);

        const label = this.add.text(0, 0, text, {
            fontSize: '16px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(label);

        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => {
            bg.setFillStyle(Phaser.Display.Color.GetColor(
                Math.min(255, ((bgColor >> 16) & 0xFF) + 30),
                Math.min(255, ((bgColor >> 8) & 0xFF) + 30),
                Math.min(255, (bgColor & 0xFF) + 30)
            ));
        });
        bg.on('pointerout', () => {
            bg.setFillStyle(bgColor);
        });
        bg.on('pointerdown', () => {
            if (typeof audioManager !== 'undefined') {
                audioManager.playClick();
            }
            callback();
        });

        return container;
    }

    createEmailInput() {
        // Create HTML input element for email
        const input = document.createElement('input');
        input.type = 'email';
        input.id = 'email-input';
        input.placeholder = 'your@email.com';
        input.style.cssText = `
            position: absolute;
            width: 300px;
            height: 35px;
            font-size: 18px;
            padding: 0 10px;
            border: none;
            border-radius: 5px;
            background: #3a3a5e;
            color: #ffffff;
            outline: none;
            text-align: center;
        `;

        // Position it over the game canvas
        const canvas = this.game.canvas;
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / this.scale.width;
        const scaleY = rect.height / this.scale.height;

        input.style.left = `${rect.left + (this.scale.width / 2 - 150) * scaleX}px`;
        input.style.top = `${rect.top + (this.scale.height / 2 - 8) * scaleY}px`;
        input.style.transform = `scale(${scaleX}, ${scaleY})`;
        input.style.transformOrigin = 'top left';

        document.body.appendChild(input);
        this.emailInput = input;

        // Handle Enter key
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.sendMagicLink();
            }
        });
    }

    removeEmailInput() {
        if (this.emailInput && this.emailInput.parentNode) {
            this.emailInput.parentNode.removeChild(this.emailInput);
            this.emailInput = null;
        }
    }

    async sendMagicLink(email = null) {
        const emailValue = email || this.emailInput?.value?.trim();

        if (!emailValue) {
            this.showStatus('Please enter your email address', '#ff6b6b');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailValue)) {
            this.showStatus('Please enter a valid email address', '#ff6b6b');
            return;
        }

        this.showStatus('Sending magic link...', '#ffd700');

        const result = await supabaseClient.sendMagicLink(emailValue);

        if (result.success) {
            this.removeEmailInput();
            this.showCheckEmailPanel(emailValue);
        } else {
            this.showStatus(result.error || 'Failed to send magic link', '#ff6b6b');
        }
    }

    async syncSaveData() {
        this.syncStatusText.setText('Cloud Save: Syncing...');
        this.syncStatusText.setColor('#ffd700');

        try {
            // Get local save data
            const localSave = saveSystem.load();

            // Save to cloud
            const saveResult = await supabaseClient.saveToCloud(localSave);

            if (saveResult.success) {
                this.syncStatusText.setText('Cloud Save: Synced!');
                this.syncStatusText.setColor('#4ade80');

                // Update leaderboard
                await supabaseClient.updateLeaderboard(
                    localSave.highestWave || 0,
                    localSave.totalEnemiesKilled || 0
                );

                this.showMessage('Save synced to cloud!', '#4ade80');
            } else {
                this.syncStatusText.setText('Cloud Save: Failed');
                this.syncStatusText.setColor('#ff6b6b');
                this.showMessage('Sync failed: ' + saveResult.error, '#ff6b6b');
            }
        } catch (error) {
            this.syncStatusText.setText('Cloud Save: Error');
            this.syncStatusText.setColor('#ff6b6b');
            console.error('Sync error:', error);
        }
    }

    async logout() {
        const result = await supabaseClient.logout();

        if (result.success) {
            this.isLoggedIn = false;
            this.clearPanel();
            this.showLoginPanel();
            this.showMessage('Logged out successfully', '#4ade80');
        } else {
            this.showMessage('Logout failed: ' + result.error, '#ff6b6b');
        }
    }

    showStatus(message, color = '#888888') {
        if (this.statusText) {
            this.statusText.setText(message);
            this.statusText.setColor(color);
        }
    }

    showMessage(message, color = '#ffffff') {
        const { width, height } = this.scale;

        const msgText = this.add.text(width / 2, height - 80, message, {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: color,
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        this.tweens.add({
            targets: msgText,
            alpha: 0,
            y: height - 120,
            duration: 2000,
            delay: 1000,
            onComplete: () => msgText.destroy()
        });
    }

    clearPanel() {
        if (this.panelContainer) {
            this.panelContainer.destroy();
            this.panelContainer = null;
        }
        this.removeEmailInput();
    }

    goBack() {
        this.clearPanel();
        this.scene.start('MenuScene');
    }

    shutdown() {
        this.removeEmailInput();
        if (this.authListener) {
            window.removeEventListener('authStateChanged', this.authListener);
        }
    }
}
