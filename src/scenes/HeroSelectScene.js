// Hero Select Scene - Choose your hero before battle
class HeroSelectScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HeroSelectScene' });
    }

    create() {
        const width = GAME_WIDTH;
        const height = GAME_HEIGHT;

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Title
        this.add.text(width / 2, 50, 'CHOOSE YOUR HERO', {
            fontSize: '40px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(width / 2, 95, 'Your hero leads the battle with unique powers', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#cccccc'
        }).setOrigin(0.5);

        // Create hero cards
        this.selectedHero = null;
        this.heroCards = [];

        const heroes = ['DRUID', 'WARLORD', 'ALCHEMIST'];
        const cardWidth = 280;
        const cardSpacing = 30;
        const totalWidth = (cardWidth * 3) + (cardSpacing * 2);
        const startX = (width - totalWidth) / 2 + cardWidth / 2;

        heroes.forEach((heroKey, index) => {
            const x = startX + index * (cardWidth + cardSpacing);
            const card = this.createHeroCard(x, 310, heroKey);
            this.heroCards.push(card);
        });

        // Battle button (disabled until hero selected)
        this.createBattleButton(width / 2, height - 60);

        // Back button
        this.createBackButton(80, height - 35);
    }

    createHeroCard(x, y, heroKey) {
        const hero = HERO_TYPES[heroKey];
        const cardWidth = 280;
        const cardHeight = 380;

        // Card container
        const container = this.add.container(x, y);

        // Card background
        const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x2a2a4e, 0.9);
        bg.setStrokeStyle(3, 0x444488);
        container.add(bg);

        // Hero portrait area with pixel art
        const portraitSize = 90;
        const portrait = this.add.rectangle(0, -100, portraitSize, portraitSize, 0x1a1a2e);
        portrait.setStrokeStyle(3, hero.color);
        container.add(portrait);

        // Draw pixel art hero portrait
        const heroArt = this.add.graphics();
        this.drawPixelArtHero(heroArt, heroKey, 0, -100, 80);
        container.add(heroArt);

        // Hero name
        const nameText = this.add.text(0, -35, hero.name.toUpperCase(), {
            fontSize: '28px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        container.add(nameText);

        // Hero quote
        const quoteText = this.add.text(0, -5, hero.quote, {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#aaaaaa',
            fontStyle: 'italic'
        }).setOrigin(0.5);
        container.add(quoteText);

        // Passive effects header
        const passiveHeader = this.add.text(0, 25, '~ Passive Powers ~', {
            fontSize: '16px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#88aaff'
        }).setOrigin(0.5);
        container.add(passiveHeader);

        // Passive effects list
        const passives = this.getPassiveDescriptions(heroKey);
        passives.forEach((passive, i) => {
            const passiveText = this.add.text(0, 50 + i * 24, passive, {
                fontSize: '15px',
                fontFamily: 'Arial',
                color: '#ccffcc'
            }).setOrigin(0.5);
            container.add(passiveText);
        });

        // Wave 20 ability
        const abilityHeader = this.add.text(0, 110, '~ Wave 20 Ability ~', {
            fontSize: '16px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffaa44'
        }).setOrigin(0.5);
        container.add(abilityHeader);

        const abilityName = this.add.text(0, 135, hero.abilityName, {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(abilityName);

        const abilityDesc = this.add.text(0, 158, hero.abilityDescription, {
            fontSize: '13px',
            fontFamily: 'Arial',
            color: '#cccccc'
        }).setOrigin(0.5);
        container.add(abilityDesc);

        // Make card interactive
        bg.setInteractive({ useHandCursor: true });

        bg.on('pointerover', () => {
            if (this.selectedHero !== heroKey) {
                bg.setFillStyle(0x3a3a6e, 0.95);
            }
        });

        bg.on('pointerout', () => {
            if (this.selectedHero !== heroKey) {
                bg.setFillStyle(0x2a2a4e, 0.9);
            }
        });

        bg.on('pointerdown', () => {
            this.selectHero(heroKey);
        });

        // Store reference
        container.heroKey = heroKey;
        container.bg = bg;

        return container;
    }

    getPassiveDescriptions(heroKey) {
        switch (heroKey) {
            case 'DRUID':
                return [
                    'Archers deal +10% damage',
                    'All enemies move 10% slower'
                ];
            case 'WARLORD':
                return [
                    'Melee units deal +15% damage',
                    'Unit production 15% faster'
                ];
            case 'ALCHEMIST':
                return [
                    'Horsemen deal +10% damage',
                    'Unit costs reduced by 5%'
                ];
            default:
                return [];
        }
    }

    selectHero(heroKey) {
        this.selectedHero = heroKey;

        // Update card visuals
        this.heroCards.forEach(card => {
            if (card.heroKey === heroKey) {
                card.bg.setFillStyle(0x446644, 0.95);
                card.bg.setStrokeStyle(4, 0x88ff88);
            } else {
                card.bg.setFillStyle(0x2a2a4e, 0.9);
                card.bg.setStrokeStyle(3, 0x444488);
            }
        });

        // Enable battle button
        if (this.battleButton) {
            this.battleButton.bg.setFillStyle(0x228B22);
            this.battleButton.text.setColor('#ffffff');
        }

        // Play selection sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playGold();
        }
    }

    createBattleButton(x, y) {
        const container = this.add.container(x, y);

        // Button background (initially disabled/gray)
        const bg = this.add.rectangle(0, 0, 220, 55, 0x555555);
        bg.setStrokeStyle(3, 0x333333);
        container.add(bg);

        // Button text
        const text = this.add.text(0, 0, 'BATTLE!', {
            fontSize: '28px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#888888',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        container.add(text);

        // Make interactive
        bg.setInteractive({ useHandCursor: true });

        bg.on('pointerover', () => {
            if (this.selectedHero) {
                bg.setFillStyle(0x33aa33);
            }
        });

        bg.on('pointerout', () => {
            if (this.selectedHero) {
                bg.setFillStyle(0x228B22);
            }
        });

        bg.on('pointerdown', () => {
            if (this.selectedHero) {
                // Start game with selected hero
                this.scene.start('GameScene', { heroKey: this.selectedHero });
            }
        });

        this.battleButton = { container, bg, text };
    }

    createBackButton(x, y) {
        const text = this.add.text(x, y, '< Back', {
            fontSize: '20px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#aaaaaa',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        text.setInteractive({ useHandCursor: true });

        text.on('pointerover', () => {
            text.setColor('#ffffff');
        });

        text.on('pointerout', () => {
            text.setColor('#aaaaaa');
        });

        text.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });
    }

    // Draw pixel-art hero portrait (same as GameScene)
    drawPixelArtHero(graphics, heroKey, centerX, centerY, size) {
        const px = size / 16;  // Pixel size for 16x16 grid
        const startX = centerX - size / 2;
        const startY = centerY - size / 2;

        // Helper to draw a pixel
        const drawPx = (x, y, color) => {
            graphics.fillStyle(color, 1);
            graphics.fillRect(startX + x * px, startY + y * px, px, px);
        };

        if (heroKey === 'DRUID') {
            // Druid - Green hooded nature mage with leafy details
            const skinColor = 0xd4a574;      // Tan skin
            const hoodColor = 0x228B22;       // Forest green hood
            const hoodDark = 0x1a6b1a;        // Darker green for shadow
            const hoodLight = 0x32cd32;       // Lighter green highlight
            const eyeColor = 0x00ff00;        // Glowing green eyes
            const beardColor = 0x654321;      // Brown beard
            const leafColor = 0x90ee90;       // Light green for leaves

            // Hood top (rows 1-3)
            [5,6,7,8,9,10].forEach(x => drawPx(x, 1, hoodColor));
            [4,5,6,7,8,9,10,11].forEach(x => drawPx(x, 2, hoodColor));
            [3,4,5,6,7,8,9,10,11,12].forEach(x => drawPx(x, 3, hoodColor));

            // Hood sides and face area (rows 4-7)
            [2,3,4].forEach(x => drawPx(x, 4, hoodColor));
            [11,12,13].forEach(x => drawPx(x, 4, hoodColor));
            [5,6,7,8,9,10].forEach(x => drawPx(x, 4, hoodDark)); // Shadow under hood

            [2,3].forEach(x => drawPx(x, 5, hoodColor));
            [12,13].forEach(x => drawPx(x, 5, hoodColor));
            [4,5].forEach(x => drawPx(x, 5, hoodDark));
            [10,11].forEach(x => drawPx(x, 5, hoodDark));
            [6,7,8,9].forEach(x => drawPx(x, 5, skinColor)); // Forehead

            [2,3].forEach(x => drawPx(x, 6, hoodColor));
            [12,13].forEach(x => drawPx(x, 6, hoodColor));
            [4].forEach(x => drawPx(x, 6, hoodDark));
            [11].forEach(x => drawPx(x, 6, hoodDark));
            [5,6,7,8,9,10].forEach(x => drawPx(x, 6, skinColor)); // Face
            drawPx(6, 6, eyeColor); // Left eye
            drawPx(9, 6, eyeColor); // Right eye

            // Face and hood (rows 7-9)
            [2,3].forEach(x => drawPx(x, 7, hoodColor));
            [12,13].forEach(x => drawPx(x, 7, hoodColor));
            [4,5,6,7,8,9,10,11].forEach(x => drawPx(x, 7, skinColor));

            [2,3].forEach(x => drawPx(x, 8, hoodColor));
            [12,13].forEach(x => drawPx(x, 8, hoodColor));
            [4,5].forEach(x => drawPx(x, 8, skinColor));
            [10,11].forEach(x => drawPx(x, 8, skinColor));
            [6,7,8,9].forEach(x => drawPx(x, 8, beardColor)); // Beard

            // Beard and robe (rows 9-11)
            [3,4].forEach(x => drawPx(x, 9, hoodColor));
            [11,12].forEach(x => drawPx(x, 9, hoodColor));
            [5,6,7,8,9,10].forEach(x => drawPx(x, 9, beardColor));

            [4,5].forEach(x => drawPx(x, 10, hoodColor));
            [10,11].forEach(x => drawPx(x, 10, hoodColor));
            [6,7,8,9].forEach(x => drawPx(x, 10, beardColor));

            // Robe/shoulders (rows 11-14)
            [3,4,5,6,7,8,9,10,11,12].forEach(x => drawPx(x, 11, hoodColor));
            [2,3,4,5,6,7,8,9,10,11,12,13].forEach(x => drawPx(x, 12, hoodColor));
            [2,3,4,5,6,7,8,9,10,11,12,13].forEach(x => drawPx(x, 13, hoodColor));
            [3,4,5,6,7,8,9,10,11,12].forEach(x => drawPx(x, 14, hoodColor));

            // Leaf decorations
            drawPx(4, 3, leafColor);
            drawPx(11, 3, leafColor);
            drawPx(3, 11, leafColor);
            drawPx(12, 11, leafColor);
            drawPx(7, 12, hoodLight);
            drawPx(8, 12, hoodLight);

        } else if (heroKey === 'WARLORD') {
            // Warlord - Red armored warrior with helmet
            const skinColor = 0xd4a574;       // Tan skin
            const helmetColor = 0xb22222;     // Firebrick red
            const helmetDark = 0x8b0000;      // Dark red shadow
            const helmetLight = 0xff4444;     // Light red highlight
            const steelColor = 0x808080;      // Gray steel
            const steelLight = 0xc0c0c0;      // Light steel
            const eyeColor = 0x000000;        // Dark eyes
            const scarColor = 0x8b4513;       // Scar

            // Helmet crest (rows 0-2)
            [7,8].forEach(x => drawPx(x, 0, helmetLight));
            [6,7,8,9].forEach(x => drawPx(x, 1, helmetColor));
            [5,6,7,8,9,10].forEach(x => drawPx(x, 2, helmetColor));

            // Helmet main (rows 3-5)
            [3,4,5,6,7,8,9,10,11,12].forEach(x => drawPx(x, 3, helmetColor));
            [2,3].forEach(x => drawPx(x, 3, helmetDark));
            [12,13].forEach(x => drawPx(x, 3, helmetDark));

            [2,3,4,5,6,7,8,9,10,11,12,13].forEach(x => drawPx(x, 4, helmetColor));
            drawPx(3, 4, steelColor); // Steel band
            drawPx(12, 4, steelColor);

            [2,3,4,5,6,7,8,9,10,11,12,13].forEach(x => drawPx(x, 5, helmetColor));
            [4,5,6].forEach(x => drawPx(x, 5, steelColor)); // Eye slit frame
            [9,10,11].forEach(x => drawPx(x, 5, steelColor));

            // Face through helmet visor (rows 6-8)
            [2,3].forEach(x => drawPx(x, 6, helmetColor));
            [12,13].forEach(x => drawPx(x, 6, helmetColor));
            [4].forEach(x => drawPx(x, 6, steelColor));
            [11].forEach(x => drawPx(x, 6, steelColor));
            [5,6,7,8,9,10].forEach(x => drawPx(x, 6, skinColor)); // Face visible
            drawPx(6, 6, eyeColor); // Left eye
            drawPx(9, 6, eyeColor); // Right eye

            [2,3].forEach(x => drawPx(x, 7, helmetColor));
            [12,13].forEach(x => drawPx(x, 7, helmetColor));
            [4].forEach(x => drawPx(x, 7, steelColor));
            [11].forEach(x => drawPx(x, 7, steelColor));
            [5,6,7,8,9,10].forEach(x => drawPx(x, 7, skinColor));
            drawPx(10, 7, scarColor); // Battle scar

            [2,3].forEach(x => drawPx(x, 8, helmetColor));
            [12,13].forEach(x => drawPx(x, 8, helmetColor));
            [4,5].forEach(x => drawPx(x, 8, steelColor));
            [10,11].forEach(x => drawPx(x, 8, steelColor));
            [6,7,8,9].forEach(x => drawPx(x, 8, skinColor));

            // Chin guard (rows 9-10)
            [3,4,5].forEach(x => drawPx(x, 9, steelColor));
            [10,11,12].forEach(x => drawPx(x, 9, steelColor));
            [6,7,8,9].forEach(x => drawPx(x, 9, helmetDark));

            [4,5,6,7,8,9,10,11].forEach(x => drawPx(x, 10, steelColor));

            // Armor shoulders (rows 11-14)
            [2,3,4,5,6,7,8,9,10,11,12,13].forEach(x => drawPx(x, 11, helmetColor));
            drawPx(4, 11, steelLight); // Shoulder plate shine
            drawPx(11, 11, steelLight);

            [1,2,3,4].forEach(x => drawPx(x, 12, helmetColor));
            [11,12,13,14].forEach(x => drawPx(x, 12, helmetColor));
            [5,6,7,8,9,10].forEach(x => drawPx(x, 12, helmetDark)); // Chest

            [1,2,3].forEach(x => drawPx(x, 13, helmetColor));
            [12,13,14].forEach(x => drawPx(x, 13, helmetColor));
            [4,5,6,7,8,9,10,11].forEach(x => drawPx(x, 13, helmetDark));
            drawPx(7, 13, steelColor); // Belt buckle
            drawPx(8, 13, steelColor);

            [2,3,4,5,6,7,8,9,10,11,12,13].forEach(x => drawPx(x, 14, helmetDark));

        } else if (heroKey === 'ALCHEMIST') {
            // Alchemist - Gold-robed scholar with goggles
            const skinColor = 0xd4a574;       // Tan skin
            const robeColor = 0xffd700;       // Gold
            const robeDark = 0xdaa520;        // Darker gold
            const robeLight = 0xffec8b;       // Light gold
            const goggleColor = 0x4169e1;     // Royal blue goggles
            const goggleFrame = 0x696969;     // Gray frame
            const hairColor = 0x2f2f2f;       // Dark hair
            const potionColor = 0x00ff7f;     // Green potion glow

            // Hair/head top (rows 1-3)
            [6,7,8,9].forEach(x => drawPx(x, 1, hairColor));
            [5,6,7,8,9,10].forEach(x => drawPx(x, 2, hairColor));
            [4,5,6,7,8,9,10,11].forEach(x => drawPx(x, 3, hairColor));

            // Forehead and goggles (rows 4-6)
            [3,4].forEach(x => drawPx(x, 4, hairColor));
            [11,12].forEach(x => drawPx(x, 4, hairColor));
            [5,6,7,8,9,10].forEach(x => drawPx(x, 4, skinColor));

            [3].forEach(x => drawPx(x, 5, hairColor));
            [12].forEach(x => drawPx(x, 5, hairColor));
            [4,5].forEach(x => drawPx(x, 5, goggleFrame)); // Goggle frame left
            [10,11].forEach(x => drawPx(x, 5, goggleFrame)); // Goggle frame right
            [6,7,8,9].forEach(x => drawPx(x, 5, skinColor));

            [3].forEach(x => drawPx(x, 6, hairColor));
            [12].forEach(x => drawPx(x, 6, hairColor));
            [4].forEach(x => drawPx(x, 6, goggleFrame));
            [5,6].forEach(x => drawPx(x, 6, goggleColor)); // Left goggle lens
            [7,8].forEach(x => drawPx(x, 6, goggleFrame)); // Bridge
            [9,10].forEach(x => drawPx(x, 6, goggleColor)); // Right goggle lens
            [11].forEach(x => drawPx(x, 6, goggleFrame));

            // Lower face (rows 7-9)
            [3,4].forEach(x => drawPx(x, 7, skinColor));
            [11,12].forEach(x => drawPx(x, 7, skinColor));
            [5,6,7,8,9,10].forEach(x => drawPx(x, 7, skinColor));

            [4,5,6,7,8,9,10,11].forEach(x => drawPx(x, 8, skinColor));
            drawPx(7, 8, 0xcc8866); // Nose shadow

            [5,6,7,8,9,10].forEach(x => drawPx(x, 9, skinColor));
            drawPx(6, 9, 0x000000); // Slight smile
            drawPx(9, 9, 0x000000);

            // Collar and robe (rows 10-14)
            [4,5].forEach(x => drawPx(x, 10, robeColor));
            [10,11].forEach(x => drawPx(x, 10, robeColor));
            [6,7,8,9].forEach(x => drawPx(x, 10, skinColor)); // Neck

            [3,4,5,6,7,8,9,10,11,12].forEach(x => drawPx(x, 11, robeColor));
            drawPx(7, 11, robeDark); // Collar V
            drawPx(8, 11, robeDark);

            [2,3,4,5,6,7,8,9,10,11,12,13].forEach(x => drawPx(x, 12, robeColor));
            drawPx(6, 12, robeLight); // Highlight
            drawPx(9, 12, robeLight);

            [2,3,4,5,6,7,8,9,10,11,12,13].forEach(x => drawPx(x, 13, robeColor));
            drawPx(4, 13, potionColor); // Potion vial glow
            drawPx(11, 13, potionColor);

            [3,4,5,6,7,8,9,10,11,12].forEach(x => drawPx(x, 14, robeDark));

            // Goggle shine
            drawPx(5, 6, 0x87ceeb); // Light reflection
            drawPx(9, 6, 0x87ceeb);
        }
    }
}
