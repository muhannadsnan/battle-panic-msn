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
        const cardHeight = 330;

        // Card container
        const container = this.add.container(x, y);

        // Card background
        const bg = this.add.rectangle(0, 0, cardWidth, cardHeight, 0x2a2a4e, 0.9);
        bg.setStrokeStyle(3, 0x444488);
        container.add(bg);

        // Hero portrait area (pixel art placeholder - colored square with initial)
        const portraitSize = 90;
        const portrait = this.add.rectangle(0, -100, portraitSize, portraitSize, hero.color);
        portrait.setStrokeStyle(3, 0xffffff);
        container.add(portrait);

        // Hero initial letter
        const initial = this.add.text(0, -100, hero.name.charAt(0), {
            fontSize: '56px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        container.add(initial);

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
                    'Resource income +20%',
                    'Unit costs reduced by 10%'
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
}
