/**
 * SAP Helpdesk Splash Screen - Immergo-style
 * Floating SAP transaction code particles, mystic theme
 */
class ViewHome extends HTMLElement {
    connectedCallback() {
        const sapTerms = [
            'VA01', 'ME21N', 'MM01', 'FB60', 'XK01', 'MIGO',
            'SE38', 'SM37', 'SU01', 'SPRO', 'VL01N', 'CO01',
            'MB51', 'FBL1N', 'ME23N', 'XD03', 'VF01', 'IW31',
            'QM01', 'PP01', 'PA20', 'ABAP', 'HANA',
            'S/4', 'BTP', 'FIORI', 'RFC', 'BAPI', 'IDOC'
        ];

        this.innerHTML = `
            <style>
                :host {
                    display: block;
                    position: relative;
                    width: 100%;
                    min-height: 100vh;
                    overflow: hidden;
                }

                .splash-particle {
                    position: absolute;
                    font-family: 'JetBrains Mono', 'Courier New', monospace;
                    pointer-events: none;
                    opacity: 0;
                    animation: floatUp 15s linear infinite;
                    color: var(--color-accent-primary);
                    font-size: 0.9rem;
                    font-weight: 700;
                    z-index: 0;
                    filter: blur(1px);
                }

                @keyframes floatUp {
                    0% { transform: translateY(110vh) translateX(0) rotate(0deg); opacity: 0; }
                    20% { opacity: 0.25; transform: translateY(80vh) translateX(30px) rotate(15deg); }
                    50% { transform: translateY(50vh) translateX(-30px) rotate(-10deg); }
                    80% { opacity: 0.25; transform: translateY(20vh) translateX(30px) rotate(15deg); }
                    100% { transform: translateY(-20vh) translateX(0) rotate(0deg); opacity: 0; }
                }

                .mystic-title {
                    font-weight: 800;
                    letter-spacing: -0.02em;
                    line-height: normal;
                    margin-bottom: var(--spacing-sm);
                    padding: 0 var(--spacing-md);
                    padding-bottom: 0.3em;
                    background: linear-gradient(135deg, var(--color-text-main) 30%, var(--color-accent-primary));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 0 30px var(--color-accent-glow));
                    position: relative;
                    z-index: 10;
                    text-align: center;
                    font-size: clamp(2rem, 6vw, 3.5rem);
                }

                .content-wrapper {
                    position: relative;
                    z-index: 5;
                    width: 100%;
                    max-width: 1200px;
                    min-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    padding: var(--spacing-xl);
                    padding-top: 10vh;
                    padding-bottom: 15vh;
                }

                .feature-cards {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
                    gap: var(--spacing-lg);
                    max-width: 900px;
                    width: 100%;
                    margin-top: var(--spacing-xxl);
                }
            </style>

            <div class="container flex-center" style="position: relative; min-height: 100vh; flex-direction: column;">
                <div id="particles-host" style="position: absolute; inset: 0; pointer-events: none;"></div>

                <div class="content-wrapper">
                    <h1 class="mystic-title">SAP Helpdesk Agent</h1>

                    <p style="
                        font-family: var(--font-heading);
                        font-style: italic;
                        font-size: clamp(1.1rem, 3vw, 1.8rem);
                        opacity: 0.8;
                        margin-bottom: var(--spacing-xl);
                        color: var(--color-text-sub);
                        text-align: center;
                        max-width: 600px;
                    ">
                        Voice-powered SAP support with real-time screen analysis
                    </p>

                    <div class="feature-cards">
                        <div class="card" style="text-align: center; padding: var(--spacing-lg);">
                            <div style="font-size: 2rem; margin-bottom: var(--spacing-sm);">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                    <line x1="12" y1="19" x2="12" y2="23"/>
                                    <line x1="8" y1="23" x2="16" y2="23"/>
                                </svg>
                            </div>
                            <h3 style="font-size: 1.1rem; margin-bottom: var(--spacing-xs);">Voice Interaction</h3>
                            <p style="font-size: 0.85rem; opacity: 0.7; margin: 0;">Talk naturally with your AI SAP consultant</p>
                        </div>

                        <div class="card" style="text-align: center; padding: var(--spacing-lg);">
                            <div style="font-size: 2rem; margin-bottom: var(--spacing-sm);">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                                    <line x1="8" y1="21" x2="16" y2="21"/>
                                    <line x1="12" y1="17" x2="12" y2="21"/>
                                </svg>
                            </div>
                            <h3 style="font-size: 1.1rem; margin-bottom: var(--spacing-xs);">Screen Analysis</h3>
                            <p style="font-size: 0.85rem; opacity: 0.7; margin: 0;">Share your SAP screen for real-time visual guidance</p>
                        </div>

                        <div class="card" style="text-align: center; padding: var(--spacing-lg);">
                            <div style="font-size: 2rem; margin-bottom: var(--spacing-sm);">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                </svg>
                            </div>
                            <h3 style="font-size: 1.1rem; margin-bottom: var(--spacing-xs);">Auto Issue Tracking</h3>
                            <p style="font-size: 0.85rem; opacity: 0.7; margin: 0;">AI detects and logs SAP issues automatically</p>
                        </div>
                    </div>

                    <div style="margin-top: calc(var(--spacing-xxl) * 1.2); width: 100%; display: flex; justify-content: center;">
                        <button id="start-btn" class="mystic-btn">
                            Start Helpdesk Session
                        </button>
                    </div>

                    <div style="margin-top: var(--spacing-xl);">
                        <p style="font-size: 1rem; opacity: 0.5; color: var(--color-text-sub); text-align: center; line-height: 1.6;">
                            Powered by <br>
                            <span class="powered-by-link" style="cursor: default;">
                                Gemini Live API on Google Cloud
                            </span>
                        </p>
                    </div>
                </div>

                <div style="
                    position: absolute;
                    bottom: var(--spacing-lg);
                    left: 0;
                    right: 0;
                    font-size: 0.75rem;
                    opacity: 0.4;
                    max-width: 600px;
                    margin: 0 auto;
                    line-height: 1.5;
                    text-align: center;
                    padding: 0 var(--spacing-md);
                    z-index: 15;
                    color: var(--color-text-sub);
                ">
                    Built by <strong>KaarTech UK</strong> for the Gemini Live Agent Challenge
                </div>
            </div>
        `;

        // Create floating SAP particles
        const host = this.querySelector('#particles-host');
        const particleCount = 25;

        for (let i = 0; i < particleCount; i++) {
            const p = document.createElement('div');
            p.className = 'splash-particle';
            p.textContent = sapTerms[Math.floor(Math.random() * sapTerms.length)];
            p.style.left = `${Math.random() * 100}%`;
            p.style.animationDelay = `${Math.random() * 15}s`;
            p.style.animationDuration = `${10 + Math.random() * 10}s`;
            p.style.fontSize = `${0.7 + Math.random() * 0.8}rem`;
            host.appendChild(p);
        }

        this.querySelector('#start-btn').addEventListener('click', () => {
            this.style.filter = 'blur(10px) brightness(1.2)';
            this.style.opacity = '0';
            this.style.transform = 'scale(1.05)';
            this.style.transition = 'all 0.6s cubic-bezier(0.19, 1, 0.22, 1)';

            setTimeout(() => {
                this.dispatchEvent(new CustomEvent('navigate', {
                    bubbles: true,
                    detail: { view: 'session' }
                }));
            }, 500);
        });
    }
}

customElements.define('view-home', ViewHome);
