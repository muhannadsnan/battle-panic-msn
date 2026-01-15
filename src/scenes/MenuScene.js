// Menu Scene - Main menu
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const width = GAME_WIDTH;
        const height = GAME_HEIGHT;

        // Hide default cursor
        this.input.setDefaultCursor('none');

        // Create sword cursor
        this.createSwordCursor();

        // Background gradient effect
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Add battlefield characters - enemies on left, units on right
        this.createBattlefieldDisplay();

        // Add some decorative stars (fewer, only in top area)
        for (let i = 0; i < 12; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, 200);
            const size = Phaser.Math.Between(2, 4);
            const star = this.add.circle(x, y, size, 0xffffff, 0.2);

            this.tweens.add({
                targets: star,
                alpha: 0.6,
                duration: Phaser.Math.Between(1000, 3000),
                yoyo: true,
                repeat: -1
            });
        }

        // Subtitle at very top
        this.add.text(width / 2, 20, 'A Battle Panic MSn game, built with Phaser 3', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#666666'
        }).setOrigin(0.5);

        // Title
        const title = this.add.text(width / 2, 85, 'BATTLE PANIC', {
            fontSize: '64px',
            fontFamily: 'Arial',
            color: '#ff6b6b',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Animate title
        this.tweens.add({
            targets: title,
            y: 95,
            duration: 2000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // Session validation + cloud sync if logged in
        // Only validate once per session to avoid infinite restart loop
        if (typeof supabaseClient !== 'undefined' && supabaseClient.isLoggedIn() && !MenuScene.hasSynced) {
            MenuScene.hasSynced = true;
            this.validateAndSync();
        }

        // Listen for XP purchases (real-time from Stripe webhook)
        this.xpPurchaseHandler = (event) => {
            const { newXP, xpGained } = event.detail;
            console.log(`XP purchased! +${xpGained} XP`);
            this.showXPPurchaseNotification(xpGained);
            // Reload save data and restart scene to show new XP
            this.time.delayedCall(2000, () => {
                saveSystem.syncWithCloud().then(() => {
                    this.scene.restart();
                });
            });
        };
        window.addEventListener('xpPurchased', this.xpPurchaseHandler);

        // Periodic session validation (check every 30s if another device took over)
        if (typeof supabaseClient !== 'undefined' && supabaseClient.isLoggedIn()) {
            this.sessionCheckTimer = this.time.addEvent({
                delay: 30000, // 30 seconds
                callback: this.checkSessionStillValid,
                callbackScope: this,
                loop: true
            });
        }

        // Load save data for stats display
        const saveData = saveSystem.load();
        const rankInfo = saveSystem.getRankInfo(saveData);

        // Stats display - Highest Wave - LARGER
        this.add.text(width / 2, 150, `Highest Wave: ${saveData.highestWave}`, {
            fontSize: '26px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Rank display - PRESTIGIOUS with background panel
        this.createRankDisplay(width / 2, 210, rankInfo);

        // Play button - GOLD and BIGGER (moved down for rank display)
        this.createPlayButton(width / 2, 370, () => {
            this.scene.start('GameScene');
        });

        // Upgrades button with XP notification
        this.createUpgradesButton(width / 2, 440, saveData.xp || 0, () => {
            this.scene.start('UpgradeScene');
        });

        // Tips button
        this.createSmallButton(width / 2, 500, 'TIPS & INFO', () => {
            this.showTipsPanel();
        });

        // Buy XP button (bottom left) - hide on third-party sites
        if (!this.checkIfEmbedded()) {
            this.createBuyXPButton(100, height - 60);
        }

        // Buy me a coffee button (bottom right) - hide on third-party sites
        if (!this.checkIfEmbedded()) {
            this.createCoffeeButton(width - 100, height - 60);
        }

        // Settings gear icon (top left corner)
        this.createSettingsGear(40, 40);

        // Login/Profile button (top right corner) - hide on third-party sites
        if (!this.checkIfEmbedded()) {
            this.createLoginButton(width - 50, 40);
        }

        // Version (bottom left, under Buy XP button) - white color
        this.add.text(100, height - 18, GAME_VERSION, {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5, 0);

        // Show "Play on Official Site" button if embedded on another site (iframe)
        const isEmbedded = this.checkIfEmbedded();
        if (isEmbedded) {
            this.createOfficialSiteButton(width / 2, height - 35);
        }
    }

    createOfficialSiteButton(x, y) {
        const container = this.add.container(x, y);

        // Background pill
        const bg = this.add.rectangle(0, 0, 280, 32, 0x2266aa, 0.9);
        bg.setStrokeStyle(2, 0x44aaff);
        bg.setInteractive({ useHandCursor: true });
        container.add(bg);

        // Icon + Text
        const text = this.add.text(0, 0, '🌐 Play on Official Site', {
            fontSize: '16px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(text);

        // Hover effects
        bg.on('pointerover', () => {
            bg.setFillStyle(0x3388cc);
            text.setColor('#ffff88');
        });
        bg.on('pointerout', () => {
            bg.setFillStyle(0x2266aa);
            text.setColor('#ffffff');
        });
        bg.on('pointerdown', () => {
            window.open('https://battle-panic-msn.netlify.app/', '_blank');
        });

        // Subtle pulse animation
        this.tweens.add({
            targets: bg,
            scaleX: 1.02,
            scaleY: 1.05,
            duration: 1500,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        return container;
    }

    checkIfEmbedded() {
        // Check if we're in an iframe on a different domain
        try {
            // If we're not in an iframe, window.self === window.top
            if (window.self === window.top) {
                return false;
            }
            // We're in an iframe - try to access parent location
            // This will throw an error if cross-origin (embedded on different site)
            const parentHost = window.top.location.hostname;
            // If we can access it and it's the same domain, not embedded externally
            return parentHost !== window.location.hostname;
        } catch (e) {
            // Cross-origin error = we're embedded on another site
            return true;
        }
    }

    createButton(x, y, text, callback) {
        // Text-only button with larger touch area for mobile
        const label = this.add.text(x, y, text, {
            fontSize: '38px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#4169E1',
            stroke: '#000000',
            strokeThickness: 4,
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        // Larger hit area for touch
        label.setInteractive({ useHandCursor: true });

        label.on('pointerover', () => {
            label.setColor('#6495ED');
            this.tweens.add({
                targets: label,
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 100
            });
        });

        label.on('pointerout', () => {
            label.setColor('#4169E1');
            this.tweens.add({
                targets: label,
                scaleX: 1,
                scaleY: 1,
                duration: 100
            });
        });

        label.on('pointerdown', () => {
            this.tweens.add({
                targets: label,
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 50,
                yoyo: true,
                onComplete: callback
            });
        });

        return label;
    }

    createPlayButton(x, y, callback) {
        // Special GOLD and BIGGER play button (no border/stroke)
        const label = this.add.text(x, y, 'PLAY', {
            fontSize: '52px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffd700',
            padding: { x: 30, y: 15 }
        }).setOrigin(0.5);

        // Larger hit area for touch
        label.setInteractive({ useHandCursor: true });

        // Subtle glow animation
        this.tweens.add({
            targets: label,
            alpha: 0.85,
            duration: 800,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        label.on('pointerover', () => {
            label.setColor('#ffec8b');
            label.setAlpha(1);
            this.tweens.add({
                targets: label,
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 100
            });
        });

        label.on('pointerout', () => {
            label.setColor('#ffd700');
            this.tweens.add({
                targets: label,
                scaleX: 1,
                scaleY: 1,
                duration: 100
            });
        });

        label.on('pointerdown', () => {
            this.tweens.add({
                targets: label,
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 50,
                yoyo: true,
                onComplete: callback
            });
        });

        return label;
    }

    createUpgradesButton(x, y, xpAmount, callback) {
        const container = this.add.container(x, y);

        // Main button text with XP in parentheses
        const mainText = 'UPGRADES';
        const xpText = xpAmount > 0 ? ` (${xpAmount})` : '';

        const label = this.add.text(0, 0, mainText, {
            fontSize: '38px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#4169E1',
            stroke: '#000000',
            strokeThickness: 4,
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);
        container.add(label);

        // XP count in different color (yellow/gold) after the text - closer with spaces
        if (xpAmount > 0) {
            const xpLabel = this.add.text(label.width / 2 - 5, 0, `( ${xpAmount} )`, {
                fontSize: '32px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#ffd700',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0, 0.5);
            container.add(xpLabel);
        }

        // Make the whole container interactive
        label.setInteractive({ useHandCursor: true });

        label.on('pointerover', () => {
            label.setColor('#6495ED');
            this.tweens.add({
                targets: container,
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 100
            });
        });

        label.on('pointerout', () => {
            label.setColor('#4169E1');
            this.tweens.add({
                targets: container,
                scaleX: 1,
                scaleY: 1,
                duration: 100
            });
        });

        label.on('pointerdown', () => {
            this.tweens.add({
                targets: container,
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 50,
                yoyo: true,
                onComplete: callback
            });
        });

        return container;
    }

    createSmallButton(x, y, text, callback) {
        // Text-only small button with touch-friendly size
        const label = this.add.text(x, y, text, {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#888888',
            stroke: '#000000',
            strokeThickness: 2,
            padding: { x: 15, y: 8 }
        }).setOrigin(0.5);

        label.setInteractive({ useHandCursor: true });

        label.on('pointerover', () => {
            label.setColor('#ffffff');
        });

        label.on('pointerout', () => {
            label.setColor('#888888');
        });

        label.on('pointerdown', callback);

        return label;
    }

    createCoffeeButton(x, y) {
        const container = this.add.container(x, y);

        // Background with warm coffee color - narrower width
        const bg = this.add.rectangle(0, 0, 155, 70, 0x8B4513);
        bg.setStrokeStyle(3, 0xFFD700);
        container.add(bg);

        // Coffee cup icon (made of shapes) - moved closer to center
        const cupBody = this.add.rectangle(-48, 5, 28, 32, 0xFFFFFF);
        container.add(cupBody);
        const cupHandle = this.add.rectangle(-30, 5, 8, 14, 0x8B4513);
        cupHandle.setStrokeStyle(3, 0xFFFFFF);
        container.add(cupHandle);
        // Coffee inside
        const coffee = this.add.rectangle(-48, 10, 22, 18, 0x4A2C2A);
        container.add(coffee);
        // Steam (three wavy lines represented as small rectangles)
        const steam1 = this.add.rectangle(-53, -16, 3, 8, 0xFFFFFF, 0.6);
        const steam2 = this.add.rectangle(-48, -18, 3, 10, 0xFFFFFF, 0.6);
        const steam3 = this.add.rectangle(-43, -16, 3, 8, 0xFFFFFF, 0.6);
        container.add(steam1);
        container.add(steam2);
        container.add(steam3);

        // Animate steam
        this.tweens.add({
            targets: [steam1, steam2, steam3],
            y: '-=5',
            alpha: 0,
            duration: 1500,
            ease: 'Sine.easeOut',
            yoyo: true,
            repeat: -1
        });

        // Text - moved closer to cup
        const text = this.add.text(22, -8, 'Buy me a', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#FFD700'
        }).setOrigin(0.5);
        container.add(text);

        const text2 = this.add.text(22, 10, 'COFFEE', {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5);
        container.add(text2);

        // Make interactive
        bg.setInteractive({});

        bg.on('pointerover', () => {
            bg.setFillStyle(0xA0522D);
            this.tweens.add({
                targets: container,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 100
            });
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(0x8B4513);
            this.tweens.add({
                targets: container,
                scaleX: 1,
                scaleY: 1,
                duration: 100
            });
        });

        bg.on('pointerdown', () => {
            window.open('https://www.buymeacoffee.com/masterassassin', '_blank');
        });

        return container;
    }

    createBuyXPButton(x, y) {
        const container = this.add.container(x, y);

        // Background - active gold/amber style
        const bg = this.add.rectangle(0, 0, 160, 60, 0x4a3800);
        bg.setStrokeStyle(3, 0xffd700);
        container.add(bg);

        // Star icon for XP
        const star = this.add.text(-50, 0, '⭐', {
            fontSize: '32px'
        }).setOrigin(0.5);
        container.add(star);

        // Text
        const text = this.add.text(20, -8, 'Buy XP', {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffd700'
        }).setOrigin(0.5);
        container.add(text);

        const text2 = this.add.text(20, 14, 'from $2.99', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffaa00'
        }).setOrigin(0.5);
        container.add(text2);

        // Make interactive
        bg.setInteractive({ useHandCursor: true });

        bg.on('pointerover', () => {
            bg.setFillStyle(0x5a4800);
            bg.setStrokeStyle(3, 0xffee44);
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(0x4a3800);
            bg.setStrokeStyle(3, 0xffd700);
        });

        bg.on('pointerdown', () => {
            if (typeof audioManager !== 'undefined') {
                audioManager.playClick();
            }
            this.showBuyXPDialog();
        });

        return container;
    }

    showBuyXPDialog() {
        const dialog = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);
        dialog.setDepth(1000);

        // Overlay
        const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.9);
        overlay.setInteractive();
        dialog.add(overlay);

        // Panel background
        const panel = this.add.rectangle(0, 0, 420, 400, 0x1a1a2e);
        panel.setStrokeStyle(3, 0xffd700);
        dialog.add(panel);

        // Title
        const title = this.add.text(0, -165, '⭐ BUY XP ⭐', {
            fontSize: '32px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        dialog.add(title);

        // Subtitle
        const subtitle = this.add.text(0, -130, 'Support the game & get XP instantly!', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#aaaaaa'
        }).setOrigin(0.5);
        dialog.add(subtitle);

        // XP packages
        const packages = [
            { xp: 25, price: 299, priceText: '$2.99', color: 0x4a3800 },
            { xp: 50, price: 450, priceText: '$4.50', color: 0x3a4800 },
            { xp: 100, price: 799, priceText: '$7.99', color: 0x48003a, best: true }
        ];

        packages.forEach((pkg, index) => {
            const y = -60 + index * 80;
            this.createXPPackageButton(dialog, 0, y, pkg);
        });

        // Login reminder if not logged in
        if (!supabaseClient.isLoggedIn()) {
            const loginNote = this.add.text(0, 130, '⚠️ Please log in first to purchase XP', {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#ff8888'
            }).setOrigin(0.5);
            dialog.add(loginNote);
        }

        // Close button
        const closeBtn = this.add.container(185, -175);
        const closeBg = this.add.circle(0, 0, 22, 0x442222);
        closeBg.setStrokeStyle(2, 0xff4444);
        closeBg.setInteractive({ useHandCursor: true });
        closeBtn.add(closeBg);

        const closeX = this.add.text(0, 0, '✕', {
            fontSize: '24px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ff6666'
        }).setOrigin(0.5);
        closeBtn.add(closeX);

        closeBg.on('pointerover', () => {
            closeBg.setFillStyle(0x663333);
            closeX.setColor('#ff8888');
        });

        closeBg.on('pointerout', () => {
            closeBg.setFillStyle(0x442222);
            closeX.setColor('#ff6666');
        });

        closeBg.on('pointerdown', () => {
            if (typeof audioManager !== 'undefined') {
                audioManager.playClick();
            }
            dialog.destroy();
        });

        dialog.add(closeBtn);

        // Store reference
        this.buyXPDialog = dialog;
    }

    createXPPackageButton(dialog, x, y, pkg) {
        const container = this.add.container(x, y);

        // Background
        const bg = this.add.rectangle(0, 0, 340, 65, pkg.color);
        bg.setStrokeStyle(2, pkg.best ? 0x88ff88 : 0x666666);
        container.add(bg);

        // Best value badge
        if (pkg.best) {
            const badge = this.add.text(120, -25, 'BEST VALUE', {
                fontSize: '12px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#88ff88',
                backgroundColor: '#1a1a2e',
                padding: { x: 6, y: 2 }
            }).setOrigin(0.5);
            container.add(badge);
        }

        // Star icon
        const star = this.add.text(-130, 0, '⭐', {
            fontSize: '28px'
        }).setOrigin(0.5);
        container.add(star);

        // XP amount
        const xpText = this.add.text(-50, 0, `${pkg.xp} XP`, {
            fontSize: '26px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0, 0.5);
        container.add(xpText);

        // Price
        const priceText = this.add.text(130, 0, pkg.priceText, {
            fontSize: '24px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffd700'
        }).setOrigin(0.5);
        container.add(priceText);

        // Make interactive
        bg.setInteractive({ useHandCursor: true });

        bg.on('pointerover', () => {
            bg.setFillStyle(pkg.color + 0x222222);
            bg.setStrokeStyle(3, 0xffd700);
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(pkg.color);
            bg.setStrokeStyle(2, pkg.best ? 0x88ff88 : 0x666666);
        });

        bg.on('pointerdown', async () => {
            if (typeof audioManager !== 'undefined') {
                audioManager.playClick();
            }

            // Check if logged in
            if (!supabaseClient.isLoggedIn()) {
                this.showNotification('Please log in first to purchase XP', 0xff8888);
                return;
            }

            // Show loading state
            priceText.setText('Loading...');
            bg.disableInteractive();

            // Create checkout session
            const result = await supabaseClient.createCheckoutSession(pkg.xp, pkg.price);

            if (result.success && result.url) {
                // Redirect to Stripe checkout
                window.location.href = result.url;
            } else {
                // Show error
                priceText.setText(pkg.priceText);
                bg.setInteractive({ useHandCursor: true });
                this.showNotification(result.error || 'Payment failed. Please try again.', 0xff8888);
            }
        });

        dialog.add(container);
    }

    showNotification(message, color = 0xffffff) {
        const notification = this.add.container(GAME_WIDTH / 2, 50);
        notification.setDepth(2000);

        const bg = this.add.rectangle(0, 0, 500, 50, 0x000000, 0.9);
        bg.setStrokeStyle(2, color);
        notification.add(bg);

        const text = this.add.text(0, 0, message, {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#' + color.toString(16).padStart(6, '0')
        }).setOrigin(0.5);
        notification.add(text);

        // Animate in and out
        notification.setAlpha(0);
        notification.y = 20;

        this.tweens.add({
            targets: notification,
            alpha: 1,
            y: 50,
            duration: 300,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.time.delayedCall(3000, () => {
                    this.tweens.add({
                        targets: notification,
                        alpha: 0,
                        y: 20,
                        duration: 300,
                        onComplete: () => notification.destroy()
                    });
                });
            }
        });
    }

    showXPPurchaseInfo() {
        const dialog = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

        const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8);
        dialog.add(overlay);

        const title = this.add.text(0, -50, 'Thanks for Supporting!', {
            fontSize: '24px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#44DDFF',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        dialog.add(title);

        const message = this.add.text(0, 0, 'After your $2 donation, click below\nto receive your 25 XP!', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        dialog.add(message);

        // Claim XP button
        const claimText = this.add.text(0, 60, 'CLAIM 25 XP', {
            fontSize: '22px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#44FF44',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        claimText.setInteractive({});
        dialog.add(claimText);

        claimText.on('pointerdown', () => {
            saveSystem.addXP(25);
            dialog.destroy();
            this.scene.restart();
        });

        // Cancel button
        const cancelText = this.add.text(0, 100, 'Cancel', {
            fontSize: '21px',
            fontFamily: 'Arial',
            color: '#888888',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        cancelText.setInteractive({});
        dialog.add(cancelText);

        cancelText.on('pointerdown', () => {
            dialog.destroy();
        });

        dialog.setDepth(1000);
    }

    confirmResetUpgrades() {
        const saveData = saveSystem.load();
        const spentXP = saveSystem.calculateSpentXP(saveData);
        const currentXP = saveData.xp || 0;
        const totalXP = currentXP + spentXP;

        const dialog = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

        const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85);
        overlay.setInteractive(); // Block clicks behind
        dialog.add(overlay);

        // Panel background
        const panel = this.add.rectangle(0, 0, 500, 320, 0x1a1a2e);
        panel.setStrokeStyle(3, 0xffaa00);
        dialog.add(panel);

        const title = this.add.text(0, -120, 'Reset Upgrades?', {
            fontSize: '34px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffaa00',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        dialog.add(title);

        const info = this.add.text(0, -40, `This will reset all upgrades to default.\nYou have ${spentXP} XP in upgrades.\nCost: 2 XP fee\nYou'll get back: ${Math.max(0, spentXP - 2)} XP`, {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 2,
            lineSpacing: 6
        }).setOrigin(0.5);
        dialog.add(info);

        const canReset = totalXP >= 2;

        // 10 second countdown for safety
        let countdown = 10;

        // Reset button (initially disabled with countdown)
        const resetBtnBg = this.add.rectangle(-100, 90, 160, 60, canReset ? 0x553300 : 0x333333);
        resetBtnBg.setStrokeStyle(3, canReset ? 0x886600 : 0x555555);
        dialog.add(resetBtnBg);

        const resetBtnText = this.add.text(-100, 90, canReset ? `RESET (${countdown})` : 'RESET', {
            fontSize: '24px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: canReset ? '#886600' : '#555555'
        }).setOrigin(0.5);
        dialog.add(resetBtnText);

        // Cancel button (always enabled)
        const cancelBtnBg = this.add.rectangle(100, 90, 160, 60, 0x225522);
        cancelBtnBg.setStrokeStyle(3, 0x44aa44);
        cancelBtnBg.setInteractive({ useHandCursor: true });
        dialog.add(cancelBtnBg);

        const cancelBtnText = this.add.text(100, 90, 'CANCEL', {
            fontSize: '24px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#44ff44'
        }).setOrigin(0.5);
        dialog.add(cancelBtnText);

        cancelBtnBg.on('pointerover', () => {
            cancelBtnBg.setFillStyle(0x336633);
        });
        cancelBtnBg.on('pointerout', () => {
            cancelBtnBg.setFillStyle(0x225522);
        });
        cancelBtnBg.on('pointerdown', () => {
            if (this.resetCountdownTimer) {
                this.resetCountdownTimer.remove();
            }
            dialog.destroy();
        });

        if (canReset) {
            // Countdown timer - enable reset button after 10 seconds
            this.resetCountdownTimer = this.time.addEvent({
                delay: 1000,
                repeat: 9,
                callback: () => {
                    countdown--;
                    if (countdown > 0) {
                        resetBtnText.setText(`RESET (${countdown})`);
                    } else {
                        // Enable reset button
                        resetBtnText.setText('RESET');
                        resetBtnText.setColor('#ffaa00');
                        resetBtnBg.setFillStyle(0x664400);
                        resetBtnBg.setStrokeStyle(3, 0xffaa00);
                        resetBtnBg.setInteractive({ useHandCursor: true });

                        resetBtnBg.on('pointerover', () => {
                            resetBtnBg.setFillStyle(0x885500);
                        });
                        resetBtnBg.on('pointerout', () => {
                            resetBtnBg.setFillStyle(0x664400);
                        });
                        resetBtnBg.on('pointerdown', () => {
                            const result = saveSystem.resetUpgrades();
                            if (result.success) {
                                dialog.destroy();
                                this.scene.restart();
                            }
                        });
                    }
                }
            });
        }

        if (!canReset) {
            const warning = this.add.text(0, 140, 'Need at least 2 XP total to reset!', {
                fontSize: '18px',
                fontFamily: 'Arial',
                color: '#ff4444'
            }).setOrigin(0.5);
            dialog.add(warning);
        }

        dialog.setDepth(1000);
    }

    createRankDisplay(x, y, rankInfo) {
        const container = this.add.container(x, y);

        // Prestigious background panel (no border)
        const panelBg = this.add.rectangle(0, 40, 320, 130, 0x1a1a2e, 0.8);
        container.add(panelBg);

        // Rank icon and full name with grade (e.g., "⚔️ Soldier II") - PRESTIGIOUS & LARGE
        const rankText = this.add.text(0, 0, `${rankInfo.rank.icon} ${rankInfo.rank.fullName}`, {
            fontSize: '38px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: rankInfo.rank.color,
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        container.add(rankText);

        // Score display - LARGER
        const scoreText = this.add.text(0, 38, `Score: ${rankInfo.score}`, {
            fontSize: '22px',
            fontFamily: 'Arial',
            color: '#aaaaaa'
        }).setOrigin(0.5);
        container.add(scoreText);

        // Progress bar background - LARGER
        const barWidth = 260;
        const barHeight = 18;
        const barBg = this.add.rectangle(0, 68, barWidth, barHeight, 0x333333);
        barBg.setStrokeStyle(2, 0x555555);
        container.add(barBg);

        // Progress bar fill
        const fillWidth = barWidth * rankInfo.progress;
        if (fillWidth > 0) {
            const barFill = this.add.rectangle(
                -barWidth / 2 + fillWidth / 2,
                68,
                fillWidth,
                barHeight - 2,
                Phaser.Display.Color.HexStringToColor(rankInfo.rank.color).color
            );
            container.add(barFill);
        }

        // Progress text - shows next grade or next rank - LARGER
        if (rankInfo.isMaxGrade) {
            const maxText = this.add.text(0, 95, '⚡ MAX RANK ⚡', {
                fontSize: '20px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#ffd700'
            }).setOrigin(0.5);
            container.add(maxText);
        } else {
            // Determine what's next (next grade or next rank tier)
            const nextLabel = rankInfo.rank.grade < 3
                ? `${rankInfo.rank.name} ${['II', 'III'][rankInfo.rank.grade - 1]}`
                : rankInfo.nextRank.name + ' I';
            const progressText = this.add.text(0, 95, `${rankInfo.pointsToNext} pts to ${nextLabel}`, {
                fontSize: '20px',
                fontFamily: 'Arial',
                color: '#888888'
            }).setOrigin(0.5);
            container.add(progressText);
        }

        return container;
    }

    createSettingsGear(x, y) {
        const container = this.add.container(x, y);

        // Simple Minecraft-like 2D gear - larger for mobile
        // Gear body - simple gray circle
        const gearBody = this.add.circle(0, 0, 20, 0x888888);
        container.add(gearBody);

        // Simple square teeth - 8 teeth, no fancy effects
        for (let i = 0; i < 8; i++) {
            const angle = (i * 45) * Math.PI / 180;
            const toothX = Math.cos(angle) * 22;
            const toothY = Math.sin(angle) * 22;
            const tooth = this.add.rectangle(toothX, toothY, 12, 10, 0x888888);
            tooth.setAngle(i * 45);
            container.add(tooth);
        }

        // Center hole - simple dark circle
        const hole = this.add.circle(0, 0, 7, 0x333333);
        container.add(hole);

        // Larger hit area for touch (48px diameter minimum)
        const hitArea = this.add.circle(0, 0, 35, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });
        container.add(hitArea);

        // Simple hover effect - just brighten
        hitArea.on('pointerover', () => {
            gearBody.setFillStyle(0xaaaaaa);
            container.list.forEach(child => {
                if (child !== hitArea && child !== hole) {
                    if (child.setFillStyle) child.setFillStyle(0xaaaaaa);
                }
            });
        });

        hitArea.on('pointerout', () => {
            gearBody.setFillStyle(0x888888);
            container.list.forEach(child => {
                if (child !== hitArea && child !== hole) {
                    if (child.setFillStyle) child.setFillStyle(0x888888);
                }
            });
        });

        hitArea.on('pointerdown', () => {
            this.showSettingsPanel();
        });

        return container;
    }

    createLoginButton(x, y) {
        const container = this.add.container(x, y);

        // Check if logged in
        const isLoggedIn = supabaseClient && supabaseClient.isLoggedIn();

        // Background circle - larger for mobile
        const bg = this.add.circle(0, 0, 28, isLoggedIn ? 0x4ade80 : 0x4a4a8e);
        container.add(bg);

        // User icon - larger
        const icon = this.add.text(0, 0, isLoggedIn ? '👤' : '🔑', {
            fontSize: '26px'
        }).setOrigin(0.5);
        container.add(icon);

        // Status indicator if logged in
        if (isLoggedIn) {
            const statusDot = this.add.circle(18, -18, 7, 0x4ade80);
            statusDot.setStrokeStyle(2, 0xffffff);
            container.add(statusDot);
        }

        // Label below - short text only, name shown in profile dialog
        const labelText = isLoggedIn ? 'Profile' : 'Login';
        const label = this.add.text(0, 42, labelText, {
            fontSize: '16px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: isLoggedIn ? '#4ade80' : '#888888'
        }).setOrigin(0.5);
        container.add(label);

        // Larger hit area for touch (48px+ diameter)
        const hitArea = this.add.circle(0, 0, 38, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });
        container.add(hitArea);

        // Hover effects
        hitArea.on('pointerover', () => {
            bg.setFillStyle(isLoggedIn ? 0x6be88a : 0x6a6aae);
            label.setColor('#ffffff');
        });

        hitArea.on('pointerout', () => {
            bg.setFillStyle(isLoggedIn ? 0x4ade80 : 0x4a4a8e);
            label.setColor(isLoggedIn ? '#4ade80' : '#888888');
        });

        hitArea.on('pointerdown', () => {
            if (typeof audioManager !== 'undefined') {
                audioManager.playClick();
            }
            this.scene.start('AuthScene');
        });

        return container;
    }

    createBattlefieldDisplay() {
        // All enemy creation functions (same as in-game)
        const enemyTypes = [
            (x, y, s) => this.createMenuGoblin(x, y, s),
            (x, y, s) => this.createMenuOrc(x, y, s),
            (x, y, s) => this.createMenuSkeleton(x, y, s),
            (x, y, s) => this.createMenuTroll(x, y, s),
            (x, y, s) => this.createMenuSkeletonArcher(x, y, s),
            (x, y, s) => this.createMenuDarkKnight(x, y, s),
            (x, y, s) => this.createMenuDemon(x, y, s),
            (x, y, s) => this.createMenuSpearMonster(x, y, s)
        ];

        // All unit creation functions - base AND elite versions!
        const unitTypes = [
            (x, y, s) => this.createMenuPeasant(x, y, s, true),
            (x, y, s) => this.createMenuArcher(x, y, s, true),
            (x, y, s) => this.createMenuHorseman(x, y, s, true),
            (x, y, s) => this.createMenuKnight(x, y, s, true),
            (x, y, s) => this.createMenuRobinhood(x, y, s, true),
            (x, y, s) => this.createMenuLancelot(x, y, s, true)
        ];

        // Shuffle and pick unique enemies (4 per side, staggered, above buttons)
        const shuffledEnemies = Phaser.Utils.Array.Shuffle([...enemyTypes]);
        const enemyCount = 4;
        // More spacing, closer to middle horizontally
        const enemyPositions = [
            { x: 100, y: 175 },
            { x: 180, y: 270 },
            { x: 90, y: 365 },
            { x: 200, y: 460 }
        ];
        for (let i = 0; i < enemyCount; i++) {
            const pos = enemyPositions[i];
            const scale = Phaser.Math.FloatBetween(1.2, 1.4);
            shuffledEnemies[i](pos.x, pos.y, scale);
        }

        // Shuffle and pick unique units (6 types - base + elite, show 5)
        const shuffledUnits = Phaser.Utils.Array.Shuffle([...unitTypes]);
        const unitCount = 5;
        // More spacing to show variety
        const unitPositions = [
            { x: GAME_WIDTH - 160, y: 175 },
            { x: GAME_WIDTH - 90, y: 260 },
            { x: GAME_WIDTH - 180, y: 340 },
            { x: GAME_WIDTH - 100, y: 420 },
            { x: GAME_WIDTH - 190, y: 500 }
        ];
        for (let i = 0; i < unitCount; i++) {
            const pos = unitPositions[i];
            const scale = Phaser.Math.FloatBetween(1.1, 1.3);
            shuffledUnits[i](pos.x, pos.y, scale);
        }
    }

    // Menu enemy sprites (exact copy from Enemy.js, static version)
    createMenuGoblin(x, y, scale) {
        const container = this.add.container(x, y);
        container.setScale(scale);

        // Shadow
        container.add(this.add.rectangle(0, 28, 20, 5, 0x000000, 0.2));
        // Legs
        container.add(this.add.rectangle(-5, 20, 8, 14, 0x44BB44));
        container.add(this.add.rectangle(-6, 26, 10, 5, 0x33AA33));
        container.add(this.add.rectangle(5, 20, 8, 14, 0x44BB44));
        container.add(this.add.rectangle(6, 26, 10, 5, 0x33AA33));
        // Body
        container.add(this.add.rectangle(0, 6, 18, 18, 0x55DD55));
        container.add(this.add.rectangle(0, 8, 14, 12, 0x66EE66));
        container.add(this.add.rectangle(-6, 6, 4, 14, 0x44BB44));
        container.add(this.add.rectangle(0, 6, 16, 14, 0x8B5A33, 0.7)); // vest
        // Arms
        container.add(this.add.rectangle(-12, 4, 6, 12, 0x55DD55));
        container.add(this.add.rectangle(12, 4, 6, 12, 0x55DD55));
        // Head
        container.add(this.add.rectangle(0, -14, 24, 22, 0x55DD55));
        container.add(this.add.rectangle(0, -12, 20, 16, 0x66EE66));
        // Ears
        container.add(this.add.rectangle(-16, -14, 10, 14, 0x55DD55));
        container.add(this.add.rectangle(-20, -20, 8, 10, 0x66EE66));
        container.add(this.add.rectangle(-22, -26, 6, 8, 0x77FF77));
        container.add(this.add.rectangle(16, -14, 10, 14, 0x55DD55));
        container.add(this.add.rectangle(20, -20, 8, 10, 0x66EE66));
        container.add(this.add.rectangle(22, -26, 6, 8, 0x77FF77));
        // Eyes
        container.add(this.add.rectangle(-6, -16, 10, 12, 0xFFFF44));
        container.add(this.add.rectangle(6, -16, 10, 12, 0xFFFF44));
        container.add(this.add.rectangle(-5, -15, 5, 8, 0x000000));
        container.add(this.add.rectangle(7, -15, 5, 8, 0x000000));
        // Nose
        container.add(this.add.rectangle(0, -8, 8, 8, 0x44BB44));
        // Mouth
        container.add(this.add.rectangle(0, -1, 12, 6, 0x226622));
        container.add(this.add.rectangle(-4, -2, 3, 4, 0xFFFFFF));
        container.add(this.add.rectangle(4, -2, 3, 4, 0xFFFFFF));
        // Dagger
        container.add(this.add.rectangle(-18, 4, 5, 20, 0xAAAAAA));
        container.add(this.add.rectangle(-18, 14, 10, 4, 0x8B5A33));

        return container;
    }

    createMenuOrc(x, y, scale) {
        const container = this.add.container(x, y);
        container.setScale(scale);

        // Shadow
        container.add(this.add.rectangle(0, 40, 32, 6, 0x000000, 0.2));
        // Legs
        container.add(this.add.rectangle(-8, 28, 12, 18, 0x6B8844));
        container.add(this.add.rectangle(-9, 38, 14, 6, 0x5A7733));
        container.add(this.add.rectangle(8, 28, 12, 18, 0x6B8844));
        container.add(this.add.rectangle(9, 38, 14, 6, 0x5A7733));
        // Body
        container.add(this.add.rectangle(0, 6, 30, 32, 0x7B9955));
        container.add(this.add.rectangle(0, 8, 26, 26, 0x8BAA66));
        container.add(this.add.rectangle(-12, 6, 5, 28, 0x5A7733));
        container.add(this.add.rectangle(-6, 2, 10, 10, 0x9BBB77));
        container.add(this.add.rectangle(6, 2, 10, 10, 0x9BBB77));
        // Arms
        container.add(this.add.rectangle(-20, 4, 12, 22, 0x7B9955));
        container.add(this.add.rectangle(-18, 4, 6, 18, 0x8BAA66));
        container.add(this.add.rectangle(-20, 18, 14, 10, 0x8BAA66));
        container.add(this.add.rectangle(20, 4, 12, 22, 0x7B9955));
        container.add(this.add.rectangle(20, 18, 14, 10, 0x8BAA66));
        // Head
        container.add(this.add.rectangle(0, -20, 28, 26, 0x7B9955));
        container.add(this.add.rectangle(0, -18, 24, 20, 0x8BAA66));
        container.add(this.add.rectangle(0, -8, 22, 12, 0x6B8844));
        // Tusks
        container.add(this.add.rectangle(-8, -2, 5, 12, 0xFFFFEE));
        container.add(this.add.rectangle(8, -2, 5, 12, 0xFFFFEE));
        // Eyes
        container.add(this.add.rectangle(-7, -22, 10, 8, 0xFF4444));
        container.add(this.add.rectangle(7, -22, 10, 8, 0xFF4444));
        container.add(this.add.rectangle(-7, -28, 12, 4, 0x4A5533));
        container.add(this.add.rectangle(7, -28, 12, 4, 0x4A5533));
        // Axe
        container.add(this.add.rectangle(-28, 2, 6, 46, 0x8B5A33));
        container.add(this.add.rectangle(-38, -22, 18, 22, 0x777777));
        container.add(this.add.rectangle(-36, -20, 14, 18, 0x999999));

        return container;
    }

    createMenuSkeleton(x, y, scale) {
        const container = this.add.container(x, y);
        container.setScale(scale);

        // Shadow
        container.add(this.add.rectangle(0, 38, 18, 5, 0x000000, 0.2));
        // Legs
        container.add(this.add.rectangle(-4, 26, 6, 20, 0xFFFFFF));
        container.add(this.add.rectangle(4, 26, 6, 20, 0xFFFFFF));
        container.add(this.add.rectangle(-5, 36, 8, 4, 0xEEEEEE));
        container.add(this.add.rectangle(5, 36, 8, 4, 0xEEEEEE));
        // Ribcage
        container.add(this.add.rectangle(0, 8, 18, 22, 0xFFFFFF));
        container.add(this.add.rectangle(0, 2, 16, 4, 0xDDDDDD));
        container.add(this.add.rectangle(0, 8, 14, 4, 0xDDDDDD));
        container.add(this.add.rectangle(0, 14, 12, 4, 0xDDDDDD));
        container.add(this.add.rectangle(0, 10, 4, 24, 0xCCCCCC));
        // Arms
        container.add(this.add.rectangle(-12, 6, 6, 18, 0xFFFFFF));
        container.add(this.add.rectangle(12, 6, 6, 18, 0xFFFFFF));
        // Skull
        container.add(this.add.rectangle(0, -14, 24, 22, 0xFFFFFF));
        container.add(this.add.rectangle(0, -12, 20, 16, 0xF8F8F8));
        container.add(this.add.rectangle(-6, -16, 10, 10, 0x222222));
        container.add(this.add.rectangle(6, -16, 10, 10, 0x222222));
        container.add(this.add.rectangle(-5, -15, 6, 6, 0xFF3333));
        container.add(this.add.rectangle(7, -15, 6, 6, 0xFF3333));
        container.add(this.add.rectangle(0, -8, 6, 6, 0x333333));
        container.add(this.add.rectangle(0, -2, 14, 6, 0x222222));
        container.add(this.add.rectangle(-5, -2, 3, 4, 0xFFFFFF));
        container.add(this.add.rectangle(0, -2, 3, 4, 0xFFFFFF));
        container.add(this.add.rectangle(5, -2, 3, 4, 0xFFFFFF));
        // Sword
        container.add(this.add.rectangle(-18, 0, 5, 28, 0x998866));
        container.add(this.add.rectangle(-18, 14, 10, 4, 0x6B4423));

        return container;
    }

    createMenuTroll(x, y, scale) {
        const container = this.add.container(x, y);
        container.setScale(scale);
        const s = 1.3;

        // Shadow
        container.add(this.add.rectangle(0, 46 * s, 36 * s, 8, 0x000000, 0.2));
        // Legs
        container.add(this.add.rectangle(-10 * s, 34 * s, 14 * s, 20 * s, 0x558866));
        container.add(this.add.rectangle(10 * s, 34 * s, 14 * s, 20 * s, 0x558866));
        container.add(this.add.rectangle(-11 * s, 46 * s, 18 * s, 8 * s, 0x447755));
        container.add(this.add.rectangle(11 * s, 46 * s, 18 * s, 8 * s, 0x447755));
        // Body
        container.add(this.add.rectangle(0, 10 * s, 34 * s, 38 * s, 0x669977));
        container.add(this.add.rectangle(0, 12 * s, 30 * s, 32 * s, 0x77AA88));
        container.add(this.add.rectangle(0, 16 * s, 28 * s, 26 * s, 0x88BB99));
        // Arms
        container.add(this.add.rectangle(-24 * s, 10 * s, 14 * s, 30 * s, 0x669977));
        container.add(this.add.rectangle(24 * s, 10 * s, 14 * s, 30 * s, 0x669977));
        container.add(this.add.rectangle(-24 * s, 28 * s, 16 * s, 12 * s, 0x77AA88));
        container.add(this.add.rectangle(24 * s, 28 * s, 16 * s, 12 * s, 0x77AA88));
        // Head
        container.add(this.add.rectangle(0, -18 * s, 30 * s, 26 * s, 0x669977));
        container.add(this.add.rectangle(0, -16 * s, 26 * s, 20 * s, 0x77AA88));
        // Warts
        container.add(this.add.rectangle(-10 * s, -26 * s, 6 * s, 6 * s, 0x88BB99));
        container.add(this.add.rectangle(12 * s, -16 * s, 5 * s, 5 * s, 0x88BB99));
        // Eyes
        container.add(this.add.rectangle(-8 * s, -20 * s, 10 * s, 10 * s, 0xFFFF66));
        container.add(this.add.rectangle(8 * s, -20 * s, 10 * s, 10 * s, 0xFFFF66));
        container.add(this.add.rectangle(-7 * s, -19 * s, 5 * s, 6 * s, 0x000000));
        container.add(this.add.rectangle(9 * s, -19 * s, 5 * s, 6 * s, 0x000000));
        // Nose
        container.add(this.add.rectangle(0, -10 * s, 14 * s, 12 * s, 0x558866));
        container.add(this.add.rectangle(-3 * s, -6 * s, 4 * s, 4 * s, 0x336644));
        container.add(this.add.rectangle(3 * s, -6 * s, 4 * s, 4 * s, 0x336644));
        // Mouth
        container.add(this.add.rectangle(0, -2 * s, 16 * s, 8 * s, 0x336644));
        container.add(this.add.rectangle(-5 * s, -4 * s, 4 * s, 5 * s, 0xFFFFEE));
        container.add(this.add.rectangle(5 * s, -4 * s, 4 * s, 5 * s, 0xFFFFEE));
        // Club
        container.add(this.add.rectangle(-30 * s, 24 * s, 8 * s, 38 * s, 0x8B6633));
        container.add(this.add.rectangle(-30 * s, 48 * s, 18 * s, 20 * s, 0x6B5533));

        return container;
    }

    createMenuSkeletonArcher(x, y, scale) {
        const container = this.add.container(x, y);
        container.setScale(scale);

        // Shadow
        container.add(this.add.rectangle(0, 34, 16, 5, 0x000000, 0.2));
        // Legs
        container.add(this.add.rectangle(-3, 22, 5, 18, 0xEEEEEE));
        container.add(this.add.rectangle(3, 22, 5, 18, 0xEEEEEE));
        container.add(this.add.rectangle(-4, 32, 7, 4, 0xDDDDDD));
        container.add(this.add.rectangle(4, 32, 7, 4, 0xDDDDDD));
        // Ribcage
        container.add(this.add.rectangle(0, 6, 16, 18, 0xEEEEEE));
        container.add(this.add.rectangle(0, 4, 14, 4, 0xDDDDDD));
        container.add(this.add.rectangle(0, 10, 12, 4, 0xDDDDDD));
        // Hood and cloak
        container.add(this.add.rectangle(0, 4, 20, 20, 0x333344));
        container.add(this.add.rectangle(0, 2, 18, 16, 0x444455));
        container.add(this.add.rectangle(0, -8, 24, 18, 0x333344));
        container.add(this.add.rectangle(0, -14, 22, 14, 0x444455));
        container.add(this.add.rectangle(0, -20, 18, 10, 0x555566));
        // Skull
        container.add(this.add.rectangle(0, -10, 18, 16, 0xEEEEEE));
        container.add(this.add.rectangle(0, -8, 14, 12, 0xFFFFFF));
        // Eyes
        container.add(this.add.rectangle(-5, -12, 8, 8, 0x111111));
        container.add(this.add.rectangle(5, -12, 8, 8, 0x111111));
        container.add(this.add.rectangle(-4, -11, 5, 5, 0x44FF44));
        container.add(this.add.rectangle(6, -11, 5, 5, 0x44FF44));
        // Bow
        container.add(this.add.rectangle(-18, -14, 5, 10, 0x554433));
        container.add(this.add.rectangle(-20, -6, 5, 8, 0x665544));
        container.add(this.add.rectangle(-18, 2, 5, 10, 0x554433));
        container.add(this.add.rectangle(-20, 10, 5, 8, 0x665544));
        container.add(this.add.rectangle(-18, 18, 5, 10, 0x554433));
        container.add(this.add.rectangle(-14, 2, 2, 36, 0x888888));

        return container;
    }

    createMenuDarkKnight(x, y, scale) {
        const container = this.add.container(x, y);
        container.setScale(scale);

        // Shadow
        container.add(this.add.rectangle(0, 40, 30, 6, 0x000000, 0.2));
        // Cape
        container.add(this.add.rectangle(0, 22, 34, 36, 0x660022));
        container.add(this.add.rectangle(0, 24, 30, 30, 0x880033));
        // Legs
        container.add(this.add.rectangle(-6, 26, 10, 18, 0x333344));
        container.add(this.add.rectangle(6, 26, 10, 18, 0x333344));
        container.add(this.add.rectangle(-7, 36, 12, 6, 0x222233));
        container.add(this.add.rectangle(7, 36, 12, 6, 0x222233));
        // Body
        container.add(this.add.rectangle(0, 6, 26, 28, 0x333344));
        container.add(this.add.rectangle(0, 8, 22, 22, 0x444455));
        container.add(this.add.rectangle(0, 4, 12, 12, 0xAA0022));
        container.add(this.add.rectangle(0, 4, 8, 8, 0xCC0033));
        // Arms
        container.add(this.add.rectangle(-16, 6, 8, 18, 0x333344));
        container.add(this.add.rectangle(16, 6, 8, 18, 0x333344));
        // Helmet
        container.add(this.add.rectangle(0, -18, 24, 22, 0x333344));
        container.add(this.add.rectangle(0, -16, 20, 18, 0x444455));
        container.add(this.add.rectangle(0, -16, 18, 8, 0x111122));
        container.add(this.add.rectangle(-5, -16, 8, 5, 0xFF2222));
        container.add(this.add.rectangle(5, -16, 8, 5, 0xFF2222));
        // Horns
        container.add(this.add.rectangle(-12, -28, 6, 12, 0x333344));
        container.add(this.add.rectangle(-12, -36, 5, 10, 0x444455));
        container.add(this.add.rectangle(-12, -42, 4, 8, 0x555566));
        container.add(this.add.rectangle(12, -28, 6, 12, 0x333344));
        container.add(this.add.rectangle(12, -36, 5, 10, 0x444455));
        container.add(this.add.rectangle(12, -42, 4, 8, 0x555566));
        // Sword
        container.add(this.add.rectangle(-22, -4, 6, 36, 0x444466));
        container.add(this.add.rectangle(-22, -20, 8, 4, 0xFF0044));
        container.add(this.add.rectangle(-22, 16, 16, 6, 0x333344));

        return container;
    }

    createMenuDemon(x, y, scale) {
        const container = this.add.container(x, y);
        container.setScale(scale);
        const s = 1.2;

        // Shadow
        container.add(this.add.rectangle(0, 42 * s, 40 * s, 8, 0x000000, 0.2));
        // Wings
        container.add(this.add.rectangle(-32 * s, -8 * s, 14 * s, 28 * s, 0xAA2244));
        container.add(this.add.rectangle(-42 * s, -16 * s, 12 * s, 22 * s, 0xBB3355));
        container.add(this.add.rectangle(-50 * s, -24 * s, 10 * s, 18 * s, 0xCC4466));
        container.add(this.add.rectangle(32 * s, -8 * s, 14 * s, 28 * s, 0xAA2244));
        container.add(this.add.rectangle(42 * s, -16 * s, 12 * s, 22 * s, 0xBB3355));
        container.add(this.add.rectangle(50 * s, -24 * s, 10 * s, 18 * s, 0xCC4466));
        // Tail
        container.add(this.add.rectangle(14 * s, 28 * s, 18 * s, 8 * s, 0xBB3344));
        container.add(this.add.rectangle(26 * s, 26 * s, 14 * s, 7 * s, 0xCC4455));
        container.add(this.add.rectangle(36 * s, 24 * s, 12 * s, 8 * s, 0x661122));
        // Legs
        container.add(this.add.rectangle(-8 * s, 30 * s, 12 * s, 18 * s, 0xBB3344));
        container.add(this.add.rectangle(8 * s, 30 * s, 12 * s, 18 * s, 0xBB3344));
        container.add(this.add.rectangle(-9 * s, 40 * s, 14 * s, 6 * s, 0x441122));
        container.add(this.add.rectangle(9 * s, 40 * s, 14 * s, 6 * s, 0x441122));
        // Body
        container.add(this.add.rectangle(0, 6 * s, 30 * s, 34 * s, 0xCC3344));
        container.add(this.add.rectangle(0, 8 * s, 26 * s, 28 * s, 0xDD4455));
        container.add(this.add.rectangle(-5 * s, 4 * s, 10 * s, 10 * s, 0xEE5566));
        container.add(this.add.rectangle(5 * s, 4 * s, 10 * s, 10 * s, 0xEE5566));
        // Arms
        container.add(this.add.rectangle(-20 * s, 6 * s, 12 * s, 24 * s, 0xCC3344));
        container.add(this.add.rectangle(20 * s, 6 * s, 12 * s, 24 * s, 0xCC3344));
        container.add(this.add.rectangle(-22 * s, 22 * s, 10 * s, 8 * s, 0xDD4455));
        container.add(this.add.rectangle(22 * s, 22 * s, 10 * s, 8 * s, 0xDD4455));
        // Head
        container.add(this.add.rectangle(0, -18 * s, 28 * s, 26 * s, 0xCC3344));
        container.add(this.add.rectangle(0, -16 * s, 24 * s, 20 * s, 0xDD4455));
        // Horns
        container.add(this.add.rectangle(-12 * s, -32 * s, 8 * s, 14 * s, 0x441122));
        container.add(this.add.rectangle(-14 * s, -42 * s, 7 * s, 12 * s, 0x552233));
        container.add(this.add.rectangle(-16 * s, -50 * s, 6 * s, 10 * s, 0x663344));
        container.add(this.add.rectangle(12 * s, -32 * s, 8 * s, 14 * s, 0x441122));
        container.add(this.add.rectangle(14 * s, -42 * s, 7 * s, 12 * s, 0x552233));
        container.add(this.add.rectangle(16 * s, -50 * s, 6 * s, 10 * s, 0x663344));
        // Eyes
        container.add(this.add.rectangle(-7 * s, -20 * s, 10 * s, 10 * s, 0xFFFF44));
        container.add(this.add.rectangle(7 * s, -20 * s, 10 * s, 10 * s, 0xFFFF44));
        container.add(this.add.rectangle(-6 * s, -19 * s, 5 * s, 7 * s, 0x000000));
        container.add(this.add.rectangle(8 * s, -19 * s, 5 * s, 7 * s, 0x000000));
        // Mouth
        container.add(this.add.rectangle(0, -8 * s, 16 * s, 8 * s, 0x661122));
        container.add(this.add.rectangle(-6 * s, -6 * s, 4 * s, 8 * s, 0xFFFFFF));
        container.add(this.add.rectangle(6 * s, -6 * s, 4 * s, 8 * s, 0xFFFFFF));

        return container;
    }

    createMenuSpearMonster(x, y, scale) {
        const container = this.add.container(x, y);
        container.setScale(scale);

        // Shadow
        container.add(this.add.rectangle(0, 38, 28, 6, 0x000000, 0.2));
        // Legs
        container.add(this.add.rectangle(-7, 26, 10, 16, 0x8B6B4A));
        container.add(this.add.rectangle(-8, 34, 12, 6, 0x7A5A3A));
        container.add(this.add.rectangle(7, 26, 10, 16, 0x8B6B4A));
        container.add(this.add.rectangle(8, 34, 12, 6, 0x7A5A3A));
        // Body
        container.add(this.add.rectangle(0, 6, 26, 28, 0x9B7B5A));
        container.add(this.add.rectangle(0, 8, 22, 22, 0xAB8B6A));
        container.add(this.add.rectangle(0, 2, 4, 18, 0xFF4444));
        container.add(this.add.rectangle(-6, 6, 3, 8, 0xFF4444));
        container.add(this.add.rectangle(6, 6, 3, 8, 0xFF4444));
        // Arms
        container.add(this.add.rectangle(-16, 4, 10, 20, 0x9B7B5A));
        container.add(this.add.rectangle(-16, 16, 12, 8, 0xAB8B6A));
        container.add(this.add.rectangle(16, 4, 10, 20, 0x9B7B5A));
        container.add(this.add.rectangle(16, 16, 12, 8, 0xAB8B6A));
        // Head
        container.add(this.add.rectangle(0, -16, 24, 22, 0x9B7B5A));
        container.add(this.add.rectangle(0, -14, 20, 16, 0xAB8B6A));
        container.add(this.add.rectangle(-8, -14, 6, 3, 0xFF4444));
        container.add(this.add.rectangle(8, -14, 6, 3, 0xFF4444));
        container.add(this.add.rectangle(0, -8, 8, 3, 0xFF4444));
        // Eyes
        container.add(this.add.rectangle(-6, -18, 8, 8, 0xFFFFFF));
        container.add(this.add.rectangle(6, -18, 8, 8, 0xFFFFFF));
        container.add(this.add.rectangle(-5, -17, 4, 5, 0x000000));
        container.add(this.add.rectangle(7, -17, 4, 5, 0x000000));
        container.add(this.add.rectangle(-6, -24, 10, 4, 0x5A4A3A));
        container.add(this.add.rectangle(6, -24, 10, 4, 0x5A4A3A));
        // Feather headdress
        container.add(this.add.rectangle(-6, -30, 4, 12, 0xFF6644));
        container.add(this.add.rectangle(-6, -38, 3, 10, 0xFF8866));
        container.add(this.add.rectangle(0, -32, 4, 14, 0xFFAA44));
        container.add(this.add.rectangle(0, -42, 3, 12, 0xFFCC66));
        container.add(this.add.rectangle(6, -30, 4, 12, 0xFF6644));
        container.add(this.add.rectangle(6, -38, 3, 10, 0xFF8866));
        // Spear
        container.add(this.add.rectangle(-24, 8, 6, 56, 0x8B5A33));
        container.add(this.add.rectangle(-24, -26, 12, 24, 0x666666));
        container.add(this.add.rectangle(-24, -34, 6, 12, 0x999999));
        container.add(this.add.rectangle(-24, -38, 4, 6, 0xAAAAAA));

        return container;
    }

    // Menu player unit sprites (exact copy from Unit.js, static version)
    createMenuPeasant(x, y, scale, flipX = false) {
        const container = this.add.container(x, y);
        container.setScale(flipX ? -scale : scale, scale);

        // Shadow
        container.add(this.add.rectangle(0, 30, 24, 6, 0x000000, 0.2));
        // Legs
        container.add(this.add.rectangle(-6, 22, 10, 14, 0x6B4423));
        container.add(this.add.rectangle(-7, 28, 12, 6, 0x4A3020));
        container.add(this.add.rectangle(6, 22, 10, 14, 0x6B4423));
        container.add(this.add.rectangle(7, 28, 12, 6, 0x4A3020));
        // Body
        container.add(this.add.rectangle(0, 6, 22, 22, 0xE8C87A));
        container.add(this.add.rectangle(0, 8, 18, 16, 0xF5D88A));
        container.add(this.add.rectangle(-8, 6, 4, 18, 0xD4B060));
        container.add(this.add.rectangle(0, 14, 24, 5, 0x8B5A2B));
        container.add(this.add.rectangle(0, 14, 6, 6, 0xFFD700));
        // Arms
        container.add(this.add.rectangle(-14, 4, 8, 14, 0xFFCBA4));
        container.add(this.add.rectangle(-14, 12, 10, 8, 0xFFDDBB));
        container.add(this.add.rectangle(14, 4, 8, 14, 0xFFCBA4));
        container.add(this.add.rectangle(14, 12, 10, 8, 0xFFDDBB));
        // Head
        container.add(this.add.rectangle(0, -14, 26, 24, 0xFFCBA4));
        container.add(this.add.rectangle(0, -12, 22, 18, 0xFFDDBB));
        container.add(this.add.rectangle(-10, -14, 4, 20, 0xE8B090));
        // Hair
        container.add(this.add.rectangle(0, -26, 28, 10, 0x8B6914));
        container.add(this.add.rectangle(-8, -24, 8, 8, 0x8B6914));
        container.add(this.add.rectangle(8, -24, 8, 8, 0x8B6914));
        // Eyes
        container.add(this.add.rectangle(-6, -14, 10, 12, 0xFFFFFF));
        container.add(this.add.rectangle(6, -14, 10, 12, 0xFFFFFF));
        container.add(this.add.rectangle(-5, -13, 6, 8, 0x4A3020));
        container.add(this.add.rectangle(7, -13, 6, 8, 0x4A3020));
        // Mouth
        container.add(this.add.rectangle(0, -4, 8, 4, 0xE08080));
        // Cheeks
        container.add(this.add.rectangle(-10, -8, 6, 4, 0xFFAAAA, 0.5));
        container.add(this.add.rectangle(10, -8, 6, 4, 0xFFAAAA, 0.5));
        // Pitchfork
        container.add(this.add.rectangle(20, 0, 5, 36, 0xC49A4A));
        container.add(this.add.rectangle(20, -18, 4, 10, 0x88AACC));
        container.add(this.add.rectangle(14, -16, 4, 8, 0x88AACC));
        container.add(this.add.rectangle(26, -16, 4, 8, 0x88AACC));
        container.add(this.add.rectangle(20, -12, 16, 4, 0x99BBDD));

        return container;
    }

    createMenuArcher(x, y, scale, flipX = false) {
        const container = this.add.container(x, y);
        container.setScale(flipX ? -scale : scale, scale);

        // Shadow
        container.add(this.add.rectangle(0, 28, 22, 5, 0x000000, 0.2));
        // Legs
        container.add(this.add.rectangle(-5, 20, 8, 14, 0x2E5A2E));
        container.add(this.add.rectangle(5, 20, 8, 14, 0x2E5A2E));
        container.add(this.add.rectangle(-6, 26, 10, 6, 0x5A3A20));
        container.add(this.add.rectangle(6, 26, 10, 6, 0x5A3A20));
        // Body
        container.add(this.add.rectangle(0, 4, 18, 20, 0x3CB043));
        container.add(this.add.rectangle(0, 6, 14, 14, 0x4CC053));
        container.add(this.add.rectangle(-6, 4, 4, 16, 0x2A9030));
        container.add(this.add.rectangle(0, 12, 20, 4, 0x6B4423));
        // Arms
        container.add(this.add.rectangle(-12, 2, 6, 12, 0xFFCBA4));
        container.add(this.add.rectangle(12, 2, 6, 12, 0xFFCBA4));
        // Hood
        container.add(this.add.rectangle(0, -4, 22, 14, 0x228B22));
        container.add(this.add.rectangle(0, -10, 20, 10, 0x228B22));
        container.add(this.add.rectangle(0, -16, 16, 8, 0x2A9B32));
        container.add(this.add.rectangle(0, -20, 10, 6, 0x2A9B32));
        // Face
        container.add(this.add.rectangle(0, -6, 16, 14, 0xFFCBA4));
        container.add(this.add.rectangle(0, -5, 14, 10, 0xFFDDBB));
        // Eyes
        container.add(this.add.rectangle(-4, -8, 8, 8, 0xFFFFFF));
        container.add(this.add.rectangle(4, -8, 8, 8, 0xFFFFFF));
        container.add(this.add.rectangle(-3, -7, 5, 6, 0x228B22));
        container.add(this.add.rectangle(5, -7, 5, 6, 0x228B22));
        // Smirk
        container.add(this.add.rectangle(2, -1, 6, 2, 0xCC8888));
        // Bow
        container.add(this.add.rectangle(18, -12, 5, 8, 0x8B5A33));
        container.add(this.add.rectangle(20, -6, 5, 6, 0x9B6A43));
        container.add(this.add.rectangle(22, 0, 5, 8, 0x9B6A43));
        container.add(this.add.rectangle(20, 6, 5, 6, 0x9B6A43));
        container.add(this.add.rectangle(18, 12, 5, 8, 0x8B5A33));
        container.add(this.add.rectangle(16, 0, 2, 28, 0xDDDDDD));
        // Quiver
        container.add(this.add.rectangle(-14, 2, 8, 20, 0x6B4423));
        container.add(this.add.rectangle(-14, -10, 3, 6, 0xFF6666));
        container.add(this.add.rectangle(-12, -10, 3, 6, 0x66FF66));

        return container;
    }

    createMenuHorseman(x, y, scale, flipX = false) {
        const container = this.add.container(x, y);
        container.setScale(flipX ? -scale : scale, scale);

        // Shadow (larger for horse)
        container.add(this.add.rectangle(0, 36, 40, 8, 0x000000, 0.2));
        // Horse legs
        container.add(this.add.rectangle(-10, 30, 6, 16, 0x6B3503));
        container.add(this.add.rectangle(10, 30, 6, 16, 0x6B3503));
        // Horse body
        container.add(this.add.rectangle(0, 14, 36, 18, 0x8B4513));
        container.add(this.add.rectangle(0, 12, 32, 14, 0x9B5523));
        // Horse tail (LEFT side - horse faces right)
        container.add(this.add.rectangle(-20, 18, 8, 12, 0x3B2503));
        // Horse head and neck (RIGHT side - facing toward enemies)
        container.add(this.add.rectangle(20, 8, 10, 16, 0x8B4513));  // neck
        container.add(this.add.rectangle(26, 4, 14, 12, 0x9B5523));  // head
        container.add(this.add.rectangle(30, 2, 6, 6, 0x8B4513));    // snout
        container.add(this.add.rectangle(24, -2, 4, 6, 0x7B3503));   // ear
        container.add(this.add.rectangle(28, 4, 3, 3, 0x000000));    // eye
        // Rider torso
        container.add(this.add.rectangle(0, -6, 16, 18, 0x4169E1));
        container.add(this.add.rectangle(0, -4, 12, 14, 0x5179F1));
        // Rider head
        container.add(this.add.rectangle(0, -20, 14, 14, 0xFFCBA4));
        container.add(this.add.rectangle(0, -26, 16, 10, 0x708090));
        container.add(this.add.rectangle(-3, -20, 4, 4, 0x000000));
        container.add(this.add.rectangle(3, -20, 4, 4, 0x000000));
        // Sword (raised and ready!)
        container.add(this.add.rectangle(16, -16, 5, 24, 0xC0C0C0));    // blade
        container.add(this.add.rectangle(17, -16, 2, 20, 0xE0E0E0));   // shine
        container.add(this.add.rectangle(16, -30, 4, 6, 0xD0D0D0));    // tip
        container.add(this.add.rectangle(16, -3, 12, 4, 0xFFD700));    // crossguard
        container.add(this.add.rectangle(16, 3, 4, 8, 0x8B4513));      // handle

        return container;
    }

    // ELITE UNIT SPRITES (Gold tier versions)
    createMenuKnight(x, y, scale, flipX = false) {
        const container = this.add.container(x, y);
        container.setScale(flipX ? -scale : scale, scale);

        // Shadow
        container.add(this.add.rectangle(0, 32, 28, 6, 0x000000, 0.2));
        // Legs - blue armor
        container.add(this.add.rectangle(-6, 22, 10, 16, 0x5080C0));
        container.add(this.add.rectangle(-6, 22, 6, 12, 0x60A0E0)); // highlight
        container.add(this.add.rectangle(-7, 30, 12, 6, 0x4070B0)); // boot
        container.add(this.add.rectangle(6, 22, 10, 16, 0x5080C0));
        container.add(this.add.rectangle(7, 30, 12, 6, 0x4070B0)); // boot
        // Body - heroic blue armor
        container.add(this.add.rectangle(0, 4, 24, 24, 0x4488DD));
        container.add(this.add.rectangle(0, 6, 20, 18, 0x55AAEE)); // highlight
        container.add(this.add.rectangle(-9, 4, 5, 20, 0x3366AA)); // shade
        // Golden chest emblem
        container.add(this.add.rectangle(0, 4, 10, 10, 0xFFD700));
        container.add(this.add.rectangle(0, 4, 6, 6, 0xFFEE44)); // inner shine
        // Shield arm
        container.add(this.add.rectangle(-18, 6, 14, 26, 0x4488DD)); // shield
        container.add(this.add.rectangle(-18, 6, 12, 22, 0x55AAEE)); // highlight
        container.add(this.add.rectangle(-18, 4, 8, 8, 0xFFD700)); // emblem
        container.add(this.add.rectangle(-18, 4, 4, 4, 0xFFEE66)); // shine
        // Sword arm
        container.add(this.add.rectangle(13, 8, 6, 14, 0x5080C0));
        // AWESOME Helmet
        container.add(this.add.rectangle(0, -14, 22, 18, 0x6090D0));
        container.add(this.add.rectangle(0, -12, 18, 14, 0x70A0E0)); // highlight
        // Visor
        container.add(this.add.rectangle(0, -12, 16, 8, 0x303030));
        container.add(this.add.rectangle(-4, -12, 6, 5, 0x4488FF)); // left eye glow
        container.add(this.add.rectangle(4, -12, 6, 5, 0x4488FF)); // right eye glow
        container.add(this.add.rectangle(-4, -13, 3, 2, 0xAADDFF)); // shine
        container.add(this.add.rectangle(4, -13, 3, 2, 0xAADDFF));
        // Epic red plume
        container.add(this.add.rectangle(0, -24, 6, 12, 0xFF4444));
        container.add(this.add.rectangle(0, -30, 5, 8, 0xFF6666));
        container.add(this.add.rectangle(0, -34, 4, 6, 0xFF8888)); // tip
        // SHINY Sword
        container.add(this.add.rectangle(20, -8, 6, 32, 0xDDDDDD)); // blade
        container.add(this.add.rectangle(20, -6, 4, 28, 0xFFFFFF)); // shine
        container.add(this.add.rectangle(20, 10, 14, 6, 0xC49A4A)); // crossguard
        container.add(this.add.rectangle(20, 16, 6, 6, 0xFFD700)); // pommel

        return container;
    }

    createMenuRobinhood(x, y, scale, flipX = false) {
        const container = this.add.container(x, y);
        container.setScale(flipX ? -scale : scale, scale);

        // Shadow
        container.add(this.add.rectangle(0, 30, 24, 5, 0x000000, 0.2));
        // Legs with leather boots
        container.add(this.add.rectangle(-5, 20, 8, 14, 0x2E4A2E));
        container.add(this.add.rectangle(-5, 28, 10, 6, 0x4A3020)); // boot
        container.add(this.add.rectangle(5, 20, 8, 14, 0x2E4A2E));
        container.add(this.add.rectangle(5, 28, 10, 6, 0x4A3020)); // boot
        // Flowing cloak (behind)
        container.add(this.add.rectangle(-6, 8, 20, 24, 0x1A3A1A));
        container.add(this.add.rectangle(-8, 14, 16, 18, 0x0A2A0A));
        // Body - dark green tunic
        container.add(this.add.rectangle(0, 4, 18, 20, 0x2E5A2E));
        container.add(this.add.rectangle(0, 6, 14, 14, 0x3E6A3E)); // highlight
        container.add(this.add.rectangle(-6, 4, 4, 16, 0x1E4A1E)); // shade
        // Leather belt with golden buckle
        container.add(this.add.rectangle(0, 12, 20, 4, 0x5A3A20));
        container.add(this.add.rectangle(0, 12, 6, 5, 0xFFD700));
        // Quiver on back (more arrows!)
        container.add(this.add.rectangle(-14, 2, 10, 22, 0x5A3A20));
        container.add(this.add.rectangle(-14, -10, 4, 6, 0xFF4444)); // red fletching
        container.add(this.add.rectangle(-12, -10, 4, 6, 0x44FF44)); // green
        container.add(this.add.rectangle(-16, -10, 4, 6, 0xFFFF44)); // yellow
        // Arms
        container.add(this.add.rectangle(-12, 2, 6, 12, 0xFFCBA4));
        container.add(this.add.rectangle(12, 2, 6, 12, 0xFFCBA4));
        // Hood (iconic Robinhood look)
        container.add(this.add.rectangle(0, -6, 24, 16, 0x1A4A1A));
        container.add(this.add.rectangle(0, -12, 22, 12, 0x1A4A1A));
        container.add(this.add.rectangle(0, -18, 18, 10, 0x2A5A2A));
        container.add(this.add.rectangle(0, -24, 12, 8, 0x2A5A2A));
        // Hood point
        container.add(this.add.rectangle(0, -30, 6, 8, 0x3A6A3A));
        // Face under hood (confident smirk)
        container.add(this.add.rectangle(0, -8, 16, 14, 0xFFCBA4));
        container.add(this.add.rectangle(0, -6, 14, 10, 0xFFDDBB));
        // Determined eyes
        container.add(this.add.rectangle(-4, -10, 8, 6, 0xFFFFFF));
        container.add(this.add.rectangle(4, -10, 8, 6, 0xFFFFFF));
        container.add(this.add.rectangle(-3, -9, 4, 5, 0x228B22));
        container.add(this.add.rectangle(5, -9, 4, 5, 0x228B22));
        // Smirk
        container.add(this.add.rectangle(2, -3, 6, 2, 0xCC8888));
        // Feather in cap!
        container.add(this.add.rectangle(10, -22, 4, 16, 0xFF4444));
        container.add(this.add.rectangle(12, -28, 3, 10, 0xFF6666));
        // LEGENDARY BOW (golden trim)
        container.add(this.add.rectangle(20, -14, 6, 10, 0x6B4423));
        container.add(this.add.rectangle(22, -8, 6, 8, 0x7B5433));
        container.add(this.add.rectangle(24, 0, 6, 10, 0x7B5433));
        container.add(this.add.rectangle(22, 8, 6, 8, 0x7B5433));
        container.add(this.add.rectangle(20, 14, 6, 10, 0x6B4423));
        // Golden accents on bow
        container.add(this.add.rectangle(20, -16, 4, 4, 0xFFD700));
        container.add(this.add.rectangle(20, 16, 4, 4, 0xFFD700));
        // Bowstring
        container.add(this.add.rectangle(18, 0, 2, 32, 0xEEEEEE));

        return container;
    }

    createMenuLancelot(x, y, scale, flipX = false) {
        const container = this.add.container(x, y);
        container.setScale(flipX ? -scale : scale, scale);

        // Shadow (larger for armored horse)
        container.add(this.add.rectangle(0, 38, 48, 8, 0x000000, 0.2));
        // Horse back legs (WHITE STALLION!)
        container.add(this.add.rectangle(-12, 30, 7, 18, 0xDDDDDD));
        container.add(this.add.rectangle(-12, 38, 6, 6, 0xCCCCCC)); // hoof
        // Horse front legs
        container.add(this.add.rectangle(12, 30, 7, 18, 0xEEEEEE));
        container.add(this.add.rectangle(12, 38, 6, 6, 0xDDDDDD)); // hoof
        // Royal cape (flowing behind)
        container.add(this.add.rectangle(-10, -6, 24, 32, 0x8B0000));
        container.add(this.add.rectangle(-14, 0, 20, 28, 0xAA2222));
        // Horse body - WHITE STALLION
        container.add(this.add.rectangle(0, 14, 44, 22, 0xEEEEEE));
        container.add(this.add.rectangle(2, 12, 38, 18, 0xFFFFFF)); // highlight
        container.add(this.add.rectangle(-18, 14, 8, 18, 0xDDDDDD)); // rear shade
        // Horse armor (golden barding)
        container.add(this.add.rectangle(0, 10, 32, 8, 0xFFD700));
        container.add(this.add.rectangle(0, 10, 28, 6, 0xFFEE44));
        // Horse tail (flowing white)
        container.add(this.add.rectangle(-24, 16, 6, 16, 0xCCCCCC));
        container.add(this.add.rectangle(-28, 20, 5, 14, 0xDDDDDD));
        container.add(this.add.rectangle(-30, 24, 4, 10, 0xEEEEEE));
        // Horse head and neck (right side - charging!)
        // Neck
        container.add(this.add.rectangle(24, 6, 14, 20, 0xEEEEEE));
        container.add(this.add.rectangle(26, 4, 10, 16, 0xFFFFFF)); // highlight
        // Head
        container.add(this.add.rectangle(36, -2, 18, 14, 0xFFFFFF));
        container.add(this.add.rectangle(38, -4, 14, 10, 0xFFFFFF)); // face
        // Snout
        container.add(this.add.rectangle(44, 0, 10, 8, 0xEEEEEE));
        container.add(this.add.rectangle(46, 2, 4, 3, 0xCCCCCC)); // nostril
        // Golden face armor
        container.add(this.add.rectangle(34, -2, 16, 4, 0xFFD700));
        // Ears
        container.add(this.add.rectangle(30, -12, 5, 10, 0xEEEEEE));
        container.add(this.add.rectangle(36, -12, 5, 10, 0xEEEEEE));
        // Eye
        container.add(this.add.rectangle(32, -2, 5, 5, 0x000000));
        // Mane (white flowing)
        container.add(this.add.rectangle(22, -6, 8, 16, 0xDDDDDD));
        container.add(this.add.rectangle(26, -8, 6, 12, 0xEEEEEE));
        // Golden saddle
        container.add(this.add.rectangle(0, 2, 20, 12, 0xFFD700));
        container.add(this.add.rectangle(0, 0, 16, 8, 0xFFEE44)); // seat
        // Lancelot - GOLDEN ARMOR!
        container.add(this.add.rectangle(0, -14, 20, 22, 0xFFD700));
        container.add(this.add.rectangle(2, -12, 16, 18, 0xFFEE44)); // highlight
        container.add(this.add.rectangle(-8, -14, 4, 18, 0xDDAA00)); // shade
        // Chest emblem (royal crest)
        container.add(this.add.rectangle(0, -10, 10, 10, 0x4169E1));
        container.add(this.add.rectangle(0, -10, 6, 6, 0x5179F1));
        // Golden helmet
        container.add(this.add.rectangle(0, -30, 18, 16, 0xFFD700));
        container.add(this.add.rectangle(0, -28, 14, 12, 0xFFEE44));
        // Visor
        container.add(this.add.rectangle(0, -28, 14, 6, 0x303030));
        container.add(this.add.rectangle(-3, -28, 5, 4, 0xFFFFFF)); // left eye
        container.add(this.add.rectangle(3, -28, 5, 4, 0xFFFFFF)); // right eye
        // Crown-like crest on helmet
        container.add(this.add.rectangle(-6, -40, 4, 10, 0xFFD700));
        container.add(this.add.rectangle(0, -42, 4, 12, 0xFFEE44));
        container.add(this.add.rectangle(6, -40, 4, 10, 0xFFD700));
        // EXCALIBUR! (legendary sword)
        container.add(this.add.rectangle(18, -24, 6, 36, 0xFFFFFF)); // blade
        container.add(this.add.rectangle(18, -22, 4, 32, 0xFFFFEE)); // shine
        container.add(this.add.rectangle(18, -40, 4, 8, 0xFFFFFF)); // tip
        container.add(this.add.rectangle(18, -5, 16, 6, 0xFFD700)); // crossguard
        container.add(this.add.rectangle(18, 4, 6, 10, 0x8B0000)); // handle
        container.add(this.add.rectangle(18, 10, 8, 6, 0xFFD700)); // pommel

        return container;
    }

    showSettingsPanel() {
        const dialog = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

        // Overlay
        const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85);
        overlay.setInteractive(); // Block clicks behind
        dialog.add(overlay);

        // Panel background - taller to fit more buttons
        const panel = this.add.rectangle(0, 0, 360, 300, 0x2a2a3e);
        panel.setStrokeStyle(3, 0x4169E1);
        dialog.add(panel);

        // Title - renamed to SETTINGS
        const title = this.add.text(0, -120, 'SETTINGS', {
            fontSize: '32px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#4169E1',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        dialog.add(title);

        // User status
        const isLoggedIn = supabaseClient && supabaseClient.isLoggedIn();
        const statusText = this.add.text(0, -75, isLoggedIn ? `Account: ${supabaseClient.getDisplayName()}` : 'Guest Account', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: isLoggedIn ? '#4ade80' : '#888888'
        }).setOrigin(0.5);
        dialog.add(statusText);

        // Reset Upgrades button (moved here from main menu)
        const resetUpgradesBtn = this.createSettingsButton(0, -35, 'Reset Upgrades (2 XP)', 0x665500, () => {
            dialog.destroy();
            this.confirmResetUpgrades();
        }, false);
        dialog.add(resetUpgradesBtn);

        // Delete Account / Reset Progress button - bigger gap
        const deleteBtn = this.createSettingsButton(0, 35, 'Delete Account', 0x8B0000, () => {
            this.confirmDeleteAccount(dialog);
        }, false);
        dialog.add(deleteBtn);

        // Warning text
        const warning = this.add.text(0, 80, 'Delete resets all progress to Rank 0', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ff6666'
        }).setOrigin(0.5);
        dialog.add(warning);

        // Close button (X in top-right corner) - larger touch target
        const closeBtnBg = this.add.rectangle(165, -135, 50, 50, 0x442222, 0.8);
        closeBtnBg.setStrokeStyle(2, 0x664444);
        closeBtnBg.setInteractive({ useHandCursor: true });
        dialog.add(closeBtnBg);

        const closeBtn = this.add.text(165, -135, '✕', {
            fontSize: '28px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ff6666'
        }).setOrigin(0.5);
        dialog.add(closeBtn);

        closeBtnBg.on('pointerover', () => {
            closeBtnBg.setFillStyle(0x663333);
            closeBtn.setColor('#ff8888');
        });
        closeBtnBg.on('pointerout', () => {
            closeBtnBg.setFillStyle(0x442222);
            closeBtn.setColor('#ff6666');
        });
        closeBtnBg.on('pointerdown', () => dialog.destroy());

        dialog.setDepth(1000);
        this.settingsDialog = dialog;
    }

    createSettingsButton(x, y, text, bgColor, callback, disabled = false) {
        const container = this.add.container(x, y);

        // Larger button for mobile
        const bg = this.add.rectangle(0, 0, 280, 50, bgColor);
        bg.setStrokeStyle(2, disabled ? 0x444444 : 0x666666);
        container.add(bg);

        const label = this.add.text(0, 0, text, {
            fontSize: '20px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: disabled ? '#555555' : '#ffffff'
        }).setOrigin(0.5);
        container.add(label);

        if (!disabled) {
            bg.setInteractive({ useHandCursor: true });

            bg.on('pointerover', () => {
                bg.setFillStyle(bgColor + 0x222222);
                this.tweens.add({
                    targets: container,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 100
                });
            });

            bg.on('pointerout', () => {
                bg.setFillStyle(bgColor);
                this.tweens.add({
                    targets: container,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100
                });
            });

            bg.on('pointerdown', callback);
        }

        return container;
    }

    confirmDeleteAccount(parentDialog) {
        parentDialog.destroy();

        const dialog = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

        const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.9);
        overlay.setInteractive();
        dialog.add(overlay);

        const panel = this.add.rectangle(0, 0, 350, 220, 0x2a2a3e);
        panel.setStrokeStyle(3, 0x8B0000);
        dialog.add(panel);

        const title = this.add.text(0, -70, 'DELETE ACCOUNT?', {
            fontSize: '24px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        dialog.add(title);

        const warning = this.add.text(0, -25, 'This will reset:\n• All upgrades and XP\n• Current stats and rank (back to Recruit I)', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        dialog.add(warning);

        const preserved = this.add.text(0, 30, 'Legacy achievements will be preserved:\n• Highest wave ever  • Total games played', {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#44ff44',
            align: 'center'
        }).setOrigin(0.5);
        dialog.add(preserved);

        // Delete button
        const deleteBtn = this.add.text(-70, 80, 'DELETE', {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        deleteBtn.setInteractive({ useHandCursor: true });
        dialog.add(deleteBtn);

        deleteBtn.on('pointerover', () => deleteBtn.setColor('#ff6666'));
        deleteBtn.on('pointerout', () => deleteBtn.setColor('#ff4444'));
        deleteBtn.on('pointerdown', () => {
            saveSystem.resetAccount();
            dialog.destroy();
            this.scene.restart();
        });

        // Cancel button
        const cancelBtn = this.add.text(70, 80, 'CANCEL', {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#44ff44',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        cancelBtn.setInteractive({ useHandCursor: true });
        dialog.add(cancelBtn);

        cancelBtn.on('pointerover', () => cancelBtn.setColor('#66ff66'));
        cancelBtn.on('pointerout', () => cancelBtn.setColor('#44ff44'));
        cancelBtn.on('pointerdown', () => {
            dialog.destroy();
        });

        dialog.setDepth(1001);
    }

    showTipsPanel() {
        const dialog = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

        // Overlay
        const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.9);
        overlay.setInteractive();
        dialog.add(overlay);

        // Panel background - larger for mobile
        const panel = this.add.rectangle(0, 0, 800, 520, 0x1a1a2e);
        panel.setStrokeStyle(3, 0x4169E1);
        dialog.add(panel);

        // Title
        const title = this.add.text(0, -230, 'TIPS & INFO', {
            fontSize: '36px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#4169E1',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        dialog.add(title);

        // Tips pages content
        const tipsPages = [
            {
                title: 'CONTROLS',
                tips: [
                    { icon: '🎮', text: 'Hover over unit buttons to spawn units' },
                    { icon: '⏸️', text: 'Press ESC or P to pause the game' },
                    { icon: '🔇', text: 'Press M to toggle music on/off' },
                    { icon: '🖱️', text: 'Right-click anywhere to pause' },
                    { icon: '⛏️', text: 'Hover over gold/wood mines to collect resources' }
                ]
            },
            {
                title: 'GAMEPLAY BASICS',
                tips: [
                    { icon: '🏰', text: 'Defend your castle from waves of enemies' },
                    { icon: '⚔️', text: 'Spawn units using gold and wood resources' },
                    { icon: '💰', text: 'Earn resources by killing enemies and completing waves' },
                    { icon: '🎯', text: 'Units automatically attack nearby enemies' },
                    { icon: '🐴', text: 'Horsemen: 2x speed, -40% melee dmg, -20% ranged dmg!' }
                ]
            },
            {
                title: 'UNIT PROMOTION',
                tips: [
                    { icon: '⭐', text: 'Spawning the same unit type promotes it!' },
                    { icon: '🥈', text: 'Silver tier (1-3): +10% HP/DMG per level' },
                    { icon: '🥇', text: 'Gold tier (4-6): +10% HP/DMG per level' },
                    { icon: '👥', text: 'Gold tier (level 4+) spawns TWO units at once!' },
                    { icon: '💎', text: 'Higher promotion = higher cost (balanced)' }
                ]
            },
            {
                title: 'CASTLE & MINING',
                tips: [
                    { icon: '🏰', text: 'Upgrade castle in-game by hovering over it' },
                    { icon: '🔨', text: 'Castle level 3+ builds a defensive fence' },
                    { icon: '⛏️', text: 'Castle upgrades increase mining speed by 25%/level' },
                    { icon: '❤️', text: 'Castle Health XP upgrade gives +20 HP per wave (level 2+)' },
                    { icon: '🛡️', text: 'Castle Armor reduces incoming damage' }
                ]
            },
            {
                title: 'ENEMIES & BOSSES',
                tips: [
                    { icon: '👺', text: 'Goblins (Wave 1+): Fast but weak' },
                    { icon: '👹', text: 'Orcs (Wave 2+): Stronger melee fighters' },
                    { icon: '💀', text: 'Skeletons (Wave 4+): Medium threat' },
                    { icon: '🏹', text: 'Skeleton Archers (Wave 6+): Ranged enemies!' },
                    { icon: '🐉', text: 'DRAGON BOSS every 10 waves - very dangerous!' }
                ]
            },
            {
                title: 'MORE ENEMIES',
                tips: [
                    { icon: '🗡️', text: 'Spear Monsters (Wave 7+): Throw big spears' },
                    { icon: '🧌', text: 'Trolls (Wave 8+): High HP tanks' },
                    { icon: '⚫', text: 'Dark Knights (Wave 12+): Strong armored foes' },
                    { icon: '😈', text: 'Demons (Wave 18+): Very powerful enemies' },
                    { icon: '⚠️', text: 'Enemies get stronger each wave!' }
                ]
            },
            {
                title: 'XP & RANKINGS',
                tips: [
                    { icon: '✨', text: 'Earn XP by reaching wave milestones (max 3/game)' },
                    { icon: '📊', text: 'Recruit: 2 waves/XP, Soldier/Warrior: 3 waves/XP' },
                    { icon: '📈', text: 'Higher ranks need more waves per XP' },
                    { icon: '🎖️', text: 'Ranks: Recruit → Soldier → Warrior → Knight → ...' },
                    { icon: '👑', text: 'Each rank has 3 grades (I, II, III)' }
                ]
            },
            {
                title: 'UPGRADES & XP',
                tips: [
                    { icon: '⬆️', text: 'Spend XP in Upgrades menu for permanent boosts' },
                    { icon: '🔓', text: 'Unlock Horseman (2 XP) - 2x speed, armored vs all' },
                    { icon: '💪', text: 'Unit upgrades increase base HP and damage' },
                    { icon: '🔄', text: 'Reset upgrades costs 2 XP fee (refunds spent XP)' },
                    { icon: '⛏️', text: 'Mining Speed upgrade increases rate by 10%/level' }
                ]
            }
        ];

        // Current page tracking
        let currentPage = 0;

        // Page content container
        const pageContainer = this.add.container(0, 20);
        dialog.add(pageContainer);

        // Page indicator - larger for mobile
        const pageIndicator = this.add.text(0, 215, '', {
            fontSize: '22px',
            fontFamily: 'Arial',
            color: '#888888'
        }).setOrigin(0.5);
        dialog.add(pageIndicator);

        // Function to render current page
        const renderPage = () => {
            pageContainer.removeAll(true);

            const page = tipsPages[currentPage];

            // Page title - larger
            const pageTitle = this.add.text(0, -170, page.title, {
                fontSize: '28px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#ffd700',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);
            pageContainer.add(pageTitle);

            // Tips list - larger font and better spacing
            page.tips.forEach((tip, index) => {
                const y = -105 + index * 55;

                const tipText = this.add.text(-350, y, `${tip.icon}  ${tip.text}`, {
                    fontSize: '22px',
                    fontFamily: 'Arial',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 1
                }).setOrigin(0, 0.5);
                pageContainer.add(tipText);
            });

            // Update page indicator
            pageIndicator.setText(`Page ${currentPage + 1} of ${tipsPages.length}`);
        };

        // Navigation buttons - larger for mobile with background buttons
        const prevBtnContainer = this.add.container(-300, 215);
        const prevBtnBg = this.add.rectangle(0, 0, 120, 50, 0x333366);
        prevBtnBg.setStrokeStyle(2, 0x4169E1);
        prevBtnContainer.add(prevBtnBg);
        const prevBtnText = this.add.text(0, 0, '◀ PREV', {
            fontSize: '26px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#4169E1'
        }).setOrigin(0.5);
        prevBtnContainer.add(prevBtnText);
        prevBtnBg.setInteractive({ useHandCursor: true });
        dialog.add(prevBtnContainer);

        prevBtnBg.on('pointerover', () => {
            prevBtnBg.setFillStyle(0x444488);
            prevBtnText.setColor('#6495ED');
        });
        prevBtnBg.on('pointerout', () => {
            prevBtnBg.setFillStyle(0x333366);
            prevBtnText.setColor('#4169E1');
        });
        prevBtnBg.on('pointerdown', () => {
            currentPage = (currentPage - 1 + tipsPages.length) % tipsPages.length;
            renderPage();
        });

        const nextBtnContainer = this.add.container(300, 215);
        const nextBtnBg = this.add.rectangle(0, 0, 120, 50, 0x333366);
        nextBtnBg.setStrokeStyle(2, 0x4169E1);
        nextBtnContainer.add(nextBtnBg);
        const nextBtnText = this.add.text(0, 0, 'NEXT ▶', {
            fontSize: '26px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#4169E1'
        }).setOrigin(0.5);
        nextBtnContainer.add(nextBtnText);
        nextBtnBg.setInteractive({ useHandCursor: true });
        dialog.add(nextBtnContainer);

        nextBtnBg.on('pointerover', () => {
            nextBtnBg.setFillStyle(0x444488);
            nextBtnText.setColor('#6495ED');
        });
        nextBtnBg.on('pointerout', () => {
            nextBtnBg.setFillStyle(0x333366);
            nextBtnText.setColor('#4169E1');
        });
        nextBtnBg.on('pointerdown', () => {
            currentPage = (currentPage + 1) % tipsPages.length;
            renderPage();
        });

        // Close button - popping circle style outside panel
        const closeBtnContainer = this.add.container(400 + 15, -260 + 15);
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
        dialog.add(closeBtnContainer);

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
        closeBtnBg.on('pointerdown', () => dialog.destroy());

        // Render first page
        renderPage();

        dialog.setDepth(1000);
    }

    createSwordCursor() {
        this.swordCursor = this.add.container(0, 0);

        // Sword blade (silver/steel)
        const blade = this.add.rectangle(0, -20, 8, 40, 0xC0C0C0);
        blade.setStrokeStyle(1, 0x888888);
        this.swordCursor.add(blade);

        // Blade highlight
        const highlight = this.add.rectangle(-1, -20, 3, 36, 0xE8E8E8);
        this.swordCursor.add(highlight);

        // Blade tip
        const tip = this.add.rectangle(0, -42, 6, 8, 0xD0D0D0);
        this.swordCursor.add(tip);
        const tipPoint = this.add.rectangle(0, -48, 4, 6, 0xE0E0E0);
        this.swordCursor.add(tipPoint);

        // Cross guard (gold)
        const guard = this.add.rectangle(0, 2, 24, 6, 0xFFD700);
        guard.setStrokeStyle(1, 0xDAA520);
        this.swordCursor.add(guard);

        // Guard ends (curved look with rectangles)
        const guardLeft = this.add.rectangle(-14, 4, 6, 4, 0xFFD700);
        const guardRight = this.add.rectangle(14, 4, 6, 4, 0xFFD700);
        this.swordCursor.add(guardLeft);
        this.swordCursor.add(guardRight);

        // Handle (brown leather wrap)
        const handle = this.add.rectangle(0, 16, 6, 20, 0x8B4513);
        this.swordCursor.add(handle);

        // Handle wrap lines
        for (let i = 0; i < 4; i++) {
            const wrap = this.add.rectangle(0, 8 + i * 5, 7, 2, 0x654321);
            this.swordCursor.add(wrap);
        }

        // Pommel (gold ball at bottom)
        const pommel = this.add.rectangle(0, 28, 10, 8, 0xFFD700);
        pommel.setStrokeStyle(1, 0xDAA520);
        this.swordCursor.add(pommel);

        // Slight tilt for style
        this.swordCursor.setAngle(-30);
        this.swordCursor.setDepth(2000);
        this.swordCursor.setScale(0.8);

        // Subtle idle animation
        this.tweens.add({
            targets: this.swordCursor,
            angle: -25,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    // Validate session and sync with cloud
    async validateAndSync() {
        try {
            const validation = await supabaseClient.validateSession();
            console.log('Session validation:', validation.reason);

            if (validation.valid || validation.reason === 'new_session') {
                // Start new session or session matches
                if (validation.reason === 'new_session' || !supabaseClient.hasValidLocalSession()) {
                    await supabaseClient.startSession();
                }
                // Sync with cloud
                const guestData = supabaseClient.getPendingGuestData();
                const result = await saveSystem.syncWithCloud(guestData);
                if (result.success) {
                    console.log('Cloud sync completed:', result.action);
                    // Subscribe to real-time save updates (for XP purchases)
                    supabaseClient.subscribeToSaves();
                    this.scene.restart();
                }
            } else if (validation.canAutoTakeover) {
                // Stale session (>2h old), auto-takeover
                console.log('Auto-taking over stale session');
                await supabaseClient.takeoverSession();
                const guestData = supabaseClient.getPendingGuestData();
                const result = await saveSystem.syncWithCloud(guestData);
                if (result.success) {
                    supabaseClient.subscribeToSaves();
                    this.scene.restart();
                }
            } else if (validation.reason === 'session_conflict') {
                // Active session on another device - show dialog
                const choice = await SessionUI.showConflictDialog(this);
                console.log('User choice:', choice);
                if (choice === 'takeover') {
                    console.log('Calling takeoverSession...');
                    const takeoverResult = await supabaseClient.takeoverSession();
                    console.log('Takeover result:', takeoverResult);
                    const guestData = supabaseClient.getPendingGuestData();
                    const result = await saveSystem.syncWithCloud(guestData);
                    console.log('Sync result:', result);
                    if (result.success) {
                        supabaseClient.subscribeToSaves();
                        this.scene.restart();
                    }
                } else {
                    // User cancelled - show blocked message
                    this.showSessionBlockedMessage();
                }
            }
        } catch (error) {
            console.error('Session validation error:', error);
        }
    }

    // Show message when session is blocked
    showSessionBlockedMessage() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const msg = this.add.text(width / 2, height - 50,
            'Session active on another device. Refresh to try again.',
            { fontSize: '14px', fontFamily: 'Arial', color: '#ffaa00' }
        ).setOrigin(0.5);

        this.tweens.add({
            targets: msg,
            alpha: 0,
            delay: 5000,
            duration: 1000
        });
    }

    // Check if session is still valid (called periodically)
    async checkSessionStillValid() {
        if (!supabaseClient.isLoggedIn() || !supabaseClient.hasValidLocalSession()) return;

        const validation = await supabaseClient.validateSession();

        if (validation.reason === 'session_conflict' || validation.reason === 'session_expired') {
            // Another device took over - stop the timer and show expired dialog
            if (this.sessionCheckTimer) {
                this.sessionCheckTimer.remove();
            }

            console.log('Session taken over by another device');
            await SessionUI.showExpiredDialog(this);

            // Log out and reload
            await supabaseClient.logout();
            sessionStorage.removeItem('battlePanicSessionId');
            window.location.reload();
        }
    }

    // Show XP purchase notification
    showXPPurchaseNotification(xpGained) {
        const width = this.cameras.main.width;

        // Create notification container
        const container = this.add.container(width / 2, 120);
        container.setDepth(9999);

        // Background
        const bg = this.add.rectangle(0, 0, 280, 60, 0x228B22, 0.95);
        bg.setStrokeStyle(3, 0x44FF44);
        container.add(bg);

        // Text
        const text = this.add.text(0, 0, `+${xpGained} XP Purchased!`, {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(text);

        // Animate in
        container.setScale(0);
        this.tweens.add({
            targets: container,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });

        // Animate out after delay
        this.tweens.add({
            targets: container,
            alpha: 0,
            y: 80,
            delay: 1500,
            duration: 500,
            onComplete: () => container.destroy()
        });
    }

    update() {
        // Update sword cursor position - tip points at cursor
        if (this.swordCursor) {
            const pointer = this.input.activePointer;
            // Offset to align sword tip with actual cursor position
            // Sword tip is at y=-48 (scaled 0.8 = -38.4), rotated -30 degrees
            this.swordCursor.x = pointer.x + 20;
            this.swordCursor.y = pointer.y + 35;
        }
    }
}

// Static flag to prevent infinite sync loop (reset on page reload)
MenuScene.hasSynced = false;
