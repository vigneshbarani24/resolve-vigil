/**
 * Vigil — Landing Screen
 * Dual-agent command center aesthetic
 */
class ViewHome extends HTMLElement {
    connectedCallback() {
        this.innerHTML = `
            <style>
                :host {
                    display: block;
                    position: relative;
                    width: 100%;
                    min-height: 100vh;
                    overflow: hidden;
                }

                /* ─── Animated Gradient Mesh Background ─── */
                .bg-mesh {
                    position: fixed;
                    inset: 0;
                    z-index: 0;
                    overflow: hidden;
                }
                .bg-mesh .orb {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(120px);
                    opacity: 0.35;
                    animation: orbFloat 20s ease-in-out infinite;
                }
                .bg-mesh .orb-1 {
                    width: 600px; height: 600px;
                    background: radial-gradient(circle, var(--color-theepa) 0%, transparent 70%);
                    top: -10%; left: -10%;
                    animation-delay: 0s;
                }
                .bg-mesh .orb-2 {
                    width: 500px; height: 500px;
                    background: radial-gradient(circle, var(--color-vigil) 0%, transparent 70%);
                    bottom: -15%; right: -8%;
                    animation-delay: -7s;
                    animation-duration: 25s;
                }
                .bg-mesh .orb-3 {
                    width: 300px; height: 300px;
                    background: radial-gradient(circle, var(--color-accent-primary) 0%, transparent 70%);
                    top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    animation-delay: -14s;
                    animation-duration: 18s;
                    opacity: 0.15;
                }
                @keyframes orbFloat {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    25% { transform: translate(40px, -30px) scale(1.1); }
                    50% { transform: translate(-20px, 40px) scale(0.95); }
                    75% { transform: translate(30px, 20px) scale(1.05); }
                }

                /* ─── Grid Overlay ─── */
                .bg-grid {
                    position: fixed;
                    inset: 0;
                    z-index: 1;
                    background-image:
                        linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
                    background-size: 60px 60px;
                    mask-image: radial-gradient(ellipse 80% 70% at 50% 40%, black 30%, transparent 100%);
                    -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 40%, black 30%, transparent 100%);
                }

                /* ─── Content ─── */
                .content {
                    position: relative;
                    z-index: 10;
                    width: 100%;
                    max-width: 1100px;
                    margin: 0 auto;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    padding: 60px 24px 80px;
                    gap: 0;
                }

                /* ─── Badge ─── */
                .badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 16px;
                    border-radius: 9999px;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.08);
                    font-size: 0.72rem;
                    font-weight: 600;
                    color: var(--color-text-sub);
                    letter-spacing: 0.04em;
                    margin-bottom: 24px;
                    animation: fadeInUp 0.8s cubic-bezier(0.19, 1, 0.22, 1) both;
                    backdrop-filter: blur(8px);
                }
                .badge .dot {
                    width: 6px; height: 6px;
                    border-radius: 50%;
                    background: var(--color-vigil);
                    box-shadow: 0 0 8px var(--color-vigil-glow);
                    animation: pulse 2s ease infinite;
                }

                /* ─── Title ─── */
                .title {
                    font-family: var(--font-heading);
                    font-weight: 800;
                    font-size: clamp(3rem, 8vw, 5.5rem);
                    letter-spacing: -0.04em;
                    line-height: 1;
                    margin: 0 0 16px;
                    text-align: center;
                    animation: fadeInUp 0.8s cubic-bezier(0.19, 1, 0.22, 1) 0.1s both;
                }
                .title .resolve {
                    background: linear-gradient(135deg, var(--color-text-main) 40%, var(--color-theepa));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
                .title .plus {
                    color: var(--color-text-sub);
                    opacity: 0.25;
                    -webkit-text-fill-color: initial;
                    font-weight: 400;
                    margin: 0 4px;
                }
                .title .vigil {
                    background: linear-gradient(135deg, var(--color-text-main) 40%, var(--color-vigil));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                /* ─── Tagline ─── */
                .tagline {
                    font-size: clamp(1rem, 2.5vw, 1.35rem);
                    color: var(--color-text-sub);
                    text-align: center;
                    max-width: 600px;
                    margin: 0 0 48px;
                    line-height: 1.6;
                    font-weight: 400;
                    animation: fadeInUp 0.8s cubic-bezier(0.19, 1, 0.22, 1) 0.2s both;
                }
                .tagline strong {
                    color: var(--color-text-main);
                    font-weight: 600;
                }

                /* ─── Agent Cards ─── */
                .agents {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    max-width: 720px;
                    width: 100%;
                    margin-bottom: 48px;
                    animation: fadeInUp 0.8s cubic-bezier(0.19, 1, 0.22, 1) 0.3s both;
                }

                .agent-card {
                    position: relative;
                    padding: 28px 24px;
                    border-radius: 18px;
                    background: rgba(16, 18, 28, 0.6);
                    border: 1px solid rgba(255,255,255,0.06);
                    backdrop-filter: blur(12px);
                    transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
                    overflow: hidden;
                }
                .agent-card::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: 18px;
                    padding: 1px;
                    background: linear-gradient(135deg, transparent 40%, var(--card-accent));
                    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                    opacity: 0;
                    transition: opacity 0.4s;
                }
                .agent-card:hover::before { opacity: 1; }
                .agent-card:hover {
                    transform: translateY(-4px);
                    border-color: transparent;
                    box-shadow: 0 16px 48px rgba(0,0,0,0.4);
                }

                .agent-card.theepa { --card-accent: var(--color-theepa); }
                .agent-card.vigil { --card-accent: var(--color-vigil); }

                .agent-icon {
                    width: 44px; height: 44px;
                    border-radius: 12px;
                    display: flex; align-items: center; justify-content: center;
                    margin-bottom: 16px;
                    font-size: 1.3rem;
                }
                .agent-card.theepa .agent-icon {
                    background: var(--color-theepa-glow);
                    border: 1px solid rgba(232, 167, 62, 0.15);
                    color: var(--color-theepa);
                }
                .agent-card.vigil .agent-icon {
                    background: var(--color-vigil-glow);
                    border: 1px solid rgba(0, 212, 170, 0.15);
                    color: var(--color-vigil);
                }

                .agent-name {
                    font-family: var(--font-heading);
                    font-weight: 700;
                    font-size: 1.15rem;
                    margin-bottom: 4px;
                    color: var(--color-text-main);
                    letter-spacing: -0.01em;
                }
                .agent-role {
                    font-size: 0.72rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    margin-bottom: 12px;
                }
                .agent-card.theepa .agent-role { color: var(--color-theepa); }
                .agent-card.vigil .agent-role { color: var(--color-vigil); }

                .agent-desc {
                    font-size: 0.85rem;
                    color: var(--color-text-sub);
                    line-height: 1.55;
                    margin: 0 0 16px;
                }

                .agent-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }
                .agent-tag {
                    font-size: 0.65rem;
                    font-weight: 600;
                    padding: 3px 10px;
                    border-radius: 9999px;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.06);
                    color: var(--color-text-sub);
                    letter-spacing: 0.02em;
                }

                /* ─── Stats Bar ─── */
                .stats {
                    display: flex;
                    align-items: center;
                    gap: 32px;
                    margin-bottom: 36px;
                    animation: fadeInUp 0.8s cubic-bezier(0.19, 1, 0.22, 1) 0.4s both;
                }
                .stat {
                    text-align: center;
                }
                .stat-value {
                    font-family: var(--font-heading);
                    font-weight: 800;
                    font-size: 1.5rem;
                    color: var(--color-text-main);
                    letter-spacing: -0.02em;
                }
                .stat-label {
                    font-size: 0.65rem;
                    font-weight: 600;
                    color: var(--color-text-sub);
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    margin-top: 2px;
                }
                .stat-divider {
                    width: 1px;
                    height: 28px;
                    background: rgba(255,255,255,0.08);
                }

                /* ─── Controls ─── */
                .controls {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                    animation: fadeInUp 0.8s cubic-bezier(0.19, 1, 0.22, 1) 0.5s both;
                }

                .lang-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .lang-label {
                    font-size: 0.7rem;
                    font-weight: 700;
                    color: var(--color-text-sub);
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                }
                .lang-select {
                    padding: 8px 20px 8px 14px;
                    border-radius: 9999px;
                    background: rgba(16, 18, 28, 0.7);
                    color: var(--color-text-main);
                    border: 1px solid rgba(255,255,255,0.08);
                    font-family: var(--font-body);
                    font-size: 0.85rem;
                    font-weight: 500;
                    cursor: pointer;
                    backdrop-filter: blur(8px);
                    outline: none;
                    transition: border-color 0.2s;
                    appearance: none;
                    -webkit-appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b8fa4' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 12px center;
                    padding-right: 32px;
                }
                .lang-select:focus {
                    border-color: var(--color-accent-primary);
                }
                .lang-select option {
                    background: var(--color-surface-solid);
                    color: var(--color-text-main);
                }

                .start-btn {
                    position: relative;
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    padding: 18px 52px;
                    border-radius: 9999px;
                    border: none;
                    font-family: var(--font-heading);
                    font-size: 1.05rem;
                    font-weight: 700;
                    letter-spacing: 0.02em;
                    cursor: pointer;
                    overflow: hidden;
                    background: linear-gradient(135deg, var(--color-accent-primary), #6bb5ff);
                    color: #fff;
                    box-shadow: 0 8px 32px rgba(77, 159, 247, 0.3),
                                0 0 0 1px rgba(255,255,255,0.06) inset;
                    transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
                }
                .start-btn:hover {
                    transform: translateY(-3px) scale(1.02);
                    box-shadow: 0 16px 56px rgba(77, 159, 247, 0.4),
                                0 0 0 2px rgba(255,255,255,0.1) inset;
                }
                .start-btn::after {
                    content: '';
                    position: absolute;
                    top: 0; left: 0;
                    width: 200%; height: 100%;
                    background: linear-gradient(115deg, transparent 0%, transparent 42%, rgba(255, 255, 255, 0.2) 50%, transparent 58%, transparent 100%);
                    transform: translateX(-150%) skewX(-15deg);
                    transition: transform 0.7s;
                }
                .start-btn:hover::after {
                    transform: translateX(150%) skewX(-15deg);
                }
                .start-btn svg {
                    transition: transform 0.3s;
                }
                .start-btn:hover svg {
                    transform: translateX(3px);
                }

                /* ─── Footer ─── */
                .footer {
                    margin-top: 40px;
                    text-align: center;
                    animation: fadeInUp 0.8s cubic-bezier(0.19, 1, 0.22, 1) 0.6s both;
                }
                .footer-text {
                    font-size: 0.7rem;
                    color: var(--color-text-sub);
                    opacity: 0.4;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                }
                .footer-text svg { opacity: 0.5; }

                /* ─── Responsive ─── */
                @media (max-width: 640px) {
                    .agents {
                        grid-template-columns: 1fr;
                        max-width: 400px;
                    }
                    .stats { gap: 20px; }
                    .stat-value { font-size: 1.2rem; }
                    .content { padding: 40px 16px 60px; }
                }

                /* ─── Onboarding Card ─── */
                .onboarding {
                    width: 100%;
                    max-width: 520px;
                    padding: 24px 28px;
                    border-radius: 18px;
                    background: rgba(16, 18, 28, 0.55);
                    border: 1px solid rgba(255,255,255,0.06);
                    backdrop-filter: blur(16px);
                    margin-bottom: 32px;
                    animation: fadeInUp 0.8s cubic-bezier(0.19, 1, 0.22, 1) 0.35s both;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.25);
                }
                .onboard-title {
                    font-size: 0.65rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: var(--color-text-sub);
                    margin-bottom: 14px;
                }
                .onboard-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 16px;
                }
                .onboard-input {
                    flex: 1;
                    padding: 8px 16px;
                    border-radius: 9999px;
                    background: rgba(16, 18, 28, 0.7);
                    color: var(--color-text-main);
                    border: 1px solid rgba(255,255,255,0.08);
                    font-family: var(--font-body);
                    font-size: 0.85rem;
                    font-weight: 500;
                    outline: none;
                    backdrop-filter: blur(8px);
                    transition: border-color 0.2s;
                }
                .onboard-input::placeholder {
                    color: var(--color-text-sub);
                    opacity: 0.5;
                }
                .onboard-input:focus {
                    border-color: var(--color-accent-primary);
                }

                /* ─── Tab System ─── */
                .home-tabs {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    padding: 4px;
                    border-radius: 12px;
                    background: rgba(16, 18, 28, 0.5);
                    border: 1px solid rgba(255,255,255,0.05);
                    backdrop-filter: blur(8px);
                    margin-bottom: 20px;
                    animation: fadeInUp 0.8s cubic-bezier(0.19, 1, 0.22, 1) 0.45s both;
                }
                .home-tab {
                    padding: 8px 22px;
                    border-radius: 9px;
                    border: none;
                    background: transparent;
                    color: var(--color-text-sub);
                    font-family: var(--font-body);
                    font-size: 0.78rem;
                    font-weight: 600;
                    letter-spacing: 0.02em;
                    cursor: pointer;
                    transition: all 0.25s ease;
                }
                .home-tab:hover {
                    color: var(--color-text-main);
                    background: rgba(255,255,255,0.04);
                }
                .home-tab.active {
                    color: var(--color-text-main);
                    background: rgba(255,255,255,0.08);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                }

                .tab-content {
                    width: 100%;
                    max-width: 720px;
                    animation: fadeInUp 0.4s ease both;
                }
                .tab-content.hidden {
                    display: none;
                }

                /* ─── Logs Panel ─── */
                .logs-panel {
                    width: 100%;
                    border-radius: 16px;
                    background: rgba(8, 9, 15, 0.7);
                    border: 1px solid rgba(0, 212, 170, 0.1);
                    backdrop-filter: blur(16px);
                    overflow: hidden;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
                }
                .logs-metrics {
                    display: flex;
                    gap: 2px;
                    padding: 14px 16px;
                    background: linear-gradient(135deg, rgba(0,212,170,0.06), rgba(0,212,170,0.02));
                    border-bottom: 1px solid rgba(0,212,170,0.08);
                }
                .logs-metric {
                    flex: 1;
                    text-align: center;
                    padding: 6px 4px;
                }
                .logs-metric-val {
                    font-family: var(--font-heading);
                    font-weight: 800;
                    font-size: 1.15rem;
                    color: var(--color-text-main);
                    letter-spacing: -0.02em;
                }
                .logs-metric-label {
                    font-size: 0.6rem;
                    font-weight: 600;
                    color: var(--color-text-sub);
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    margin-top: 2px;
                }
                .logs-feed {
                    max-height: 380px;
                    overflow-y: auto;
                    padding: 8px 10px;
                }
                .logs-feed::-webkit-scrollbar { width: 5px; }
                .logs-feed::-webkit-scrollbar-thumb {
                    background: rgba(0,212,170,0.15);
                    border-radius: 4px;
                }
                .logs-empty {
                    padding: 40px 20px;
                    text-align: center;
                    color: var(--color-text-sub);
                    opacity: 0.45;
                    font-size: 0.82rem;
                }
                .log-entry {
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                    padding: 8px 10px;
                    margin-bottom: 4px;
                    border-radius: 8px;
                    border-left: 3px solid var(--log-accent, #6b7280);
                    background: rgba(255,255,255,0.015);
                    transition: background 0.15s;
                }
                .log-entry:hover {
                    background: rgba(255,255,255,0.04);
                }
                .log-entry-row {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .log-icon {
                    font-size: 14px;
                    flex-shrink: 0;
                    width: 20px;
                    text-align: center;
                }
                .log-cat {
                    font-family: var(--font-heading);
                    font-weight: 800;
                    font-size: 0.6rem;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    min-width: 50px;
                }
                .log-action {
                    flex: 1;
                    color: var(--color-text-main);
                    font-size: 0.78rem;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    opacity: 0.85;
                }
                .log-time {
                    font-size: 0.65rem;
                    color: var(--color-text-sub);
                    opacity: 0.4;
                    flex-shrink: 0;
                    font-family: 'JetBrains Mono', monospace;
                }
                .log-detail {
                    padding-left: 28px;
                    font-size: 0.7rem;
                    color: var(--color-text-sub);
                    opacity: 0.55;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .log-badge {
                    font-size: 0.58rem;
                    font-weight: 800;
                    padding: 1px 7px;
                    border-radius: 4px;
                    letter-spacing: 0.04em;
                    flex-shrink: 0;
                }

                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(24px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            </style>

            <!-- Background -->
            <div class="bg-mesh">
                <div class="orb orb-1"></div>
                <div class="orb orb-2"></div>
                <div class="orb orb-3"></div>
            </div>
            <div class="bg-grid"></div>

            <!-- Content -->
            <div class="content">

                <div class="badge">
                    <span class="dot"></span>
                    Gemini Live Agent Challenge
                </div>

                <h1 class="title">
                    <span class="vigil">Vigil</span>
                </h1>

                <p class="tagline">
                    <strong>AI-Powered Scam Shield & IT Support.</strong> Voice-first protection for every page you visit.
                    Vigil shields you from scams. Both powered by Gemini Live.
                </p>

                <!-- Agent Cards -->
                <div class="agents">
                    <div class="agent-card theepa">
                        <div class="agent-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                        </div>
                        <div class="agent-name">Virtual Assistant</div>
                        <div class="agent-role">Virtual Internal Assistant</div>
                        <p class="agent-desc">Voice-first IT support. Sees your screen, speaks 20 languages, runs 9 tools in parallel to resolve issues live.</p>
                        <div class="agent-tags">
                            <span class="agent-tag">Voice</span>
                            <span class="agent-tag">Vision</span>
                            <span class="agent-tag">9 Tools</span>
                            <span class="agent-tag">ITSM</span>
                        </div>
                    </div>

                    <div class="agent-card vigil">
                        <div class="agent-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        </div>
                        <div class="agent-name">Vigil</div>
                        <div class="agent-role">Shield Mode</div>
                        <p class="agent-desc">Auto-scans every page you visit. 3-layer detection: Web Risk API, Gemini Vision, and Search grounding.</p>
                        <div class="agent-tags">
                            <span class="agent-tag">Auto-Scan</span>
                            <span class="agent-tag">Phishing</span>
                            <span class="agent-tag">3-Layer</span>
                            <span class="agent-tag">Extension</span>
                        </div>
                    </div>
                </div>

                <!-- Quick Onboarding -->
                <div class="onboarding" id="onboarding-section">
                    <div class="onboard-title">Quick Setup</div>
                    <div class="onboard-row">
                        <input type="text" id="user-name" class="onboard-input" placeholder="Your name" />
                        <select id="language-select" class="lang-select">
                            <option value="English">English</option>
                            <option value="German">German</option>
                            <option value="French">French</option>
                            <option value="Spanish">Spanish</option>
                            <option value="Portuguese">Portuguese</option>
                            <option value="Japanese">Japanese</option>
                            <option value="Chinese">Chinese</option>
                            <option value="Korean">Korean</option>
                            <option value="Hindi">Hindi</option>
                            <option value="Arabic">Arabic</option>
                            <option value="Turkish">Turkish</option>
                            <option value="Italian">Italian</option>
                            <option value="Dutch">Dutch</option>
                            <option value="Tamil">Tamil</option>
                            <option value="Telugu">Telugu</option>
                        </select>
                    </div>
                    <button id="start-btn" class="start-btn">
                        Start Voice Session
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                    </button>
                </div>

                <!-- Tabs: Logs -->
                <div class="home-tabs">
                    <button class="home-tab active" id="tab-overview">Overview</button>
                    <button class="home-tab" id="tab-logs">System Logs</button>
                </div>

                <!-- Overview (stats) -->
                <div class="tab-content" id="content-overview">
                    <div class="stats">
                        <div class="stat">
                            <div class="stat-value">9</div>
                            <div class="stat-label">Tools</div>
                        </div>
                        <div class="stat-divider"></div>
                        <div class="stat">
                            <div class="stat-value">20</div>
                            <div class="stat-label">Languages</div>
                        </div>
                        <div class="stat-divider"></div>
                        <div class="stat">
                            <div class="stat-value">4</div>
                            <div class="stat-label">Shield Layers</div>
                        </div>
                        <div class="stat-divider"></div>
                        <div class="stat">
                            <div class="stat-value">4</div>
                            <div class="stat-label">Diagnostic Stages</div>
                        </div>
                    </div>
                </div>

                <!-- Logs Tab -->
                <div class="tab-content hidden" id="content-logs">
                    <div class="logs-panel" id="logs-panel">
                        <div class="logs-metrics" id="logs-metrics"></div>
                        <div class="logs-feed" id="logs-feed">
                            <div class="logs-empty">Waiting for activity... Use the app or Chrome extension to generate events.</div>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="footer">
                    <div class="footer-text">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        Built with Gemini Live API, Google ADK, and Vertex AI
                    </div>
                </div>

            </div>
        `;

        // Start button
        this.querySelector('#start-btn').addEventListener('click', () => {
            const language = this.querySelector('#language-select').value;
            const userName = this.querySelector('#user-name').value.trim();
            this.style.opacity = '0';
            this.style.transform = 'scale(1.02)';
            this.style.filter = 'blur(8px)';
            this.style.transition = 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)';

            setTimeout(() => {
                this.dispatchEvent(new CustomEvent('navigate', {
                    bubbles: true,
                    detail: { view: 'session', language, userName }
                }));
            }, 400);
        });

