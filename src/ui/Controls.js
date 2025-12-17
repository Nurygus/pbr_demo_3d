export class UIControls {
    constructor(onToggleLighting) {
        this.isDay = true;
        this.toggleButton = document.getElementById('toggle-lighting');
        this.init(onToggleLighting);
    }

    init(onToggleLighting) {
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', () => {
                this.isDay = !this.isDay;
                this.updateButtonText();
                if (onToggleLighting) {
                    onToggleLighting(this.isDay ? 'day' : 'night');
                }
            });
        }
    }

    updateButtonText() {
        if (this.toggleButton) {
            this.toggleButton.textContent = this.isDay ? 'Вечер' : 'День';
        }
    }
}

