// Session UI - Dialogs for session conflict handling
// Shows modal dialogs when session conflicts are detected

class SessionUI {
    // Show session conflict dialog
    // Returns a promise that resolves to 'takeover' or 'cancel'
    static showConflictDialog(scene) {
        return new Promise((resolve) => {
            const width = scene.cameras.main.width;
            const height = scene.cameras.main.height;

            // Create container for dialog
            const container = scene.add.container(width / 2, height / 2);
            container.setDepth(10000);

            // Dim background
            const dimBg = scene.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.7);
            container.add(dimBg);

            // Dialog box
            const dialogBg = scene.add.rectangle(0, 0, 340, 200, 0x1a1a2e);
            dialogBg.setStrokeStyle(3, 0xff6b6b);
            container.add(dialogBg);

            // Warning icon
            const icon = scene.add.text(0, -60, '⚠️', { fontSize: '40px' }).setOrigin(0.5);
            container.add(icon);

            // Title
            const title = scene.add.text(0, -15, 'Session Conflict', {
                fontSize: '22px',
                fontFamily: 'Arial',
                color: '#ff6b6b',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            container.add(title);

            // Message
            const message = scene.add.text(0, 20, 'Game is open on another device', {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#cccccc'
            }).setOrigin(0.5);
            container.add(message);

            // Play Here button
            const playBtn = scene.add.rectangle(-80, 70, 130, 40, 0x44AA44);
            playBtn.setStrokeStyle(2, 0x88FF88);
            playBtn.setInteractive({ useHandCursor: true });
            container.add(playBtn);

            const playText = scene.add.text(-80, 70, 'Play Here', {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            container.add(playText);

            // Cancel button
            const cancelBtn = scene.add.rectangle(80, 70, 130, 40, 0x444444);
            cancelBtn.setStrokeStyle(2, 0x666666);
            cancelBtn.setInteractive({ useHandCursor: true });
            container.add(cancelBtn);

            const cancelText = scene.add.text(80, 70, 'Cancel', {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#aaaaaa'
            }).setOrigin(0.5);
            container.add(cancelText);

            // Button hover effects
            playBtn.on('pointerover', () => playBtn.setFillStyle(0x66CC66));
            playBtn.on('pointerout', () => playBtn.setFillStyle(0x44AA44));
            cancelBtn.on('pointerover', () => cancelBtn.setFillStyle(0x555555));
            cancelBtn.on('pointerout', () => cancelBtn.setFillStyle(0x444444));

            // Button click handlers
            playBtn.on('pointerdown', () => {
                if (typeof audioManager !== 'undefined') audioManager.playClick();
                container.destroy();
                resolve('takeover');
            });

            cancelBtn.on('pointerdown', () => {
                if (typeof audioManager !== 'undefined') audioManager.playClick();
                container.destroy();
                resolve('cancel');
            });
        });
    }

    // Show session expired message (when another device took over)
    static showExpiredDialog(scene) {
        return new Promise((resolve) => {
            const width = scene.cameras.main.width;
            const height = scene.cameras.main.height;

            const container = scene.add.container(width / 2, height / 2);
            container.setDepth(10000);

            // Dim background
            const dimBg = scene.add.rectangle(0, 0, width * 2, height * 2, 0x000000, 0.7);
            container.add(dimBg);

            // Dialog box
            const dialogBg = scene.add.rectangle(0, 0, 340, 180, 0x1a1a2e);
            dialogBg.setStrokeStyle(3, 0xffaa00);
            container.add(dialogBg);

            // Icon
            const icon = scene.add.text(0, -50, '🔒', { fontSize: '40px' }).setOrigin(0.5);
            container.add(icon);

            // Message
            const title = scene.add.text(0, 0, 'Session Expired', {
                fontSize: '20px',
                fontFamily: 'Arial',
                color: '#ffaa00',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            container.add(title);

            const message = scene.add.text(0, 30, 'You logged in from another device', {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#cccccc'
            }).setOrigin(0.5);
            container.add(message);

            // OK button
            const okBtn = scene.add.rectangle(0, 70, 130, 40, 0x4169E1);
            okBtn.setStrokeStyle(2, 0x6699FF);
            okBtn.setInteractive({ useHandCursor: true });
            container.add(okBtn);

            const okText = scene.add.text(0, 70, 'OK', {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#ffffff',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            container.add(okText);

            okBtn.on('pointerover', () => okBtn.setFillStyle(0x5588DD));
            okBtn.on('pointerout', () => okBtn.setFillStyle(0x4169E1));

            okBtn.on('pointerdown', () => {
                if (typeof audioManager !== 'undefined') audioManager.playClick();
                container.destroy();
                resolve('ok');
            });
        });
    }
}
