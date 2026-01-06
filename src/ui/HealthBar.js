// HealthBar UI Component
class HealthBar extends Phaser.GameObjects.Container {
    constructor(scene, x, y, width, height, color = 0x00ff00) {
        super(scene, x, y);

        this.barWidth = width;
        this.barHeight = height;
        this.barColor = color;
        this.percent = 1;

        // Background (dark)
        this.background = scene.add.rectangle(0, 0, width, height, 0x333333);
        this.background.setStrokeStyle(1, 0x000000);
        this.add(this.background);

        // Health fill
        this.fill = scene.add.rectangle(0, 0, width - 2, height - 2, color);
        this.add(this.fill);

        scene.add.existing(this);
    }

    setPercent(percent) {
        this.percent = Phaser.Math.Clamp(percent, 0, 1);

        const newWidth = (this.barWidth - 2) * this.percent;
        this.fill.setSize(newWidth, this.barHeight - 2);
        this.fill.setX(-(this.barWidth - 2) / 2 + newWidth / 2);

        // Change color based on health
        if (this.percent > 0.6) {
            this.fill.setFillStyle(0x00ff00);
        } else if (this.percent > 0.3) {
            this.fill.setFillStyle(0xffff00);
        } else {
            this.fill.setFillStyle(0xff0000);
        }
    }

    setColor(color) {
        this.barColor = color;
        this.fill.setFillStyle(color);
    }
}
