// Authentication Scene - Login/Profile UI
class AuthScene extends Phaser.Scene {
    constructor() {
        super({ key: 'AuthScene' });
    }

    create() {
        const { width, height } = this.scale;

        // Ensure cursor is visible in this scene
        this.input.setDefaultCursor('default');
        this.game.canvas.style.cursor = 'default';

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
        const panelBg = this.add.rectangle(0, 0, 400, 320, 0x1a1a2e);
        panelBg.setStrokeStyle(3, 0x4ade80);
        this.panelContainer.add(panelBg);

        // Title
        const title = this.add.text(0, -120, 'Check Your Email!', {
            fontSize: '28px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#4ade80'
        }).setOrigin(0.5);
        this.panelContainer.add(title);

        // Email icon
        const emailIcon = this.add.text(0, -70, '✉️', {
            fontSize: '48px'
        }).setOrigin(0.5);
        this.panelContainer.add(emailIcon);

        // Message - moved down to avoid overlap
        const message = this.add.text(0, 20, `We sent a login link to:\n${email}\n\nClick the link in your email to login.\nLink expires in 15 minutes.`, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#cccccc',
            align: 'center',
            lineSpacing: 6
        }).setOrigin(0.5);
        this.panelContainer.add(message);

        // Status text for resend feedback
        this.checkEmailStatus = this.add.text(0, 85, '', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffd700',
            align: 'center'
        }).setOrigin(0.5);
        this.panelContainer.add(this.checkEmailStatus);

        // Buttons row
        const resendBtn = this.createButton(-80, 115, 'Resend', () => {
            this.resendMagicLink(email);
        }, 0x4a4a8e, 100, 35);
        this.panelContainer.add(resendBtn);

        const cancelBtn = this.createButton(80, 115, 'Back', () => {
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

        // Panel background - more compact
        const panelBg = this.add.rectangle(0, 0, 350, 250, 0x1a1a2e);
        panelBg.setStrokeStyle(3, 0x4ade80);
        this.panelContainer.add(panelBg);

        // Title with user icon
        const title = this.add.text(0, -95, '👤 Profile', {
            fontSize: '26px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.panelContainer.add(title);

        // Display name - inlined
        const nameRow = this.add.text(0, -50, `Name: ${displayName}`, {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ffd700'
        }).setOrigin(0.5);
        this.panelContainer.add(nameRow);

        // Email - inlined
        const emailRow = this.add.text(0, -20, `Email: ${user?.email || 'Unknown'}`, {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#aaaaaa'
        }).setOrigin(0.5);
        this.panelContainer.add(emailRow);

        // Cloud sync status
        this.syncStatusText = this.add.text(0, 15, '☁️ Cloud Save: Ready', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#4ade80'
        }).setOrigin(0.5);
        this.panelContainer.add(this.syncStatusText);

        // Buttons row - horizontal layout
        // Back button (left) - arrow icon only
        const backBtn = this.createIconButton(-110, 70, '◀', () => {
            this.goBack();
        }, 0x555555);
        this.panelContainer.add(backBtn);

        // Sync button (center) - cloud sync icon
        const syncBtn = this.createIconButton(0, 70, '☁️', async () => {
            await this.syncSaveData();
        }, 0x3498db);
        this.panelContainer.add(syncBtn);

        // Logout button (right) - compact
        const logoutBtn = this.createButton(95, 70, '🚪', async () => {
            await this.logout();
        }, 0xc0392b, 50, 40);
        this.panelContainer.add(logoutBtn);
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

    createIconButton(x, y, icon, callback, bgColor = 0x4169E1) {
        const container = this.add.container(x, y);

        const bg = this.add.circle(0, 0, 25, bgColor);
        bg.setStrokeStyle(2, 0xffffff, 0.3);
        container.add(bg);

        const iconText = this.add.text(0, 0, icon, {
            fontSize: '24px'
        }).setOrigin(0.5);
        container.add(iconText);

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

    async resendMagicLink(email) {
        if (this.checkEmailStatus) {
            this.checkEmailStatus.setText('Sending...');
            this.checkEmailStatus.setColor('#ffd700');
        }

        const result = await supabaseClient.sendMagicLink(email);

        if (this.checkEmailStatus) {
            if (result.success) {
                this.checkEmailStatus.setText('New link sent! Check your email.');
                this.checkEmailStatus.setColor('#4ade80');
            } else {
                this.checkEmailStatus.setText(result.error || 'Failed to resend');
                this.checkEmailStatus.setColor('#ff6b6b');
            }
        }
    }

    async syncSaveData() {
        this.syncStatusText.setText('☁️ Syncing...');
        this.syncStatusText.setColor('#ffd700');

        try {
            // Get local save data
            const localSave = saveSystem.load();

            // Save to cloud
            const saveResult = await supabaseClient.saveToCloud(localSave);

            if (saveResult.success) {
                this.syncStatusText.setText('☁️ Synced!');
                this.syncStatusText.setColor('#4ade80');

                // Update leaderboard
                await supabaseClient.updateLeaderboard(
                    localSave.highestWave || 0,
                    localSave.totalEnemiesKilled || 0
                );

                this.showMessage('Save synced to cloud!', '#4ade80');
            } else {
                this.syncStatusText.setText('☁️ Sync Failed');
                this.syncStatusText.setColor('#ff6b6b');
                this.showMessage('Sync failed: ' + saveResult.error, '#ff6b6b');
            }
        } catch (error) {
            this.syncStatusText.setText('☁️ Error');
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
