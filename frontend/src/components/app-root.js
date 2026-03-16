import './view-home.js';
import './view-session.js';
import './view-summary.js';
import './dev-panel.js';

class AppRoot extends HTMLElement {
    constructor() {
        super();
        this.state = {
            view: 'home',
        };
    }

    connectedCallback() {
        this.innerHTML = '';

        // Theme State
        this.currentTheme = localStorage.getItem('theme') || 'system';

        // System Theme Listener
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        this.mediaQuery.addEventListener('change', () => {
            if (this.currentTheme === 'system') {
                this.applyTheme('system');
            }
        });

        this.applyTheme(this.currentTheme);

        // Header - Neural Command (minimal, floating)
        const header = document.createElement('header');
        header.style.cssText = `
            display: flex;
            justify-content: flex-end;
            align-items: center;
            padding: var(--spacing-sm) var(--spacing-md);
            gap: var(--spacing-md);
            width: 100%;
            pointer-events: none;
            position: fixed;
            top: 0;
            right: 0;
            z-index: 100;
        `;

        header.innerHTML = `
            <div style="pointer-events: auto; display: flex; align-items: center; gap: var(--spacing-sm);">
                <button id="theme-toggle" aria-label="Toggle Theme" style="
                    pointer-events: auto;
                    background: var(--color-surface);
                    color: var(--color-text-main);
                    border: var(--glass-border);
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: var(--shadow-sm);
                    font-size: 1.2rem;
                    transition: all 0.2s ease;
                    backdrop-filter: blur(10px);
                ">
                    <span class="theme-icon"></span>
                </button>
            </div>
        `;

        this.appendChild(header);

        const themeBtn = header.querySelector('#theme-toggle');
        themeBtn.onclick = () => this.cycleTheme();
        this.themeBtn = themeBtn;
        this.updateThemeBtnIcon();

        // View Container
        this.viewContainer = document.createElement('div');
        this.viewContainer.style.height = '100%';
        this.viewContainer.style.width = '100%';
        this.appendChild(this.viewContainer);

        // Dev Panel (floating, always visible)
        const devPanel = document.createElement('dev-panel');
        this.appendChild(devPanel);

        this.render();

        this.addEventListener('navigate', (e) => {
            this.state.view = e.detail.view;
            this.state.language = e.detail.language || 'English';
            this.state.token = e.detail.token || null;
            this.render();
        });
    }

    applyTheme(theme) {
        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setLightMode(!prefersDark);
        } else {
            this.setLightMode(theme === 'light');
        }
    }

    setLightMode(isLight) {
        if (isLight) {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }
    }

    cycleTheme() {
        const modes = ['dark', 'light', 'system'];
        const currentIdx = modes.indexOf(this.currentTheme);
        const nextIdx = currentIdx === -1 ? 0 : (currentIdx + 1) % modes.length;
        this.currentTheme = modes[nextIdx];
        localStorage.setItem('theme', this.currentTheme);
        this.applyTheme(this.currentTheme);
        this.updateThemeBtnIcon();
    }

    updateThemeBtnIcon() {
        if (!this.themeBtn) return;
        let icon = '', title = '';
        switch (this.currentTheme) {
            case 'light': icon = '\u2600'; title = 'Light Mode'; break;
            case 'dark': icon = '\u263E'; title = 'Dark Mode'; break;
            case 'system': icon = '\u2699'; title = 'System Default'; break;
        }
        const iconSpan = this.themeBtn.querySelector('.theme-icon');
        if (iconSpan) iconSpan.textContent = icon;
        this.themeBtn.title = title;
    }

    render() {
        if (!this.viewContainer) return;
        this.viewContainer.innerHTML = '';
        let currentView;
        switch (this.state.view) {
            case 'home':
                currentView = document.createElement('view-home');
                break;
            case 'session':
                currentView = document.createElement('view-session');
                currentView.setAttribute('language', this.state.language || 'English');
                break;
            case 'summary':
                currentView = document.createElement('view-summary');
                if (this.state.token) {
                    currentView.setAttribute('token', this.state.token);
                }
                break;
            default:
                currentView = document.createElement('view-home');
        }
        currentView.classList.add('fade-in');
        this.viewContainer.appendChild(currentView);
    }
}

customElements.define('app-root', AppRoot);
