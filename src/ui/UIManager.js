/*** START OF FILE src/ui/UIManager.js ***/

import * as THREE from 'three';
import { game } from '../core/Game.js';
import { economy } from '../logic/Economy.js';
import { director } from '../core/Director.js';
import { sceneSetup } from '../core/SceneSetup.js';
import { BALANCE } from '../config/Balance.js';
import { events, EVENTS, ECON_EVENTS, DIRECTOR_EVENTS } from '../core/Events.js';

export class UIManager {
    constructor() {
        this.elements = {
            // World UI
            uiLayer: null,
            money: null,
            debt: null,
            fish: null,
            employment: null,
            
            // Standard Modal Dialog (Menüs)
            dialog: null,
            dialogTitle: null,
            dialogText: null,
            dialogAvatar: null,
            dialogOptions: null,
            dialogCloseBtn: null,
            
            // Notifications
            toast: null,
            toastText: null,
            persistentWarning: null,
            persistentWarningText: null,

            // Panels
            objectiveContainer: null,
            collapseOverlay: null,
            crisisCardsContainer: null,

            // Cinematic / Intro
            cinematicLayer: null,
            cinematicCard: null,
            cinematicTitle: null,
            cinematicBody: null,
            cinematicAvatar: null,
            cinematicNextBtn: null,
            skipIntroBtn: null,

            // Tutorial Highlights
            tutorialOverlay: null,
            tutorialTooltip: null,
            tutorialText: null,

            // NEU: Narrative Scene (Dual Avatar System)
            narrativeScene: null,
            narrativeText: null,
            narrativeSpeakerName: null,
            narrativeActions: null,
            
            charSlotLeft: null,
            charImgLeft: null,
            charNameLeft: null,
            
            charSlotRight: null,
            charImgRight: null,
            charNameRight: null,

            // Sparbuch (Savings Book)
            savingsOverlay: null,
            savingsChecklist: null,
            savingsCalcBtn: null,
            savingsConfirmBtn: null,
            savingsForecast: null,
            savingsStamp: null,
            sterlingText: null,
            sterlingPanel: null,
            
            // Cycle UI
            cycleOverlay: null,
            cycleCloseBtn: null,
        };
        this.moneyDeltaTimeout = null;
        this.worldBarkQueue = [];
        this.worldBarkActive = false;

        this.dockPosition = new THREE.Vector3(0, 5, 100);
        this.cinematicCallback = null;
        this.savingsConfirmCallback = null;
        this.dialogOpen = false;
        
        // Asset Mapping
        this.avatars = {
            'Mo': 'assets/portraits/mo.png',
            'Kian': 'assets/portraits/kian.png',
            'Lale': 'assets/portraits/lale.png',
            'Sterling': 'assets/portraits/sterling.png',
            'Rani': 'assets/portraits/rani.png',
            "Kapt'n": 'assets/portraits/captain.png',
            'Die Crew': 'assets/portraits/crew.png', 
            'Bootsmann': 'assets/portraits/crew.png', 
            'Narrator': 'assets/portraits/narrator.png',
            'default': 'assets/portraits/captain.png'
        };

        this.sterlingQuotes = {
            open: [
                "Gefühle kosten Geld. Lassen Sie uns rational sein.",
                "Zeit, den Fettgürtel enger zu schnallen.",
                "Zahlen lügen nicht. Menschen schon."
            ],
            check: [
                "Ein Anfang. Aber warum zögern Sie?",
                "Besser als nichts. Aber nicht gut genug.",
                "Exzellent. Das braucht niemand.",
                "Reiner Luxus. Weg damit."
            ],
            calc: [
                "Sehen Sie diese Zahl? Das ist IHR Gewinn.",
                "Die Mathematik lügt nicht."
            ],
            confirm: [
                "Willkommen in der Welt der Erwachsenen.",
                "Schmerzhaft für andere, profitabel für Sie.",
                "So sieht Fortschritt aus."
            ]
        };

        this.activeBillboards = new Map(); // Persistente Billboards für Sequenzen
        this.currentDialogId = null;
        this.guidanceSprite = null;
        this.guidanceTarget = null;
        this.sterlingTimeout = null;
        // Start mit Default, wird über DIRECTOR_EVENTS.PHASE_CHANGED aktualisiert
        this.visiblePhaseId = 'TUTORIAL';

        // Wake Lock für Display-Aktivierung
        this.wakeLock = null;
    }

