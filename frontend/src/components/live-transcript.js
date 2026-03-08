/**
 * Live Transcript - Immergo-style with role labels
 */
class LiveTranscript extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._rendered = false;
    }

    connectedCallback() {
        if (!this._rendered) {
            this.render();
            this._rendered = true;
        }
    }

    addInputTranscript(text, isFinal) {
        this.updateTranscript('user', text, isFinal);
    }

    addOutputTranscript(text, isFinal) {
        this.updateTranscript('model', text, isFinal);
    }

    finalizeAll() {
        const container = this.shadowRoot.querySelector('.transcript-container');
        if (!container) return;
        const activeBubbles = container.querySelectorAll('.bubble.temp');
        activeBubbles.forEach(b => {
            b.classList.remove('temp');
            b.dataset.role = null;
        });
    }

    clear() {
        const container = this.shadowRoot.querySelector('.transcript-container');
        if (container) {
            container.innerHTML = '';
        }
    }

    updateTranscript(role, text, isFinal) {
        const container = this.shadowRoot.querySelector('.transcript-container');
        if (!container) return;

        // Finalize other roles
        const activeBubbles = container.querySelectorAll('.bubble.temp');
        activeBubbles.forEach(b => {
            if (b.dataset.role !== role) {
                b.classList.remove('temp');
                b.dataset.role = null;
            }
        });

        let bubble = container.querySelector(`.bubble.temp[data-role="${role}"]`);

        if (!bubble) {
            bubble = document.createElement('div');
            bubble.className = `bubble temp ${role}`;
            bubble.dataset.role = role;

            const label = document.createElement('span');
            label.className = 'bubble-label';
            label.textContent = role === 'user' ? 'You' : 'SAP Agent';
            bubble.appendChild(label);

            container.appendChild(bubble);
            container.scrollTop = container.scrollHeight;
        }

        const currentText = bubble.textContent;
        const labelText = role === 'user' ? 'You' : 'SAP Agent';
        const contentText = currentText.replace(labelText, '').trim();
        if (contentText.length > 0 && !contentText.endsWith(' ') && !text.startsWith(' ')) {
            if (/^[a-zA-Z0-9\u00C0-\u024F]/.test(text)) {
                bubble.appendChild(document.createTextNode(' '));
            }
        }

        const span = document.createElement('span');
        span.textContent = text;
        span.className = 'fade-span';
        bubble.appendChild(span);

        container.scrollTop = container.scrollHeight;
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    font-family: 'Nunito', system-ui, sans-serif;
                }

                .transcript-container {
                    height: 100%;
                    overflow-y: auto;
                    padding: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    scroll-behavior: smooth;
                    mask-image: linear-gradient(to bottom, transparent 0px, black 60px, black calc(100% - 60px), transparent 100%);
                    -webkit-mask-image: linear-gradient(to bottom, transparent 0px, black 60px, black calc(100% - 60px), transparent 100%);
                }

                .transcript-container::after {
                    content: "";
                    display: block;
                    min-height: 120px;
                    flex-shrink: 0;
                }

                .bubble {
                    max-width: 85%;
                    padding: 0.5rem 1rem;
                    font-size: 1rem;
                    line-height: 1.5;
                    animation: popIn 0.5s ease forwards;
                    word-wrap: break-word;
                    border-radius: 12px;
                }

                .bubble-label {
                    display: block;
                    font-size: 0.65rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    margin-bottom: 0.2rem;
                    opacity: 0.5;
                }

                .fade-span {
                    animation: fadeIn 1s ease forwards;
                    opacity: 0;
                }

                .bubble.model {
                    align-self: flex-start;
                    color: var(--color-text-main, #eaddcf);
                    text-align: left;
                    background: rgba(77, 159, 247, 0.06);
                    border: 1px solid rgba(77, 159, 247, 0.1);
                }

                .bubble.model .bubble-label {
                    color: var(--color-accent-primary, #4d9ff7);
                }

                .bubble.user {
                    align-self: flex-end;
                    color: var(--color-accent-secondary, #f0ab00);
                    text-align: right;
                    font-weight: 500;
                    background: rgba(240, 171, 0, 0.06);
                    border: 1px solid rgba(240, 171, 0, 0.1);
                }

                .bubble.user .bubble-label {
                    color: var(--color-accent-secondary, #f0ab00);
                }

                .bubble.temp {
                    opacity: 0.7;
                }

                @keyframes popIn {
                    0% { opacity: 0; transform: translateY(10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }

                @keyframes fadeIn {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }

                .transcript-container::-webkit-scrollbar {
                    width: 0px;
                    background: transparent;
                }
            </style>
            <div class="transcript-container"></div>
        `;
    }
}

customElements.define('live-transcript', LiveTranscript);
