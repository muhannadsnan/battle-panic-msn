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
            // Check for pending guest data migration (from magic link redirect)
            this.checkFirstTimeMigration();
        } else {
            this.showLoginPanel();
        }

        // Listen for auth state changes (for login during this session)
        this.authListener = async (event) => {
            const { user, guestData } = event.detail;
            if (user && !this.isLoggedIn) {
                // User just logged in during this session
                this.isLoggedIn = true;
                this.clearPanel();
                this.showProfilePanel();
                this.showMessage('Login successful!', '#4ade80');
                await this.handleLoginMigration(guestData);
            }
        };
        window.addEventListener('authStateChanged', this.authListener);
    }

    async checkFirstTimeMigration() {
        // Check if there's pending guest data from page reload (magic link)
        const pendingGuestData = supabaseClient.getPendingGuestData();
        if (pendingGuestData) {
            await this.handleLoginMigration(pendingGuestData);
        }
    }

    async handleLoginMigration(guestData) {
        // Load cloud data for this user
        this.showMessage('Loading your data...', '#ffd700');
        const cloudResult = await supabaseClient.loadFromCloud();

        console.log('Cloud load result:', cloudResult);

        if (cloudResult.success && cloudResult.saveData) {
            // Cloud data exists - use it
            console.log('Cloud data found:', cloudResult.saveData);
            const mergedData = saveSystem.mergeWithDefaults(cloudResult.saveData);
            saveSystem.save(mergedData);
            this.showMessage('Data loaded from cloud!', '#4ade80');
            console.log('Saved merged cloud data locally');
        } else if (guestData) {
            // First-time sign-in: migrate guest data to new account
            console.log('First-time sign-in: migrating guest data', guestData);
            saveSystem.save(guestData);

            // Upload to cloud
            const uploadResult = await supabaseClient.saveToCloud(guestData);
            if (uploadResult.success) {
                this.showMessage('Progress migrated to your account!', '#4ade80');
                console.log('Guest data migrated to cloud');
            } else {
                this.showMessage('Progress saved locally', '#ffd700');
            }
        } else {
            console.log('No cloud data and no guest data');
        }

        // Refresh profile panel to show updated data
        this.clearPanel();
        this.showProfilePanel();
    }

    showLoginPanel() {
        const { width, height } = this.scale;
        this.panelContainer = this.add.container(width / 2, height / 2);

        // Panel background
        const panelBg = this.add.rectangle(0, 0, 400, 350, 0x1a1a2e);
        panelBg.setStrokeStyle(3, 0x4169E1);
        this.panelContainer.add(panelBg);

        // Close button - popping circle style outside panel
        const closeBtnContainer = this.add.container(200 + 15, -175 + 15);
        const closeBtnBg = this.add.circle(0, 0, 28, 0x442222);
        closeBtnBg.setStrokeStyle(3, 0xff4444);
        closeBtnContainer.add(closeBtnBg);
        const closeBtnText = this.add.text(0, 0, '✕', {
            fontSize: '32px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ff6666'
        }).setOrigin(0.5);
        closeBtnContainer.add(closeBtnText);
        closeBtnBg.setInteractive({ useHandCursor: true });
        this.panelContainer.add(closeBtnContainer);

        closeBtnBg.on('pointerover', () => {
            closeBtnBg.setFillStyle(0x663333);
            closeBtnText.setColor('#ff8888');
            this.tweens.add({
                targets: closeBtnContainer,
                scale: 1.1,
                duration: 100
            });
        });
        closeBtnBg.on('pointerout', () => {
            closeBtnBg.setFillStyle(0x442222);
            closeBtnText.setColor('#ff6666');
            this.tweens.add({
                targets: closeBtnContainer,
                scale: 1,
                duration: 100
            });
        });
        closeBtnBg.on('pointerdown', () => this.goBack());

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
    }

    showCheckEmailPanel(email) {
        this.clearPanel();
        this.pendingEmail = email; // Store for code verification

        const { width, height } = this.scale;
        this.panelContainer = this.add.container(width / 2, height / 2);

        // Panel background
        const panelBg = this.add.rectangle(0, 0, 400, 340, 0x1a1a2e);
        panelBg.setStrokeStyle(3, 0x4ade80);
        this.panelContainer.add(panelBg);

        // Close button - popping circle style outside panel
        const closeBtnContainer = this.add.container(200 + 15, -170 + 15);
        const closeBtnBg = this.add.circle(0, 0, 28, 0x442222);
        closeBtnBg.setStrokeStyle(3, 0xff4444);
        closeBtnContainer.add(closeBtnBg);
        const closeBtnText = this.add.text(0, 0, '✕', {
            fontSize: '32px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ff6666'
        }).setOrigin(0.5);
        closeBtnContainer.add(closeBtnText);
        closeBtnBg.setInteractive({ useHandCursor: true });
        this.panelContainer.add(closeBtnContainer);

        closeBtnBg.on('pointerover', () => {
            closeBtnBg.setFillStyle(0x663333);
            closeBtnText.setColor('#ff8888');
            this.tweens.add({
                targets: closeBtnContainer,
                scale: 1.1,
                duration: 100
            });
        });
        closeBtnBg.on('pointerout', () => {
            closeBtnBg.setFillStyle(0x442222);
            closeBtnText.setColor('#ff6666');
            this.tweens.add({
                targets: closeBtnContainer,
                scale: 1,
                duration: 100
            });
        });
        closeBtnBg.on('pointerdown', () => this.goBack());

        // Title
        const title = this.add.text(0, -130, 'Check Your Email!', {
            fontSize: '28px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#4ade80'
        }).setOrigin(0.5);
        this.panelContainer.add(title);

        // Email icon
        const emailIcon = this.add.text(0, -80, '✉️', {
            fontSize: '40px'
        }).setOrigin(0.5);
        this.panelContainer.add(emailIcon);

        // Message
        const message = this.add.text(0, -20, `We sent a login link to:\n${email}\n\nClick the link OR use the 6-digit code\nin the email to sign in.`, {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#cccccc',
            align: 'center',
            lineSpacing: 5
        }).setOrigin(0.5);
        this.panelContainer.add(message);

        // Status text for feedback
        this.checkEmailStatus = this.add.text(0, 55, '', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffd700',
            align: 'center'
        }).setOrigin(0.5);
        this.panelContainer.add(this.checkEmailStatus);

        // Buttons row
        const resendBtn = this.createButton(-90, 95, 'Resend', () => {
            this.resendMagicLink(email);
        }, 0x4a4a8e, 90, 35);
        this.panelContainer.add(resendBtn);

        // Enter Code button (for PWA users who can't click the magic link)
        const enterCodeBtn = this.createButton(90, 95, 'Enter Code', () => {
            this.showEnterCodePanel();
        }, 0x6a5a2e, 110, 35);
        this.panelContainer.add(enterCodeBtn);

        const cancelBtn = this.createButton(0, 140, '← Re-enter Email', () => {
            this.clearPanel();
            this.showLoginPanel();
        }, 0x666666, 140, 35);
        this.panelContainer.add(cancelBtn);
    }

    showProfilePanel() {
        const { width, height } = this.scale;
        this.panelContainer = this.add.container(width / 2, height / 2);

        // Play welcome chime when profile loads
        if (typeof audioManager !== 'undefined') {
            audioManager.playWelcome();
        }

        const user = supabaseClient.getUser();
        const displayName = supabaseClient.getDisplayName();

        // Panel background - taller for better layout
        const panelBg = this.add.rectangle(0, 0, 420, 400, 0x1a1a2e);
        panelBg.setStrokeStyle(3, 0x4ade80);
        this.panelContainer.add(panelBg);

        // Close button - popping circle style outside panel
        const closeBtnContainer = this.add.container(210 + 15, -200 + 15);
        const closeBtnBg = this.add.circle(0, 0, 28, 0x442222);
        closeBtnBg.setStrokeStyle(3, 0xff4444);
        closeBtnContainer.add(closeBtnBg);
        const closeBtnText = this.add.text(0, 0, '✕', {
            fontSize: '32px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ff6666'
        }).setOrigin(0.5);
        closeBtnContainer.add(closeBtnText);
        closeBtnBg.setInteractive({ useHandCursor: true });
        this.panelContainer.add(closeBtnContainer);

        closeBtnBg.on('pointerover', () => {
            closeBtnBg.setFillStyle(0x663333);
            closeBtnText.setColor('#ff8888');
            this.tweens.add({
                targets: closeBtnContainer,
                scale: 1.1,
                duration: 100
            });
        });
        closeBtnBg.on('pointerout', () => {
            closeBtnBg.setFillStyle(0x442222);
            closeBtnText.setColor('#ff6666');
            this.tweens.add({
                targets: closeBtnContainer,
                scale: 1,
                duration: 100
            });
        });
        closeBtnBg.on('pointerdown', () => this.goBack());

        // Title - larger
        const title = this.add.text(0, -160, '👤 Profile', {
            fontSize: '32px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.panelContainer.add(title);

        // Display name row - larger fonts
        const nameLabel = this.add.text(-185, -95, 'Name:', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#888888'
        }).setOrigin(0, 0.5);
        this.panelContainer.add(nameLabel);

        this.displayNameText = this.add.text(-70, -95, displayName, {
            fontSize: '22px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffd700'
        }).setOrigin(0, 0.5);
        this.panelContainer.add(this.displayNameText);

        // Edit name button - larger
        const editBtn = this.add.text(175, -95, '✏️', {
            fontSize: '24px'
        }).setOrigin(0, 0.5);
        editBtn.setInteractive({ useHandCursor: true });
        this.panelContainer.add(editBtn);
        editBtn.on('pointerdown', () => this.showEditNameDialog());

        // Email row - larger fonts
        const emailLabel = this.add.text(-185, -45, 'Email:', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#888888'
        }).setOrigin(0, 0.5);
        this.panelContainer.add(emailLabel);

        const emailText = this.add.text(-70, -45, user?.email || 'Unknown', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#aaaaaa'
        }).setOrigin(0, 0.5);
        this.panelContainer.add(emailText);

        // Cloud sync status - larger, centered
        this.syncStatusText = this.add.text(0, 15, '☁️ Cloud Save: Ready', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#4ade80'
        }).setOrigin(0.5);
        this.panelContainer.add(this.syncStatusText);

        // Buttons at bottom - larger, full width
        // Sync button
        const syncBtn = this.createButton(-100, 120, '↻ Sync Now', async () => {
            await this.syncSaveData();
        }, 0x3498db, 150, 55);
        this.panelContainer.add(syncBtn);

        // Logout button - red background
        const logoutBtn = this.createButton(100, 120, 'Logout', async () => {
            await this.logout();
        }, 0xcc4444, 150, 55);
        this.panelContainer.add(logoutBtn);
    }

    showEditNameDialog() {
        // Create overlay
        const overlay = this.add.rectangle(0, 0, 400, 320, 0x000000, 0.9);
        overlay.setInteractive();
        this.panelContainer.add(overlay);

        const editPanel = this.add.container(0, 0);
        this.panelContainer.add(editPanel);

        // Panel background
        const bg = this.add.rectangle(0, 0, 300, 150, 0x2a2a3e);
        bg.setStrokeStyle(2, 0x4ade80);
        editPanel.add(bg);

        // Title
        const title = this.add.text(0, -50, 'Edit Display Name', {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        editPanel.add(title);

        // Create HTML input
        this.createNameInput();

        // Save button
        const saveBtn = this.createButton(-60, 40, 'Save', async () => {
            const newName = this.nameInput?.value?.trim();
            if (newName && newName.length > 0) {
                const result = await supabaseClient.updateDisplayName(newName);
                if (result.success) {
                    this.displayNameText.setText(newName);
                    this.showMessage('Name updated!', '#4ade80');
                } else {
                    this.showMessage('Failed to update name', '#ff6b6b');
                }
            }
            this.removeNameInput();
            overlay.destroy();
            editPanel.destroy();
        }, 0x4ade80, 80, 35);
        editPanel.add(saveBtn);

        // Cancel button
        const cancelBtn = this.createButton(60, 40, 'Cancel', () => {
            this.removeNameInput();
            overlay.destroy();
            editPanel.destroy();
        }, 0x666666, 80, 35);
        editPanel.add(cancelBtn);
    }

    createNameInput() {
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'name-input';
        input.value = supabaseClient.getDisplayName() || '';
        input.maxLength = 20;
        input.style.cssText = `
            position: absolute;
            width: 220px;
            height: 30px;
            font-size: 16px;
            padding: 0 10px;
            border: none;
            border-radius: 5px;
            background: #ffffff;
            color: #333333;
            text-align: center;
        `;

        const canvas = this.game.canvas;
        const rect = canvas.getBoundingClientRect();
        input.style.left = `${rect.left + rect.width / 2 - 120}px`;
        input.style.top = `${rect.top + rect.height / 2 - 15}px`;

        document.body.appendChild(input);
        this.nameInput = input;
        input.focus();
        input.select();
    }

    removeNameInput() {
        if (this.nameInput) {
            this.nameInput.remove();
            this.nameInput = null;
        }
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
                this.checkEmailStatus.setText('New email sent! Check your inbox.');
                this.checkEmailStatus.setColor('#4ade80');
            } else {
                this.checkEmailStatus.setText(result.error || 'Failed to resend');
                this.checkEmailStatus.setColor('#ff6b6b');
            }
        }
    }

    showEnterCodePanel() {
        this.clearPanel();

        const { width, height } = this.scale;
        this.panelContainer = this.add.container(width / 2, height / 2);

        // Panel background
        const panelBg = this.add.rectangle(0, 0, 360, 300, 0x1a1a2e);
        panelBg.setStrokeStyle(3, 0xffd700);
        this.panelContainer.add(panelBg);

        // Close button
        const closeBtnContainer = this.add.container(180 + 15, -150 + 15);
        const closeBtnBg = this.add.circle(0, 0, 28, 0x442222);
        closeBtnBg.setStrokeStyle(3, 0xff4444);
        closeBtnContainer.add(closeBtnBg);
        const closeBtnText = this.add.text(0, 0, '✕', {
            fontSize: '32px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ff6666'
        }).setOrigin(0.5);
        closeBtnContainer.add(closeBtnText);
        closeBtnBg.setInteractive({ useHandCursor: true });
        this.panelContainer.add(closeBtnContainer);

        closeBtnBg.on('pointerover', () => {
            closeBtnBg.setFillStyle(0x663333);
            closeBtnText.setColor('#ff8888');
        });
        closeBtnBg.on('pointerout', () => {
            closeBtnBg.setFillStyle(0x442222);
            closeBtnText.setColor('#ff6666');
        });
        closeBtnBg.on('pointerdown', () => {
            // Go back to check email panel
            this.showCheckEmailPanel(this.pendingEmail);
        });

        // Title
        const title = this.add.text(0, -110, 'Enter Login Code', {
            fontSize: '26px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffd700'
        }).setOrigin(0.5);
        this.panelContainer.add(title);

        // Instructions
        const instructions = this.add.text(0, -70, 'Enter the code from your email:', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#aaaaaa'
        }).setOrigin(0.5);
        this.panelContainer.add(instructions);

        // Code input (HTML input for mobile keyboard)
        this.createCodeInput();

        // Status text
        this.codeStatus = this.add.text(0, 50, '', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ff6b6b',
            align: 'center'
        }).setOrigin(0.5);
        this.panelContainer.add(this.codeStatus);

        // Verify button
        const verifyBtn = this.createButton(0, 95, 'Verify & Login', () => {
            this.verifyLoginCode();
        }, 0x4a8a4e, 150, 40);
        this.panelContainer.add(verifyBtn);

        // Back button
        const backBtn = this.createButton(0, 140, '← Back', () => {
            this.removeCodeInput();
            this.showCheckEmailPanel(this.pendingEmail, this.pendingLoginCode);
        }, 0x666666, 100, 35);
        this.panelContainer.add(backBtn);
    }

    createCodeInput() {
        const { width, height } = this.scale;

        // Remove existing input if any
        this.removeCodeInput();

        // Create HTML input for code
        this.codeInput = document.createElement('input');
        this.codeInput.type = 'text';
        this.codeInput.inputMode = 'numeric';
        this.codeInput.pattern = '[0-9]*';
        this.codeInput.maxLength = 8;
        this.codeInput.placeholder = '________';
        this.codeInput.style.cssText = `
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 220px;
            height: 50px;
            font-size: 24px;
            font-family: Arial, sans-serif;
            font-weight: bold;
            text-align: center;
            letter-spacing: 8px;
            padding-left: 8px;
            background: #2a2a4a;
            border: 2px solid #ffd700;
            border-radius: 8px;
            color: #ffd700;
            outline: none;
        `;

        // Position relative to game canvas
        const canvas = this.game.canvas;
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / width;
        const scaleY = rect.height / height;

        this.codeInput.style.left = `${rect.left + (width / 2) * scaleX}px`;
        this.codeInput.style.top = `${rect.top + (height / 2 - 15) * scaleY}px`;
        this.codeInput.style.width = `${220 * scaleX}px`;
        this.codeInput.style.height = `${50 * scaleY}px`;
        this.codeInput.style.fontSize = `${22 * Math.min(scaleX, scaleY)}px`;

        document.body.appendChild(this.codeInput);
        this.codeInput.focus();

        // Allow Enter key to verify
        this.codeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.verifyLoginCode();
            }
        });
    }

    removeCodeInput() {
        if (this.codeInput && this.codeInput.parentNode) {
            this.codeInput.parentNode.removeChild(this.codeInput);
            this.codeInput = null;
        }
    }

    async verifyLoginCode() {
        const code = this.codeInput?.value?.trim();

        if (!code || code.length < 6) {
            if (this.codeStatus) {
                this.codeStatus.setText('Please enter the code from your email');
                this.codeStatus.setColor('#ff6b6b');
            }
            return;
        }

        if (this.codeStatus) {
            this.codeStatus.setText('Verifying...');
            this.codeStatus.setColor('#ffd700');
        }

        const result = await supabaseClient.verifyEmailOtp(this.pendingEmail, code);

        if (result.success) {
            if (this.codeStatus) {
                this.codeStatus.setText('Success! Logging in...');
                this.codeStatus.setColor('#4ade80');
            }
            this.removeCodeInput();

            // Start session and show logged-in panel
            await supabaseClient.startSession();

            // Short delay to show success message
            this.time.delayedCall(500, () => {
                this.clearPanel();
                this.showLoggedInPanel();
            });
        } else {
            if (this.codeStatus) {
                this.codeStatus.setText(result.error || 'Invalid or expired code');
                this.codeStatus.setColor('#ff6b6b');
            }
            // Focus input for retry (don't clear - let user see what they typed)
            if (this.codeInput) {
                this.codeInput.focus();
                this.codeInput.select();
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
            // Go back to main menu (now as guest)
            this.scene.start('MenuScene');
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
        this.removeCodeInput();
    }

    goBack() {
        this.clearPanel();
        this.removeCodeInput();
        this.scene.start('MenuScene');
    }

    shutdown() {
        this.removeEmailInput();
        this.removeCodeInput();
        if (this.authListener) {
            window.removeEventListener('authStateChanged', this.authListener);
        }
    }
}