    init() {
        // --- DOM Elements Binding ---
        this.elements.uiLayer = document.getElementById('ui-layer');
        this.elements.money = document.getElementById('stat-money');
        this.elements.debt = document.getElementById('stat-debt');
        this.elements.fish = document.getElementById('stat-fish');
        this.elements.moneyDelta = null;
        
        // Standard Dialog (Menüs)
        this.elements.dialog = document.getElementById('dialog-overlay');
        this.elements.dialogTitle = document.getElementById('dialog-title');
        this.elements.dialogText = document.getElementById('dialog-text');
        this.elements.dialogAvatar = document.getElementById('dialog-avatar');
        this.elements.dialogOptions = document.getElementById('dialog-options');
        this.elements.dialogCloseBtn = document.getElementById('dialog-close-btn');

        // Toasts
        this.elements.toast = document.getElementById('toast-message');
        this.elements.toastText = document.getElementById('toast-text');
        this.elements.persistentWarning = document.getElementById('persistent-warning');
        this.elements.persistentWarningText = document.getElementById('persistent-warning-text');

        // Cinematic / Intro
        this.elements.cinematicLayer = document.getElementById('cinematic-layer');
        this.elements.cinematicCard = document.getElementById('cinematic-card');
        this.elements.cinematicTitle = document.getElementById('cinematic-title');
        this.elements.cinematicBody = document.getElementById('cinematic-body');
        this.elements.cinematicAvatar = document.getElementById('cinematic-avatar');
        this.elements.cinematicNextBtn = document.getElementById('cinematic-next-btn');
        this.elements.skipIntroBtn = document.getElementById('skip-intro-btn');

        // Tutorial
        this.elements.tutorialOverlay = document.getElementById('tutorial-overlay');
        this.elements.tutorialTooltip = document.getElementById('tutorial-tooltip');
        this.elements.tutorialText = document.getElementById('tutorial-text');

        // --- NEU: Narrative Scene Bindings ---
        this.elements.narrativeScene = document.getElementById('narrative-scene');
        this.elements.narrativeText = document.getElementById('narrative-text');
        this.elements.narrativeSpeakerName = document.getElementById('narrative-speaker-name');
        this.elements.narrativeActions = document.getElementById('narrative-actions');

        this.elements.charSlotLeft = document.getElementById('char-slot-left');
        this.elements.charImgLeft = document.getElementById('char-img-left');
        this.elements.charNameLeft = document.getElementById('char-name-left');

        this.elements.charSlotRight = document.getElementById('char-slot-right');
        this.elements.charImgRight = document.getElementById('char-img-right');
        this.elements.charNameRight = document.getElementById('char-name-right');

        // Sparbuch UI
        this.elements.savingsOverlay = document.getElementById('savings-book-overlay');
        this.elements.savingsChecklist = document.getElementById('savings-checklist');
        this.elements.savingsCalcBtn = document.getElementById('savings-calc-btn');
        this.elements.savingsConfirmBtn = document.getElementById('savings-confirm-btn');

        // Kreditvertrag UI
        this.elements.loanOverlay = document.getElementById('loan-contract-overlay');
        this.elements.loanSignatureBox = document.getElementById('loan-signature-box');
        this.elements.loanSignBtn = document.getElementById('loan-sign-btn');
        this.elements.loanCancelBtn = document.getElementById('loan-cancel-btn');
        this.elements.savingsForecast = document.getElementById('savings-forecast');
        this.elements.savingsStamp = document.getElementById('savings-stamp');
        this.elements.sterlingText = document.getElementById('sterling-text');
        this.elements.sterlingPanel = document.getElementById('sterling-advisor');
        this.elements.crisisCardsContainer = document.getElementById('crisis-cards-container');
        this.elements.cycleOverlay = document.getElementById('cycle-overlay');
        this.elements.cycleCloseBtn = document.getElementById('cycle-close-btn');

        if (this.elements.cycleCloseBtn) {
            this.elements.cycleCloseBtn.onclick = () => this.hideCycleExplanation();
        }

        // Fullscreen Button
        this.elements.fullscreenBtn = document.getElementById('fullscreen-btn');
        if (this.elements.fullscreenBtn) {
            this.elements.fullscreenBtn.onclick = () => this.toggleFullscreen();
        }

        // iOS Fullscreen-Hinweis prüfen
        this.checkiOSFullscreenSupport();

        // Wake Lock aktivieren wenn Spiel startet
        this.requestWakeLock();

        // Wake Lock bei Visibility-Änderungen neu aktivieren
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.wakeLock === null) {
                this.requestWakeLock();
            }
        });

        // --- Event Listeners ---

        if (this.elements.cinematicNextBtn) {
            this.elements.cinematicNextBtn.onclick = () => {
                if (this.cinematicCallback) this.cinematicCallback();
            };
        }

        if (this.elements.skipIntroBtn) {
            this.elements.skipIntroBtn.onclick = () => {
                if (director && typeof director.skipIntro === 'function') {
                    director.skipIntro();
                }
            };
        }

        if (this.elements.dialogCloseBtn) {
            this.elements.dialogCloseBtn.onclick = () => this.hideDialog();
        }

        // Delta-Label am Kapital anfügen
        const moneyContainer = document.getElementById('stat-money-container');
        if (moneyContainer) {
            const existing = moneyContainer.querySelector('.stat-money-delta');
            if (existing) {
                this.elements.moneyDelta = existing;
            } else {
                const delta = document.createElement('span');
                delta.className = 'stat-money-delta';
                moneyContainer.appendChild(delta);
                this.elements.moneyDelta = delta;
            }
        }

        // --- Setup UI Components ---
        this.injectDynamicStyles();
        this.createExtendedHUD();
        this.createObjectivePanel();
        this.createCollapseOverlay();

        // --- Global Event Subscriptions ---
        events.on(EVENTS.STATS_UPDATED, (stats) => this.updateStats(stats));
        events.on(EVENTS.TOAST, (data) => this.showToast(data.message));
        events.on(EVENTS.MONEY_CHANGED, (data) => this.handleMoneyChange(data));
        events.on(EVENTS.TRIGGER_COIN_LEG, (data) => {
            if (!data) return;
            const isLoss = (data.amount < 0) || data.isLoss || data.from === 'UI_MONEY';
            if (data.to === 'UI_MONEY' || data.from === 'UI_MONEY') {
                const buildingId = (data.to === 'UI_MONEY') ? data.from : data.to;
                this.animateWorldToUICoins(buildingId, Math.abs(data.amount || 0), isLoss);
            }
        });
        events.on(EVENTS.SHOW_ADVISOR, (data) => {
            if (!data) return;
            this.showAdvisor(data.text, data.duration);
        });
        events.on(EVENTS.SHOW_BILLBOARD, (data) => this.createBillboard(data));
        events.on(EVENTS.SHOW_WORLD_BARK, (data) => this.showWorldBark(data));
        events.on(EVENTS.GAME_OVER, (data) => this.showCollapseScreen(data));
        events.on('ui:show_cycle_explanation', (data) => this.showCycleExplanation(data));
        events.on('ui:update_billboard', (data) => this.updateBillboard(data));
        events.on('ui:close_billboard', (data) => this.closeBillboard(data.id));

        events.on(DIRECTOR_EVENTS.PHASE_CHANGED, (data) => this.onPhaseChanged(data));
        events.on(DIRECTOR_EVENTS.OBJECTIVES_UPDATED, (data) => this.onObjectivesUpdated(data));
        
        // Zentrale Szenen-Steuerung
        events.on(DIRECTOR_EVENTS.SCENE_START, (data) => this.handleSceneStart(data));
        events.on(DIRECTOR_EVENTS.SCENE_END, () => this.handleSceneEnd());
        
        events.on(ECON_EVENTS.ECOLOGICAL_WARNING, () => this.triggerEcologicalVisuals());
        events.on(DIRECTOR_EVENTS.SHOW_CRISIS_CARD, (data) => {
            // Wir nutzen jetzt das neue HTML Bark System statt Sprites
            if (!data || !data.targetId) {
                console.warn('⚠️ [UI] SHOW_CRISIS_CARD Event ohne gültige data empfangen:', data);
                return;
            }
            this.showWorldBark({
                targetId: data.targetId,
                text: data.text,
                icon: data.icon,
                speaker: data.speaker,
                isCrisis: data.isCrisis !== undefined ? data.isCrisis : true
            });
        });

        // Neue Event-Listener für Wirtschaftskreislauf-Wallet-Updates
        events.on(ECON_EVENTS.EXPENSES_PAID, (data) => this.updateCycleWallets(data));
        events.on(ECON_EVENTS.INCOME_RECEIVED, (data) => this.updateCycleWallets(data));
    }

    // --- Dynamic DOM Creation ---
    injectDynamicStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            .hud-extended { display: flex; gap: 15px; align-items: center; }
            .stat-bar-fill.success { background-color: var(--color-success); }
            .stat-bar-fill.warning { background-color: var(--color-warning); }
            .stat-bar-fill.danger { background-color: var(--color-danger); }
            
            /* --- OPTIMIZED WORLD BARKS --- */
            .world-bark {
                position: absolute;
                display: flex;
                flex-direction: row;
                align-items: center;
                gap: 12px;
                width: max-content;
                max-width: 320px;
                padding: 14px 20px;
                
                /* NEU: Leicht durchsichtig + Milchglas-Effekt */
                background: rgba(255, 255, 255, 0.85);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                
                border-radius: 12px;
                box-shadow: 0 8px 25px rgba(0,0,0,0.15);
                border: 1px solid rgba(255,255,255,0.5); /* Heller Rand */
                
                font-family: 'Segoe UI', sans-serif;
                font-size: 1.05rem;
                font-weight: 600;
                color: #2c3e50;
                line-height: 1.4;
                white-space: normal;
                pointer-events: none;
                z-index: 1000;
                
                transform-origin: bottom center;
                opacity: 0;
                /* Startet etwas kleiner für den Pop-In Effekt */
                transform: translate(-50%, -100%) scale(0.8);
                transition: opacity 0.3s ease-out, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            }
            
            .world-bark.visible {
                opacity: 1;
                /* Position wird via JS gesetzt, Scale auf 1 */
                transform: translate(-50%, -100%) scale(1);
            }
            
            .world-bark::after {
                content: '';
                position: absolute;
                bottom: -10px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 10px solid transparent;
                border-right: 10px solid transparent;
                /* Pfeilfarbe passend zum Hintergrund */
                border-top: 10px solid rgba(255, 255, 255, 0.85); 
            }

            .world-bark .bark-avatar {
                width: 42px;
                height: 42px;
                flex-shrink: 0;
                border-radius: 50%;
                background-size: cover;
                background-position: center top;
                background-color: #ecf0f1;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .world-bark .bark-content { display: flex; flex-direction: column; justify-content: center; }

            /* =========================================
               NEU: BILLBOARD / QUITTUNGS-DESIGN & ANIMATIONEN
               ========================================= */

            .billboard {
                position: absolute;
                min-width: 180px;
                z-index: 1500;
                background: rgba(20, 28, 38, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.15);
                border-radius: 6px;
                box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5);
                font-family: 'Courier New', monospace;
                color: #ecf0f1;
                text-align: right;
                
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.9);
                transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
                
                pointer-events: none;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            .billboard.visible {
                opacity: 1;
                transform: translate(-50%, -120%) scale(1);
            }

            /* Neuer Container für den Inhalt, damit er wachsen kann */
            .billboard-content {
                display: flex;
                flex-direction: column;
                padding: 5px 0;
                transition: height 0.3s ease;
            }

            .billboard-row {
                padding: 4px 12px;
                font-size: 0.95rem;
                color: #fff;
                display: flex;
                justify-content: space-between;
                gap: 15px;
            }

            /* NEU: Style für Ausgaben-Zeilen (Rot & Animation) */
            .billboard-row.expense {
                color: #e74c3c;
                background: rgba(231, 76, 60, 0.1); /* Leichter roter Hinterlegung */
                border-top: 1px dotted rgba(255,255,255,0.1);
                animation: slideInRight 0.4s ease-out;
            }

            /* Animation: Zeile fliegt von rechts rein */
            @keyframes slideInRight {
                from { opacity: 0; transform: translateX(20px); }
                to { opacity: 1; transform: translateX(0); }
            }

            .billboard-footer {
                font-size: 1.4rem;
                font-weight: 800;
                padding: 10px 12px;
                background: rgba(255, 255, 255, 0.05);
                border-top: 2px solid rgba(255,255,255,0.1);
                transition: color 0.3s;
            }

            /* Animation wenn der Zähler läuft */
            .billboard.counting .billboard-footer {
                color: #f1c40f; /* Gelb während des Zählens */
            }

            /* Status Farben am Ende */
            .billboard.gain { border-left: 5px solid #2ecc71; }
            .billboard.gain .billboard-footer { color: #2ecc71; }

            .billboard.loss {
                border-left: 5px solid #e74c3c;
                box-shadow: 0 15px 40px rgba(231, 76, 60, 0.3); /* Roter Glow */
            }
            .billboard.loss .billboard-footer {
                color: #e74c3c;
                font-weight: 900; /* Extra Fett für Zinsen */
            }
            .billboard.loss .billboard-header {
                background-color: rgba(231, 76, 60, 0.2); /* Rötlicher Header */
                color: #ffcccc;
            }

            .billboard.neutral { border-left: 5px solid #95a5a6; }
            .billboard.neutral .billboard-footer { color: #bdc3c7; }

            /* =========================================
               NEU: ROTE MÜNZEN & TEXT (FÜR VERLUSTE)
               ========================================= */

            .flying-coin.loss {
                /* Dunkelroter bis hellroter Verlauf */
                background: radial-gradient(circle at 30% 30%, #e74c3c, #c0392b);
                border-color: #922b21;
                color: #922b21;
                box-shadow: 0 0 12px rgba(231, 76, 60, 0.7);
            }

            /* Der Text (+10 oder -5) der im Raum schwebt */
            .floating-text.expense {
                color: #e74c3c !important; /* Knallrot */
                font-size: 1.4rem;
                text-shadow: 0 0 10px rgba(231, 76, 60, 0.5);
                font-weight: 900;
            }
        `;
        document.head.appendChild(style);
    }

    createExtendedHUD() {
        const statsPanel = document.getElementById('stats-panel');
        if (statsPanel) {
            const empItem = document.createElement('div');
            empItem.className = 'stat-item';
            empItem.title = 'Beschäftigung (Einfluss auf Nachfrage)';
            empItem.innerHTML = `
                <span class="icon">👷</span>
                <div class="stat-bar-container">
                    <div id="stat-employment-bar" class="stat-bar-fill" style="width: 100%"></div>
                </div>
            `;
            statsPanel.appendChild(empItem);
            this.elements.employment = empItem.querySelector('#stat-employment-bar');
        }
    }

    createObjectivePanel() {
        const div = document.createElement('div');
        div.id = 'objective-panel';
        div.innerHTML = `<div style="font-size:0.75rem; opacity:0.7; font-weight:bold; margin-bottom:10px; text-transform:uppercase;">Ziele</div><div id="objective-list"></div>`;
        this.elements.uiLayer.appendChild(div);
        this.elements.objectiveContainer = div.querySelector('#objective-list');
    }

    createCollapseOverlay() {
        const div = document.createElement('div');
        div.id = 'collapse-overlay';
        div.innerHTML = `
            <h1 style="font-size: 3rem; margin-bottom: 18px; color: #c0392b;">Spiel vorbei</h1>
            <p style="font-size: 1.2rem; max-width: 600px; text-align: center; margin-bottom: 32px; color:#2c3e50;">
                Die Ressourcen sind erschöpft und die Inselwirtschaft kommt zum Stillstand. Versuch es noch einmal – vielleicht mit einem anderen Kurs.
            </p>
        `;
        this.elements.uiLayer.appendChild(div);
        this.elements.collapseOverlay = div;
    }

    // --- Updates & Logic ---

    updateStats(stats) {
        if (this.elements.money) this.elements.money.textContent = Math.floor(stats.moneyPlayer);
        if (this.elements.debt) {
            // Zeige die GESAMTSCHULD (Kredit + aufgelaufene Zinsen)
            const totalDebt = stats.loanPrincipal + (stats.accruedInterest || 0);
            this.elements.debt.textContent = Math.floor(totalDebt);

            if (stats.loanPrincipal > 0) {
                this.elements.debt.style.color = '#e74c3c';

                // Neuer Tooltip: Zeigt Kredit + Zinsen + verbleibende Trips
                const tripsRemaining = stats.paymentDueInTrips - stats.tripsSinceLoan;
                const tooltipParts = [
                    `Kredit: ${Math.floor(stats.loanPrincipal)}g`,
                    `Zinsen: ${Math.floor(stats.accruedInterest || 0)}g`
                ];

                if (tripsRemaining > 0) {
                    tooltipParts.push(`Fällig in ${tripsRemaining} Fahrten`);
                } else {
                    tooltipParts.push(`ZAHLUNG FÄLLIG!`);
                }

                this.elements.debt.parentElement.title = tooltipParts.join(' | ');
            } else {
                this.elements.debt.style.color = 'var(--color-dark)';
                this.elements.debt.parentElement.title = 'Keine Schulden';
            }
        }
        if (this.elements.fish) {
            const percent = (stats.fishStock / stats.maxFishStock) * 100;
            this.elements.fish.textContent = `${Math.floor(percent)}%`;
            this.elements.fish.className = percent < 40 ? 'danger' : (percent < 70 ? 'warning' : 'success');
        }
        if (this.elements.employment) {
            // Kombiniert Beschäftigung mit Markt-Gesundheit für sensiblere Anzeige
            const health = (typeof economy.state.marketHealth !== 'undefined') ? economy.state.marketHealth : 1.0;
            const displayVal = stats.employmentRate * health * 100;

            this.elements.employment.style.width = `${displayVal}%`;
            let statusClass = 'success';
            if (displayVal < 80) statusClass = 'warning';
            if (displayVal < 40) statusClass = 'danger';
            this.elements.employment.className = `stat-bar-fill ${statusClass}`;
        }
    }

    onPhaseChanged(data) {
        if (data?.phaseId) {
            this.visiblePhaseId = data.phaseId;
        }
    }

    onObjectivesUpdated(data) {
        if (!this.elements.objectiveContainer) return;
        this.elements.objectiveContainer.innerHTML = '';
        data.objectives.forEach(obj => {
            if (obj.hidden) return;
            const div = document.createElement('div');
            div.className = `objective-item ${obj.done ? 'done' : ''}`;
            let text = obj.text;
            if (obj.target && obj.current !== undefined) {
                text += ` (${Math.floor(obj.current)}/${obj.target})`;
            }
            div.innerHTML = `
                <div class="checkbox ${obj.done ? 'checked' : ''}"></div>
                <span>${text}</span>
            `;
            this.elements.objectiveContainer.appendChild(div);
        });
    }

    // =========================================================================
    // SCENE & DIALOG HANDLING (NEU)
    // =========================================================================

    handleSceneStart(data) {
        // Unterscheidung zwischen Story (Narrative) und Menüs (Overlay)
        if (data.type === 'narrative') {
            this.renderNarrativeScene(data);
        } 
        else if (data.type === 'overlay') {
            // Funktionale Menüs (Werft, Bank) bleiben im klassischen Modal
            if (data.id === 'BANK_MENU') this.renderBankMenu();
            if (data.id === 'SHIPYARD_MENU') this.renderShipyardMenu();
            if (data.id === 'TAVERN_MENU') this.renderTavernMenu();
            if (data.id === 'HQ_MENU') this.renderHQMenu(data.extraData);
        }
        // Fallback für alte Dialog-Struktur
        else if (data.type === 'dialog') {
             this.renderStoryDialog(data); // Legacy Support
        }

        // Kamera-Steuerung für Szenen
        // FIX: Erlauben von Kamera-Bewegung für Sterling-Szenen (TENT) auch in STAGNATION
        if (data.cameraTarget) {
            const isSterlingScene = (data.cameraTarget === 'TENT' || data.cameraTarget === 'STERLING');
            const allowCameraMove = (director.currentPhaseId !== 'TUTORIAL' && director.currentPhaseId !== 'STAGNATION') || isSterlingScene;

            if (allowCameraMove) {
                this.moveCameraToTarget(data.cameraTarget);
            }
        }
    }

    handleSceneEnd() {
        this.hideDialog();
        this.hideNarrativeScene();
    }

    // --- Neues Dual-Avatar Narrative System ---

    renderNarrativeScene(data) {
        if (!this.elements.narrativeScene) return;

        // Schließe offenen Gebäudedialog automatisch, wenn Sprechblase geöffnet wird
        if (this.dialogOpen && this.elements.dialog && !this.elements.dialog.classList.contains('hidden')) {
            this.hideDialog();
        }

        // 1. Text setzen
        this.elements.narrativeText.textContent = data.text;
        
        // 2. Sprechername
        // Wir nehmen den Fokus als aktuellen Sprecher. 
        const currentSpeaker = data.focus === 'left' ? data.speakerLeft : data.speakerRight;
        this.elements.narrativeSpeakerName.textContent = currentSpeaker || '...';
        
        // 3. Charakter-Slots befüllen
        this.updateCharacterSlot(
            'left', 
            data.speakerLeft, 
            data.focus === 'left'
        );
        this.updateCharacterSlot(
            'right', 
            data.speakerRight, 
            data.focus === 'right'
        );

        // 4. Buttons Rendern
        const actionsContainer = this.elements.narrativeActions;
        actionsContainer.innerHTML = '';

        data.choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'btn-action';

            // Farbcodierung für Kauf/Verkauf
            if (choice.cost) btn.classList.add('btn-negative');
            if (choice.gain) btn.classList.add('btn-positive');
            
            // Text mit Kosten/Gewinn-Badge
            let html = `<span>${choice.text}</span>`;
            
            if (choice.cost) {
                html += `<span class="cost-badge is-cost">-${choice.cost}</span>`;
            } else if (choice.gain) {
                html += `<span class="cost-badge is-gain">+${choice.gain}</span>`;
            }
            
            btn.innerHTML = html;

            btn.onclick = async () => {
                if (btn.disabled) return;
                btn.disabled = true; // Doppelklicks verhindern

                const moneyContainer = document.getElementById('stat-money-container');
                if (moneyContainer && (choice.cost || choice.gain)) {
                    const amount = choice.cost ? -choice.cost : choice.gain;
                    const startEl = choice.gain ? btn : moneyContainer;
                    const endEl = choice.gain ? moneyContainer : btn;

                    this.showMoneyDelta(amount);
                    await this.animateCoinTransfer(startEl, endEl);
                }

                console.log(`🔘 [UI DEBUG] Button clicked. Scene: ${data.sceneId}, Choice: ${choice.id}`);

                director.handleSceneChoice(data.sceneId, choice.id);
            };

            actionsContainer.appendChild(btn);
        });

        // 5. Anzeigen
        this.elements.narrativeScene.classList.remove('hidden');
        this.dialogOpen = true;
    }

    updateCharacterSlot(side, speakerName, isFocus) {
        const slot = side === 'left' ? this.elements.charSlotLeft : this.elements.charSlotRight;
        const img = side === 'left' ? this.elements.charImgLeft : this.elements.charImgRight;
        const nameTag = side === 'left' ? this.elements.charNameLeft : this.elements.charNameRight;

        if (!speakerName) {
            slot.classList.add('hidden');
            return;
        }

        slot.classList.remove('hidden');
        
        // Bild setzen
        const path = this.avatars[speakerName] || this.avatars['default'];
        img.style.backgroundImage = `url('${path}')`;
        
        // Name
        if (nameTag) nameTag.textContent = speakerName;

        // Fokus-Klasse
        if (isFocus) {
            slot.classList.add('active');
            slot.classList.remove('inactive');
        } else {
            slot.classList.remove('active');
            slot.classList.add('inactive');
        }
    }

    hideNarrativeScene() {
        if (this.elements.narrativeScene) {
            this.elements.narrativeScene.classList.add('hidden');
        }
        this.dialogOpen = false;
    }

    // --- CYCLE EXPLANATION LOGIC (UPDATED) ---

    // =========================================================================
    // CYCLE EXPLANATION LOGIC (MATHEMATISCH BERECHNET)
    // =========================================================================

    // 1. Punkt auf Kreis berechnen
    getPointOnCircle(cx, cy, radius, angleDeg) {
        const angleRad = (angleDeg * Math.PI) / 180;
        return {
            x: cx + radius * Math.cos(angleRad),
            y: cy + radius * Math.sin(angleRad)
        };
    }

    // 2. Perfekten Bezier-Pfad generieren
    generateCurvedPath(start, end, bendAmount) {
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const nx = -dy / dist;
        const ny = dx / dist;
        const cx = midX + nx * bendAmount;
        const cy = midY + ny * bendAmount;
        return `M ${Math.round(start.x)} ${Math.round(start.y)} Q ${Math.round(cx)} ${Math.round(cy)} ${Math.round(end.x)} ${Math.round(end.y)}`;
    }

    // Helper für geschwungene Verbindungen (Kapitel 1 & 3 Leakage)
    generateOvalPath(start, end, invert = false) {
        // --- KONFIGURATION ---
        const nodeRadius = 45;   // Radius der Kreise (90px / 2)
        const spread = 15;       // Wie weit der Bogen seitlich ausbricht
        const headBuffer = 8;    // Abstand zum Ziel (für Pfeilspitze)
        const arcFactor = 1.2;   // Wölbungsgrad (höher = runder)   

        // 1. Vektor Berechnung
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const ux = dx / dist;
        const uy = dy / dist;
        
        // 2. Normale für seitlichen Versatz
        let nx = -uy;
        let ny = ux;

        // Invertieren für die andere Seite (z.B. Rückfluss)
        if (invert) {
            nx = -nx;
            ny = -ny;
        }

        // 3. Startpunkt (Am Rand des Kreises + seitlicher Spread)
        const startX = start.x + (ux * nodeRadius) + (nx * spread);
        const startY = start.y + (uy * nodeRadius) + (ny * spread);

        // 4. Endpunkt (Am Zielkreis ankommen)
        const endX = end.x - (ux * (nodeRadius + headBuffer)) + (nx * spread);
        const endY = end.y - (uy * (nodeRadius + headBuffer)) + (ny * spread);

        // 5. Bogen-Radius berechnen
        const arcRadius = dist * arcFactor;

        // Sweep-Flag bestimmt die Bogenrichtung (0 oder 1)
        const sweep = invert ? 1 : 0;

        return `M ${Math.round(startX)} ${Math.round(startY)} A ${Math.round(arcRadius)} ${Math.round(arcRadius)} 0 0 ${sweep} ${Math.round(endX)} ${Math.round(endY)}`;
    }

    showCycleExplanation(data = {}) {
        if (!this.elements.cycleOverlay) return;

        this.cycleStep = 0;
        this.isCycleBroken = !!data.broken;
        
        // NEU: Modus speichern (STAGNATION = Kap 1, LEAKAGE = Kap 3)
        // Wenn 'broken' true ist, aber kein Mode gesetzt, ist es standardmäßig STAGNATION
        this.cycleMode = data.mode || (this.isCycleBroken ? 'STAGNATION' : 'HEALTHY');

        const overlay = this.elements.cycleOverlay;
        overlay.innerHTML = ''; 

        // Titel basierend auf Modus
        let titleText = 'DER WIRTSCHAFTSKREISLAUF';
        if (this.cycleMode === 'STAGNATION') titleText = 'DIAGNOSE: DIE SPAR-SPIRALE';
        if (this.cycleMode === 'LEAKAGE') titleText = 'DIAGNOSE: KAPITALABFLUSS';
        if (this.cycleMode === 'BOOM_BUST') titleText = 'DIAGNOSE: DER WACHSTUMS-ZWANG';
        
        const content = document.createElement('div');
        content.className = `cycle-paper ${this.isCycleBroken ? 'broken' : ''}`;
        
        const imgPlayer = this.avatars["Kapt'n"] || 'assets/portraits/captain.png';
        const imgMo = this.avatars['Mo'] || 'assets/portraits/mo.png';
        const imgKian = this.avatars['Kian'] || 'assets/portraits/kian.png';

        // --- KOORDINATEN ---
        const C_PLAYER = { x: 200, y: 55 };
        const C_MO     = { x: 88,  y: 250 };
        const C_KIAN   = { x: 312, y: 250 };

        // --- PFADE GENERIEREN ---
        // Im gesunden Kreislauf UND Boom/Bust: gerade Linien
        let pathPM, pathMP, pathPK, pathKP, pathMK, pathKM;

        // Sterling Position (Rechts oben)
        const C_STERLING = { x: 320, y: 60 };

        if (this.cycleMode === 'HEALTHY' || this.cycleMode === 'BOOM_BUST') {
            // Gerade Linien
            pathPM = `M ${C_PLAYER.x} ${C_PLAYER.y} L ${C_MO.x} ${C_MO.y}`;
            pathMP = `M ${C_MO.x} ${C_MO.y} L ${C_PLAYER.x} ${C_PLAYER.y}`;
            pathPK = `M ${C_PLAYER.x} ${C_PLAYER.y} L ${C_KIAN.x} ${C_KIAN.y}`;
            pathKP = `M ${C_KIAN.x} ${C_KIAN.y} L ${C_PLAYER.x} ${C_PLAYER.y}`;
            pathMK = `M ${C_MO.x} ${C_MO.y} L ${C_KIAN.x} ${C_KIAN.y}`;
            pathKM = `M ${C_KIAN.x} ${C_KIAN.y} L ${C_MO.x} ${C_MO.y}`;
        } else {
            // Geschwungene Linien für andere Modi
            pathPM = this.generateOvalPath(C_PLAYER, C_MO);
            pathMP = this.generateOvalPath(C_MO, C_PLAYER);
            pathPK = this.generateOvalPath(C_PLAYER, C_KIAN, true);
            pathKP = this.generateOvalPath(C_KIAN, C_PLAYER, true);
            pathMK = this.generateOvalPath(C_MO, C_KIAN);
            pathKM = this.generateOvalPath(C_KIAN, C_MO);
        }

        // Pfad für Rückzahlung (Bogen nach oben)
        const pathDrain = `M ${C_PLAYER.x + 40} ${C_PLAYER.y} Q 280 20 ${C_STERLING.x} ${C_STERLING.y}`;

        // Text auf dem Pfeil je nach Modus
        let labelText = "GELDFLUSS";
        if (this.cycleMode === 'STAGNATION') labelText = "GESPART";
        if (this.cycleMode === 'LEAKAGE') labelText = "KEIN GELD";

        content.innerHTML = `
            <div class="cycle-title">${titleText}</div>

            <div class="cycle-diagram" id="cycle-diagram-area">
                <svg class="cycle-lines-svg" viewBox="0 0 400 320">
                    <defs>
                        <marker id="arrowhead-dark" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                            <path d="M0,0 L6,3 L0,6 L1.5,3 Z" fill="#2c3e50" />
                        </marker>
                        <marker id="arrowhead-red" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                            <path d="M0,0 L6,3 L0,6 L1.5,3 Z" fill="#c0392b" />
                        </marker>
                    </defs>

                    <!-- Bestehende Pfade -->
                    <path id="path-p-m" d="${pathPM}" class="arrow-path simple" />
                    <text class="arrow-label" dy="-4">
                        <textPath href="#path-p-m" startOffset="50%" text-anchor="middle">${labelText}</textPath>
                    </text>

                    <path id="path-p-k" d="${pathPK}" class="arrow-path simple" />
                    <text class="arrow-label" dy="-4">
                        <textPath href="#path-p-k" startOffset="50%" text-anchor="middle">${labelText}</textPath>
                    </text>

                    <path id="path-m-k" d="${pathMK}" class="arrow-path simple" />
                    <text class="arrow-label" dy="-4">
                        <textPath href="#path-m-k" startOffset="50%" text-anchor="middle">${labelText}</textPath>
                    </text>

                    <path id="path-k-m" d="${pathKM}" class="arrow-path simple" />
                    <text class="arrow-label" dy="-4">
                        <textPath href="#path-k-m" startOffset="50%" text-anchor="middle">${labelText}</textPath>
                    </text>

                    <path id="path-m-p" d="${pathMP}" class="arrow-path simple" />
                    <text class="arrow-label" dy="-4">
                        <textPath href="#path-m-p" startOffset="50%" text-anchor="middle">${labelText}</textPath>
                    </text>

                    <path id="path-k-p" d="${pathKP}" class="arrow-path simple" />
                    <text class="arrow-label" dy="-4">
                        <textPath href="#path-k-p" startOffset="50%" text-anchor="middle">${labelText}</textPath>
                    </text>

                    <!-- NEU: Rückzahlungs Pfad -->
                    <path id="path-drain" d="${pathDrain}" class="drain-path" />

                    <!-- Legacy IDs für Animationen im 'Gesunden' Zyklus -->
                    <path id="path-inc-mo" d="${pathMP}" class="arrow-path simple" style="display:none" />
                    <path id="path-inc-kian" d="${pathKP}" class="arrow-path simple" style="display:none" />
                    <path id="path-exp-mo" d="${pathPM}" class="arrow-path simple" style="display:none" />
                    <path id="path-exp-kian" d="${pathPK}" class="arrow-path simple" style="display:none" />
                    <path id="path-loop" d="${pathKM}" class="arrow-path simple" style="display:none" />

                </svg>

                <!-- Nodes -->
                <div id="node-player" class="cycle-node node-player">
                    <div class="node-portrait" style="background-image: url('${imgPlayer}')"></div>
                    <div class="node-label">Kapitän</div>
                    <div id="wallet-player" class="node-wallet ${this.cycleMode === 'HEALTHY' ? 'visible' : ''}">100</div>
                </div>

                <div id="node-mo" class="cycle-node node-tavern">
                    <div class="node-portrait" style="background-image: url('${imgMo}')"></div>
                    <div class="node-label">Mo</div>
                    <div id="wallet-mo" class="node-wallet ${this.cycleMode === 'HEALTHY' ? 'visible' : ''}">100</div>
                </div>

                <div id="node-kian" class="cycle-node node-shipyard">
                    <div class="node-portrait" style="background-image: url('${imgKian}')"></div>
                    <div class="node-label">Kian</div>
                    <div id="wallet-kian" class="node-wallet ${this.cycleMode === 'HEALTHY' ? 'visible' : ''}">100</div>
                </div>

                <!-- NEU: Sterling Node -->
                <div id="node-sterling" class="node-sterling">
                    <div class="node-portrait" style="background-image: url('assets/portraits/sterling.png')"></div>
                    <div class="node-label" style="background:#2c3e50; color:#f1c40f;">Bank</div>
                </div>
            </div>

            <div class="cycle-text-area">
                <div id="cycle-step-title" class="cycle-step-title">Analyse...</div>
                <div id="cycle-step-desc" class="cycle-step-desc">...</div>
            </div>

            <div class="cycle-controls">
                <button id="btn-cycle-back" class="btn-cycle" disabled>Zurück</button>
                <div class="step-dots">● ○ ○ ○</div>
                <button id="btn-cycle-next" class="btn-cycle">Weiter</button>
            </div>
        `;

        overlay.appendChild(content);
        overlay.classList.remove('hidden');

        content.querySelector('#btn-cycle-next').onclick = () => this.nextCycleStep();
        content.querySelector('#btn-cycle-back').onclick = () => this.prevCycleStep();

        this.renderCycleState(0);

        // ENTFERNT: this.updateCycleWallets(); damit die Startwerte (100) nicht überschrieben werden.
    }

    nextCycleStep() {
        if (this.isAnimating) return;
        this.cycleStep++;
        this.renderCycleState(this.cycleStep);
    }

    prevCycleStep() {
        if (this.isAnimating) return;
        this.cycleStep--;
        if (this.cycleStep < 0) this.cycleStep = 0;
        // Beim Zurückgehen keine Animationen abspielen, nur harten Reset
        this.renderCycleState(this.cycleStep, true); 
    }

    // --- NEUE LOGIK FÜR KAPITEL 3 (BOOM & BUST) ---

    renderBoomBustCycleState(step) {
        const titleEl = document.getElementById('cycle-step-title');
        const descEl = document.getElementById('cycle-step-desc');
        const btnNext = document.getElementById('btn-cycle-next');
        const btnBack = document.getElementById('btn-cycle-back');
        const dots = document.querySelector('.step-dots');
        const sterlingNode = document.getElementById('node-sterling');
        const drainPath = document.getElementById('path-drain');

        // 1. RESET: Alles auf Anfangszustand setzen (Wichtig für Zurück-Button)
        document.querySelectorAll('.arrow-path').forEach(el => {
            el.classList.remove('visible', 'active', 'faded', 'flow');
            el.style.display = 'none'; // Standardmäßig aus
        });
        if (sterlingNode) sterlingNode.classList.remove('visible');
        if (drainPath) drainPath.classList.remove('visible');

        // Helper zum gezielten Einschalten
        const setArrow = (id, type) => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = 'block';
                el.classList.add('visible', type);
            }
        };

        const setSterlingVisible = (visible) => {
            if (visible) {
                if (sterlingNode) sterlingNode.classList.add('visible');
                if (drainPath) drainPath.classList.add('visible');
            } else {
                if (sterlingNode) sterlingNode.classList.remove('visible');
                if (drainPath) drainPath.classList.remove('visible');
            }
        };

        // Buttons
        if (btnBack) btnBack.disabled = (step === 0);
        if (btnNext) {
            btnNext.textContent = "Weiter";
            btnNext.onclick = () => this.nextCycleStep();
            btnNext.classList.remove('finish');
            btnNext.className = "btn-cycle";
        }

        // --- SCHRITT DEFINITIONEN ---

        if (step === 0) {
            // SCHRITT 1: Der Boom
            titleEl.textContent = "Schritt 1: Der Boom";
            descEl.innerHTML = "Dank des Kredits haben wir massiv investiert.<br><b>Das Geld belebte die Werft, dann die Taverne und floss schließlich zurück.</b>";
            if(dots) dots.textContent = "● ○ ○ ○";

            // State: Alle Pfeile aktiv, Sterling weg
            setSterlingVisible(false);
            setArrow('path-p-k', 'flow');
            setArrow('path-k-m', 'flow');
            setArrow('path-m-p', 'flow');

            this.setWallet('wallet-player', 200);
            this.setWallet('wallet-kian', 100);
            this.setWallet('wallet-mo', 100);

            // Animation nur beim ersten Mal oder vorwärts
            if (!this.isAnimating && !this.hasAnimatedStep0) {
                this.hasAnimatedStep0 = true; // Flag um Wiederholung beim schnellen Klicken zu vermeiden
                this.runSequence([
                    () => this.animateTransfer('node-player', 'node-kian', 0, 'path-p-k'),
                    () => this.animateTransfer('node-kian', 'node-mo', 0, 'path-k-m'),
                    () => this.animateTransfer('node-mo', 'node-player', 0, 'path-m-p')
                ]);
            }
        }
        else if (step === 1) {
            // SCHRITT 2: Die Tilgung
            titleEl.textContent = "Schritt 2: Die Tilgung";
            descEl.innerHTML = "Sterling fordert sein Geld zurück.<br><b>Das Kapital verlässt den Kreislauf über die Bank.</b>";
            if(dots) dots.textContent = "○ ● ○ ○";

            // State: Alle Pfeile noch da, Sterling da
            setSterlingVisible(true);
            setArrow('path-p-k', 'flow');
            setArrow('path-k-m', 'flow');
            setArrow('path-m-p', 'flow');

            this.setWallet('wallet-player', 20); // Geld weg
            this.setWallet('wallet-kian', 100);
            this.setWallet('wallet-mo', 100);

            if (!this.isAnimating) {
                // Animation zu Sterling
                this.runSequence([
                    () => this.animateTransfer('node-player', 'node-sterling', 0, 'path-drain')
                ]);
            }
        }
        else if (step === 2) {
            // SCHRITT 3: Das Loch
            titleEl.textContent = "Schritt 3: Fehlende Aufträge";
            descEl.innerHTML = "Durch die Rückzahlung fehlt dir Geld für neue Aufträge.<br><b>Die Verbindung zur Werft trocknet aus.</b>";
            if(dots) dots.textContent = "○ ○ ● ○";

            // State: Sterling WEG, P->K grau
            setSterlingVisible(false);
            setArrow('path-p-k', 'faded'); // GRAU
            setArrow('path-k-m', 'flow');
            setArrow('path-m-p', 'flow');

            this.setWallet('wallet-player', 20);
            this.setWallet('wallet-kian', 50); // Sinkt
            this.setWallet('wallet-mo', 80);
        }
        else if (step === 3) {
            // SCHRITT 4: Der Stillstand
            titleEl.textContent = "Schritt 4: Der Stillstand";
            descEl.innerHTML = "Die Arbeitslosigkeit trifft die Taverne. Die Liquidität fehlt überall.<br><b>Der gesamte Kreislauf bricht zusammen.</b>";
            if(dots) dots.textContent = "○ ○ ○ ●";

            // State: Sterling WEG, Alle Pfeile grau
            setSterlingVisible(false); // Sterling verschwindet
            setArrow('path-p-k', 'faded');
            setArrow('path-k-m', 'faded');
            setArrow('path-m-p', 'faded');

            this.setWallet('wallet-player', 20);
            this.setWallet('wallet-kian', 20);
            this.setWallet('wallet-mo', 20);

            if (btnNext) {
                btnNext.textContent = "Verstanden";
                btnNext.classList.add('finish');
                btnNext.onclick = () => this.hideCycleExplanation();
            }
        }
    }

    // --- NEUE LOGIK FÜR KAPITEL 1 (BROKEN CYCLE) ---

    renderBrokenCycleState(step) {
        const titleEl = document.getElementById('cycle-step-title');
        const descEl = document.getElementById('cycle-step-desc');
        const btnNext = document.getElementById('btn-cycle-next');
        const btnBack = document.getElementById('btn-cycle-back');
        const dots = document.querySelector('.step-dots');

        // Helper: Pfeil sicher anzeigen (Fix für Display-Probleme)
        const showArrow = (id) => {
            const path = document.getElementById(id);
            if(path) {
                path.style.display = 'block'; // Erzwingen!
                // Kurze Verzögerung für CSS Transition
                requestAnimationFrame(() => path.classList.add('visible'));
            }
            // Label anzeigen falls vorhanden
            if(path && path.nextElementSibling && path.nextElementSibling.tagName === 'text') {
                path.nextElementSibling.style.display = 'block';
                requestAnimationFrame(() => path.nextElementSibling.classList.add('visible'));
            }
        };

        const impactNode = (id) => {
            const node = document.getElementById(id);
            if(node) node.classList.add('crisis');
        };

        const setWalletZero = (id) => {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = "0";
                el.className = "node-wallet visible deficit";
            }
        };

        // UI Reset
        document.querySelectorAll('.arrow-path, .arrow-label').forEach(el => {
            el.classList.remove('visible', 'active');
            el.style.display = 'none'; // Alles erst mal ausblenden
        });
        document.querySelectorAll('.cycle-node').forEach(el => el.classList.remove('crisis'));

        if(btnBack) btnBack.disabled = (step === 0);
        if(btnNext) {
            btnNext.textContent = "Weiter";
            btnNext.onclick = () => this.nextCycleStep();
            btnNext.className = "btn-cycle";
        }

        // --- STAGNATION (Kapitel 1) ---
        if (this.cycleMode === 'STAGNATION') {
            // FIX: Wir nutzen die echte Config, aber erzwingen 'basic' (Sparen), falls wir im Debug-Modus sind
            // oder die Simulation noch nicht läuft (isSavingActive == false), damit die Pfeile sichtbar sind.
            let config = economy.state.savingsConfig;

            if (!config || !economy.state.isSavingActive) {
                config = { tavernLevel: 'basic', shipyardLevel: 'basic' };
            }

            const isSavingMo = (config.tavernLevel === 'basic');
            const isSavingKian = (config.shipyardLevel === 'basic');
            const bothSaved = isSavingMo && isSavingKian;

            // Wallets Standard (werden bei Bedarf überschrieben)
            this.setWallet('wallet-player', 100);
            this.setWallet('wallet-mo', 100);
            this.setWallet('wallet-kian', 100);

            if (step === 0) {
                titleEl.textContent = "Ausgangslage";
                descEl.innerHTML = "Das Kapital ist gleichmäßig verteilt.<br>Alle haben 100 Gold und können Handel treiben.";
                if(dots) dots.textContent = "● ○ ○ ○";
            }
            else if (step === 1) {
                titleEl.textContent = "Schritt 1: Deine Sparmaßnahmen";
                descEl.innerHTML = "Du hast deine Ausgaben gekürzt.<br><b>Das Geld fließt nicht mehr zu deinen Nachbarn.</b>";
                if(dots) dots.textContent = "○ ● ○ ○";

                // Wir zeigen die Pfeile an, wo gespart wurde (als blockiert/rot visualisiert oder einfach fehlend?)
                // Hier zeigen wir sie als "vorhanden aber inaktiv/rot" wäre gut, aber für jetzt nutzen wir den existierenden Stil
                if (isSavingMo) { showArrow('path-p-m'); impactNode('node-mo'); this.setWallet('wallet-mo', 0); }
                if (isSavingKian) { showArrow('path-p-k'); impactNode('node-kian'); this.setWallet('wallet-kian', 0); }
            }
            else if (step === 2) {
                titleEl.textContent = "Schritt 2: Die Reaktion";
                descEl.innerHTML = "Ohne Einnahmen können Mo und Kian auch nichts mehr kaufen.<br><b>Sie streichen ihre gegenseitigen Aufträge.</b>";
                if(dots) dots.textContent = "○ ○ ● ○";

                if (isSavingMo) { showArrow('path-p-m'); showArrow('path-m-k'); }
                if (isSavingKian) { showArrow('path-p-k'); showArrow('path-k-m'); }

                impactNode('node-mo');
                impactNode('node-kian');
                if (isSavingMo) this.setWallet('wallet-mo', 0);
                if (isSavingKian) this.setWallet('wallet-kian', 0);
            }
            else if (step === 3) {
                titleEl.textContent = "Schritt 3: Der Bumerang";
                descEl.innerHTML = "Weil niemand Geld hat, kauft auch keiner deinen Fisch.<br><b>Deine Einnahmen brechen weg.</b>";
                if(dots) dots.textContent = "○ ○ ○ ●";

                if (isSavingMo) { showArrow('path-p-m'); showArrow('path-m-k'); showArrow('path-k-p'); }
                if (isSavingKian) { showArrow('path-p-k'); showArrow('path-k-m'); showArrow('path-m-p'); }

                impactNode('node-player');
                impactNode('node-mo');
                impactNode('node-kian');
                this.setWallet('wallet-player', 0);
                this.setWallet('wallet-mo', 0);
                this.setWallet('wallet-kian', 0);

                if (btnNext) {
                    btnNext.textContent = "Verstanden";
                    btnNext.classList.add('finish');
                    btnNext.onclick = () => this.hideCycleExplanation();
                }
            }
        }

        // --- LEAKAGE (Kapitel 3 Ende) ---
        else if (this.cycleMode === 'LEAKAGE') {
            if (step === 0) {
                titleEl.textContent = "Der Preis der Schuldenfreiheit";
                descEl.innerHTML = "Du hast den Kredit getilgt.<br><b>Das Geld hat die Insel verlassen.</b>";
                if(dots) dots.textContent = "● ○ ○ ○";
                setWalletZero('wallet-player');
                this.setWallet('wallet-mo', 50);
                this.setWallet('wallet-kian', 50);
            }
            else if (step === 1) {
                titleEl.textContent = "Schritt 1: Leere Kassen";
                descEl.innerHTML = "Du hast kein Geld mehr für Löhne oder Essen.<br>Die Pfeile zu Mo und Kian bleiben leer.";
                if(dots) dots.textContent = "○ ● ○ ○";

                showArrow('path-p-m');
                showArrow('path-p-k');
                setWalletZero('wallet-player');
            }
            else if (step === 2) {
                titleEl.textContent = "Schritt 2: Markteinbruch";
                descEl.innerHTML = "Ohne dein Geld können Mo und Kian auch nicht handeln.<br>Der Binnenmarkt kommt zum Erliegen.";
                if(dots) dots.textContent = "○ ○ ● ○";

                showArrow('path-p-m'); showArrow('path-p-k');
                showArrow('path-m-k'); showArrow('path-k-m');

                impactNode('node-mo'); impactNode('node-kian');
                setWalletZero('wallet-player');
                setWalletZero('wallet-mo');
                setWalletZero('wallet-kian');
            }
            else if (step === 3) {
                titleEl.textContent = "Schritt 3: Der Stillstand";
                descEl.innerHTML = "Das Geld liegt bei der Bank. Uns fehlt das Tauschmittel.<br><b>Ohne Moos nix los.</b>";
                if(dots) dots.textContent = "○ ○ ○ ●";

                showArrow('path-p-m'); showArrow('path-p-k');

                impactNode('node-player'); impactNode('node-mo'); impactNode('node-kian');
                setWalletZero('wallet-player'); setWalletZero('wallet-mo'); setWalletZero('wallet-kian');

                if (btnNext) {
                    btnNext.textContent = "Verstanden";
                    btnNext.classList.add('finish');
                    btnNext.onclick = () => this.hideCycleExplanation();
                }
            }
        }
    }

// --- HELPER FÜR BROKEN CYCLE ---

    showBadge(nodeId, text, icon, position = 'top') {
        const container = document.getElementById('cycle-diagram-area');
        const node = document.getElementById(nodeId);
        if (!node || !container) return;

        const badge = document.createElement('div');
        badge.className = 'cycle-badge';
        badge.innerHTML = `<span class="icon">${icon}</span><span>${text}</span>`;
        
        // Positionierung relativ zum Node
        // Wir nutzen einfache Offsets basierend auf CSS-Klassen oder ID
        const nodeRect = node.getBoundingClientRect();
        const contRect = container.getBoundingClientRect();
        
        // Mitte des Nodes im Container
        const centerX = (nodeRect.left + nodeRect.width/2) - contRect.left;
        const centerY = (nodeRect.top + nodeRect.height/2) - contRect.top;
        
        container.appendChild(badge);

        // Etwas Offset basierend auf Wunschposition
        if (position === 'top') {
            badge.style.left = centerX + 'px';
            badge.style.top = (centerY - 60) + 'px';
            badge.style.transform = "translateX(-50%)"; 
        } else if (position === 'left') {
            badge.style.left = (centerX - 80) + 'px';
            badge.style.top = centerY + 'px';
            badge.style.transform = "translate(-100%, -50%)";
        } else if (position === 'right') {
            badge.style.left = (centerX + 60) + 'px';
            badge.style.top = centerY + 'px';
            badge.style.transform = "translate(0, -50%)";
        }
    }

    clearBadges() {
        const badges = document.querySelectorAll('.cycle-badge');
        badges.forEach(b => b.remove());
        
        // Reset Inactive Nodes
        document.querySelectorAll('.cycle-node').forEach(n => n.classList.remove('inactive'));
    }

    setArrowStyle(arrowId, styleClass) {
        const arrow = document.getElementById(arrowId);
        if (arrow) {
            arrow.style.display = 'block';
            arrow.classList.remove('active', 'throttled', 'broken', 'blocked', 'pop-out');
            if (styleClass === 'active') {
                arrow.classList.add('active');
            } else if (styleClass === 'throttled') {
                arrow.classList.add('throttled');
            } else if (styleClass === 'broken') {
                arrow.classList.add('broken');
            } else if (styleClass === 'blocked') {
                arrow.classList.add('blocked');
            }
        }
    }

    setWalletClass(id, className) {
        const el = document.getElementById(id);
        if(el) {
            el.className = `node-wallet ${className}`;
        }
    }

    animateCoinShatter(fromId, toId) {
        return new Promise(resolve => {
            const container = document.getElementById('cycle-diagram-area');
            const fromEl = document.getElementById(fromId);
            const toEl = document.getElementById(toId);
            if (!fromEl || !toEl || !container) { resolve(); return; }

            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();
            const contRect = container.getBoundingClientRect();

            const startX = (fromRect.left + fromRect.width/2) - contRect.left;
            const startY = (fromRect.top + fromRect.height/2) - contRect.top;
            
            // Ziel ist ca. 40% des Weges (die Blockade)
            const deltaX = (toRect.left + toRect.width/2) - contRect.left - startX;
            const deltaY = (toRect.top + toRect.height/2) - contRect.top - startY;
            const endX = startX + deltaX * 0.4;
            const endY = startY + deltaY * 0.4;

            const coin = document.createElement('div');
            coin.className = 'cycle-coin shatter';
            // Startposition setzen
            coin.style.left = startX + 'px';
            coin.style.top = startY + 'px';
            container.appendChild(coin);

            const anim = coin.animate([
                // 1. Start (Klein)
                { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0, left: startX + 'px', top: startY + 'px', offset: 0 },
                // 2. Erscheinen (Normalgröße)
                { transform: 'translate(-50%, -50%) scale(1.0)', opacity: 1, offset: 0.1 },
                // 3. Aufprall an der Blockade (Groß & Stopp)
                { transform: 'translate(-50%, -50%) scale(1.2)', left: endX + 'px', top: endY + 'px', opacity: 1, offset: 0.7 },
                // 4. Zerplatzen (Noch Größer & Fade Out)
                { transform: 'translate(-50%, -50%) scale(2.5)', left: endX + 'px', top: endY + 'px', opacity: 0, offset: 1 }
            ], {
                duration: 900,
                easing: 'cubic-bezier(0.25, 1, 0.5, 1)' // Hartes Abbremsen
            });

            anim.onfinish = () => {
                coin.remove();
                resolve();
            };
        });
    }

    renderCycleState(step, skipAnimation = false) {
        // WEICHE: Spezial-Modus Boom & Bust (Kapitel 3->4)
        if (this.cycleMode === 'BOOM_BUST') {
            this.renderBoomBustCycleState(step);
            return;
        }

        // WEICHE: Wenn Broken Cycle (Kapitel 1 / Legacy), nutze die Broken Logik
        if (this.isCycleBroken) {
            this.renderBrokenCycleState(step);
            return;
        }

        const titleEl = document.getElementById('cycle-step-title');
        const descEl = document.getElementById('cycle-step-desc');
        const btnNext = document.getElementById('btn-cycle-next');
        const btnBack = document.getElementById('btn-cycle-back');
        const dots = document.querySelector('.step-dots');
        
        this.isAnimating = false;
        if (btnNext) btnNext.disabled = false;
        if (btnBack) btnBack.disabled = (step === 0);

        this.setWallet('wallet-player', 100);
        this.setWallet('wallet-mo', 100);
        this.setWallet('wallet-kian', 100);
        this.resetArrows();

        if (this.isCycleBroken) {
            this.renderBrokenState();
            return;
        }

        if (step === 0) {
            titleEl.textContent = "Ausgangslage";
            descEl.innerHTML = "Jeder startet mit <b>100 Gold</b>.<br>Das System ist im Gleichgewicht.";
            if (dots) dots.textContent = "● ○ ○ ○";
            if (btnNext) btnNext.textContent = "Starten";

        } else if (step === 1) {
            titleEl.textContent = "1. Deine Einnahmen";
            descEl.innerHTML = "Du verkaufst Fisch.<br>Mo (-30) und Kian (-20) bezahlen dich.";
            if (dots) dots.textContent = "○ ● ○ ○";
            if (btnNext) btnNext.textContent = "Weiter";

            if (!skipAnimation) {
                this.runSequence([
                    () => this.animateTransfer('node-mo', 'node-player', 30, 'path-inc-mo'),
                    () => this.animateTransfer('node-kian', 'node-player', 20, 'path-inc-kian')
                ]);
            } else {
                this.setWallet('wallet-player', 150);
                this.setWallet('wallet-mo', 70);
                this.setWallet('wallet-kian', 80);
                this.showArrow('path-inc-mo');
                this.showArrow('path-inc-kian');
            }

        } else if (step === 2) {
            titleEl.textContent = "2. Deine Ausgaben";
            descEl.innerHTML = "Das Geld fließt zurück.<br>Reparatur bei Kian (+30) und Essen bei Mo (+20).";
            if (dots) dots.textContent = "○ ○ ● ○";
            
            this.setWallet('wallet-player', 150);
            this.setWallet('wallet-mo', 70);
            this.setWallet('wallet-kian', 80);

            if (!skipAnimation) {
                this.runSequence([
                    () => this.animateTransfer('node-player', 'node-kian', 30, 'path-exp-kian'),
                    () => this.animateTransfer('node-player', 'node-mo', 20, 'path-exp-mo')
                ]);
            } else {
                this.setWallet('wallet-player', 100);
                this.setWallet('wallet-mo', 90);
                this.setWallet('wallet-kian', 110);
                this.showArrow('path-exp-mo');
                this.showArrow('path-exp-kian');
            }

        } else if (step === 3) {
            titleEl.textContent = "3. Der Ausgleich";
            descEl.innerHTML = "Damit sich der Kreis schließt: Kian kauft Bier bei Mo (+10).<br><b>Alle haben wieder 100 Gold.</b>";
            if (dots) dots.textContent = "○ ○ ○ ●";
            if (btnNext) {
                btnNext.textContent = "Verstanden";
                btnNext.classList.add('finish');
            }

            this.setWallet('wallet-player', 100);
            this.setWallet('wallet-mo', 90);
            this.setWallet('wallet-kian', 110);

            if (!skipAnimation) {
                this.runSequence([
                    () => this.animateTransfer('node-kian', 'node-mo', 10, 'path-loop')
                ]);
            } else {
                this.setWallet('wallet-mo', 100);
                this.setWallet('wallet-kian', 100);
                this.showArrow('path-loop');
            }
        } else {
            this.hideCycleExplanation();
        }
    }

    // --- VISUAL HELPERS ---

    async runSequence(animations) {
        this.isAnimating = true;
        // Buttons sperren während Animation
        const btnNext = document.getElementById('btn-cycle-next');
        const btnBack = document.getElementById('btn-cycle-back');
        if(btnNext) btnNext.disabled = true;
        if(btnBack) btnBack.disabled = true;

        // Alle Animationen in der Liste ausführen
        await Promise.all(animations.map(fn => fn()));

        this.isAnimating = false;
        if(btnNext) btnNext.disabled = false;
        if(btnBack) btnBack.disabled = false;
    }

    animateTransfer(fromId, toId, amount, arrowId) {
        return new Promise(resolve => {
            const container = document.getElementById('cycle-diagram-area');
            const fromEl = document.getElementById(fromId);
            const toEl = document.getElementById(toId);
            const arrow = document.getElementById(arrowId);

            if (arrow) {
                arrow.style.display = 'block';
                arrow.classList.add('active', 'visible');
            }

            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            const startX = (fromRect.left + fromRect.width/2) - containerRect.left;
            const startY = (fromRect.top + fromRect.height/2) - containerRect.top;
            const endX = (toRect.left + toRect.width/2) - containerRect.left;
            const endY = (toRect.top + toRect.height/2) - containerRect.top;

            const coin = document.createElement('div');
            coin.className = 'cycle-coin';
            coin.style.left = startX + 'px';
            coin.style.top = startY + 'px';
            container.appendChild(coin);

            const anim = coin.animate([
                { transform: 'translate(-50%, -50%) scale(0.5)', opacity: 0 },
                { transform: 'translate(-50%, -50%) scale(1.2)', opacity: 1, offset: 0.1 },
                { left: endX + 'px', top: endY + 'px', transform: 'translate(-50%, -50%) scale(1)' }
            ], {
                duration: 1000,
                easing: 'cubic-bezier(0.45, 0, 0.55, 1)'
            });

            anim.onfinish = () => {
                coin.remove();
                this.updateWalletValue(fromId.replace('node-', 'wallet-'), -amount);
                this.updateWalletValue(toId.replace('node-', 'wallet-'), amount);
                resolve();
            };
        });
    }

    showDeltaText(x, y, text, type, container) {
        const el = document.createElement('div');
        el.className = `cycle-delta ${type}`;
        el.textContent = text;
        el.style.left = (x + 20) + 'px'; 
        el.style.top = (y - 20) + 'px';
        container.appendChild(el);
        
        setTimeout(() => el.remove(), 1500);
    }

    updateWalletValue(walletId, change) {
        const el = document.getElementById(walletId);
        if (!el) return;
        const currentVal = parseInt(el.textContent, 10) || 0;
        const newVal = currentVal + change;
        
        el.textContent = newVal;
        el.classList.add('wallet-bump');
        setTimeout(() => el.classList.remove('wallet-bump'), 300);
        
        // Farbe basierend auf Wert anpassen
        this.setWallet(walletId, newVal);
    }

    // =========================================================================
    // VISUAL HELPERS (FÜR BEIDE ZYKLEN) - KORRIGIERT
    // =========================================================================

    setWallet(id, val) {
        const el = document.getElementById(id);
        if(el) {
            el.textContent = val;
            el.style.backgroundColor = (val < 100) ? '#e74c3c' : (val > 100 ? '#27ae60' : '#2980b9');
            // FIX: Klasse 'hidden' entfernen, damit das Element sichtbar wird
            el.classList.remove('hidden');
        }
    }

    showArrow(id) {
        const el = document.getElementById(id);
        if(el) {
            el.style.display = 'block';
            el.classList.add('active');
            // FIX: Klasse 'visible' hinzufügen, damit die CSS-Transition (Opacity) greift
            el.classList.add('visible');
        }
    }

    resetArrows() {
        const arrows = document.querySelectorAll('.arrow-path');
        arrows.forEach(a => {
            a.style.display = ''; // Inline Styles löschen
            // Alle möglichen Klassen entfernen, auch 'visible'
            a.classList.remove('active', 'throttled', 'broken', 'blocked', 'pop-out', 'visible');
        });

        // Reset Wallets visibility für sauberen Neustart, falls nötig
        // (Optional, aber sicherheitshalber lassen wir sie sichtbar, wenn setWallet aufgerufen wird)
    }
    
    renderBrokenState() {
        const titleEl = document.getElementById('cycle-step-title');
        const descEl = document.getElementById('cycle-step-desc');
        const nextBtn = document.getElementById('btn-cycle-next');
        const backBtn = document.getElementById('btn-cycle-back');
        const dots = document.querySelector('.step-dots');

        if (titleEl) {
            titleEl.textContent = "SYSTEMFEHLER: LIQUIDITÄTSFALLE";
            titleEl.style.color = "#c0392b";
        }

        if (descEl) {
            descEl.innerHTML = `
                <ul style="text-align:left; margin-left: 20px; font-size: 0.95rem; line-height: 1.6;">
                    <li>Sparmaßnahmen: <span style="color:#c0392b; font-weight:bold;">Aktiv</span></li>
                    <li>Einkommen der Nachbarn: <span style="color:#c0392b; font-weight:bold;">0 Gold</span></li>
                    <li><b>Ergebnis:</b> Dein Absatzmarkt ist zusammengebrochen.</li>
                </ul>
            `;
        }

        this.setWallet('wallet-player', 125);
        this.setWallet('wallet-mo', 0);
        this.setWallet('wallet-kian', 0);

        const badWallets = ['wallet-mo', 'wallet-kian'];
        badWallets.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.add('deficit');
                el.style.animation = 'pulseRed 1s infinite';
            }
        });

        this.resetArrows();
        const brokenArrows = ['path-exp-mo', 'path-exp-kian'];
        brokenArrows.forEach(id => {
            const arrow = document.getElementById(id);
            if (arrow) {
                arrow.style.display = 'block';
                arrow.classList.remove('active');
                arrow.style.strokeDasharray = '10, 10';
                arrow.style.stroke = '#c0392b';
                arrow.style.opacity = '0.6';
            }
        });

        if (backBtn) backBtn.style.display = 'none';
        if (dots) dots.style.display = 'none';

        if (nextBtn) {
            nextBtn.textContent = "Verstanden";
            nextBtn.classList.add('finish');
            nextBtn.style.backgroundColor = '#c0392b';
            nextBtn.onclick = () => this.hideCycleExplanation();
        }
    }

    hideCycleExplanation() {
        if (this.elements.cycleOverlay) {
            this.elements.cycleOverlay.classList.add('hidden');
            const paper = this.elements.cycleOverlay.querySelector('.cycle-paper');
            if (paper) paper.classList.remove('broken');
            events.emit(EVENTS.CYCLE_EXPLANATION_CLOSED, { cycleMode: this.cycleMode });
        }
    }

    // Aktualisiert die Wallet-Anzeigen im Wirtschaftskreislauf basierend auf Geldflüssen
    updateCycleWallets() {
        // Prüfe ob das Cycle-Overlay offen ist
        const cycleOverlay = document.getElementById('cycle-overlay');
        if (!cycleOverlay || cycleOverlay.classList.contains('hidden')) {
            return; // Nur updaten wenn das Overlay sichtbar ist
        }

        // Hole die aktuellen Werte aus dem Economy State
        const playerMoney = economy.state.moneyPlayer || 0;
        const circulation = economy.state.moneyCirculation || 0;

        // Berechne Mo und Kian Anteile (vereinfachte Logik: 50/50 Split der Circulation)
        const moMoney = Math.round(circulation * 0.5);
        const kianMoney = Math.round(circulation * 0.5);

        // Update Wallets
        this.setWallet('wallet-player', Math.round(playerMoney));
        this.setWallet('wallet-mo', moMoney);
        this.setWallet('wallet-kian', kianMoney);

        // Optional: Zeige kurze Animation für Geldfluss
        // Wenn EXPENSES_PAID, dann fließt Geld vom Spieler weg (Pfeile von player zu mo/kian)
        // Wenn INCOME_RECEIVED, dann fließt Geld zum Spieler (Pfeile von mo/kian zu player)
    }

    // Kleiner UI-Goldfluss zwischen Button und Kapitalanzeige
    animateCoinTransfer(fromEl, toEl) {
        return new Promise((resolve) => {
            if (!fromEl || !toEl || typeof document === 'undefined') {
                resolve();
                return;
            }

            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();

            const startX = fromRect.left + fromRect.width / 2;
            const startY = fromRect.top + fromRect.height / 2;
            const endX = toRect.left + toRect.width / 2;
            const endY = toRect.top + toRect.height / 2;

            const coinCount = 8;
            let finished = 0;
            const maybeDone = () => {
                finished += 1;
                if (finished >= coinCount) resolve();
            };

            const fallback = setTimeout(() => resolve(), 1200);

            for (let i = 0; i < coinCount; i++) {
                const coin = document.createElement('div');
                coin.className = 'flying-coin';
                document.body.appendChild(coin);

                coin.style.left = `${startX}px`;
                coin.style.top = `${startY}px`;

                const delay = i * 80;
                const duration = 1100 + Math.random() * 400;
                const scatterX = (Math.random() - 0.5) * 60;
                const scatterY = (Math.random() - 0.5) * 60;

                // Leichter Bogen zum Ziel
                const travelX = endX - startX;
                const travelY = endY - startY;
                const midX = travelX * 0.5 + (Math.random() - 0.5) * 40;
                const midY = travelY * 0.5 - 80 + (Math.random() - 0.5) * 30;

                const animation = coin.animate([
                    { transform: `translate(0, 0) scale(0.6)`, opacity: 0 },
                    { transform: `translate(${scatterX}px, ${scatterY}px) scale(1)`, opacity: 1, offset: 0.2 },
                    { transform: `translate(${midX}px, ${midY}px) scale(1.05)`, opacity: 1, offset: 0.6 },
                    { transform: `translate(${travelX}px, ${travelY}px) scale(0.6)`, opacity: 0 }
                ], {
                    duration,
                    delay,
                    easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)'
                });

                animation.onfinish = () => {
                    coin.remove();
                    maybeDone();
                };
            }

            setTimeout(() => clearTimeout(fallback), 1300);
        });
    }

    moveCameraToTarget(targetId) {
        // Findet Position eines Gebäudes und schwenkt Kamera dorthin
        // Director Helper Funktion wird hier via Event oder Zugriff auf SceneSetup genutzt
        // Da wir in UI sind, nutzen wir Director für die Logik oder greifen auf Buildings zu wenn verfügbar
        if (director && typeof director.focusOnBuilding === 'function') {
            // Wir müssen die Position finden
            const buildings = director.getBuildings();
            if (!buildings) return;

            let pos = null;
            if (targetId === 'HQ') pos = buildings.hqGroup?.position;
            else if (targetId === 'SHIPYARD') pos = buildings.shipyardGroup?.position;
            else if (targetId === 'TAVERN') pos = buildings.tavernGroup?.position;
            else if (targetId === 'BANK') {
                // FIX: Wenn Bank unter der Erde, verwende Zelt
                if (buildings.bankGroup && buildings.bankGroup.visible && buildings.bankGroup.position.y > -50) {
                    pos = buildings.bankGroup.position;
                } else {
                    pos = buildings.tentGroup?.position;
                }
            }
            else if (targetId === 'TENT' || targetId === 'STERLING') {
                pos = buildings.tentGroup?.position;
            }

            if (pos) {
                director.focusOnBuilding(pos);
            }
        }
    }


    // =========================================================================
    // STANDARD / LEGACY MENU HANDLING
    // =========================================================================

    renderStoryDialog(data) {
        if (!this.elements.dialog) return;

        this.elements.dialogTitle.textContent = data.title;
        this.elements.dialogText.innerText = data.text;
        this.setAvatarImage(this.elements.dialogAvatar, data.speaker);
        this.elements.dialogOptions.innerHTML = '';
        this.elements.dialogOptions.className = 'btn-group'; 

        data.choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary';
            btn.textContent = choice.text;
            btn.onclick = () => director.handleSceneChoice(data.sceneId, choice.id);
            this.elements.dialogOptions.appendChild(btn);
        });

        this.onDialogOpened(data.sceneId || data.id || 'dialog');
        this.elements.dialog.classList.remove('hidden');
    }

    renderBankMenu() {
        const state = economy.state;
        
        const content = {
            id: 'BANK_MENU',
            title: 'Inselbank',
            text: `Aktuelle Schulden: ${Math.floor(state.loanPrincipal)} Gold`,
            avatar: this.avatars['Sterling'],
            choices: []
        };

        const currentPhase = director?.currentPhaseId || economy.currentPhaseId;
        const sterlingInvited = director?.flags?.sterlingInvitationActive || false;
        const hasTakenLoan = director?.flags?.hasTakenFirstLoan || false;

        // Kredit Logik:
        // 1. In Stagnation: Nur wenn eingeladen
        // 2. In Boom: Nur wenn noch KEIN Kredit läuft UND man noch nie einen genommen hat (Kapitel 2 Einschränkung)
        const canTakeLoan = (
            (currentPhase === 'STAGNATION' && sterlingInvited) || 
            (currentPhase === 'BOOM' && !hasTakenLoan)
        ) && state.loanPrincipal === 0;

        // Texte und Status
        const totalDebt = state.loanPrincipal + (state.accruedInterest || 0);
        const tripsRemaining = state.paymentDueInTrips - state.tripsSinceLoan;

        if (totalDebt > 0) {
            content.text = `Sterling: "Sie schulden mir noch ${Math.floor(totalDebt)} Gold.\n`;
            content.text += `Kredit: ${Math.floor(state.loanPrincipal)}g | Zinsen: ${Math.floor(state.accruedInterest)}g\n`;
            
            // Textlogik für Fälligkeit
            if (state.principalDue > 0) {
                content.text += `ZAHLUNG IST JETZT FÄLLIG!"`;
            } else if (tripsRemaining > 0) {
                content.text += `Zahlung fällig in ${tripsRemaining} Fahrten."`;
            } else {
                content.text += `Fälligkeit steht bevor..."`;
            }

        } else if (canTakeLoan) {
            content.text = 'Sterling: "Ihre Situation erfordert frisches Kapital. Ich habe ein Angebot."';
        } else if (currentPhase === 'BOOM' && hasTakenLoan) {
            // Wenn Kredit schon mal genommen und zurückgezahlt wurde in Kap 2
            content.text = 'Sterling: "Für den Moment haben wir keine weiteren Angebote. Konzentrieren Sie sich auf das Wachstum."';
        } else {
            content.text = 'Sterling: "Die Bank ist derzeit für Sie nicht verfügbar."';
        }

        // Button: Kredit aufnehmen
        if (canTakeLoan) {
            content.choices.push({
                text: 'Kredit aufnehmen (200 Gold, 10% Zinsen)',
                action: () => {
                    this.hideDialog();
                    this.showLoanContract((data) => {
                        // KORRIGIERT: Direktaufruf der neuen Director-Methode
                        if (director) {
                            director.handleLoanTaken();
                        }
                    });
                }
            });
        }

        // Rückzahlung: NUR möglich, wenn Sterling es fordert (principalDue > 0)
        if (state.loanPrincipal > 0 && state.principalDue > 0) {
            const fullPayment = Math.floor(totalDebt);
            
            // Check ob Spieler genug Geld hat
            const canAfford = state.moneyPlayer >= fullPayment;

            content.choices.push({
                text: `Kredit vollständig zurückzahlen (${fullPayment} Gold)`,
                disabled: !canAfford,
                action: () => {
                    const result = economy.processLoanPayment();
                    if (result.success) {
                        this.showToast(`Kredit abbezahlt!`);
                        this.hideDialog();
                        // Trigger Nach-Kredit Szene
                        if(director) director.handleSceneChoice(null, { action: 'repay_loan_boom' });
                    } else {
                        this.showToast(`Nicht genug Gold!`);
                    }
                }
            });
        }
        // HINWEIS: Teilzahlung wurde entfernt!

        content.choices.push({ text: 'Schließen', action: () => this.hideDialog() });
        this.showGenericMenu(content);
    }


    renderShipyardMenu() {
        const state = economy.state;
        const shipyardOptions = economy.getShipyardOptions();
        const handleShipyardOption = (option) => {
            const directorRef = window.director || director;

            // KAPITEL 1: Wenn nicht genug Geld für Motorboot -> onPurchaseFailed aufrufen
            if (!option.available && option.id === 'buy_motor' && directorRef && directorRef.currentPhaseId === 'STAGNATION') {
                this.hideDialog();
                directorRef.onPurchaseFailed({ type: 'motor' });
                return;
            }

            if (!option.available) {
                this.showToast('Nicht genug Gold!');
                return;
            }

            if (option.id === 'buy_dredge_upgrade') {
                this.hideDialog();
                if (directorRef) {
                    directorRef.handleSceneChoice(null, { action: 'buy_trawler_upgrade' });
                }
                return;
            }

            if (option.id === 'buy_trawler') {
                this.hideDialog();
                if (directorRef) {
                    directorRef.handleSceneChoice(null, { action: 'buy_trawler' });
                }
                return;
            }

            if (option.id === 'buy_motor') {
                if (economy.buyBoat('motor')) {
                    this.hideDialog();
                }
            }
        };

        const content = {
            id: 'SHIPYARD_MENU',
            title: 'Werft',
            text: `Flotte: ${state.boatsRow} Ruder, ${state.boatsMotor} Motor, ${state.boatsTrawl} Trawler`,
            avatar: this.avatars['Kian'],
            choices: []
        };

        if (shipyardOptions.length === 0) {
            content.choices.push({
                text: 'Keine Angebote verfügbar',
                disabled: true,
                action: () => {}
            });
        } else {
            shipyardOptions.forEach(option => {
                const description = option.description ? option.description : '';
                content.choices.push({
                    text: `${option.label}`,
                    description: option.available ? description : `${description} (Nicht genug Gold!)`,
                    action: () => handleShipyardOption(option)
                });
            });
        }

        // Kein "Schließen"-Button mehr nötig; das X oben dient als Close.
        this.showGenericMenu(content);
    }

    renderTavernMenu() {
        const content = {
            id: 'TAVERN_MENU',
            title: 'Zum lustigen Lachs',
            text: 'Mo: "Willkommen! Hier trifft sich die Insel."',
            avatar: this.avatars['Mo'],
            choices: [
                { 
                    text: 'Runde ausgeben', 
                    action: () => {
                        this.hideDialog();
                        events.emit('ui:tavern_round_bought'); 
                        events.emit(EVENTS.TOAST, { message: 'Die Crew feiert! Die Stimmung ist gut.' });
                    }
                }
            ]
        };
        this.showGenericMenu(content);
    }

    renderHQMenu(params) {
        const state = economy.state;
        const showSavingsButton = !!(params && params.showSavingsButton);

        // Sparmaßnahmen nur in Kapitel 1 (STAGNATION) erlauben
        const activePhaseId = this.visiblePhaseId || director.currentPhaseId;
        const isSavingsAllowed = showSavingsButton && activePhaseId === 'STAGNATION';

        const content = {
            id: 'HQ_MENU',
            title: 'Fischerei-Kontor',
            text: state.isSavingActive
                ? 'Dies ist deine Zentrale.\nSparmaßnahmen laufen bereits – halte Crew und Nachfrage im Blick.'
                : 'Dies ist deine Zentrale.\nKoordiniere Boote und halte Kontakt zur Crew.',
            avatar: 'assets/portraits/captain.png', 
            choices: []
        };

        // Nur anzeigen, wenn erlaubt
        if (isSavingsAllowed) {
            content.choices.push({
                text: 'Sparmaßnahmen verwalten 📉',
                action: () => {
                    this.hideGuidanceArrow();
                    this.hideDialog();
                    this.showSavingsBook(() => { events.emit(EVENTS.SAVINGS_CONFIRMED); });
                }
            });
        }
        content.choices.push({ text: 'Schließen', action: () => this.hideDialog() });
        this.showGenericMenu(content);
    }

    showGenericMenu(content) {
        const dialogId = content.id || content.title || 'dialog';
        this.elements.dialogTitle.textContent = content.title;
        this.elements.dialogText.innerText = content.text;
        
        // Avatar-Fallback Logik
        let avatarPath = content.avatar;
        // Falls der Avatar nur ein String-Key ist, suche im Map
        if (avatarPath && !avatarPath.includes('/') && this.avatars[avatarPath]) {
            avatarPath = this.avatars[avatarPath];
        } else if (!avatarPath) {
             // Mapping basierend auf ID
             let speakerName = 'default';
             if (content.id === 'BANK_MENU') speakerName = 'Sterling';
             else if (content.id === 'SHIPYARD_MENU') speakerName = 'Kian';
             else if (content.id === 'TAVERN_MENU') speakerName = 'Mo';
             else if (content.id === 'HQ_MENU') speakerName = "Kapt'n";
             avatarPath = this.avatars[speakerName];
        }

        if (this.elements.dialogAvatar) {
            this.elements.dialogAvatar.style.backgroundImage = `url('${avatarPath}')`;
            this.elements.dialogAvatar.textContent = '';
        }

        this.elements.dialogOptions.innerHTML = '';
        this.elements.dialogOptions.className = 'menu-grid';

        content.choices.forEach(choice => {
            const btn = document.createElement('button');
            btn.className = 'menu-btn';
            btn.textContent = choice.text;
            btn.onclick = choice.action;
            btn.disabled = !!choice.disabled;
            if (choice.tooltip) btn.title = choice.tooltip;
            else if (choice.description) btn.title = choice.description;
            this.elements.dialogOptions.appendChild(btn);
        });

        this.onDialogOpened(dialogId);
        this.elements.dialog.classList.remove('hidden');
    }

    hideDialog() {
        if (director.isSceneActive) {
            director.endScene();
        }
        if (this.elements.dialog) this.elements.dialog.classList.add('hidden');
        this.onDialogClosed();
    }

    onDialogOpened(id = 'dialog') {
        this.dialogOpen = true;
        this.currentDialogId = id;
        events.emit(EVENTS.UI_DIALOG_OPENED, { id });
        // Verstecke das Narrative Overlay temporär, falls es offen war
        if (!this.elements.narrativeScene.classList.contains('hidden')) {
             this.elements.narrativeScene.classList.add('blocked');
        }
    }

    onDialogClosed() {
        if (!this.dialogOpen) return;
        this.dialogOpen = false;
        events.emit(EVENTS.UI_DIALOG_CLOSED, { id: this.currentDialogId });
        this.currentDialogId = null;
        
        // Narrative wiederherstellen
        if (this.elements.narrativeScene.classList.contains('blocked')) {
             this.elements.narrativeScene.classList.remove('blocked');
        }
    }

    // =========================================================================
    // SAVINGS BOOK
    // =========================================================================

    updateSterling(category) {
        if (!this.elements.sterlingText || !this.sterlingQuotes[category]) return;
        const quotes = this.sterlingQuotes[category];
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        this.elements.sterlingText.style.opacity = 0;
        setTimeout(() => {
            this.elements.sterlingText.textContent = randomQuote;
            this.elements.sterlingText.style.opacity = 1;
        }, 200);
    }

    showAdvisor(text, duration = 5000) {
        const panel = this.elements.sterlingPanel;
        const textEl = this.elements.sterlingText;
        if (!panel || !textEl) return;

        panel.className = 'sterling-panel gameplay-mode';
        const avatarEl = panel.querySelector('.sterling-avatar');
        if (avatarEl) {
            avatarEl.style.backgroundImage = `url('${this.avatars['Sterling']}')`;
            avatarEl.textContent = '';
        }

        textEl.textContent = text || '';

        setTimeout(() => panel.classList.remove('hidden'), 10);

        if (this.sterlingTimeout) clearTimeout(this.sterlingTimeout);
        this.sterlingTimeout = setTimeout(() => {
            panel.classList.add('hidden');
        }, duration);
    }

    showSavingsBook(onConfirmCallback) {
        const overlay = this.elements.savingsOverlay;
        const checklist = this.elements.savingsChecklist; 
        const confirmBtn = this.elements.savingsConfirmBtn;
        const forecast = this.elements.savingsForecast;
        
        if (!overlay || !checklist) return;

        this.savingsConfirmCallback = onConfirmCallback;
        
        // Advisor in Menü-Position setzen
        if (this.elements.sterlingPanel) {
            this.elements.sterlingPanel.className = 'sterling-panel menu-mode';
            this.elements.sterlingPanel.classList.remove('hidden');
            const avatarEl = this.elements.sterlingPanel.querySelector('.sterling-avatar');
            if (avatarEl) {
                avatarEl.style.backgroundImage = `url('${this.avatars['Sterling']}')`;
                avatarEl.textContent = '';
            }
        }
        
        const title = overlay.querySelector('.savings-title');
        const subtitle = overlay.querySelector('.savings-subtitle');
        if(title) title.textContent = "Effizienz-Management";
        if(subtitle) subtitle.textContent = "Definiere den Betriebsstandard.";

        // Daten aus Balance (importieren oder hardcoden für UI)
        const costsFromBalance = BALANCE && BALANCE.ECONOMY && BALANCE.ECONOMY.COSTS;
        const COSTS = costsFromBalance || { SHIPYARD: { PREMIUM: 30, BASIC: 10 }, TAVERN: { FULL: 20, BASIC: 5 } };

        const optionsData = [
            {
                id: 'shipyard', label: 'Werft & Instandhaltung',
                choices: [
                    { id: 'premium', title: 'Premium Wartung', cost: COSTS.SHIPYARD.PREMIUM, desc: '🛠️ Langfristiger Werterhalt', isCheap: false },
                    { id: 'basic', title: 'Notdürftige Flicken', cost: COSTS.SHIPYARD.BASIC, desc: '🩹 Nur das Nötigste', isCheap: true }
                ]
            },
            {
                id: 'tavern', label: 'Crew Verpflegung',
                choices: [
                    { id: 'full', title: 'Moral & Verpflegung', cost: COSTS.TAVERN.FULL, desc: '🍖 Hohe Motivation', isCheap: false },
                    { id: 'basic', title: 'Wasser & Hartbrot', cost: COSTS.TAVERN.BASIC, desc: '💧 Existenzminimum', isCheap: true }
                ]
            }
        ];

        // Default State: Teuer
        const selectionState = { shipyard: optionsData[0].choices[0], tavern: optionsData[1].choices[0] };

        const updateForecast = () => {
            const projectedRevenue = BALANCE && BALANCE.ECONOMY ? BALANCE.ECONOMY.REVENUE_PER_TRIP : 50; 
            const totalCost = selectionState.shipyard.cost + selectionState.tavern.cost;
            const projectedProfit = projectedRevenue - totalCost;
            const normalTotalCost = COSTS.SHIPYARD.PREMIUM + COSTS.TAVERN.FULL; // 50
            const totalSavings = normalTotalCost - totalCost;

            if (totalSavings === 0) {
                this.updateSterling('open'); 
                if(this.elements.sterlingText) this.elements.sterlingText.textContent = "Ohne Opfer kein Profit.";
            } else if (totalSavings < 35) {
                this.updateSterling('check'); 
                if(this.elements.sterlingText) this.elements.sterlingText.textContent = "Ein Anfang. Aber warum zögern?";
            } else {
                this.updateSterling('calc'); // "Wundervoll"
            }

            forecast.querySelector('.forecast-text').innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:0.9rem; opacity:0.8;">
                    <span>Erwarteter Umsatz:</span><span>${projectedRevenue}g</span>
                </div>
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid rgba(0,0,0,0.1); padding-bottom:8px; margin-bottom:8px;">
                    <span>Betriebskosten:</span><span style="color:#c0392b; font-weight:bold;">-${totalCost}g</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                    <span style="font-weight:bold; color:#2c3e50;">Projektierter Gewinn:</span>
                    <span style="font-size:1.4rem; font-weight:800; color:${projectedProfit > 0 ? '#27ae60' : '#7f8c8d'};">+${projectedProfit}g</span>
                </div>
                ${totalSavings > 0 ? `<div style="text-align:right; font-size:0.8rem; color:#27ae60; margin-top:5px;">(Effizienzsteigerung: +${totalSavings}g)</div>` : ''}
            `;

            confirmBtn.disabled = false;
            if (totalSavings > 0) {
                confirmBtn.textContent = "Effizienzplan anwenden";
                confirmBtn.classList.remove('btn-secondary');
                confirmBtn.classList.add('btn-success');
            } else {
                confirmBtn.textContent = "Unverändert lassen";
                confirmBtn.classList.add('btn-secondary');
                confirmBtn.classList.remove('btn-success');
            }
        };

        const renderUI = () => {
            checklist.innerHTML = '';
            optionsData.forEach(cat => {
                const row = document.createElement('div');
                row.className = 'savings-row';
                const label = document.createElement('div');
                label.className = 'savings-row-label';
                label.textContent = cat.label;
                row.appendChild(label);
                const group = document.createElement('div');
                group.className = 'savings-options-group';

                cat.choices.forEach(choice => {
                    const isActive = (selectionState[cat.id].id === choice.id);
                    const card = document.createElement('div');
                    card.className = `savings-card ${choice.isCheap ? 'cheap' : ''} ${isActive ? 'active' : ''}`;
                    card.innerHTML = `<div class="card-header"><span class="card-title">${choice.title}</span><span class="card-price">-${choice.cost}g</span></div><div class="card-desc">${choice.desc}</div>`;
                    card.onclick = () => { selectionState[cat.id] = choice; renderUI(); };
                    group.appendChild(card);
                });
                row.appendChild(group);
                checklist.appendChild(row);
            });
            updateForecast();
        };

        checklist.className = ''; 
        forecast.classList.remove('hidden');
        if (this.elements.savingsCalcBtn) this.elements.savingsCalcBtn.style.display = 'none';
        confirmBtn.style.display = 'inline-block';
        renderUI();
        overlay.classList.remove('hidden');

        confirmBtn.onclick = () => {
            const normalTotalCost = COSTS.SHIPYARD.PREMIUM + COSTS.TAVERN.FULL;
            const currentTotalCost = selectionState.shipyard.cost + selectionState.tavern.cost;
            const savingsAmount = normalTotalCost - currentTotalCost;

            const savingsConfig = {
                tavernLevel: selectionState.tavern.id,   // 'full' oder 'basic'
                shipyardLevel: selectionState.shipyard.id // 'premium' oder 'basic'
            };

            if (savingsAmount === 0) {
                this.hideSavingsBook();
                events.emit(EVENTS.TOAST, { message: "Keine Änderungen. Status Quo." });
                return;
            }

            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Wird angewendet...';
            this.updateSterling('confirm');
            
            setTimeout(() => {
                events.emit(EVENTS.SAVINGS_CONFIRMED, { 
                    amount: savingsAmount,
                    config: savingsConfig 
                }); 
                
                this.hideSavingsBook();
                if (typeof this.savingsConfirmCallback === 'function') {
                    const cb = this.savingsConfirmCallback;
                    this.savingsConfirmCallback = null;
                    cb(true);
                }
            }, 1000);
        };
    }

    // Wird vom Listener aufgerufen (siehe init())
    animateWorldToUICoins(targetId, amount = 10, isLoss = false) {
        const worldPos = this.getTargetWorldPosition(targetId);
        if (!worldPos || !sceneSetup.camera) return;

        const uiMoneyEl = document.getElementById('stat-money-container');
        if (!uiMoneyEl) return;

        const vec = worldPos.clone();
        vec.y += 5;
        vec.project(sceneSetup.camera);
        const worldX = (vec.x * 0.5 + 0.5) * window.innerWidth;
        const worldY = (-(vec.y * 0.5) + 0.5) * window.innerHeight;

        const toRect = uiMoneyEl.getBoundingClientRect();
        const uiX = toRect.left + toRect.width / 2;
        const uiY = toRect.top + toRect.height / 2;

        const startX = isLoss ? uiX : worldX;
        const startY = isLoss ? uiY : worldY;
        const endX = isLoss ? worldX : uiX;
        const endY = isLoss ? worldY : uiY;

        const coinCount = Math.max(3, Math.min(12, Math.ceil(Math.abs(amount) / 3)));

        for(let i=0; i<coinCount; i++) {
            const coin = document.createElement('div');
            coin.className = 'flying-coin';
            if (isLoss) coin.classList.add('loss');

            document.body.appendChild(coin);

            // FIX: Positioniere das Element direkt an den Startkoordinaten
            // Damit ist (0,0) im Transform relativ zu diesem Punkt
            coin.style.left = `${startX}px`;
            coin.style.top = `${startY}px`;

            const delay = i * 60;
            const duration = 1000 + Math.random() * 300;

            // Berechne relative Distanzen für die Animation
            const relEndX = endX - startX;
            const relEndY = endY - startY;
            const relMidX = relEndX * 0.5 + (Math.random()-0.5) * 80;
            const arcOffset = isLoss ? 50 : -100;
            const relMidY = (relEndY * 0.5) + arcOffset + (Math.random() - 0.5) * 40;

            const anim = coin.animate([
                // Zentriere die Münze mit translate(-50%, -50%) und starte bei 0 Offset
                { transform: 'translate(-50%, -50%) translate(0px, 0px) scale(0.5)', opacity: 0 },
                { transform: `translate(-50%, -50%) translate(${relMidX}px, ${relMidY}px) scale(1.0)`, opacity: 1, offset: 0.5 },
                { transform: `translate(-50%, -50%) translate(${relEndX}px, ${relEndY}px) scale(0.6)`, opacity: 0 }
            ], { duration, delay, easing: 'ease-in-out' });

            anim.onfinish = () => coin.remove();
        }
    }

    // --- Billboard für Rechnungen über Gebäuden ---
    createBillboard(data) {
        if (!data || !data.target) return;

        const targetPos = this.getTargetWorldPosition(data.target);
        if (!targetPos) return;

        const el = document.createElement('div');
        el.className = `billboard ${data.type || 'neutral'}`;
        el.innerHTML = `
            <div class="billboard-header">${data.title || 'INFO'}</div>
            <div class="billboard-content">
                <div class="billboard-row">
                    <span>${data.text || ''}</span>
                </div>
            </div>
            <div class="billboard-footer">${data.subtext || ''}</div>
        `;
        
        this.elements.uiLayer.appendChild(el);

        if (data.id) {
            const existing = this.activeBillboards.get(data.id);
            if (existing && existing.parentNode) {
                existing.parentNode.removeChild(existing);
            }
            this.activeBillboards.set(data.id, el);
        }

        let frameId;
        const autoClose = !data.isPersist;
        const startTime = Date.now();
        const duration = 3000;

        const updatePos = () => {
            if (!el.parentNode) {
                cancelAnimationFrame(frameId);
                return;
            }

            if (autoClose && Date.now() - startTime > duration) {
                if (data.id) this.activeBillboards.delete(data.id);
                this.closeElement(el);
                cancelAnimationFrame(frameId);
                return;
            }

            if (sceneSetup && sceneSetup.camera) {
                const vec = targetPos.clone();
                vec.y += 10;
                vec.project(sceneSetup.camera);

                const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-(vec.y * 0.5) + 0.5) * window.innerHeight;

                if (vec.z > 1) {
                    el.style.display = 'none';
                } else {
                    el.style.display = 'block';
                    // OPTIMIERUNG: GPU-beschleunigte Positionierung mit translate3d
                    el.style.left = '0px';
                    el.style.top = '0px';
                    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
                }
            }

            if (!el.classList.contains('visible')) {
                requestAnimationFrame(() => el.classList.add('visible'));
            }

            frameId = requestAnimationFrame(updatePos);
        };

        updatePos();
    }

    updateBillboard(data) {
        const el = this.activeBillboards.get(data?.id);
        if (!el) return;

        const contentDiv = el.querySelector('.billboard-content');
        const footerDiv = el.querySelector('.billboard-footer');

        // --- DEDUPLIZIERUNG (Punkt 4) ---
        // Prüfen, ob eine Zeile mit diesem Label bereits existiert
        if (data.addLabel !== undefined && data.addAmount !== undefined) {
            // Suche nach existierender Zeile anhand eines data-Attributs
            let existingRow = contentDiv.querySelector(`.billboard-row[data-label="${data.addLabel}"]`);
            
            if (existingRow) {
                // Update existierende Zeile (z.B. Betrag summieren oder einfach nur anzeigen)
                // In diesem Fall ersetzen wir den Betrag, da die Economy die Gesamtsumme sendet
                existingRow.querySelector('.amount').textContent = `${data.addAmount} G`;
                // Kleiner visueller Flash für das Update
                existingRow.style.color = '#fff';
                setTimeout(() => existingRow.style.color = '#e74c3c', 200);
            } else {
                // Neue Zeile erstellen
                const row = document.createElement('div');
                row.className = 'billboard-row expense';
                row.setAttribute('data-label', data.addLabel); // Wichtig für Deduplizierung
                row.innerHTML = `
                    <span>${data.addLabel}</span>
                    <span class="amount">${data.addAmount} G</span>
                `;
                contentDiv.appendChild(row);
            }
        }

        // --- ANIMATION (Punkt 9) ---
        if (data.newTotal !== undefined) {
            // Zähler-Effekt für den Footer
            // Robustere Regex zur Erkennung von Minus, Punkten und Ziffern
            const currentTotalStr = footerDiv.textContent.replace(/[^0-9.-]/g, '');
            let currentVal = parseFloat(currentTotalStr) || 0;
            const targetVal = data.newTotal;

            // Klasse für visuelles Feedback während des Zählens
            el.classList.add('counting');

            // Einfache Zähl-Animation
            const steps = 20;
            const duration = 1000;
            const stepTime = duration / steps;
            const delta = (targetVal - currentVal) / steps;
            let step = 0;

            const counterInterval = setInterval(() => {
                step++;
                currentVal += delta;
                
                // Formatierung
                const displayVal = Math.round(currentVal);
                const prefix = displayVal > 0 ? '+' : '';
                footerDiv.textContent = `${prefix}${displayVal} G`;

                if (step >= steps) {
                    clearInterval(counterInterval);
                    // Endzustand setzen
                    const finalPrefix = targetVal > 0 ? '+' : '';
                    footerDiv.textContent = `${finalPrefix}${targetVal} G`;
                    
                    el.classList.remove('counting');
                    el.classList.remove('gain', 'neutral', 'loss');
                    
                    if (targetVal > 0) el.classList.add('gain');
                    else if (targetVal < 0) el.classList.add('loss');
                    else el.classList.add('neutral');
                }
            }, stepTime);
        }
    }

    closeBillboard(id) {
        const el = this.activeBillboards.get(id);
        if (el) {
            this.closeElement(el);
            this.activeBillboards.delete(id);
        }
    }

    closeElement(el) {
        el.classList.remove('visible');
        el.style.transform = `translate(-50%, -150%) scale(0.9)`;
        el.style.opacity = '0';
        setTimeout(() => { 
            if (el.parentNode) el.parentNode.removeChild(el); 
        }, 300);
    }

    hideSavingsBook() {
        if (this.elements.savingsOverlay) {
            this.elements.savingsOverlay.classList.add('hidden');
        }
        if (this.elements.sterlingPanel) {
            this.elements.sterlingPanel.classList.add('hidden');
        }
    }

    // Kreditvertrag anzeigen (BOOM Phase)
    showLoanContract(onConfirmCallback) {
        const overlay = this.elements.loanOverlay;
        const signatureBox = this.elements.loanSignatureBox;
        const signBtn = this.elements.loanSignBtn;
        const cancelBtn = this.elements.loanCancelBtn;

        if (!overlay) return;

        this.loanConfirmCallback = onConfirmCallback;
        let signed = false;

        // Sterling Advisor in Menü-Position setzen
        if (this.elements.sterlingPanel) {
            this.elements.sterlingPanel.className = 'sterling-panel menu-mode';
            this.elements.sterlingPanel.classList.remove('hidden');
            const avatarEl = this.elements.sterlingPanel.querySelector('.sterling-avatar');
            if (avatarEl) {
                avatarEl.style.backgroundImage = `url('${this.avatars['Sterling']}')`;
                avatarEl.textContent = '';
            }
            if (this.elements.sterlingText) {
                this.elements.sterlingText.textContent = 'Wachstum erfordert Kapital. Unterschreiben Sie!';
            }
        }

        // --- FIX: Handler Definitionen ---

        const handleSignature = () => {
            if (signed) return;
            signed = true;

            signatureBox.classList.add('signed');
            signatureBox.querySelector('.signature-placeholder').classList.add('hidden');
            signatureBox.querySelector('.signature-text').classList.remove('hidden');

            signBtn.disabled = false;
            signBtn.classList.add('btn-success');

            if (this.elements.sterlingText) {
                this.elements.sterlingText.textContent = 'Ausgezeichnet! Wachstum wartet auf Sie.';
            }
        };

        const handleSign = () => {
            // Sterling Panel verstecken
            if (this.elements.sterlingPanel) {
                this.elements.sterlingPanel.classList.add('hidden');
            }

            // Callback ausführen
            if (this.loanConfirmCallback) {
                this.loanConfirmCallback({ amount: 200 });
            }

            // Reset und schließen
            this.resetLoanContractUI();
            overlay.classList.add('hidden');
            
            // WICHTIG: Handler löschen, damit keine Referenzen bleiben
            signBtn.onclick = null;
            cancelBtn.onclick = null;
            signatureBox.onclick = null;
        };

        const handleCancel = () => {
            if (this.elements.sterlingPanel) {
                this.elements.sterlingPanel.classList.add('hidden');
            }

            this.resetLoanContractUI();
            overlay.classList.add('hidden');
            events.emit(EVENTS.TOAST, { message: 'Kreditvertrag abgelehnt' });
            
            // Handler löschen
            signBtn.onclick = null;
            cancelBtn.onclick = null;
            signatureBox.onclick = null;
        };

        // --- FIX: .onclick statt .addEventListener nutzen ---
        // Dies überschreibt vorherige Listener, falls der Dialog abgebrochen und neu geöffnet wurde.
        signatureBox.onclick = handleSignature;
        signBtn.onclick = handleSign;
        cancelBtn.onclick = handleCancel;

        // Overlay anzeigen
        overlay.classList.remove('hidden');

        // Reset state beim Öffnen
        signed = false;
        signBtn.disabled = true;
        signBtn.classList.remove('btn-success');
        signatureBox.classList.remove('signed');
        signatureBox.querySelector('.signature-placeholder').classList.remove('hidden');
        signatureBox.querySelector('.signature-text').classList.add('hidden');
    }


    resetLoanContractUI() {
        const signatureBox = this.elements.loanSignatureBox;
        const signBtn = this.elements.loanSignBtn;

        if (!signatureBox || !signBtn) return;

        // Unterschrift zurücksetzen
        signBtn.disabled = true;
        signBtn.classList.remove('btn-success');
        signatureBox.classList.remove('signed');

        const placeholder = signatureBox.querySelector('.signature-placeholder');
        const signatureText = signatureBox.querySelector('.signature-text');

        if (placeholder) placeholder.classList.remove('hidden');
        if (signatureText) signatureText.classList.add('hidden');
    }

    // =========================================================================
    // VISUAL FEEDBACK
    // =========================================================================

    showToast(msg) {
        if (!this.elements.toastText) return;
        this.elements.toastText.textContent = msg;
        this.elements.toast.classList.remove('hidden');
        this.elements.toast.style.opacity = '1';
        this.elements.toast.style.transform = 'translate(-50%, 0) scale(1)';

        setTimeout(() => {
            this.elements.toast.style.opacity = '0';
            this.elements.toast.style.transform = 'translate(-50%, 20px) scale(0.9)';
            setTimeout(() => this.elements.toast.classList.add('hidden'), 500);
        }, 4000);
    }

    showPersistentWarning(text) {
        if (!this.elements.persistentWarning) return;
        if (this.elements.persistentWarningText) {
            this.elements.persistentWarningText.textContent = text;
        }
        this.elements.persistentWarning.classList.remove('neutral-hint');
        this.elements.persistentWarning.classList.remove('hidden');
    }

    hidePersistentWarning() {
        if (!this.elements.persistentWarning) return;
        this.elements.persistentWarning.classList.add('hidden');
        this.elements.persistentWarning.classList.remove('neutral-hint');
    }

    showPersistentHint(text) {
        if (!this.elements.persistentWarning) return;
        if (this.elements.persistentWarningText) {
            this.elements.persistentWarningText.textContent = text;
        }
        this.elements.persistentWarning.classList.add('neutral-hint');
        this.elements.persistentWarning.classList.remove('hidden');
    }

    handleMoneyChange(data) {
        // Pulse Effekt beim Kapital oben rechts
        this.triggerMoneyPulse(data.amount);
        this.showMoneyDelta(data.amount);

        // GLOBAL DEAKTIVIERT: Keine Floating Texts im 3D-Raum mehr (alte Logik)
        // Wir nutzen nur noch das Delta oben rechts und die Billboards.
        return; 
    }

    // NEU: Methode für den Pulse-Effekt
    triggerMoneyPulse(amount) {
        if (!this.elements.money) return;

        this.elements.money.classList.remove('stat-pulse-gain', 'stat-pulse-loss');
        void this.elements.money.offsetWidth; // Reflow, um Animation neu zu starten

        if (amount > 0) {
            this.elements.money.classList.add('stat-pulse-gain');
        } else if (amount < 0) {
            this.elements.money.classList.add('stat-pulse-loss');
        }
    }

    showMoneyDelta(amount) {
        const el = this.elements.moneyDelta;
        if (!el) return;

        el.classList.remove('animate-pop', 'show', 'positive', 'negative');
        void el.offsetWidth; // Reflow

        const prefix = amount > 0 ? '+' : '';
        el.textContent = `${prefix}${Math.floor(amount)}`;
        el.classList.add(amount > 0 ? 'positive' : 'negative');
        el.classList.add('animate-pop'); // CSS anim
    }

    createFloatingText(text, position3D, color, className = 'floating-text') {
        if (!sceneSetup.camera) return;

        const vector = position3D.clone();
        vector.x += (Math.random() - 0.5) * 20;
        vector.y += 10;
        vector.project(sceneSetup.camera);

        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight;

        if (x < 0 || x > window.innerWidth || y < 0 || y > window.innerHeight) return;

        const el = document.createElement('div');
        el.className = className;
        el.textContent = text;
        // OPTIMIERUNG: GPU-beschleunigte Positionierung mit translate3d
        el.style.left = '0px';
        el.style.top = '0px';
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        el.style.color = color;

        this.elements.uiLayer.appendChild(el);
        setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 2000);
    }

    getTargetWorldPosition(targetId) {
        // Hilfsfunktion um Gebäude-Positionen zu finden
        if (!director) return null;
        const buildings = director.getBuildings();
        if (!buildings || !targetId) return null;

        let t = typeof targetId === 'string' ? targetId.toUpperCase() : '';
        let group = null;

        if (t === 'SHIPYARD' || t === 'KIAN') group = buildings.shipyardGroup;
        else if (t === 'TAVERN' || t === 'MO') group = buildings.tavernGroup;
        else if (t === 'HQ' || t === 'HQ_MENU') group = buildings.hqGroup;

        // --- FIX START: Intelligente Sterling-Positionierung ---
        else if (t === 'BANK' || t === 'STERLING') {
            // Wenn die Bank noch unter der Erde ist (Y < -100) oder unsichtbar,
            // fokussieren wir stattdessen auf das Zelt.
            if (buildings.bankGroup && buildings.bankGroup.visible && buildings.bankGroup.position.y > -50) {
                group = buildings.bankGroup;
            } else {
                group = buildings.tentGroup;
            }
        }
        else if (t === 'TENT') {
            group = buildings.tentGroup;
        }
        // --- FIX ENDE ---

        else if (t === 'BOAT') {
            return new THREE.Vector3(0, 5, 180);
        }

        if (!group || !group.position) return null;

        // Position mit leichtem Offset über dem Gebäude
        return new THREE.Vector3(group.position.x, group.position.y + 15, group.position.z);
    }

    createGuidanceSprite(icon = '⬇️') {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Leuchtendes Gelb/Orange
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#ffd700');
        grad.addColorStop(1, '#f39c12');
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#b9770e';
        ctx.lineWidth = 10;

        // Runde Form
        ctx.beginPath();
        ctx.roundRect(60, 60, w - 120, h - 180, 50);
        ctx.fill();
        ctx.stroke();

        // Pfeil Dreieck unten
        ctx.beginPath();
        ctx.moveTo(w / 2 - 40, h - 160);
        ctx.lineTo(w / 2 + 40, h - 160);
        ctx.lineTo(w / 2, h - 80);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Icon/Text
        ctx.fillStyle = '#2c3e50';
        ctx.font = 'bold 140px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(icon, w / 2, h / 2 - 30);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false,
            depthWrite: false
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(70, 70, 1);
        sprite.center.set(0.5, 0);
        sprite.renderOrder = 1000;
        sprite.userData.canvas = canvas;
        sprite.userData.texture = texture;
        return sprite;
    }

    // --- Guidance Arrow ---

    showGuidanceArrow(targetId) {
        this.guidanceTarget = targetId;
        if (!this.guidanceSprite) {
            this.guidanceSprite = this.createGuidanceSprite('⬇️');
            sceneSetup.scene.add(this.guidanceSprite);
        }
        this.guidanceSprite.visible = true;
        this.updateGuidanceArrowPosition();
    }

    hideGuidanceArrow() {
        if (this.guidanceSprite) this.guidanceSprite.visible = false;
        this.guidanceTarget = null;
    }

    updateGuidanceArrowPosition() {
        if (!this.guidanceSprite || !this.guidanceTarget) return;
        const pos = this.getTargetWorldPosition(this.guidanceTarget);
        if (!pos) {
            this.guidanceSprite.visible = false;
            return;
        }
        this.guidanceSprite.visible = true;
        this.guidanceSprite.position.copy(pos);
    }

    // --- Cinemativ & Intro ---

    showCinematicLayer() {
        if (this.elements.cinematicLayer) {
            this.elements.cinematicLayer.classList.remove('hidden');
            this.elements.cinematicLayer.classList.add('active');
        }
    }

    toggleSkipButton(visible) {
        if (!this.elements.skipIntroBtn) return;
        if (visible) this.elements.skipIntroBtn.classList.remove('hidden');
        else this.elements.skipIntroBtn.classList.add('hidden');
    }

    setCinematicBarsVisible(visible) {
        if (!this.elements.cinematicLayer) return;
        if (visible) this.elements.cinematicLayer.classList.remove('no-bars');
        else this.elements.cinematicLayer.classList.add('no-bars');
    }

    hideCinematicLayer() {
        if (this.elements.cinematicLayer) {
            this.elements.cinematicLayer.classList.remove('active');
            setTimeout(() => {
                this.elements.cinematicLayer.classList.add('hidden');
            }, 1000);
        }
    }

    showCinematicCard(data) {
        if (!this.elements.cinematicCard) return;
        this.elements.cinematicTitle.textContent = data.title;
        this.elements.cinematicBody.textContent = data.text;
        
        let path = this.avatars[data.speaker] || this.avatars['default'];
        this.elements.cinematicAvatar.style.backgroundImage = `url('${path}')`;
        this.elements.cinematicAvatar.textContent = '';
        
        this.cinematicCallback = data.onNext;
        this.elements.cinematicCard.classList.remove('hidden');
        setTimeout(() => this.elements.cinematicCard.classList.add('visible'), 50);

        if (this.elements.cinematicNextBtn) {
            this.elements.cinematicNextBtn.style.display = data.hideNextBtn ? 'none' : 'block';
        }
    }

    hideCinematicCard() {
        if (!this.elements.cinematicCard) return;
        this.elements.cinematicCard.classList.remove('visible');
        setTimeout(() => this.elements.cinematicCard.classList.add('hidden'), 500);
    }

    // --- Misc ---

    showUI() {
        if (this.elements.uiLayer) this.elements.uiLayer.classList.remove('hidden');
    }

    hideUI() {
        if (this.elements.uiLayer) this.elements.uiLayer.classList.add('hidden');
    }

    highlightElement(elementId, text) {
        const el = document.getElementById(elementId);
        if (!el || !this.elements.tutorialOverlay) return;
        this.elements.tutorialOverlay.classList.remove('hidden');
        el.classList.add('ui-highlight');
        this.elements.tutorialTooltip.classList.remove('hidden');
        this.elements.tutorialText.textContent = text;
        
        const rect = el.getBoundingClientRect();
        this.elements.tutorialTooltip.style.top = `${rect.bottom + 15}px`;
        this.elements.tutorialTooltip.style.left = `${rect.left}px`;
    }

    clearHighlights() {
        const highlighted = document.querySelectorAll('.ui-highlight');
        highlighted.forEach(el => el.classList.remove('ui-highlight'));
        if (this.elements.tutorialOverlay) {
            this.elements.tutorialOverlay.classList.add('hidden');
            this.elements.tutorialTooltip.classList.add('hidden');
        }
    }

    triggerEcologicalVisuals() {
        if (this.elements.fish) {
            this.elements.fish.classList.add('pulse-warning');
            setTimeout(() => this.elements.fish.classList.remove('pulse-warning'), 2000);
        }
    }

    showCollapseScreen() {
        if (this.elements.collapseOverlay) {
            this.elements.collapseOverlay.classList.add('visible');
        }
    }

    // 2. Positionierung der Barks (Punkt 3: Höher & Zentral)
    showWorldBark(data) {
        if (!data || !data.targetId) return;

        this.worldBarkQueue.push(data);
        if (!this.worldBarkActive) {
            this.processWorldBarkQueue();
        }
    }

    async processWorldBarkQueue() {
        if (this.worldBarkQueue.length === 0) {
            this.worldBarkActive = false;
            return;
        }

        this.worldBarkActive = true;
        const next = this.worldBarkQueue.shift();
        await this.displayWorldBark(next);

        if (this.worldBarkQueue.length > 0) {
            await new Promise(res => setTimeout(res, 150));
            this.processWorldBarkQueue();
        } else {
            this.worldBarkActive = false;
        }
    }

    displayWorldBark(data) {
        return new Promise((resolve) => {
            if (!data || !data.targetId) {
                resolve();
                return;
            }
            
            const targetPos = this.getTargetWorldPosition(data.targetId);
            if (!targetPos) {
                resolve();
                return;
            }

            const el = document.createElement('div');
            const isSterling = data.speaker === 'Sterling';
            el.className = `world-bark ${data.isCrisis ? 'crisis' : ''} ${isSterling ? 'sterling' : ''}`;
            
            let avatarHtml = '';
            if (data.speaker && this.avatars[data.speaker]) {
                const url = this.avatars[data.speaker];
                avatarHtml = `<div class="bark-avatar" style="background-image: url('${url}')"></div>`;
            } else if (data.icon) {
                avatarHtml = `<div class="bark-avatar" style="display:flex;align-items:center;justify-content:center;font-size:1.5rem;">${data.icon}</div>`;
            }

            const labelHtml = isSterling
                ? '<span class="bark-label">Advisor</span>'
                : (data.speaker ? `<span class="bark-label">${data.speaker}</span>` : '');

            el.innerHTML = `
                ${avatarHtml}
                <div class="bark-content">
                    ${labelHtml}
                    <span>${data.text}</span>
                </div>
            `;
            
            this.elements.uiLayer.appendChild(el);

            let frameId;
            const startTime = Date.now();
            const duration = 5000; // Länger anzeigen für bessere Lesbarkeit

            const cleanup = () => {
                if (!el.parentNode) {
                    resolve();
                    return;
                }
                el.classList.remove('visible');
                setTimeout(() => { 
                    if (el.parentNode) el.parentNode.removeChild(el);
                    resolve(); 
                }, 300);
            };

            const updatePos = () => {
                if (!el.parentNode) {
                    cancelAnimationFrame(frameId);
                    resolve();
                    return;
                }

                if (Date.now() - startTime > duration) {
                    cancelAnimationFrame(frameId);
                    cleanup();
                    return;
                }

                const vec = targetPos.clone();
                vec.project(sceneSetup.camera);

                const distance = sceneSetup.camera.position.distanceTo(targetPos);
                let scale = 1.0;
                if (distance < 600) {
                    scale = 1.2 - (distance / 1000);
                    scale = Math.max(0.85, Math.min(1.1, scale));
                }

                const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
                const y = (-(vec.y * 0.5) + 0.5) * window.innerHeight;

                // KORREKTUR: Wieder etwas tiefer, damit sie nicht über dem HUD liegen (Punkt 6)
                // War -120, jetzt -90
                const yOffset = -90 * scale; 

                if (vec.z > 1) {
                    el.style.display = 'none';
                } else {
                    el.style.display = 'flex';
                    // Positionierung zentriert über dem Punkt
                    el.style.transform = `translate(${x}px, ${y + yOffset}px) translate(-50%, -100%) scale(${scale})`;
                }

                if (!el.classList.contains('visible')) {
                    requestAnimationFrame(() => el.classList.add('visible'));
                }

                frameId = requestAnimationFrame(updatePos);
            };

            updatePos();
        });
    }

    setAvatarImage(element, speakerName) {
        if (!element) return;
        element.textContent = '';
        const path = this.avatars[speakerName] || this.avatars['default'];
        element.style.backgroundImage = `url('${path}')`;
    }

    checkiOSFullscreenSupport() {
        // Prüfen ob iOS und nicht im Standalone-Modus
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isInStandaloneMode = ('standalone' in window.navigator) && window.navigator.standalone;

        if (isIOS && !isInStandaloneMode) {
            // Verstecke Fullscreen-Button auf iOS wenn nicht als Web-App installiert
            // da der normale Fullscreen-API auf iOS Safari nicht funktioniert
            if (this.elements.fullscreenBtn) {
                this.elements.fullscreenBtn.style.display = 'none';
            }
        }
    }

    toggleFullscreen() {
        const elem = document.documentElement;

        // Prüfen ob wir bereits im Fullscreen sind
        const isFullscreen = document.fullscreenElement
            || document.webkitFullscreenElement
            || document.mozFullScreenElement
            || document.msFullscreenElement;

        if (!isFullscreen) {
            // Enter fullscreen mit Browser-Präfixen für bessere Kompatibilität
            if (elem.requestFullscreen) {
                elem.requestFullscreen().catch(err => {
                    console.warn('Fullscreen request failed:', err);
                    this.showToast('Vollbild auf diesem Gerät nicht verfügbar', 'warning');
                });
            } else if (elem.webkitRequestFullscreen) {
                // Safari/iOS
                elem.webkitRequestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                // Firefox
                elem.mozRequestFullScreen();
            } else if (elem.msRequestFullscreen) {
                // IE/Edge
                elem.msRequestFullscreen();
            } else {
                // Fallback für Geräte ohne Fullscreen-Support
                console.warn('Fullscreen API not supported on this device');
                this.showToast('Vollbild wird auf diesem Gerät nicht unterstützt', 'warning');
            }
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    async requestWakeLock() {
        // Prüfen ob Wake Lock API verfügbar ist (hauptsächlich für mobile Geräte)
        if ('wakeLock' in navigator) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
                console.log('Wake Lock aktiviert - Display bleibt an');

                // Event Listener für Wake Lock Release
                this.wakeLock.addEventListener('release', () => {
                    console.log('Wake Lock wurde freigegeben');
                    this.wakeLock = null;
                });
            } catch (err) {
                // Wake Lock kann fehlschlagen wenn Tab nicht aktiv ist
                console.warn('Wake Lock konnte nicht aktiviert werden:', err.message);
            }
        } else {
            console.log('Wake Lock API nicht verfügbar in diesem Browser');
        }
    }

    releaseWakeLock() {
        if (this.wakeLock !== null) {
            this.wakeLock.release()
                .then(() => {
                    this.wakeLock = null;
                    console.log('Wake Lock manuell freigegeben');
                });
        }
    }
}

export const ui = new UIManager();
