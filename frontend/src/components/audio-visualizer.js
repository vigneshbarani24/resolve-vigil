/**
 * Audio Visualizer - Guitar-string waveform with configurable color
 * Supports `color` attribute for visual distinction (user vs agent)
 */
class AudioVisualizer extends HTMLElement {
    static get observedAttributes() { return ['color']; }

    constructor() {
        super();
        this.active = false;
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
        this.animationId = null;
        this._color = null;
    }

    get waveColor() {
        return this._color || this.getAttribute('color') ||
            getComputedStyle(document.documentElement).getPropertyValue('--color-accent-primary').trim() || '#4d9ff7';
    }

    attributeChangedCallback(name, oldVal, newVal) {
        if (name === 'color') this._color = newVal;
    }

    connectedCallback() {
        this.style.display = 'block';
        this.style.width = '100%';
        this.style.height = '100%';

        this.innerHTML = `<canvas style="width: 100%; height: 100%; display: block;"></canvas>`;
        this.canvas = this.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(this);
        this.resize();
        this.drawIdle();
    }

    disconnectedCallback() {
        if (this.resizeObserver) this.resizeObserver.disconnect();
        this.stopAudio();
    }

    resize() {
        const rect = this.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        if (!this.active) this.drawIdle();
    }

    connect(audioContext, sourceNode) {
        if (this.analyser) {
            this.disconnect();
        }

        try {
            this.audioContext = audioContext;
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;

            this.source = sourceNode;
            this.source.connect(this.analyser);

            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);

            this.active = true;
            this.animate();
        } catch (err) {
            console.error('Error connecting visualizer:', err);
        }
    }

    disconnect() {
        this.active = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        if (this.source && this.analyser) {
            try {
                this.source.disconnect(this.analyser);
            } catch (e) {
                // Ignore
            }
        }
        this.analyser = null;
        this.source = null;
        this.audioContext = null;
        this.drawIdle();
    }

    stopAudio() {
        this.disconnect();
    }

    drawIdle() {
        const { width, height } = this.canvas;
        this.ctx.clearRect(0, 0, width, height);

        this.ctx.beginPath();
        this.ctx.moveTo(0, height / 2);
        this.ctx.lineTo(width, height / 2);
        this.ctx.strokeStyle = this.waveColor;
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 0.3;
        this.ctx.stroke();
        this.ctx.globalAlpha = 1.0;
    }

    animate() {
        if (!this.active || !this.analyser) return;

        this.animationId = requestAnimationFrame(() => this.animate());
        this.analyser.getByteTimeDomainData(this.dataArray);

        const width = this.canvas.width;
        const height = this.canvas.height;
        const ctx = this.ctx;

        ctx.clearRect(0, 0, width, height);
        ctx.lineWidth = 3;
        ctx.strokeStyle = this.waveColor;
        ctx.beginPath();

        const pointsCount = 20;
        const lerpFactor = 0.3;
        const amplitudeScale = 10.0;

        if (!this.points || this.points.length !== pointsCount) {
            this.points = new Array(pointsCount).fill(0);
        }

        const sliceWidth = width / (pointsCount - 1);
        const bufferStep = Math.floor(this.dataArray.length / pointsCount);

        for (let i = 0; i < pointsCount; i++) {
            const audioIndex = Math.min(i * bufferStep, this.dataArray.length - 1);
            let val = (this.dataArray[audioIndex] / 128.0) - 1.0;

            const normalization = i / (pointsCount - 1);
            const window = Math.sin(normalization * Math.PI);
            const targetY = val * (height * 0.4) * amplitudeScale * window;

            this.points[i] += (targetY - this.points[i]) * lerpFactor;
        }

        ctx.moveTo(0, height / 2);

        for (let i = 0; i < pointsCount; i++) {
            const x = i * sliceWidth;
            const y = (height / 2) + this.points[i];

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                const prevX = (i - 1) * sliceWidth;
                const prevY = (height / 2) + this.points[i - 1];
                const cx = (prevX + x) / 2;
                const cy = (prevY + y) / 2;
                ctx.quadraticCurveTo(prevX, prevY, cx, cy);
            }
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
    }
}

customElements.define('audio-visualizer', AudioVisualizer);