        // ─── Tab switching ───
        this._logsPollTimer = null;
        this._logsActivities = [];
        this._logsSystem = {};

        const tabOverview = this.querySelector('#tab-overview');
        const tabLogs = this.querySelector('#tab-logs');
        const contentOverview = this.querySelector('#content-overview');
        const contentLogs = this.querySelector('#content-logs');

        tabOverview.addEventListener('click', () => {
            tabOverview.classList.add('active');
            tabLogs.classList.remove('active');
            contentOverview.classList.remove('hidden');
            contentLogs.classList.add('hidden');
            this._stopLogsPolling();
        });

        tabLogs.addEventListener('click', () => {
            tabLogs.classList.add('active');
            tabOverview.classList.remove('active');
            contentLogs.classList.remove('hidden');
            contentOverview.classList.add('hidden');
            this._fetchLogs();
            this._startLogsPolling();
        });
    }

    disconnectedCallback() {
        this._stopLogsPolling();
    }

    _startLogsPolling() {
        this._stopLogsPolling();
        this._logsPollTimer = setInterval(() => this._fetchLogs(), 2000);
    }

    _stopLogsPolling() {
        if (this._logsPollTimer) {
            clearInterval(this._logsPollTimer);
            this._logsPollTimer = null;
        }
    }

    async _fetchLogs() {
        try {
            const resp = await fetch('/api/activity?limit=30');
            if (!resp.ok) return;
            const data = await resp.json();
            this._logsActivities = data.activities || [];
            this._logsSystem = data.system || {};
            this._renderLogMetrics();
            this._renderLogFeed();
        } catch (e) { /* silently fail */ }
    }

    _renderLogMetrics() {
        const el = this.querySelector('#logs-metrics');
        if (!el) return;
        const sys = this._logsSystem;
        const acts = this._logsActivities;
        const up = sys.uptime_seconds || 0;
        const scanCount = acts.filter(a => a.category === 'shield' && a.action.includes('complete')).length;
        const toolCount = acts.filter(a => a.category === 'tool').length;

        el.innerHTML = `
            <div class="logs-metric">
                <div class="logs-metric-val">${sys.adk_enabled ? 'ADK' : 'LIVE'}</div>
                <div class="logs-metric-label">Mode</div>
            </div>
            <div class="logs-metric">
                <div class="logs-metric-val">${scanCount}</div>
                <div class="logs-metric-label">Scans</div>
            </div>
            <div class="logs-metric">
                <div class="logs-metric-val">${toolCount}</div>
                <div class="logs-metric-label">Tool Calls</div>
            </div>
            <div class="logs-metric">
                <div class="logs-metric-val">${Math.floor(up / 60)}m${up % 60}s</div>
                <div class="logs-metric-label">Uptime</div>
            </div>
        `;
    }

    _renderLogFeed() {
        const el = this.querySelector('#logs-feed');
        if (!el) return;

        if (this._logsActivities.length === 0) {
            el.innerHTML = '<div class="logs-empty">Waiting for activity... Use the app or Chrome extension to generate events.</div>';
            return;
        }

        const colorMap = { shield: '#00d4aa', voice: '#e8a73e', tool: '#a78bfa', adk: '#60a5fa', system: '#6b7280', nav: '#f59e0b' };
        const iconMap = { shield: '\u{1F6E1}', voice: '\u{1F399}', tool: '\u{1F527}', adk: '\u{1F916}', system: '\u2699\uFE0F', nav: '\u{1F9ED}' };

        el.innerHTML = this._logsActivities.map(a => {
            const icon = iconMap[a.category] || '\u{1F4CC}';
            const color = colorMap[a.category] || '#9ca3af';
            const isShieldComplete = a.category === 'shield' && a.action.includes('complete');

            let badge = '';
            if (isShieldComplete) {
                const match = a.action.match(/\u2192 (\w+)/);
                const level = match ? match[1] : 'SAFE';
                const bc = level === 'SAFE' ? '#81c784' : level === 'MEDIUM' ? '#f0ab00' : (level === 'HIGH' || level === 'CRITICAL') ? '#e57373' : '#81c784';
                badge = `<span class="log-badge" style="background:${bc}20;color:${bc};border:1px solid ${bc}40">${level}</span>`;
            }

            const detail = a.detail ? `<div class="log-detail">${this._esc(a.detail)}</div>` : '';

            return `
                <div class="log-entry" style="--log-accent:${color}">
                    <div class="log-entry-row">
                        <span class="log-icon">${icon}</span>
                        <span class="log-cat" style="color:${color}">${a.category.toUpperCase()}</span>
                        <span class="log-action">${this._esc(a.action)}</span>
                        ${badge}
                        <span class="log-time">${a.ts || ''}</span>
                    </div>
                    ${detail}
                </div>
            `;
        }).join('');
    }

    _esc(s) {
        const d = document.createElement('div');
        d.textContent = s || '';
        return d.innerHTML;
    }
}

customElements.define('view-home', ViewHome);
