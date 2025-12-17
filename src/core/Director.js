/*** START OF FILE src/core/Director.js ***/

import * as THREE from 'three';
import { sceneSetup } from './SceneSetup.js';
import { events, EVENTS, ECON_EVENTS, DIRECTOR_EVENTS } from './Events.js';
import { economy } from '../logic/Economy.js';
import { input } from './Input.js';
import { ui } from '../ui/UIManager.js';
import { SCENE_DATA } from '../config/Scenes.js';
import { BALANCE } from '../config/Balance.js';

// --- KONFIGURATION DER PHASEN ---
const PHASES = {
    TUTORIAL: {
        id: 'TUTORIAL',
        title: 'Kapitel 0: Der perfekte Kreis',
        objectives: [
            { id: 'catch_30_fish', text: 'Fange 30 Fische', done: false },
            { id: 'buy_round', text: 'Gib eine Runde im lustigen Lachs aus', done: false }
        ]
    },
    STAGNATION: {
        id: 'STAGNATION',
        title: 'Kapitel 1: Der Stillstand',
        objectives: [
            { id: 'check_price', text: 'Prüfe den Preis für das Motorboot (Werft)', done: false },
            { id: 'open_savings', text: 'Nutze das Sparbuch im Kontor (HQ)', done: false }
        ]
    },
    BOOM: {
        id: 'BOOM',
        title: 'Kapitel 2: Goldregen vom Festland',
        objectives: [
            { id: 'take_loan', text: 'Nimm den Kredit von Sterling an', done: false },
            { id: 'buy_motorboat', text: 'Kaufe das Motorboot in der Werft (200g)', done: false },
            { id: 'complete_trips', text: 'Absolviere 3 profitable Fahrten', target: 3, current: 0, done: false },
            { id: 'observe_economy', text: 'Beobachte die wirtschaftliche Erholung', done: false }
        ]
    },
    CRUNCH: {
        id: 'CRUNCH',
        title: 'Kapitel 3: Die Abrechnung',
        objectives: [
            { id: 'crunch_trips', text: 'Absolviere 3 Fahrten trotz Flaute', target: 3, current: 0, done: false },
            { id: 'talk_refinance', text: 'Sprich mit Sterling über eine Umschuldung', done: false }
        ]
    },
    GROWTH_TRAP: {
        id: 'GROWTH_TRAP',
        title: 'Kapitel 4: Die Wachstumsfalle',
        objectives: [
            { id: 'accept_refinance', text: 'Umschuldung annehmen (+500g)', done: false },
            { id: 'survive_interest', text: 'Überlebe den ersten Zins-Schock', done: false },
            { id: 'buy_dredge', text: 'Kaufe das Schleppnetz (Werft)', done: false }
        ]
    },
    EFFICIENCY: {
        id: 'EFFICIENCY',
        title: 'Kapitel 5: Mehr Technik, weniger Fische',
        objectives: [
            { id: 'fund_upgrade', text: 'Sichere 350g für das Schleppnetz-Upgrade', done: false },
            { id: 'buy_tech', text: 'Rüste das Schleppnetz-Upgrade nach', done: false }
        ]
    },
    CANNIBALIZATION: {
        id: 'CANNIBALIZATION',
        title: 'Kapitel 6: Wenn das Meer ausblutet',
        objectives: [
            { id: 'keep_running', text: 'Verhindere die Zahlungsunfähigkeit', done: false }
        ]
    },
    COLLAPSE: {
        id: 'COLLAPSE',
        title: 'Kapitel 7: Das Ende',
        objectives: [
            { id: 'epilog', text: 'Sieh der Realität ins Auge', done: false }
        ]
    }
};

// --- DIE INTRO SEQUENZ ---
const INTRO_SEQUENCE = [
    {
        target: 'OVERVIEW',
        title: 'Capital Cove',
        text: 'Willkommen auf Capital Cove. Ein kleines Paradies im Gleichgewicht. Noch schwimmen die Fische zahlreich im blauen Wasser, und das Leben folgt dem Takt der Gezeiten.',
        speaker: 'Narrator'
    },
    {
        target: 'TAVERN',
        title: 'Mo - Der Wirt',
        text: 'Ich bin Mo. In meiner Taverne "Zum lustigen Lachs" trifft sich die Insel. Aber meine Tische bleiben leer, wenn die Fischer keinen Fang nach Hause bringen. Ich brauche Fisch!',
        speaker: 'Mo'
    },
    {
        target: 'SHIPYARD',
        title: 'Kian - Die Werft',
        text: 'Moin. Ich bin Kian. Ich halte deine Boote über Wasser. Qualität hat ihren Preis, und Holz wächst nicht umsonst. Ohne Gold stehen meine Sägen still.',
        speaker: 'Kian'
    },
    {
        target: 'HQ',
        title: 'Lale - Das Kontor',
        text: 'Ich bin Lale. Ich führe die Bücher. Denke daran: Jeder Fisch, den du verkaufst, bezahlt Mo und Kian. Und ihr Geld bezahlt deinen nächsten Fang. Alles ist ein Kreis.',
        speaker: 'Lale'
    },
    {
        target: 'BOAT',
        title: 'Der Anfang',
        text: 'Dein Ruderboot liegt bereit. Die Mannschaft wartet auf deine Befehle. Es ist Zeit, den Kreislauf in Gang zu setzen.',
        speaker: "Kapt'n"
    }
];

class Director {
    constructor() {
        this.currentPhaseId = 'TUTORIAL';
        this.activeObjectives = [];

        // Tracking
        this.totalFishCaught = 0;
        this.tripsCompleted = 0;
        this.tutorialLoopCount = 0;

        // NEU: Zähler für Trips im Sparmodus
        this.savingsTripCount = 0;

        // NEU: Zähler für profitable Trips in BOOM-Phase
        this.boomProfitableTrips = 0;
        this.boomProgressShown = false;
        this.boomWarningShown = false;

        // Flags für Story-Fortschritt
        this.flags = this.createInitialFlags();

        this.timers = {
            stagnationStartTime: null,
            lastStagnationToast: 0
        };

        this.buildingsRef = null;
        this.isSceneActive = false;
        this.isIntroRunning = false;
        this.waitingForBoatClick = false;
        this.waitingForTutorialRelease = false;
        this.nextSceneOnBoatClick = null;
        this.tutorialObjectivesCompleted = false;
        this.bankOfferTimeout = null;
        this.tutorialTavernHintTimer = null;
        this.tutorialBoatHintTimer = null;
    }

    init() {
        this.setPhase('TUTORIAL');

        // Event Listeners
        events.on(ECON_EVENTS.TRIP_COMPLETED, (data) => this.onTripCompleted(data));
        events.on(ECON_EVENTS.GRACE_PERIOD_ENDED, () => this.onGracePeriodEnded());
        events.on(ECON_EVENTS.LOAN_RECALL_TRIGGERED, (data) => this.onLoanRecall(data));
        events.on(ECON_EVENTS.ECOLOGICAL_WARNING, () => this.onEcologicalWarning());
        events.on(ECON_EVENTS.BOAT_BOUGHT, (data) => this.onBoatBought(data));
        events.on(ECON_EVENTS.UPGRADE_BOUGHT, (data) => this.onUpgradeBought(data));
        events.on(ECON_EVENTS.PURCHASE_FAILED, (data) => this.onPurchaseFailed(data));
        events.on(EVENTS.UI_DIALOG_CLOSED, (data) => this.onDialogClosed(data));
        events.on(EVENTS.SAVINGS_CONFIRMED, (payload) => this.onSavingsConfirmed(payload));
        events.on(EVENTS.CYCLE_EXPLANATION_CLOSED, () => this.onCycleExplanationClosed());
        events.on(EVENTS.BANK_CONSTRUCTED, () => this.onBankConstructed());
        events.on('ui:tavern_round_bought', () => {
            this.markObjectiveDone('buy_round');
            events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'tavern', show: false });
            if (this.tutorialTavernHintTimer) {
                clearTimeout(this.tutorialTavernHintTimer);
                this.tutorialTavernHintTimer = null;
            }
            this.checkTutorialObjectives();
        });

        // Weiterleitung: Zurückgekehrte Kisten aufs Boot legen
        events.on('world:crate_landed_on_boat', (payload) => {
            const boatId = payload?.boatId ?? 0;
            const bm = window.game?.boatManager;
            const boat = bm?.boats?.[boatId];
            if (boat && typeof boat.addCrateToDeck === 'function') {
                boat.addCrateToDeck();
            }
        });
    }

    // --- SETUP & UTILS ---

    setBuildings(buildings) {
        this.buildingsRef = buildings;
    }

    getBuildings() {
        if (this.buildingsRef) return this.buildingsRef;
        if (typeof window !== 'undefined' && window.game && window.game.buildings) {
            return window.game.buildings;
        }
        return null;
    }

    // Kamera-Helper (DEAKTIVIERT)
    focusOnBuilding(targetPos, angleOffset = 0) {
        // Deaktiviert: Kamera bleibt beim Spieler
        // input.setLookTarget(targetPos);
        // input.targetRadius = 280;
        // input.targetHeight = 160;
        // const angle = Math.atan2(targetPos.x, targetPos.z);
        // input.targetAngle = angle + angleOffset;
    }

    // --- NEU: Sanfter "Schubs" (Soft Nudge) --- (DEAKTIVIERT)
    async ensureCameraFocus(targetName) {
        // Deaktiviert: Keine automatischen Schwenks
        await this.wait(100);
    }

    setupIntroCamera(targetName) {
        const buildings = this.getBuildings();
        if (!buildings) return;

        switch (targetName) {
            case 'OVERVIEW':
                input.setLookTarget(new THREE.Vector3(0, 10, 0));
                input.targetRadius = 480;
                input.targetHeight = 240;
                input.targetAngle = 0.78;
                break;
            case 'TAVERN':
                if (buildings.tavernGroup) {
                    input.setLookTarget(buildings.tavernGroup.position);
                    input.targetRadius = 160;
                    input.targetHeight = 85;
                    input.targetAngle = Math.PI * 1.45;
                }
                break;
            case 'SHIPYARD':
                if (buildings.shipyardGroup) {
                    input.setLookTarget(buildings.shipyardGroup.position);
                    input.targetRadius = 170;
                    input.targetHeight = 90;
                    input.targetAngle = Math.PI * 0.95;
                }
                break;
            case 'HQ':
                if (buildings.hqGroup) {
                    input.setLookTarget(buildings.hqGroup.position);
                    input.targetRadius = 150;
                    input.targetHeight = 80;
                    input.targetAngle = -0.2;
                }
                break;
            case 'BOAT':
                const dockPos = new THREE.Vector3(0, 0, 180);
                input.moveCameraTo(dockPos);
                input.targetRadius = 230; // Weiter weg, mehr Kontext
                input.targetHeight = 100;
                input.targetAngle = 0.55; // Leicht seitliche Perspektive
                break;
        }
    }

    setIslandOverviewCamera(immediate = false) {
        console.log('📷 [DEBUG] setIslandOverviewCamera() aufgerufen.'); // <--- DEBUG 1

        if (!input) {
            console.error('❌ [DEBUG] Input Instanz fehlt!'); // <--- DEBUG 2
            return;
        }

        const target = new THREE.Vector3(0, 10, 0);
        console.log('📷 [DEBUG] Setze Input Target auf:', target); // <--- DEBUG 3

        input.setLookTarget(target);
        input.targetRadius = 480;
        input.targetHeight = 240;
        input.targetAngle = 0.78;

        if (immediate) {
            console.log('📷 [DEBUG] Immediate Reset active'); // <--- DEBUG 4
            input.currentRadius = 480;
            input.currentHeight = 240;
            input.currentAngle = 0.78;
            input.currentLook.copy(target);
        }
    }


    setStagnationCamera() {
        if (input && typeof input.moveCameraTo === 'function') {
            input.targetAngle = Math.PI * 0.55;
            input.targetRadius = 200;
            input.targetHeight = 60;
            if (typeof input.setLookTarget === 'function') {
                input.setLookTarget(new THREE.Vector3(0, 5, 0));
            }
        }
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    startTutorialTavernReminder() {
        if (this.tutorialTavernHintTimer) {
            clearTimeout(this.tutorialTavernHintTimer);
        }

        this.tutorialTavernHintTimer = setTimeout(() => {
            this.tutorialTavernHintTimer = null;

            if (this.currentPhaseId !== 'TUTORIAL') return;

            const obj = this.activeObjectives.find(o => o.id === 'buy_round');
            if (obj && obj.done) return;

            events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'tavern', show: true });
            events.emit(EVENTS.TOAST, { message: 'Gib eine Runde im Lustigen Lachs aus!' });
        }, 15000);
    }

    checkTutorialObjectives() {
        if (this.currentPhaseId !== 'TUTORIAL' || this.tutorialObjectivesCompleted) return;

        const allDone = this.activeObjectives.every(o => o.done);
        if (allDone) {
            this.tutorialObjectivesCompleted = true;
            this.startPhaseOne();
        }
    }

    startPhaseOne() {
        if (this.currentPhaseId !== 'TUTORIAL') return;
        this.setPhase('STAGNATION');

        // FIX: Kapital hart auf 100 zurücksetzen, damit das Balancing für Kapitel 1 stimmt
        // (Motorboot kostet 200, Spieler soll sich arm fühlen)
        economy.state.moneyPlayer = 100;
        economy.broadcastStats();

        this.panCameraToTentArea();

        setTimeout(() => {
            this.triggerScene('D1_STERLING_ARRIVAL');
        }, 1000);
    }

    panCameraToTentArea() {
        // Deaktiviert
    }

    createInitialFlags() {
        return {
            tutorialStarted: false,
            tutorialManualStepComplete: false,
            hasVisitedTavern: false,
            hasMotorboat: false,
            hasTakenFirstLoan: false,
            refinancingDone: false,
            techUnlocked: false,
            raniWarned: false,
            explanationRunning: false,
            sterlingAfterSpiralTriggered: false,
            stagnationExplained: false,
            dominoRunning: false,
            savingShockShown: false,
            isSaving: false,
            savingsProposed: false,
            savingsTriggered: false,
            savingsUnlocked: false,
            waitingForRealization: false,
            stormTriggered: false,
            motorboatReady: false, // NEU: Wird true, wenn Kian das Motorboot fertiggestellt hat
            forceDockLock: false, // NEU: Verhindert das Ablegen, wenn ein Story-Event bevorsteht
            // NEU für Kapitel 4
            growthTrapTripCount: 0,
            dredgePurchased: false,
            interestShockShown: false,
            trawlerPurchased: false
        };
    }

    // --- INTRO SEQUENZ ---

    async startIntroSequence() {
        this.isIntroRunning = true;
        input.setLocked(true);
        ui.hideUI();
        ui.showCinematicLayer();
        ui.toggleSkipButton(true);

        try {
                await this.wait(1000); // Kurz warten beim Start

                for (let i = 0; i < INTRO_SEQUENCE.length; i++) {
                    if (!this.isIntroRunning) break; // Abbruch durch "Skip"

                    const step = INTRO_SEQUENCE[i];

                    // 1. Kamera bewegen
                    this.setupIntroCamera(step.target);

                    // 2. Kurz warten für die Kamerafahrt
                    await this.wait(800);
                    if (!this.isIntroRunning) break;

                    // 3. Karte anzeigen und warten bis Spieler "Weiter" klickt
                    await this.playIntroCard(step);
                }

                if (this.isIntroRunning) {
                    this.finishIntro();
                    this.promptBoatStart(); // Nach der Intro direkt den Spielstart-Hinweis zeigen
                }
        } catch (err) {
            console.log("Intro interrupted", err);
            if (this.isIntroRunning) this.finishIntro();
        }
    }

    playIntroCard(step) {
        return new Promise(resolve => {
            ui.showCinematicCard({
                title: step.title,
                text: step.text,
                speaker: step.speaker,
                hideNextBtn: step.hideNextBtn,
                onNext: () => {
                    resolve();
                }
            });
        });
    }

    skipIntro() {
        this.isIntroRunning = false;
        this.finishIntro();
        // Fallback: Wenn übersprungen, Kamera aufs Boot und Hinweis zeigen
        setTimeout(() => this.promptBoatStart(false), 500);
    }

    finishIntro() {
        this.isIntroRunning = false;
        ui.toggleSkipButton(false);

        // Input bleibt gesperrt, bis Spieler auf Boot klickt (durch promptBoatStart geregelt)
        if (!this.waitingForBoatClick) input.setLocked(false);

        ui.hideCinematicLayer();
        ui.hideCinematicCard();
        ui.setCinematicBarsVisible(true);
        ui.showUI();

        economy.state.moneyPlayer = BALANCE.ECONOMY.START_MONEY;
        economy.broadcastStats();
        economy.setSimulationActive(true);
    }

    async promptBoatStart() {
        ui.hideCinematicCard();
        ui.hideCinematicLayer();
        ui.showUI();
        input.setLocked(false);

        // Kamera sicherstellen (Nah am Boot)
        this.setupIntroCamera('BOAT');

        // Boot-Manager triggern um Hint anzuzeigen
        events.emit(EVENTS.CMD_SHOW_BOAT_HINT, { show: true });

        // Hinweis anzeigen statt Dialog
        events.emit(EVENTS.TOAST, { message: 'Klicke auf das Boot, um zu starten!' });

        this.waitingForBoatClick = true;
    }

    // --- HAUPTSCHLEIFE ---

    tick() {
        if (!economy.state.isSimulationRunning) return;

        // --- PHASE 1: STAGNATION (Spar-Paradoxon) ---
        if (this.currentPhaseId === 'STAGNATION') {
        } else {
            ui.hidePersistentWarning();
        }

        // --- KOLLAPS CHECK ---
        if (this.currentPhaseId !== 'COLLAPSE' && this.currentPhaseId !== 'TUTORIAL') {
            if (economy.state.fishStock <= 100) {
                this.setPhase('COLLAPSE');
                this.triggerScene('D7_COLLAPSE');
            }
        }
    }

    // --- NEU: Zentrale Logik für Kreditaufnahme ---
    handleLoanTaken() {
        // 1. Wirtschaft: Geld gutschreiben
        economy.takeLoan(200);

        // 2. Flags & Phase setzen
        this.flags.sterlingInvitationActive = false;
        this.flags.hasTakenFirstLoan = true;
        events.emit('world:update_visuals', { health: 1.0 });
        this.setPhase('BOOM');
        this.markObjectiveDone('take_loan');

        // 3. Kamera: Sanfter Zoom-Out auf Inselmitte (OHNE Rotation)
        if (input && typeof input.setLookTarget === 'function') {
            input.setLookTarget(new THREE.Vector3(0, 10, 0)); // Fokus Mitte
            input.targetRadius = 520; // Leicht rauszoomen
            input.targetHeight = 260; // Etwas höher
            // WICHTIG: input.targetAngle NICHT ändern, damit die Kamera nicht rotiert!
        }

        // 4. Spielerführung: Pfeil auf Werft (Verzögert)
        setTimeout(() => {
            // Pfeil über Bank weg
            events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'bank', show: false });
            events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'bank_tent', show: false });

            // Pfeil über Werft an
            events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'shipyard', show: true });
            events.emit(EVENTS.TOAST, { message: 'Gehe zur Werft und kaufe das Motorboot!' });
        }, 1500);
    }

    // --- INTERAKTION & SZENEN-LOGIK ---

    async onBuildingClicked(type, id) {
        // Sonderfall: Tutorial-Abschluss (Boot starten nach Lales Erklärung)
        if (this.waitingForTutorialRelease && type === 'boat') {
            this.waitingForTutorialRelease = false;

            // Timer abbrechen, falls Spieler selbst gestartet hat
            if (this.tutorialBoatHintTimer) {
                clearTimeout(this.tutorialBoatHintTimer);
                this.tutorialBoatHintTimer = null;
            }

            events.emit(EVENTS.CMD_SHOW_BOAT_HINT, { show: false });

            // Dialog schließen, falls offen
            if (this.isSceneActive) {
                this.endScene();
            }

            input.setLocked(false);
            this.flags.tutorialManualStepComplete = true;
            this.setIslandOverviewCamera();

            const bm = window.game.boatManager;
            if (bm && bm.boats[0]) {
                this.startTutorialTavernReminder();
                bm.startBoat(0);
                events.emit(EVENTS.TOAST, { message: 'Der Kreislauf läuft nun automatisch.' });
            }
            return;
        }

        // Fall 1: Intro (Warten auf Start)
        if (this.waitingForBoatClick && type === 'boat') {
            const boatId = (typeof id === 'number' && !isNaN(id)) ? id : 0;
            events.emit(EVENTS.CMD_START_BOAT, { id: boatId });
            this.waitingForBoatClick = false;
            const pendingScene = this.nextSceneOnBoatClick;
            this.nextSceneOnBoatClick = null;

            // Wenn Dialog noch offen, schließen
            if (this.isSceneActive) {
                this.endScene();
            }

            // Kamera zurück in die Totale, sobald das Boot startet
            this.setIslandOverviewCamera();
            events.emit(EVENTS.CMD_SHOW_BOAT_HINT, { show: false });

            if (pendingScene) {
                setTimeout(() => this.triggerScene(pendingScene), 400);
            }
            return;
        }

        // Normale Menüs blockieren, wenn Szenen laufen
        if (this.isSceneActive || this.isIntroRunning) return;

        // Blockade aller Gebäude während aktiver Sparmaßnahmen, AUSSER Bank/Zelt (für Story-Fortschritt)
        if (economy.state.isSavingActive && type !== 'boat' && type !== 'bank' && type !== 'bank_tent') {
            events.emit(EVENTS.TOAST, { message: 'Wir sparen bereits. Warte auf Ergebnisse...' });
            return;
        }

        if (type === 'boat') {
            // KAPITEL 4 BLOCKADE
            const hasDoneFirstGrowthTrapTrip = (this.flags.growthTrapTripCount || 0) >= 1;
            if (this.currentPhaseId === 'GROWTH_TRAP' &&
                !this.flags.dredgePurchased &&
                hasDoneFirstGrowthTrapTrip) {

                events.emit(EVENTS.TOAST, { message: 'Ohne Schleppnetz lohnt die Fahrt nicht. Ab zur Werft!' });
                events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'shipyard', show: true });
                return;
            }

            events.emit(EVENTS.CMD_START_BOAT, { id });
            events.emit(EVENTS.CMD_SHOW_BOAT_HINT, { show: false });
            return;
        }

        if (type === 'tavern') {
            events.emit(DIRECTOR_EVENTS.SCENE_START, { type: 'overlay', id: 'TAVERN_MENU' });
        }
        else if (type === 'shipyard') {
            events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'shipyard', show: false });

            if (this.currentPhaseId === 'STAGNATION' && !this.flags.savingsProposed) {
                ui.hidePersistentWarning();
            }

            // --- HIER IST DER FIX ---
            // VORHER: if (this.currentPhaseId === 'BOOM' && economy.state.loanTaken && !this.flags.motorboatPurchased)
            // NACHHER: Wir nutzen das Flag oder prüfen loanPrincipal

            if (this.currentPhaseId === 'BOOM' &&
                this.flags.hasTakenFirstLoan && // <--- KORRIGIERT (nutzt Director Flag)
                !this.flags.motorboatPurchased) {

                console.log('🎬 [DIRECTOR] BOOM Phase - Öffne D2_BOAT_ORDER Story');
                this.triggerScene('D2_BOAT_ORDER');
            } else {
                // Menü öffnen erlauben (Wichtig für Kauf in GROWTH_TRAP!)
                events.emit(DIRECTOR_EVENTS.SCENE_START, { type: 'overlay', id: 'SHIPYARD_MENU' });
            }
        }
        else if (type === 'bank' || type === 'bank_tent') {
            // Pfeil über Bank deaktivieren beim Klick
            events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'bank', show: false });
            events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'bank_tent', show: false });

            // Wenn Sterling den Spieler eingeladen hat (Kapitel 2 Start)
            if (this.flags.sterlingInvitationActive && !this.flags.hasTakenFirstLoan) {

                // 1. Visueller Ausbau: Zelt -> Bank (falls noch Zelt)
                const bManager = window.game?.buildings;
                if (bManager && type === 'bank_tent') {
                    bManager.constructBank();
                    // Kurze Wartezeit, damit die Aufstellung sichtbar ist;
                    // der Dialog startet automatisch nach Fertigstellung.
                    await this.wait(1200);
                    return;
                }

                // 2. Story-Szene starten (statt generischem Menü)
                // Dadurch kommt der Dialog über das neue Gebäude
                this.triggerScene('D2_STERLING_OFFER');
            }
            else if (this.currentPhaseId === 'TUTORIAL' || this.currentPhaseId === 'STAGNATION') {
                events.emit(EVENTS.TOAST, { message: 'Die Bank hat noch kein Interesse an dir.' });
            } else {
                // Normales Menü für spätere Besuche
                events.emit(DIRECTOR_EVENTS.SCENE_START, { type: 'overlay', id: 'BANK_MENU' });
            }
        }
        else if (type === 'hq') {
            // NEU: Pfeil explizit ausblenden, wenn man draufklickt
            events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'hq', show: false });
            ui.hideGuidanceArrow?.(); // Falls auch der 2D Pfeil aktiv war

            events.emit(DIRECTOR_EVENTS.SCENE_START, {
                type: 'overlay',
                id: 'HQ_MENU',
                extraData: { showSavingsButton: this.flags.savingsUnlocked }
            });
        }
    }

    // --- NEUE BOOM SEQUENZ LOGIK (OPTIMIERT) ---
    async playBoomSequence() {
        console.log("🎬 ========== START BOOM SEQUENCE ==========");
        const buildings = this.getBuildings();
        const bm = window.game.boatManager;
        const pm = window.game.personManager;
        const bManager = window.game.buildings;

        if (!buildings || !bManager) return;

        // 1. GELDABZUG & STATUS
        economy.state.moneyPlayer -= 200;
        economy.broadcastStats();
        events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'shipyard', show: false });
        this.markObjectiveDone('buy_motorboat');

        // 2. BAU STARTEN (Wolke erscheint)
        if (bm) bm.startMotorBoatConstruction(0);

        events.emit(EVENTS.TOAST, { message: "Kauf bestätigt! Ausbau beginnt." });

        // 3. VISUALISIERUNG: SACK 1 (HQ -> WERFT)
        if(buildings) {
            bManager.visualizeBigTransfer('HQ', 'SHIPYARD', true);
        }

        // Kian reagiert auf das Geld
        events.emit(EVENTS.SHOW_WORLD_BARK, {
            targetId: 'shipyard',
            speaker: 'Kian',
            text: 'Ein großer Auftrag! Damit kann ich wieder Leute einstellen.',
            icon: '🏗️'
        });

        // Warten bis Geld bei Werft ist
        await this.wait(2000);

        // 4. VISUALISIERUNG: SACK 2 (WERFT -> TAVERNE)
        // Der Boom breitet sich aus
        bManager.visualizeBigTransfer('SHIPYARD', 'TAVERN', true);

        events.emit(EVENTS.SHOW_WORLD_BARK, {
            targetId: 'shipyard',
            speaker: 'Kian',
            text: 'Jungs, die Runde im Lustigen Lachs geht auf mich!',
            icon: '🍻'
        });

        // Party Runner spawnen
        if (pm) {
            const shipPos = buildings.shipyardGroup.position;
            const tavPos = buildings.tavernGroup.position;
            pm.spawnPartyRunners(8, shipPos, tavPos);
        }

        // Warten auf Party-Start
        await this.wait(2500);

        const tavPos = buildings.tavernGroup.position;
        ui.createFloatingText("BOOM!", new THREE.Vector3(tavPos.x, 30, tavPos.z), '#FFD700');

        // Mo freut sich
        events.emit(EVENTS.SHOW_WORLD_BARK, {
            targetId: 'tavern',
            speaker: 'Mo',
            text: 'Endlich wieder dicke Umsätze!',
            icon: '💰'
        });

        // WICHTIG: Bauzeit simulieren (Wolke bleibt sichtbar)
        await this.wait(3000);

        // 5. FERTIGSTELLUNG
        events.emit(EVENTS.SHOW_WORLD_BARK, {
            targetId: 'shipyard',
            speaker: 'Kian',
            text: 'Das Motorboot ist fertig! Du kannst nun in See stechen!',
            icon: '🚤'
        });

        // Kurze Pause nach der Ansage, bevor es "Plopp" macht
        await this.wait(1500);

        if (bm) bm.finishMotorBoatConstruction(0);

        // 6. ABSCHLUSS
        console.log("🎬 [BOOM] Sequenz fertig. Input frei.");

        input.setLocked(false);
        events.emit(EVENTS.CMD_RELEASE_BOATS);

        events.emit(EVENTS.TOAST, { message: 'Die Wirtschaft wächst! Erwirtschafte Profit.' });
    }

    // --- KAPITEL 4: GROWTH TRAP SEQUENCE ---
    async playGrowthTrapSequence(tripIndex, data) {
        console.log(`🎬 [GROWTH TRAP] Trip ${tripIndex} Sequence Start`);

        // FIX: Input NICHT sperren, damit Spieler weiter interagieren kann
        // input.setLocked(true);

        try {
            const getPayouts = () => {
                // Trip 1 IMMER Basiswert 15/15, egal ob Schleppnetz schon existiert
                if (tripIndex === 1) {
                    return { paidMo: 15, paidKian: 15 };
                }

                const hasDredge = (economy.state.tech.netType === 'dredge') || (director.flags?.dredgePurchased);
                const defaultMo = hasDredge ? 35 : 10;
                const defaultKian = hasDredge ? 35 : 10;
                return {
                    paidMo: data.financials?.mo?.paid ?? defaultMo,
                    paidKian: data.financials?.kian?.paid ?? defaultKian
                };
            };

            // --- TRIP 1: DER SCHOCK (Motorboot) ---
            if (tripIndex === 1) {

                // 1. Kisten fliegen (Visuell)
                if (data.crates.mo.accepted > 0) events.emit(EVENTS.VISUAL_DELIVERY_START, { target: 'TAVERN', count: data.crates.mo.accepted });
                if (data.crates.kian.accepted > 0) events.emit(EVENTS.VISUAL_DELIVERY_START, { target: 'SHIPYARD', count: data.crates.kian.accepted });

                await this.wait(2000); // Warten bis Kisten da sind

                // 2. Gebäude erwachen zum Leben (Farbe kommt zurück)
                events.emit('world:visual_effect', { type: 'RECOVER' });
                events.emit(EVENTS.BUILDING_REACTION, { target: 'TAVERN', type: 'SUCCESS' });
                events.emit(EVENTS.BUILDING_REACTION, { target: 'SHIPYARD', type: 'SUCCESS' });
                economy.state.marketHealth = 1.0;
                events.emit(ECON_EVENTS.MARKET_HEALTH_CHANGED, { health: economy.state.marketHealth });
                economy.broadcastStats();

                await this.wait(500);

                // 3. Geld fließt zum Spieler (Operativer Gewinn)
                const { paidMo, paidKian } = getPayouts();
                events.emit(EVENTS.TRIGGER_COIN_LEG, { from: 'TAVERN', to: 'UI_MONEY', amount: paidMo });
                events.emit(EVENTS.TRIGGER_COIN_LEG, { from: 'SHIPYARD', to: 'UI_MONEY', amount: paidKian });

                await this.wait(1500); // Warten bis Geld da ist

                // 4. Einnahmen JETZT gutschreiben (+30G)
                const { paidMo: pm1, paidKian: pk1 } = getPayouts();
                const operatingProfit = pm1 + pk1;

                economy.state.moneyPlayer += operatingProfit;
                economy.broadcastStats();
                events.emit(EVENTS.MONEY_CHANGED, { amount: operatingProfit, suppressFloatingText: false, reason: 'visual-update' });

                await this.wait(2000);

                // 5. BARKS (Nacheinander!)
                events.emit(EVENTS.SHOW_WORLD_BARK, {
                    targetId: 'tavern', speaker: 'Mo', text: "Das Geschäft läuft wieder, Prost!", icon: "🍻", isCrisis: false
                });
                await this.wait(6000); // Längere Pause zwischen den Dialogen

                events.emit(EVENTS.SHOW_WORLD_BARK, {
                    targetId: 'shipyard', speaker: 'Kian', text: "Endlich wieder Arbeit. Das tut gut.", icon: "🔧", isCrisis: false
                });
                await this.wait(6000); // Längere Pause zwischen den Dialogen

                // 6. DER SCHOCK (Bank Zinsen Billboard)
                events.emit(EVENTS.SHOW_BILLBOARD, {
                    id: 'bb_bank_interest',
                    target: 'BANK',
                    title: 'ZINSFÄLLIGKEIT',
                    text: 'Kreditraten',
                    subtext: '-50 G',
                    type: 'loss',
                    isPersist: true
                });

                await this.wait(2000); // Billboard lesen lassen

                // 7. Rote Münzen zur Bank (Zinsabfluss)
                events.emit(EVENTS.TRIGGER_COIN_LEG, { from: 'UI_MONEY', to: 'BANK', amount: 50, isLoss: true });

                await this.wait(1500); // Warten bis Geld bei Bank ist

                // 8. Geld abziehen (-50G)
                economy.state.moneyPlayer -= 50;
                economy.broadcastStats();
                events.emit(EVENTS.MONEY_CHANGED, { amount: -50, suppressFloatingText: false, reason: 'visual-update' });

                await this.wait(2000);

                // 9. Dialog & Stillstand
                events.emit('ui:close_billboard', { id: 'bb_bank_interest' });
                this.triggerScene('D4_INTEREST_SHOCK');
                this.markObjectiveDone('survive_interest');

                // WICHTIG: KEIN CMD_RELEASE_BOATS! Das Boot bleibt gesperrt, bis das Upgrade gekauft wurde.
            }

            // --- TRIP 2: DIE ESKALATION ---
            else if (tripIndex === 2) {
                
                // 1. NEU: Erst die Einnahmen verarbeiten (Geld rein)
                const { paidMo, paidKian } = getPayouts();
                const operatingProfit = paidMo + paidKian;

                // Visualisierung Einnahmen
                if (operatingProfit > 0) {
                    if (data.crates.mo.accepted > 0)
                        events.emit(EVENTS.TRIGGER_COIN_LEG, { from: 'TAVERN', to: 'UI_MONEY', amount: paidMo });
                    if (data.crates.kian.accepted > 0)
                        events.emit(EVENTS.TRIGGER_COIN_LEG, { from: 'SHIPYARD', to: 'UI_MONEY', amount: paidKian });
                    await this.wait(1000);
                }

                // Logik Einnahmen
                economy.state.moneyPlayer += operatingProfit;
                economy.broadcastStats();
                events.emit(EVENTS.MONEY_CHANGED, { amount: operatingProfit, suppressFloatingText: true, reason: 'visual-update' });

                await this.wait(500);

                // 2. DANN die Zinsen abziehen (Geld raus)
                events.emit(EVENTS.TRIGGER_COIN_LEG, { from: 'UI_MONEY', to: 'BANK', amount: 50, isLoss: true });

                await this.wait(1000);

                economy.state.moneyPlayer -= 50;
                economy.broadcastStats();
                // Floating Text für Zinsen explizit zeigen
                ui.createFloatingText("-50 Zinsen", new THREE.Vector3(0, 10, 0), '#e74c3c');

                await this.wait(1500);

                events.emit(EVENTS.SHOW_ADVISOR, {
                    text: "Der Cashflow stimmt. Wir sind wieder im Geschäft.",
                    speaker: "Sterling",
                    duration: 4000
                });

                events.emit(EVENTS.CMD_RELEASE_BOATS);
            }

            // --- TRIP 3 & 4: RANI & ÜBERGANG ---
            else if (tripIndex === 3) {
                
                // 1. Einnahmen verarbeiten
                const { paidMo, paidKian } = getPayouts();
                const operatingProfit = paidMo + paidKian;

                if (operatingProfit > 0) {
                    events.emit(EVENTS.TRIGGER_COIN_LEG, { from: 'TAVERN', to: 'UI_MONEY', amount: paidMo });
                    events.emit(EVENTS.TRIGGER_COIN_LEG, { from: 'SHIPYARD', to: 'UI_MONEY', amount: paidKian });
                    await this.wait(800);
                }

                economy.state.moneyPlayer += operatingProfit;
                economy.broadcastStats();

                await this.wait(500);

                // 2. Zinsabzug
                events.emit(EVENTS.TRIGGER_COIN_LEG, { from: 'UI_MONEY', to: 'BANK', amount: 50, isLoss: true });

                await this.wait(1000);

                economy.state.moneyPlayer -= 50;
                economy.broadcastStats();
                ui.createFloatingText("-50 Zinsen", new THREE.Vector3(0, 10, 0), '#e74c3c');

                await this.wait(1500);

                // 3. Rani Dialog (TRIP 3)
                this.triggerScene('D4_RANI_INTRO');
                
                // WICHTIG: Boot bleibt gesperrt bis Dialog durch ist
            }
            
            // --- TRIP 4: STERLING ERZWINGT UPGRADE ---
            else if (tripIndex === 4) {
                
                // 1. Einnahmen verarbeiten
                const { paidMo, paidKian } = getPayouts();
                const operatingProfit = paidMo + paidKian;

                if (operatingProfit > 0) {
                    events.emit(EVENTS.TRIGGER_COIN_LEG, { from: 'TAVERN', to: 'UI_MONEY', amount: paidMo });
                    events.emit(EVENTS.TRIGGER_COIN_LEG, { from: 'SHIPYARD', to: 'UI_MONEY', amount: paidKian });
                    await this.wait(800);
                }

                economy.state.moneyPlayer += operatingProfit;
                economy.broadcastStats();

                await this.wait(500);

                // 2. Zinsabzug
                events.emit(EVENTS.TRIGGER_COIN_LEG, { from: 'UI_MONEY', to: 'BANK', amount: 50, isLoss: true });

                await this.wait(1000);

                economy.state.moneyPlayer -= 50;
                economy.broadcastStats();
                ui.createFloatingText("-50 Zinsen", new THREE.Vector3(0, 10, 0), '#e74c3c');

                await this.wait(2000);

                // 3. Sterling erzwingt Upgrade
                // Sicherstellen, dass kein anderes Dialogfenster (z.B. Rani) offen ist
                this.endScene();
                this.triggerScene('D4_TO_D5_TRANSITION');
                
                // WICHTIG: Boot bleibt gesperrt, bis Spieler zur Werft geht
            }
            
            // --- AB TRIP 5: Sollte nicht passieren (Spieler muss upgraden) ---
            else if (tripIndex >= 5) {
                console.warn("⚠️ [GROWTH_TRAP] Trip 5+ sollte nicht erreichbar sein!");
                events.emit(EVENTS.CMD_RELEASE_BOATS);
            }
        } catch (error) {
            console.error("❌ Fehler in Growth Trap Sequenz:", error);
            // Input war nie gesperrt, kein Unlock nötig
        }
    }

    async playCannibalizationSequence(tripIndex, data) {
        console.log(`🎬 [CANNIBALIZATION] Trip ${tripIndex} - Ökologischer Abbau`);
        
        try {
            // 1. Einnahmen verarbeiten (Schnell, da Routine)
            const revenue = data.revenue || 0;
            const expenses = data.expenses || 0;
            const operatingProfit = revenue - expenses;

            if (operatingProfit > 0) {
                events.emit(EVENTS.TRIGGER_COIN_LEG, { from: 'TAVERN', to: 'UI_MONEY', amount: 40 });
                events.emit(EVENTS.TRIGGER_COIN_LEG, { from: 'SHIPYARD', to: 'UI_MONEY', amount: 40 });
                await this.wait(800);
            }

            economy.state.moneyPlayer += operatingProfit;
            economy.broadcastStats();

            await this.wait(500);

            // 2. Zinsabzug
            events.emit(EVENTS.TRIGGER_COIN_LEG, { from: 'UI_MONEY', to: 'BANK', amount: 50, isLoss: true });
            await this.wait(1000);

            economy.state.moneyPlayer -= 50;
            economy.broadcastStats();
            ui.createFloatingText("-50 Zinsen", new THREE.Vector3(0, 10, 0), '#e74c3c');

            await this.wait(1500);

            // 3. Ökologischer Status prüfen
            const fishStock = economy.state.fishStock;
            const maxFish = BALANCE.ECOLOGY.MAX_FISH_STOCK;
            const fishRatio = fishStock / maxFish;

            console.log(`🐟 Fischbestand: ${fishStock}/${maxFish} (${(fishRatio * 100).toFixed(1)}%)`);

            // 4. Fortschreitende Verschlechterung (Kollaps nach 8-9 Trips)
            if (tripIndex === 1) {
                // Trip 1: Rani-Warnung als vollwertiger Dialog (12% Abbau)
                events.emit('world:update_visuals', { health: 0.88 });
                economy.state.fishStock = Math.max(0, economy.state.fishStock - (BALANCE.ECOLOGY.MAX_FISH_STOCK * 0.12));
                economy.broadcastStats();

                // Rani Warnung als Dialog-Szene (wie Lale, Kian etc.)
                if (!this.flags.raniWarned) {
                    this.flags.raniWarned = true;
                    this.triggerScene('D5_RANI_WARNING');
                    return; // Boot bleibt gesperrt bis Dialog geschlossen wird
                }
            }
            else if (tripIndex === 2) {
                // Trip 2: Verschlechterung (13% Abbau, total 25%)
                events.emit('world:update_visuals', { health: 0.75 });
                economy.state.fishStock = Math.max(0, economy.state.fishStock - (BALANCE.ECOLOGY.MAX_FISH_STOCK * 0.13));
                economy.broadcastStats();
                if (this.currentPhaseId !== 'EFFICIENCY') {
                    events.emit(EVENTS.SHOW_WORLD_BARK, {
                        targetId: 'boat',
                        speaker: 'Bootsmann',
                        text: "Das Wasser wird merklich trüber, Kapitän...",
                        icon: '🌊',
                        isCrisis: true
                    });
                    await this.wait(6000);
                }
            }
            else if (tripIndex === 3) {
                // Trip 3: Deutliche Verschlechterung (13% Abbau, total 38%)
                events.emit('world:update_visuals', { health: 0.62 });
                economy.state.fishStock = Math.max(0, economy.state.fishStock - (BALANCE.ECOLOGY.MAX_FISH_STOCK * 0.13));
                economy.broadcastStats();
                events.emit(EVENTS.SHOW_WORLD_BARK, {
                    targetId: 'tavern',
                    speaker: 'Mo',
                    text: "Die Fische schmecken seltsam. Die Gäste beschweren sich...",
                    icon: '🤢',
                    isCrisis: true
                });
                await this.wait(6000);
            }
            else if (tripIndex === 4) {
                // Trip 4: Kritisch (13% Abbau, total 51%)
                events.emit('world:update_visuals', { health: 0.49 });
                economy.state.fishStock = Math.max(0, economy.state.fishStock - (BALANCE.ECOLOGY.MAX_FISH_STOCK * 0.13));
                economy.broadcastStats();
                events.emit(EVENTS.SHOW_WORLD_BARK, {
                    targetId: 'boat',
                    speaker: 'Kian',
                    text: "Die Netze bringen immer weniger...",
                    icon: '😰',
                    isCrisis: true
                });
                await this.wait(6000);
            }
            else if (tripIndex === 5) {
                // Trip 5: Sehr kritisch (12% Abbau, total 63%)
                events.emit('world:update_visuals', { health: 0.37 });
                economy.state.fishStock = Math.max(0, economy.state.fishStock - (BALANCE.ECOLOGY.MAX_FISH_STOCK * 0.12));
                economy.broadcastStats();
                events.emit(EVENTS.SHOW_WORLD_BARK, {
                    targetId: 'shipyard',
                    speaker: 'Kian',
                    text: "Die Gründe sind fast leer gefischt. Das wird böse enden...",
                    icon: '⚠️',
                    isCrisis: true
                });
                await this.wait(6000);
            }
            else if (tripIndex === 6) {
                // Trip 6: Dramatisch (12% Abbau, total 75%)
                events.emit('world:update_visuals', { health: 0.25 });
                economy.state.fishStock = Math.max(0, economy.state.fishStock - (BALANCE.ECOLOGY.MAX_FISH_STOCK * 0.12));
                economy.broadcastStats();
                if (this.currentPhaseId !== 'EFFICIENCY') {
                    events.emit(EVENTS.SHOW_WORLD_BARK, {
                        targetId: 'boat',
                        speaker: 'Bootsmann',
                        text: "Kapitän, wir fangen hauptsächlich Algen und Dreck...",
                        icon: '🌿',
                        isCrisis: true
                    });
                    await this.wait(6000);
                }
            }
            else if (tripIndex === 7) {
                // Trip 7: Kurz vor Kollaps (12% Abbau, total 87%)
                events.emit('world:update_visuals', { health: 0.13 });
                economy.state.fishStock = Math.max(0, economy.state.fishStock - (BALANCE.ECOLOGY.MAX_FISH_STOCK * 0.12));
                economy.broadcastStats();
                events.emit(EVENTS.SHOW_WORLD_BARK, {
                    targetId: 'tavern',
                    speaker: 'Mo',
                    text: "Ich kann den Laden kaum noch öffnen. Niemand will mehr diese Fische...",
                    icon: '😔',
                    isCrisis: true
                });
                await this.wait(6000);
            }
            else if (tripIndex >= 8) {
                // Trip 8+: TOTALER KOLLAPS (Rest auf 0)
                economy.state.fishStock = 0;
                economy.broadcastStats();
                events.emit('world:update_visuals', { health: 0.0 });

                await this.wait(2000);

                this.triggerScene('D6_ECOLOGICAL_COLLAPSE');
                return; // Boot bleibt gesperrt
            }

            // Boot freigeben für nächsten Trip
            events.emit(EVENTS.CMD_RELEASE_BOATS);
            
        } catch (error) {
            console.error("❌ Fehler in Cannibalization Sequenz:", error);
            events.emit(EVENTS.CMD_RELEASE_BOATS);
        }
    }

    // Zentrale Methode für Szenen-Wahl (Scripted Flow Logic)
    async handleSceneChoice(sceneId, choiceId) {
        let choice;

        // FALL A: Direkter Aufruf aus UI-Menüs (ohne Szene)
        // Der UIManager übergibt hier ein Objekt als choiceId: { action: '...' }
        if (sceneId === null && typeof choiceId === 'object' && choiceId.action) {
            choice = choiceId;
            console.log(`🎬 [DIRECTOR] Direct Action Trigger: ${choice.action}`);
        }
        // FALL B: Normale Story-Szene
        else {
            const scene = SCENE_DATA[sceneId];
            if (!scene) return;
            choice = scene.choices.find(c => c.id === choiceId);
        }

        if (!choice) return;

        console.log(`🎬 [DIRECTOR] Processing Action: ${choice.action}`);

        // --- SPECIAL CASES & OVERRIDES ---

        // Fix for Chapter 1 Start: Explicitly show Shipyard arrow if Lale is unsatisfied
        if (sceneId === 'D0_LALE_UNSATISFIED' && choiceId === 'check_prices') {
            this.endScene();
            events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'shipyard', show: true });
            ui.showPersistentWarning('Geh zur Werft');
            setTimeout(() => this.setIslandOverviewCamera(), 200);
            return;
        }

        // Übergang zu Kapitel 5 nach Rani-Warnungen
        if (sceneId === 'D4_STERLING_REBUTTAL' && choiceId === 'ignore_rani') {
            this.endScene();

            // WICHTIG: Wir bleiben in Kapitel 4. Nächster Trip (Trip 4) triggert den Sterling-Trawler-Dialog.
            setTimeout(() => this.setIslandOverviewCamera(), 200);
            input.setLocked(false);

            // Boot freigeben, damit Trip 4 stattfinden kann
            events.emit(EVENTS.CMD_RELEASE_BOATS);
            return;
        }

        // --- ACTION SWITCH ---

        switch (choice.action) {

            // --- CHAPTER 1: STAGNATION START ---
            case 'build_tent_early':
                this.endScene();
                events.emit(EVENTS.CMD_SHOW_TENT);
                setTimeout(() => this.setIslandOverviewCamera(), 200);
                await this.wait(1200);

                this.triggerScene('D1_STERLING_DIRECTIVE');
                break;

            case 'activate_shipyard_quest':
                this.endScene();

                // 1. Werft-Pfeil einschalten
                events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'shipyard', show: true });

                // 2. FIX: HQ-Pfeil explizit ausschalten, damit er nicht zu früh sichtbar ist
                events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'hq', show: false });

                // ÄNDERUNG: Neutraler Hinweis statt Warnung
                ui.showPersistentHint('Prüfe Angebot in der Werft');
                break;

            case 'activate_savings_quest':
                this.endScene();
                // JETZT erst den Pfeil zeigen
                events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'hq', show: true });
                ui.showPersistentHint('Gehe zum Kontor');
                break;

            // --- TUTORIAL: KAPITEL 0 FLOW (ohne animierte Geldflüsse) ---
            case 'trigger_coin_leg':
                this.getBuildings(); // ensure buildings are initialized

                // 1. Income Part A (Mo)
                if (choice.param === 'INCOME_MO_PHASE') {
                    this.endScene();
                    economy.state.moneyPlayer = 130;
                    economy.broadcastStats();
                    this.triggerScene('D0_INCOME_KIAN');
                }
                // 2. Income Part B (Kian)
                else if (choice.param === 'INCOME_KIAN_PHASE') {
                    this.endScene();
                    economy.state.moneyPlayer = 150;
                    economy.broadcastStats();

                    setTimeout(() => this.setIslandOverviewCamera(), 200);
                    this.waitingForBoatClick = true;
                    this.nextSceneOnBoatClick = 'D0_REPAIR_REQUEST';
                    events.emit(EVENTS.CMD_SHOW_BOAT_HINT, { show: true });
                    events.emit(EVENTS.TOAST, { message: 'Klicke das Boot, um weiterzumachen.' });
                }
                // 3. Repair (Kian gets money)
                else if (choice.param === 'REPAIR_PHASE') {
                    this.endScene();
                    economy.state.moneyPlayer = 120;
                    economy.broadcastStats();
                    this.triggerScene('D0_FOOD_REQUEST');
                }
                // 4. Food (Mo gets money)
                else if (choice.param === 'FOOD_PHASE') {
                    this.endScene();
                    economy.state.moneyPlayer = 100;
                    economy.broadcastStats();
                    this.triggerScene('D0_SUMMARY');
                }
                break;

            case 'release_boat_tutorial':
                this.endScene();
                input.setLocked(false);
                setTimeout(() => this.setIslandOverviewCamera(), 200);
                this.waitingForTutorialRelease = true;

                // Verzögerter Hinweis: Zeige erst nach 10 Sekunden an, falls Spieler nicht selbst gestartet hat
                if (this.tutorialBoatHintTimer) {
                    clearTimeout(this.tutorialBoatHintTimer);
                }
                this.tutorialBoatHintTimer = setTimeout(() => {
                    // Nur anzeigen, wenn Spieler noch nicht selbst gestartet hat
                    if (this.waitingForTutorialRelease) {
                        events.emit(EVENTS.CMD_SHOW_BOAT_HINT, { show: true });
                        events.emit(EVENTS.TOAST, { message: 'Klicke auf das Boot, um zu starten.' });
                    }
                }, 10000); // 10 Sekunden
                break;

            case 'start_crunch_gameplay':
                this.endScene();
                setTimeout(() => {
                    this.setIslandOverviewCamera();
                    input.setLocked(false);
                    
                    // Boot explizit freigeben, falls es durch einen Recall festgehalten wurde
                    const bm = window.game?.boatManager;
                    if (bm && bm.boats) {
                        bm.boats.forEach(b => {
                            b.state = 0; // WAITING_FOR_COMMAND
                        });
                    }

                    // Explizit Hinweis erzwingen und sicherstellen, dass er bleibt
                    this.waitingForBoatClick = true;
                    events.emit(EVENTS.CMD_SHOW_BOAT_HINT, { show: true });
                    events.emit(EVENTS.TOAST, { message: 'Stech wieder in See!' });
                }, 200);
                break;

            // --- CHAPTER 1 & 3 CYCLE ANALYSIS ---
            case 'show_cycle_visual':
                this.endScene();

                let cycleMode = 'HEALTHY'; // Default (Kapitel 0)
                let isBroken = false;

                // Mapping der Parameter auf UI-Modi
                if (choice.param === 'BROKEN') {
                    cycleMode = 'STAGNATION';
                    isBroken = true;
                } else if (choice.param === 'BOOM_BUST') {
                    cycleMode = 'BOOM_BUST';
                    isBroken = true; // Roter Rahmen für das Fenster
                }

                setTimeout(() => {
                    events.emit('ui:show_cycle_explanation', {
                        broken: isBroken,
                        mode: cycleMode
                    });
                }, 200);
                break;

            // --- CHAPTER 3 END: LEAKAGE ANALYSIS (NEW!) ---
            case 'show_cycle_leakage':
                this.endScene();
                // Opens Cycle UI in specific "Leakage" mode (Red arrow to bank)
                setTimeout(() => {
                    events.emit('ui:show_cycle_explanation', {
                        broken: true,
                        mode: 'LEAKAGE'
                    });
                }, 200);
                break;

            // --- CHAPTER 2: LOAN LOGIC ---
            case 'go_to_sterling_bank':
                this.endScene();
                this.flags.sterlingInvitationActive = true;
                this.panCameraToTentArea();
                input.setLocked(false);
                break;

            case 'take_loan_and_quest':
                this.endScene();
                // Central logic for taking the loan
                this.handleLoanTaken();
                break;

            // Fallback generic loan (NUR für Kapitel 2!)
            case 'take_loan':
                economy.takeLoan(choice.amount || 200);
                this.endScene();
                events.emit('world:update_visuals', { health: 1.0 });
                this.setPhase('BOOM');
                setTimeout(() => {
                    // Falls es eine Folgeszene gibt
                    if(choice.param) this.triggerScene(choice.param);
                }, 1000);
                break;

            // --- KAPITEL 4 ACTIONS ---
            case 'take_refinancing_loan':
                this.endScene();
                // 1. Kredit setzen
                economy.state.moneyPlayer += 500;
                economy.state.loanPrincipal = 500; // Neuer Kredit
                economy.state.accruedInterest = 0; // Reset alter Zinsen

                // 2. Visueller Zustand aus Kapitel 3 beibehalten
                economy.state.marketHealth = Math.min(economy.state.marketHealth, 0.35);
                events.emit(ECON_EVENTS.MARKET_HEALTH_CHANGED, { health: economy.state.marketHealth });
                economy.broadcastStats();
                events.emit('world:visual_effect', { type: 'STALL' });

                // 3. Phase setzen
                this.setPhase('GROWTH_TRAP');
                this.flags.refinancingDone = true;
                this.flags.growthTrapTripCount = 0;
                this.markObjectiveDone('accept_refinance');

                setTimeout(() => this.setIslandOverviewCamera(), 200);
                input.setLocked(false);

                // 4. Feedback
                events.emit(EVENTS.TOAST, { message: '500 Gold erhalten. Zinsen laufen!' });

                // ÄNDERUNG: Billboard "Darlehen: Unbegrenzt" entfernt.
                // Kapitel 4 Start: Boot manuell starten lassen
                const bm = window.game?.boatManager;
                if (bm && bm.boats) {
                    bm.boats.forEach((boat) => {
                        boat.state = 0; // STATE.WAITING_FOR_COMMAND
                        boat.timer = 0;
                        boat.currentWaypointIdx = 0;
                        boat.waypoints = [];
                        if (boat.mesh && boat.position) {
                            boat.mesh.position.copy(boat.position);
                            boat.mesh.rotation.set(0, Math.PI, 0);
                        }
                    });
                }

                events.emit(EVENTS.CMD_SHOW_BOAT_HINT, { show: true });
                events.emit(EVENTS.TOAST, { message: 'Kapitel 4: Starte das Boot!' });
                break;

            case 'activate_shipyard_upgrade_quest':
                this.endScene();
                this.flags.dredgeUpgradeUnlocked = true; // Flag für Kapitel 4 Schleppnetz
                events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'shipyard', show: true });
                // Grauer Hinweis
                ui.showPersistentHint('Kaufe das Schleppnetz bei Kian');
                break;

            case 'buy_dredge_net':
                this.endScene();
                if (economy.state.moneyPlayer >= 350) {
                    // Visual payment flow from player to shipyard
                    events.emit(EVENTS.TRIGGER_COIN_LEG, {
                        from: 'UI_MONEY',
                        to: 'SHIPYARD',
                        amount: 350,
                        isLoss: true
                    });

                    // allow time for coins to flow before applying the upgrade
                    setTimeout(() => {
                        if (economy.buyUpgrade('NETS', 'dredge')) {
                            this.flags.dredgePurchased = true;
                            this.markObjectiveDone('buy_dredge');
                            ui.hidePersistentWarning();
                            events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'shipyard', show: false });

                            events.emit(EVENTS.TOAST, { message: 'Schleppnetz montiert. Effizienz gesteigert.' });

                            // Boot freigeben für Trip 2
                            events.emit(EVENTS.CMD_RELEASE_BOATS);
                        }
                    }, 1000);
                } else {
                    events.emit(EVENTS.TOAST, { message: 'Nicht genug Gold (350g benötigt)' });
                }
                break;

            case 'start_efficiency_chapter':
                this.endScene();
                
                // Phase auf EFFICIENCY setzen
                this.setPhase('EFFICIENCY');
                this.flags.forceDockLock = true; // Boot blocken bis Kauf erledigt
                this.flags.trawlerPurchased = false; // sicherstellen, dass Kauf nötig bleibt
                this.flags.raniWarned = false; // Rani erst wieder warnen, wenn Trawler aktiv

                // Ziele setzen: Trawler kaufen (Pflicht)
                this.markObjectiveDone('fund_upgrade', false);
                this.activeObjectives = [
                    { id: 'fund_upgrade', text: 'Sichere 500g für den Trawler', done: false },
                    { id: 'buy_tech', text: 'Kaufe den Trawler in der Werft', done: false }
                ];
                this.updateObjectives();

                const trawlerCost = BALANCE.COSTS.BOATS.TRAWLER;
                const efficiencyMoney = economy.state.moneyPlayer;

                setTimeout(() => this.setIslandOverviewCamera(), 200);
                input.setLocked(false);

                if (efficiencyMoney < trawlerCost) {
                    const shortfall = trawlerCost - efficiencyMoney;
                    events.emit(EVENTS.TOAST, { 
                        message: `Du brauchst ${trawlerCost}g für den Trawler (${shortfall}g fehlen). Geh zur Werft.` 
                    });
                }

                events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'shipyard', show: true });
                ui.showPersistentHint('Kaufe den Trawler bei Kian (500g)');
                break;

            case 'buy_trawler_upgrade':
                this.endScene();

                // Kapitel 4: Schleppnetz kaufen
                if (this.currentPhaseId === 'GROWTH_TRAP') {
                    const upgradeCost = BALANCE.COSTS.UPGRADES.NET_DREDGE;

                    if (economy.state.moneyPlayer >= upgradeCost) {
                        // Visual payment flow from player to shipyard
                        events.emit(EVENTS.TRIGGER_COIN_LEG, {
                            from: 'UI_MONEY',
                            to: 'SHIPYARD',
                            amount: upgradeCost,
                            isLoss: true
                        });

                        setTimeout(() => {
                            if (economy.buyUpgrade('NETS', 'dredge')) {
                                this.flags.dredgePurchased = true;
                                this.markObjectiveDone('buy_dredge');

                                ui.hidePersistentWarning();
                                ui.hidePersistentHint();
                                events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'shipyard', show: false });

                                events.emit(EVENTS.TOAST, { message: 'Schleppnetz montiert. Effizienz gesteigert.' });

                                // Boot freigeben für Trip 2+
                                events.emit(EVENTS.CMD_RELEASE_BOATS);
                            }
                        }, 800);
                    } else {
                        events.emit(EVENTS.TOAST, { message: `Nicht genug Gold (${upgradeCost}g benötigt)` });
                    }
                } else {
                    // In Kapitel 5/6 wird der Trawler-Kauf genutzt, nicht das Upgrade
                    events.emit(EVENTS.TOAST, { message: 'Upgrade derzeit nicht verfügbar.' });
                }
                break;

            case 'buy_trawler':
                this.endScene();
                
                const trawlerCostReal = BALANCE.COSTS.BOATS.TRAWLER;
                if (economy.state.moneyPlayer >= trawlerCostReal) {
                    // Manuelle Kauf-Logik, damit kein zweiter Trawler gespawnt wird
                    economy.state.moneyPlayer -= trawlerCostReal;
                    economy.broadcastStats();

                    // Motorboot durch Trawler ersetzen
                    const bm = window.game?.boatManager;
                    if (bm) {
                        const motorIdx = bm.boats.findIndex(b => b.type === 'motor');
                        const targetIdx = motorIdx >= 0 ? motorIdx : 0;
                        bm.replaceBoatWithPoof(targetIdx, 'trawler');

                        // Sicherstellen, dass nur EIN Trawler vorhanden ist
                        let trawlerSeen = false;
                        const filtered = [];
                        bm.boats.forEach((b) => {
                            if (b.type === 'trawler') {
                                if (!trawlerSeen) {
                                    trawlerSeen = true;
                                    filtered.push(b);
                                } else {
                                    if (b.mesh) sceneSetup.scene.remove(b.mesh);
                                }
                            } else {
                                filtered.push(b);
                            }
                        });
                        bm.boats = filtered;
                    }

                    // Flottenzähler anpassen
                    if (economy.state.boatsMotor > 0) economy.state.boatsMotor -= 1;
                    economy.state.boatsTrawl = Math.max(1, economy.state.boatsTrawl); // genau ein Trawler
                    economy.broadcastStats();

                    this.flags.trawlerPurchased = true;
                    this.flags.forceDockLock = false;
                    this.markObjectiveDone('fund_upgrade');
                    this.markObjectiveDone('buy_tech');
                    ui.hidePersistentHint();
                    events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'shipyard', show: false });
                    events.emit(EVENTS.TOAST, { message: 'Trawler gekauft. Höhere Fangmenge, höhere Risiken.' });
                    // Hinweis auf neuen Trawler
                    events.emit(EVENTS.CMD_SHOW_BOAT_HINT, { show: true });
                    events.emit(EVENTS.TOAST, { message: 'Schicke den Trawler los.' });

                    // Übergang in Kapitel 6: Öko-Kollaps einleiten
                    this.setPhase('CANNIBALIZATION');
                    this.flags.cannibalizationTripCount = 0;
                    events.emit(EVENTS.CMD_RELEASE_BOATS);
                    input.setLocked(false);
                } else {
                    const shortfall = trawlerCostReal - economy.state.moneyPlayer;
                    events.emit(EVENTS.TOAST, { message: `Nicht genug Gold (${trawlerCostReal}g benötigt, es fehlen ${shortfall}g)` });
                    // Sterling bietet nach fehlgeschlagenem Kauf direkt Kredit an
                    this.triggerScene('D5_STERLING_LOAN_OFFER');
                }
                break;

            case 'take_efficiency_loan':
                this.endScene();
                
                const loanAmount = choice.amount || 400;
                economy.state.moneyPlayer += loanAmount;
                economy.state.loanPrincipal += loanAmount;
                economy.broadcastStats();
                
                events.emit(EVENTS.TOAST, { message: `${loanAmount}g Kredit erhalten` });
                
                setTimeout(() => this.setIslandOverviewCamera(), 200);
                input.setLocked(false);
                
                events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'shipyard', show: true });
                ui.showPersistentHint('Kaufe das Schleppnetz-Upgrade bei Kian (350g)');
                break;

            case 'trigger_collapse':
                this.endScene();
                
                // Zeige Collapse Overlay
                const collapseOverlay = document.getElementById('collapse-overlay');
                if (collapseOverlay) {
                    collapseOverlay.style.display = 'flex';
                }
                
                // Phase auf COLLAPSE setzen
                this.setPhase('COLLAPSE');
                
                // Visueller Effekt
                events.emit('world:visual_effect', { type: 'DEATH' });
                events.emit('world:update_visuals', { health: 0.0 });
                break;

            case 'show_game_over_screen':
                this.endScene();

                // Game Over Bildschirm anzeigen
                this.showGameOverScreen();
                break;

            case 'buy_motor_boat':
                this.endScene();
                if (economy.state.moneyPlayer >= 200) {
                    this.flags.motorboatPurchased = true;
                    // Trigger the big construction sequence
                    this.playBoomSequence();
                } else {
                    events.emit(EVENTS.TOAST, { message: "Nicht genug Gold!" });
                }
                break;

            case 'start_boom_gameplay':
                this.endScene();
                setTimeout(() => this.setIslandOverviewCamera(), 200);
                input.setLocked(false);
                events.emit(EVENTS.CMD_RELEASE_BOATS);
                events.emit(EVENTS.TOAST, { message: 'Nutze das Motorboot und erwirtschafte Profit!' });
                break;

            // --- CHAPTER 2 END: REPAYMENT ---
            case 'repay_loan_boom':
                this.endScene();
                const result = economy.processLoanPayment();
                if (result.success) {
                    // Visual Coin flow from Money to Bank
                    events.emit(EVENTS.TRIGGER_COIN_LEG, {
                        from: 'UI_MONEY',
                        to: 'BANK',
                        amount: result.paid
                    });

                    // Trigger next scene
                    setTimeout(() => {
                        this.triggerScene('D2_AFTER_REPAYMENT');
                    }, 1500);
                } else {
                    events.emit(EVENTS.TOAST, { message: 'Nicht genug Geld!' });
                }
                break;

            // --- TRANSITION TO CHAPTER 3 ---
            case 'transition_to_crunch':
                this.endScene();
                this.setPhase('CRUNCH');

                // NEU: Dynamischen Text setzen basierend auf echtem Kapital
                const currentMoney = Math.floor(economy.state.moneyPlayer);
                SCENE_DATA['D3_INTRO'].text = `Der Kredit ist getilgt! Wir sind frei... aber sieh dir das Konto an. Nur noch ${currentMoney} Gold.\n\nDas Motorboot verbraucht Unmengen an Sprit und die Crew will ihren Anteil. Das wird verdammt knapp für die nächste Fahrt.`;

                this.tripsCompleted = 0;
                setTimeout(() => this.setIslandOverviewCamera(), 200);

                // Short delay before Lale notices the empty account
                setTimeout(() => {
                    this.triggerScene('D3_INTRO');
                }, 1000);
                break;

            // --- TRANSITION TO CHAPTER 4 (NEW!) ---
            case 'transition_to_growth_trap':
                this.endScene();
                this.setPhase('GROWTH_TRAP');
                setTimeout(() => this.setIslandOverviewCamera(), 200);
                input.setLocked(false);
                events.emit(EVENTS.TOAST, { message: 'Kapitel 4: Die Wachstumsfalle' });

                // Optional: Start scene for Chapter 4
                // setTimeout(() => this.triggerScene('D4_INTRO'), 1000);
                break;

            // --- STANDARD ACTIONS ---
            case 'trigger_scene':
                if (choice.param === 'D3_STERLING_SOLUTION' && this.currentPhaseId === 'CRUNCH') {
                    this.markObjectiveDone('talk_refinance');
                }
                this.endScene();
                setTimeout(() => this.triggerScene(choice.param), 300);
                break;

            case 'next_phase':
                if (choice.param) this.setPhase(choice.param);
                this.endScene();
                setTimeout(() => this.setIslandOverviewCamera(), 200);
                input.setLocked(false);
                break;

            case 'game_over':
                this.endScene();
                location.reload();
                break;

            case 'close':
            default:
                this.endScene();
                // Wait for UI to close before resetting camera
                setTimeout(() => {
                    this.setIslandOverviewCamera();
                }, 200);
                input.setLocked(false);

                // WICHTIG: Boot freigeben, falls es durch Sterling gesperrt wurde
                events.emit(EVENTS.CMD_RELEASE_BOATS);
                break;
        }
    }

    triggerScene(sceneId) {
        const scene = SCENE_DATA[sceneId];
        if (!scene) {
            console.warn('Scene not found:', sceneId);
            return;
        }

        input.setLocked(true);
        this.isSceneActive = true;
        if (sceneId === 'D0_READY_AGAIN') {
            this.waitingForTutorialRelease = true;
            events.emit(EVENTS.CMD_SHOW_BOAT_HINT, { show: true });
            input.setLocked(false); // Boot soll direkt klickbar sein
        }

        events.emit(DIRECTOR_EVENTS.SCENE_START, {
            type: scene.type || 'narrative', // Default zu Narrative
            sceneId: sceneId,
            ...scene
        });
    }

    endScene() {
        this.isSceneActive = false;
        input.setLocked(false);
        events.emit(DIRECTOR_EVENTS.SCENE_END);
    }

    onCycleExplanationClosed() {
        // Logik für den Übergang nach der Analyse

        // Fall A: Kapitel 1 (Sparmaßnahmen Analyse) -> Sterling kommt
        if (this.currentPhaseId === 'STAGNATION' && this.flags.isSaving) {
            setTimeout(() => {
                this.panCameraToTentArea();
                setTimeout(() => {
                    this.triggerScene('D2_STERLING_INVITATION');
                    setTimeout(() => {
                        events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'bank_tent', show: true });
                        events.emit(EVENTS.TOAST, { message: 'Gehe zum Zelt und sprich mit Sterling!' });
                    }, 100);
                }, 1000);
            }, 1000);
        }

        // Fall B: Kapitel 3 (Boom/Bust Analyse) -> Lösungsvorschlag
        else if (this.currentPhaseId === 'CRUNCH') {
            // Die Phase wechselt erst, wenn der Spieler den Kredit annimmt.
            // Jetzt zeigen wir erst den Lösungsvorschlag (Refinanzierung).
            setTimeout(() => {
                this.triggerScene('D3_STERLING_SOLUTION');
            }, 500);
        }

        // Fall C: Tutorial
        else if (this.currentPhaseId === 'TUTORIAL') {
            setTimeout(() => this.triggerScene('D0_READY_AGAIN'), 300);
        }
    }

    // --- LOGIK HANDLER ---

    // --- ÄNDERUNG: CRUNCH Logik auf 3 Trips erweitert ---
// --- ÄNDERUNG: CRUNCH Logik auf 3 Trips erweitert ---
    onTripCompleted(data) {
        // 1. TUTORIAL LOGIK
        if (this.currentPhaseId === 'TUTORIAL') {
            if (data?.catchAmount) {
                this.totalFishCaught += data.catchAmount;
                if (this.totalFishCaught >= 30) this.markObjectiveDone('catch_30_fish');
            }

            if (!this.flags.tutorialManualStepComplete) {
                this.triggerScene('D0_MARKET_ARRIVED');
                return;
            } else {
                this.tutorialLoopCount++;
                const pos = new THREE.Vector3(0, 10, -60);
                ui.createFloatingText(`+${Math.floor(data.revenue)}`, pos, '#f1c40f');

                // Simulierter Geldfluss im Tutorial
                economy.state.moneyPlayer += 50;

                // WICHTIG: Timeout speichern oder Checks einbauen, damit er nicht in Phase 1 feuert
                setTimeout(() => {
                    // FIX: Wenn wir bereits in STAGNATION gewechselt sind, keine Abzüge mehr!
                    // Das verhindert, dass wir in Kapitel 1 mit 50g statt 100g starten.
                    if (this.currentPhaseId !== 'TUTORIAL') return;

                    economy.state.moneyPlayer -= 50;
                    economy.broadcastStats();
                    ui.createFloatingText(`-50 (Kosten)`, pos, '#e74c3c');
                }, 1500);

                economy.broadcastStats();

                // Prüfen ob Ziele erreicht sind
                this.checkTutorialObjectives();

                // FIX: Boot nur neu starten, wenn das Tutorial noch NICHT vorbei ist.
                // Wenn checkTutorialObjectives() true war, ist tutorialObjectivesCompleted jetzt true.
                // Dann bleibt das Boot stehen für den Übergang zu Kapitel 1.
                if (!this.tutorialObjectivesCompleted) {
                    const bm = window.game.boatManager;
                    if (bm && bm.boats[0]) setTimeout(() => bm.startBoat(0), 2000);
                }

                return;
            }
        }

        // 2. STAGNATION LOGIK (Kapitel 1)
        if (this.currentPhaseId === 'STAGNATION') {
            // Fall A: Sparmaßnahmen laufen bereits (Inszenierung)
            if (this.flags.isSaving) {
                this.playStagnationSequence(data);
            }
            // Fall B: Kapitel 1 Start (noch keine Sparmaßnahmen)
            else {
                // FIX: Wenn das Boot zurückkommt, bevor wir sparen, darf das Kapital nicht steigen.
                // Der Spieler muss bei 100g bleiben, damit das Problem (200g für Boot) besteht.
                // Economy.js hat den Profit bereits addiert (da isSavingActive=false), wir machen das rückgängig.
                const profit = data.profit || 0;

                if (profit > 0) {
                    economy.state.moneyPlayer -= profit;
                    economy.broadcastStats();

                    // Visuelles Feedback entfernen (Floating Text korrigieren wir hier nicht, aber wir senden einen Toast)
                    events.emit(EVENTS.TOAST, { message: 'Der Fang deckt nur die Kosten. Gewinn: 0g' });
                }
            }
            return;
        }

        // 3. BOOM LOGIK (Kapitel 2)
        if (this.currentPhaseId === 'BOOM') {
            this.tripsCompleted += 1;
            economy.accrueInterestForTrip();

            if (this.tripsCompleted === 1) {
                this.playBoomFirstTrip(data);
            } else {
                this.playBoomQuickTrip(data);
            }

            if (data?.profit > 0) {
                this.boomProfitableTrips += 1;
                if (this.boomProfitableTrips === 2) setTimeout(() => this.triggerScene('D2_MO_BOOM'), 2000);
                if (this.boomProfitableTrips === 3) setTimeout(() => this.triggerScene('D2_KIAN_BOOM'), 2000);

                const tripObj = this.activeObjectives.find(o => o.id === 'complete_trips');
                if (tripObj) {
                    tripObj.current = this.boomProfitableTrips;
                    if (this.boomProfitableTrips >= (tripObj.target || 3)) {
                        tripObj.done = true;
                        this.markObjectiveDone('observe_economy');
                    }
                    this.updateObjectives();
                }
            }
            return;
        }

        // 4. CRUNCH LOGIK (Kapitel 3: Die Abrechnung) - NEU STRUKTURIERT
        if (this.currentPhaseId === 'CRUNCH') {
            this.tripsCompleted += 1;

            const crunchTrips = this.activeObjectives.find(o => o.id === 'crunch_trips');
            if (crunchTrips) {
                crunchTrips.current = Math.min(this.tripsCompleted, crunchTrips.target || this.tripsCompleted);
                if (crunchTrips.target && crunchTrips.current >= crunchTrips.target) {
                    crunchTrips.done = true;
                }
                this.updateObjectives();
            }

            if (this.tripsCompleted === 1) {
                // Trip 1: Der Schock (Mo still, Kian laut)
                this.playCrunchSequence('TRIP_1', data);
            }
            else if (this.tripsCompleted === 2) {
                // Trip 2: Die Konsequenz (Mo laut, Kian still)
                this.playCrunchSequence('TRIP_2', data);
            }
            else if (this.tripsCompleted >= 3) {
                // Trip 3: Das Ende (Sterling greift ein)
                this.playCrunchSequence('TRIP_3', data);
            }

            return;
        }

        // 5. GROWTH TRAP (Kapitel 4)
        if (this.currentPhaseId === 'GROWTH_TRAP') {
            this.flags.growthTrapTripCount++;
            this.playGrowthTrapSequence(this.flags.growthTrapTripCount, data);
            return;
        }

        // 5.5. EFFICIENCY (Kapitel 5: Trawler & Ökologische Warnung)
        if (this.currentPhaseId === 'EFFICIENCY') {
            this.flags.efficiencyTripCount = (this.flags.efficiencyTripCount || 0) + 1;
            this.playCannibalizationSequence(this.flags.efficiencyTripCount, data);
            return;
        }

        // 6. CANNIBALIZATION (Kapitel 6: Ökologischer Kollaps)
        if (this.currentPhaseId === 'CANNIBALIZATION') {
            this.flags.cannibalizationTripCount = (this.flags.cannibalizationTripCount || 0) + 1;
            this.playCannibalizationSequence(this.flags.cannibalizationTripCount, data);
            return;
        }

        // Standard-Fallback für spätere Phasen
        this.tripsCompleted += 1;
    }

    // --- NEU: Helper für Kapitel 3 (Crunch) ---
    async runCrunchBuildingSequence(charKey, buildingId, financeData, crateData, isPartial, tripType) {
        // Standard-Werte aus Economy
        let revenue = financeData.revenue;
        // FORCE override für Trip 2 & 3 Visuals (Story driven)
        let accepted = crateData.accepted;

        if (tripType === 'TRIP_2') accepted = 2; // Story-Zwang: Nur 2 Kisten
        if (tripType === 'TRIP_3') accepted = 0; // Story-Zwang: Keine Abnahme

        let displayCost = -financeData.cost;
        let displayLabel = 'Betriebskosten';

        // KOSTEN-ÜBERSCHREIBUNG FÜR STORY-KONSISTENZ (Alle Trips gleich)
        if (charKey === 'mo') {
            displayLabel = 'Verpflegung';
            displayCost = -20; // FIX: Mo kostet jetzt -20G (war vorher -5)
        } else if (charKey === 'kian') {
            displayLabel = 'Wartung';
            displayCost = -20; // Kian bleibt bei -20G
        }

        // Profit für das Billboard neu berechnen
        // Hinweis: Revenue muss für Trip 2/3 ggf. angepasst werden, wenn accepted sinkt,
        // aber wir lassen die Economy-Werte hier stehen und faken nur die Kisten-Visuals.
        // Für saubere Anzeige berechnen wir Revenue basierend auf Fake-Accepted neu:
        if (tripType === 'TRIP_2' || tripType === 'TRIP_3') {
            revenue = accepted * 10; // 10g pro Kiste
        }

        const displayProfit = revenue + displayCost;

        // 1. BARK (Reaktion) - SKRIPT GESTEUERT
        let barkText = null;
        let barkIcon = "📉";
        let speakerName = charKey === 'mo' ? 'Mo' : 'Kian';

        if (tripType === 'TRIP_1') {
            if (charKey === 'mo') {
                barkText = "Du hast an uns gespart – jetzt haben wir weniger Geld.";
                barkIcon = "💸";
            }
        } else if (tripType === 'TRIP_2') {
            if (charKey === 'kian') {
                barkText = "Kein Auftrag? Ich schicke die Jungs heim.";
                barkIcon = "👋";
            } else if (charKey === 'mo') {
                barkText = "Werftcrew bleibt weg. Weniger Gäste, weniger Fisch.";
                barkIcon = "📉";
            }
        }
        // Trip 3: Kian/Mo Barks entfernt (dafür Lale später)

        // Bark anzeigen (nur wenn Text definiert)
        if (barkText) {
            events.emit(EVENTS.SHOW_WORLD_BARK, {
                targetId: buildingId === 'TAVERN' ? 'tavern' : 'shipyard',
                speaker: speakerName,
                text: barkText,
                icon: barkIcon,
                isCrisis: true
            });
            await this.wait(5500);
        }

        // 2. VISUELLE KISTEN
        if (accepted > 0) {
            events.emit(EVENTS.VISUAL_DELIVERY_START, { target: buildingId, count: accepted });
            await this.wait(1400);
        }

        // 3. GEBÄUDE REAKTION
        if (accepted > 0) {
            events.emit(EVENTS.BUILDING_REACTION, { target: buildingId, type: 'PARTIAL_PAYMENT' });
        } else {
            // Bei 0 Kisten (Trip 3) keine positive Reaktion, eher Stille oder Shake
            events.emit(EVENTS.BUILDING_REACTION, { target: buildingId, type: 'REJECT' });
        }
        await this.wait(600);

        // 4. BILLBOARD: PHASE A (Einnahmen)
        const billboardId = `bb_crunch_${charKey}`;

        events.emit(EVENTS.SHOW_BILLBOARD, {
            id: billboardId,
            target: buildingId,
            title: accepted === 0 ? 'KEIN UMSATZ' : 'UMSATZ EINBRUCH',
            text: accepted === 0 ? 'Keine Abnahme' : `${accepted}x Kisten`,
            subtext: `+${revenue} G`,
            type: accepted === 0 ? 'neutral' : 'gain',
            isPersist: true
        });

        await this.wait(1000);

        // 5. BILLBOARD: PHASE B (Kosten)
        events.emit('ui:update_billboard', {
            id: billboardId,
            addLabel: displayLabel,
            addAmount: displayCost,
            newTotal: displayProfit
        });

        await this.wait(1500);

        // 6. GELDFLUSS (Münzen fliegen zum/vom Kapital)
        if (displayProfit < 0) {
            events.emit(EVENTS.TRIGGER_COIN_LEG, {
                from: 'UI_MONEY',
                to: buildingId,
                amount: Math.abs(displayProfit),
                isLoss: true
            });
        } else if (displayProfit > 0) {
            events.emit(EVENTS.TRIGGER_COIN_LEG, {
                from: buildingId,
                to: 'UI_MONEY',
                amount: displayProfit
            });
        }

        // Warten bis die Münzen am Kapital ankommen
        await this.wait(1200);

        // 7. ECHTER GELDABZUG IM UI & ECONOMY UPDATE
        // FIX: Im CRUNCH-Modus ändert die Economy das Geld nicht, also machen wir es hier!
        // Wir müssen sowohl die Economy als auch das UI aktualisieren.
        economy.state.moneyPlayer += displayProfit;
        economy.broadcastStats(); // Wichtig: Stats an UI senden

        events.emit(EVENTS.MONEY_CHANGED, {
            amount: displayProfit,
            reason: 'visual-update',
            suppressFloatingText: true
        });

        await this.wait(500);
        events.emit('ui:close_billboard', { id: billboardId });
        await this.wait(200);
    }

    async playCrunchSequence(type, data) {
        // --- SZENARIO: CRUNCH (Geldknappheit & Rezession) ---

        // TRIP 1: Käptn Bark am Anfang
        if (type === 'TRIP_1') {
            events.emit(EVENTS.SHOW_WORLD_BARK, {
                targetId: 'boat',
                speaker: "Kapt'n",
                text: "Ich bin weniger liquide und muss die Kosten kürzen.",
                icon: '⚓',
                isCrisis: false
            });
            await this.wait(4000);
        }

        // VISUELLE EFFEKTE (Sättigung)
        if (type === 'TRIP_2') {
            // Leichte Entsättigung
            events.emit('world:visual_effect', { type: 'STALL' });
            // Marktgesundheit senken
            economy.state.marketHealth = Math.max(0.55, economy.state.marketHealth - 0.25);
            economy.broadcastStats();
        }
        if (type === 'TRIP_3') {
            events.emit('world:visual_effect', { type: 'ROTTEN_CRATES' });
            // FIX: Health auf 0.3 statt 0.1 setzen, damit Gebäude nicht schwarz werden,
            // sondern nur entsättigt und düster wirken.
            events.emit('world:update_visuals', { health: 0.3 });
            // Marktgesundheit weiter drücken
            economy.state.marketHealth = Math.max(0.3, economy.state.marketHealth - 0.25);
            economy.broadcastStats();
        }

        // 1. Sequenz Kian (Werft)
        await this.runCrunchBuildingSequence(
            'kian',
            'SHIPYARD',
            data.financials.kian,
            data.crates.kian,
            data.isPartialPayment,
            type
        );

        // ZWISCHENSCHRITT: Arbeiter verlassen die Werft (Domino-Effekt)
        if (type === 'TRIP_2') {
            const pm = window.game?.personManager;
            if (pm) {
                console.log("📉 [DIRECTOR] Kian feuert Leute...");
                pm.dismissShipyardWorkers();
                // Kurze Pause, damit man sieht, wie sie gehen, bevor Mo sich beschwert
                await this.wait(2000); 
            }
        }

        // 2. Sequenz Mo (Taverne)
        await this.runCrunchBuildingSequence(
            'mo',
            'TAVERN',
            data.financials.mo,
            data.crates.mo,
            data.isPartialPayment,
            type
        );

        // 3. NACHKLAPP (Post-Trip Events)
        // Kurze Pause für den Effekt der letzten Transaktion
        await this.wait(500);

        // --- FIX: BOOT FREIGABE VOR STERLING ---
        // Bei Trip 1 und 2 soll das Spiel sofort weitergehen, auch wenn Sterling redet.
        if (type !== 'TRIP_3') {
            events.emit(EVENTS.CMD_RELEASE_BOATS);
            input.setLocked(false);
            events.emit(EVENTS.CMD_SHOW_BOAT_HINT, { show: false });
        }

        if (type === 'TRIP_2') {
            // Sterling Kommentar parallel zum Ablegen
            // ÄNDERUNG: Text angepasst auf Werft-Problematik
            events.emit(EVENTS.SHOW_ADVISOR, {
                text: "Sehen Sie? Keine Aufträge in der Werft, keine Löhne für die Arbeiter. Der Konsum bricht ein. Die Spirale dreht sich.",
                duration: 6000,
                speaker: 'Sterling'
            });
            // KEIN await hier, damit das Spiel flüssig bleibt!
        }

        if (type === 'TRIP_3') {
            // Lale Kommentar (HQ) - Hier warten wir, da es zum Story-Übergang führt
            events.emit(EVENTS.SHOW_WORLD_BARK, {
                targetId: 'hq',
                speaker: 'Lale',
                text: "Mo und Kian sind pleite. Niemand kauft deinen Fisch. Wir stehen vor dem Abgrund.",
                icon: '🏛️',
                isCrisis: true
            });

            await this.wait(5000);

            // Trigger nächste Szene
            this.triggerScene('D3_DOWNWARD_SPIRAL');
        }
    }


    // --- FUNKTION A: BOOM Erster Trip (Mit Billboards und Erklärungen) ---
    async playBoomFirstTrip(data) {
        console.log("🎬 [BOOM] playBoomFirstTrip - Erster Trip beginnt");

        const { financials, crates } = data;
        const buildings = this.getBuildings();

        // Boot kommt an
        await this.wait(500);

        // =========================================================
        // SEQUENZ MO (Taverne)
        // =========================================================
        const moAccepted = crates?.mo?.accepted || 0;
        if (moAccepted > 0) {
            events.emit(EVENTS.VISUAL_DELIVERY_START, { target: 'TAVERN', count: moAccepted });
            await this.wait(1400);
        }

        const moRevenue = financials?.mo?.revenue || 0;
        const moCost = financials?.mo?.cost || 0;
        const moProfit = moRevenue - moCost;

        events.emit(EVENTS.SHOW_BILLBOARD, {
            id: 'bb_mo_first',
            target: 'TAVERN',
            title: 'EINKAUF',
            text: `${moAccepted} Kisten`,
            subtext: `+${moRevenue}g Einnahme`,
            type: 'gain',
            isPersist: true
        });

        await this.wait(1500);

        events.emit('ui:update_billboard', {
            id: 'bb_mo_first',
            addLabel: 'Verpflegung',
            addAmount: -moCost,
            newTotal: moProfit
        });

        await this.wait(2000);

        if (moProfit > 0) {
            events.emit(EVENTS.TRIGGER_COIN_LEG, {
                from: 'TAVERN',
                to: 'UI_MONEY',
                amount: moProfit
            });

            await this.wait(1200);

            economy.state.moneyPlayer += moProfit;
            economy.broadcastStats();

            events.emit(EVENTS.MONEY_CHANGED, {
                amount: moProfit,
                suppressFloatingText: true,
                reason: 'visual-update'
            });
        }

        await this.wait(500);
        events.emit('ui:close_billboard', { id: 'bb_mo_first' });
        await this.wait(400);


        // =========================================================
        // SEQUENZ KIAN (Werft)
        // =========================================================
        const kianAccepted = crates?.kian?.accepted || 0;
        if (kianAccepted > 0) {
            events.emit(EVENTS.VISUAL_DELIVERY_START, { target: 'SHIPYARD', count: kianAccepted });
            await this.wait(1400);
        }

        const kianRevenue = financials?.kian?.revenue || 0;
        const kianCost = financials?.kian?.cost || 0;
        const kianProfit = kianRevenue - kianCost;

        const billboardType = kianProfit >= 0 ? 'gain' : 'loss';

        events.emit(EVENTS.SHOW_BILLBOARD, {
            id: 'bb_kian_first',
            target: 'SHIPYARD',
            title: 'MATERIAL',
            text: `${kianAccepted} Kisten`,
            subtext: `+${kianRevenue}g Einnahme`,
            type: billboardType,
            isPersist: true
        });

        await this.wait(1500);

        events.emit('ui:update_billboard', {
            id: 'bb_kian_first',
            addLabel: 'Wartung',
            addAmount: -kianCost,
            newTotal: kianProfit
        });

        await this.wait(2000);

        if (kianProfit > 0) {
            events.emit(EVENTS.TRIGGER_COIN_LEG, {
                from: 'SHIPYARD',
                to: 'UI_MONEY',
                amount: kianProfit
            });

            await this.wait(1200);

            economy.state.moneyPlayer += kianProfit;
            economy.broadcastStats();

            events.emit(EVENTS.MONEY_CHANGED, {
                amount: kianProfit,
                suppressFloatingText: true,
                reason: 'visual-update'
            });

        } else if (kianProfit < 0) {
            events.emit(EVENTS.TRIGGER_COIN_LEG, {
                from: 'UI_MONEY',
                to: 'SHIPYARD',
                amount: Math.abs(kianProfit),
                isLoss: true
            });

            await this.wait(1200);

            economy.state.moneyPlayer += kianProfit;
            economy.broadcastStats();

            events.emit(EVENTS.MONEY_CHANGED, {
                amount: kianProfit,
                suppressFloatingText: true,
                reason: 'visual-update'
            });
        }

        await this.wait(500);

        // 5. Billboard schließen
        events.emit('ui:close_billboard', { id: 'bb_kian_first' });

        // --- ABSCHLUSS ---
        await this.wait(2000);

        // NEU: Prüfe SOFORT nach Geldgutschrift, ob Sterling zurückfordern will
        if (economy.checkLoanRecall()) {
            console.log("🎬 [BOOM] Sterling fordert zurück (nach 1. Trip) - Szene wird getriggert");
            // Szene wird durch onLoanRecall() automatisch getriggert
            return; // Boot bleibt gesperrt
        }

        events.emit(EVENTS.SHOW_ADVISOR, {
            text: "Perfekt! Ab jetzt läuft das automatisch. Beobachte dein Kapital!",
            duration: 3500
        });

        events.emit(EVENTS.CMD_RELEASE_BOATS);
        input.setLocked(false);
    }

    // --- FUNKTION B: BOOM Schneller Trip (Ab Trip 2 - Keine Billboards) ---
    async playBoomQuickTrip(data) {
        console.log("🎬 [BOOM] playBoomQuickTrip - Schneller Ablauf");

        const { financials, crates } = data;

        // --- NEU: ANTIZIPATION ---
        // Wir prüfen VOR der Animation, ob das Geld nach diesem Trip für den Recall reicht.
        // Wenn ja, setzen wir ein Flag, um das Boot am Ende NICHT freizugeben.
        const currentMoney = economy.state.moneyPlayer;
        const projectedProfit = data.profit || 0;
        const projectedTotal = currentMoney + projectedProfit;
        const recallThreshold = 270;

        let forceDockLock = false;

        // FIX: Boot NUR stoppen, wenn das Limit tatsächlich erreicht oder überschritten wird.
        // Keine Pufferzone (-20) mehr, da dies zu Softlocks führt (z.B. bei 265 Gold).
        if (projectedTotal >= recallThreshold) {
            console.log(`🛑 [BOOM] Limit erreicht (${projectedTotal} >= ${recallThreshold}). Boot wird für Sterling festgehalten.`);
            forceDockLock = true;

            // Setze Flag auch im Director State, damit Boat.js es beim Unloading sicher sieht
            this.flags.forceDockLock = true;
        }

        // 1. Kisten fliegen GLEICHZEITIG zu Mo und Kian
        const moAccepted = crates?.mo?.accepted || 0;
        const kianAccepted = crates?.kian?.accepted || 0;

        if (moAccepted > 0) events.emit(EVENTS.VISUAL_DELIVERY_START, { target: 'TAVERN', count: moAccepted });
        if (kianAccepted > 0) events.emit(EVENTS.VISUAL_DELIVERY_START, { target: 'SHIPYARD', count: kianAccepted });

        // 2. Kurze Pause (Kisten fliegen)
        await this.wait(1500);

        // 3. Gebäude reagieren
        if (moAccepted > 0) events.emit(EVENTS.BUILDING_REACTION, { target: 'TAVERN', type: 'SUCCESS' });
        if (kianAccepted > 0) events.emit(EVENTS.BUILDING_REACTION, { target: 'SHIPYARD', type: 'SUCCESS' });

        await this.wait(300);

        // 4. Geld fließt
        const moProfit = (financials?.mo?.revenue || 0) - (financials?.mo?.cost || 0);
        const kianProfit = (financials?.kian?.revenue || 0) - (financials?.kian?.cost || 0);

        if (moProfit > 0) events.emit(EVENTS.TRIGGER_COIN_LEG, { from: 'TAVERN', to: 'UI_MONEY', amount: moProfit });
        if (kianProfit > 0) events.emit(EVENTS.TRIGGER_COIN_LEG, { from: 'SHIPYARD', to: 'UI_MONEY', amount: kianProfit });

        // 5. Economy aktualisieren
        const totalProfit = moProfit + kianProfit;
        await this.wait(1200);

        // JETZT ist das Geld wirklich da
        economy.state.moneyPlayer += totalProfit;
        economy.broadcastStats();

        if (totalProfit > 0) {
            events.emit(EVENTS.MONEY_CHANGED, {
                amount: totalProfit,
                suppressFloatingText: true,
                reason: 'visual-update'
            });
        }

        await this.wait(500);

        // --- NEU: ENTSCHEIDUNG ---
        if (forceDockLock) {
            // Trigger Recall sofort (Input wird dort gesperrt)
            // Boot bleibt stehen.
            economy.checkLoanRecall();
        } else {
            // Normal weiterfahren
            console.log("🎬 [BOOM] Trip ok, Boot freigeben");
            events.emit(EVENTS.CMD_RELEASE_BOATS);
        }
    }

    // --- NEU: BOOM Gebäude-Sequenz NUR für ersten Trip (MIT Billboard, OHNE Kamerafahrt) ---
    async runBoomBuildingSequenceNoCam(charKey, buildingId, financeData, crateData) {
        const accepted = crateData.accepted;
        const revenue = financeData.revenue;
        const cost = financeData.cost;
        const profit = revenue - cost;

        // 1. Bark anzeigen
        const bark = this.getBoomBarkForFirstTrip(charKey, accepted);
        events.emit(EVENTS.SHOW_WORLD_BARK, bark);
        await this.wait(5500); // Warten auf Bark (5s + Puffer)

        // 2. Kisten fliegen
        if (accepted > 0) {
            events.emit(EVENTS.VISUAL_DELIVERY_START, { target: buildingId, count: accepted });
            await this.wait(1400);
        }

        // 3. Gebäude reagiert
        const reactionType = accepted > 0 ? 'SUCCESS' : 'REJECT';
        events.emit(EVENTS.BUILDING_REACTION, { target: buildingId, type: reactionType });
        await this.wait(600);

        // 4. Billboard: Einnahmen
        let incomeTitle = "UMSATZ";
        let incomeText = `${accepted}x 📦 à 10g`;
        let incomeClass = 'gain';

        if (accepted === 0) {
            incomeTitle = "KEIN UMSATZ";
            incomeText = "Keine Abnahme";
            incomeClass = 'neutral';
        }

        const billboardId = `bb_${charKey}`;
        events.emit(EVENTS.SHOW_BILLBOARD, {
            id: billboardId,
            target: buildingId,
            title: incomeTitle,
            text: incomeText,
            subtext: `+${revenue} G`,
            type: incomeClass,
            isPersist: true
        });

        await this.wait(1500);

        // 5. Billboard: Kosten
        events.emit('ui:update_billboard', {
            id: billboardId,
            addLabel: financeData.label,
            addAmount: -cost,
            newTotal: profit
        });

        await this.wait(2000);

        // 6. Geldfluss
        if (profit !== 0) {
            if (profit > 0) {
                events.emit(EVENTS.TRIGGER_COIN_LEG, { from: buildingId, to: 'UI_MONEY', amount: profit });
            } else {
                events.emit(EVENTS.TRIGGER_COIN_LEG, { from: 'UI_MONEY', to: buildingId, amount: profit, isLoss: true });
            }
        }

        await this.wait(1500);

        events.emit('ui:close_billboard', { id: billboardId });
        await this.wait(300);
    }

    // Barks für den ersten BOOM-Trip (freudige Reaktionen mit Expansion-Hinweisen)
    getBoomBarkForFirstTrip(character, acceptedCrates) {
        const barks = {
            mo: {
                text: acceptedCrates > 0
                    ? "Volle Hütte! Ich stelle eine Hilfskraft ein! 🏗️"
                    : "Hmm, keine Ware? Das wird schwierig...",
                icon: acceptedCrates > 0 ? "🍺" : "😕"
            },
            kian: {
                text: acceptedCrates > 0
                    ? "Auftragsboom! Ich baue einen Anbau an die Werft! 🏗️"
                    : "Keine Arbeit, kein Lohn. Schade.",
                icon: acceptedCrates > 0 ? "👷" : "⚙️"
            }
        };

        const data = barks[character];
        return {
            targetId: character === 'mo' ? 'tavern' : 'shipyard',
            speaker: character === 'mo' ? 'Mo' : 'Kian',
            text: data.text,
            icon: data.icon,
            isCrisis: false
        };
    }

    // --- ALTE METHODE (für andere Phasen) ---
    async runBoomBuildingSequence(charKey, buildingId, financeData, crateData) {
        const accepted = crateData.accepted;
        const revenue = financeData.revenue;
        const cost = financeData.cost;
        const profit = revenue - cost;

        // 1. Kisten fliegen
        if (accepted > 0) {
            events.emit(EVENTS.VISUAL_DELIVERY_START, { target: buildingId, count: accepted });
            await this.wait(1400);
        }

        // 2. Gebäude reagiert
        const reactionType = accepted > 0 ? 'SUCCESS' : 'REJECT';
        events.emit(EVENTS.BUILDING_REACTION, { target: buildingId, type: reactionType });
        await this.wait(600);

        // 3. Billboard: Einnahmen
        let incomeTitle = "UMSATZ";
        let incomeText = `${accepted}x 📦 à 10g`;
        let incomeClass = 'gain';

        if (accepted === 0) {
            incomeTitle = "KEIN UMSATZ";
            incomeText = "Keine Abnahme";
            incomeClass = 'neutral';
        }

        const billboardId = `bb_${charKey}`;
        events.emit(EVENTS.SHOW_BILLBOARD, {
            id: billboardId,
            target: buildingId,
            title: incomeTitle,
            text: incomeText,
            subtext: `+${revenue} G`,
            type: incomeClass,
            isPersist: true
        });

        await this.wait(1500);

        // 4. Billboard: Kosten
        events.emit('ui:update_billboard', {
            id: billboardId,
            addLabel: financeData.label,
            addAmount: -cost,
            newTotal: profit
        });

        await this.wait(2000);

        // 5. Geldfluss
        if (profit !== 0) {
            if (profit > 0) {
                events.emit(EVENTS.TRIGGER_COIN_LEG, { from: buildingId, to: 'UI_MONEY', amount: profit });
            } else {
                events.emit(EVENTS.TRIGGER_COIN_LEG, { from: 'UI_MONEY', to: buildingId, amount: profit, isLoss: true });
            }
        }

        await this.wait(1500);

        events.emit('ui:close_billboard', { id: billboardId });
        await this.wait(300);
    }

    // --- ÜBERARBEITET: Die Inszenierung der Abrechnung ---
    async playStagnationSequence(data) {
        const { financials, crates, tripNumber } = data;

        ui.hidePersistentWarning();

        await this.wait(500);

        // --- SEQUENZ MO (Taverne) ---
        await this.ensureCameraFocus('TAVERN');
        await this.runBuildingSequence('mo', 'TAVERN', financials.mo, crates.mo, tripNumber);

        // --- SEQUENZ KIAN (Werft) ---
        await this.ensureCameraFocus('SHIPYARD');
        await this.runBuildingSequence('kian', 'SHIPYARD', financials.kian, crates.kian, tripNumber);

        // Abschluss-Logik
        await this.wait(1000);

        // Kamera-Bewegung bei Sterling-Advisor entfernt (bleibt in aktueller Position)

        if (tripNumber === 1) {
            events.emit(EVENTS.SHOW_ADVISOR, { text: "Die Kosten sinken. Das ist der Weg.", duration: 4000 });
        } else if (tripNumber === 2) {
            events.emit(EVENTS.SHOW_ADVISOR, { text: "Umsatzrückgang. Unschön, aber notwendig.", duration: 4000 });
        } else if (tripNumber >= 3) {
            this.flags.waitingForRealization = true;
            this.triggerScene('D1_REALIZATION');
            return;
        }

        events.emit(EVENTS.CMD_RELEASE_BOATS);
        input.setLocked(false);
    }

    // --- ÜBERARBEITET: Timing & Geldfluss korrigiert ---
    async runBuildingSequence(charKey, buildingId, financeData, crateData, tripNumber) {
        // 1. BARK (Sprechblase)
        const bark = this.getBarkForTrip(charKey, tripNumber, financeData.isSaving);
        events.emit(EVENTS.SHOW_WORLD_BARK, bark);

        // Warten bis Bark gelesen wurde und ausgeblendet ist
        await this.wait(5500); // Warten bis Bark gelesen wurde

        // 2. KISTEN
        const accepted = crateData.accepted;

        if (accepted > 0) {
            events.emit(EVENTS.VISUAL_DELIVERY_START, { target: buildingId, count: accepted });
            // WICHTIG: Wir warten jetzt genau so lange, wie die Kisten fliegen (ca 1.5s bei Speed 0.65)
            // bevor das Gebäude reagiert.
            await this.wait(1400);
        }

        // Reaktion des Gebäudes (Wackeln) ERST JETZT, wenn Kisten da sind (Punkt 1)
        const reactionType = accepted > 0 ? 'SUCCESS' : 'REJECT';
        events.emit(EVENTS.BUILDING_REACTION, { target: buildingId, type: reactionType });
        await this.wait(600);

        // 3. BILLBOARD: PHASE A (Einnahmen)
        const revenue = financeData.revenue;
        const cost = financeData.cost;
        const profit = revenue - cost;

        let incomeTitle = "UMSATZ";
        let incomeText = `${accepted}x 📦 à 10g`;
        let incomeClass = 'gain';

        if (accepted === 0) {
            incomeTitle = "KEIN UMSATZ";
            incomeText = "Keine Abnahme";
            incomeClass = 'neutral';
        }

        const billboardId = `bb_${charKey}`;
        events.emit(EVENTS.SHOW_BILLBOARD, {
            id: billboardId,
            target: buildingId,
            title: incomeTitle,
            text: incomeText,
            subtext: `+${revenue} G`,
            type: incomeClass,
            isPersist: true
        });

        await this.wait(1500);

        // FIX: Label definieren, da financeData.label oft undefined ist
        let costLabel = (charKey === 'mo') ? 'Verpflegung' : 'Wartung';

        // ÄNDERUNG: Not-Ration anzeigen, wenn gespart wird (Kosten <= 5)
        if (charKey === 'mo' && financeData.cost <= 5) {
            costLabel = 'Not-Ration';
        }
        // ÄNDERUNG: Not-Flicken bei Kian (Kosten <= 10)
        if (charKey === 'kian' && financeData.cost <= 10) {
            costLabel = 'Not-Flicken';
        }

        // 4. BILLBOARD: PHASE B (Rechnung)
        events.emit('ui:update_billboard', {
            id: billboardId,
            addLabel: costLabel,
            addAmount: -cost,
            newTotal: profit
        });

        // WICHTIG: Hier länger warten (Punkt 2), damit man das Ergebnis sieht
        await this.wait(2500);

        // 5. GELDFLUSS & STATUS UPDATE (Punkt 3, 4, 5)
        if (profit !== 0) {
            // A. Visueller Effekt sofort starten
            if (profit > 0) {
                events.emit(EVENTS.TRIGGER_COIN_LEG, { from: buildingId, to: 'UI_MONEY', amount: profit });
            } else {
                events.emit(EVENTS.TRIGGER_COIN_LEG, { from: 'UI_MONEY', to: buildingId, amount: profit, isLoss: true });
            }

            // B. Logischer Effekt VERZÖGERT (Punkt 4)
            // Wir warten 1.5s (Flugzeit der Münzen), bevor wir das Kapital ändern.
            setTimeout(() => {
                economy.state.moneyPlayer += profit;
                economy.broadcastStats();

                // Kleines visuelles Feedback an der Zahl oben
                events.emit(EVENTS.MONEY_CHANGED, {
                    amount: profit,
                    reason: 'trip-end',
                    suppressFloatingText: true // Unterdrückt den gelben 3D-Text
                });
            }, 2200);
        }

        await this.wait(2000);

        events.emit('ui:close_billboard', { id: billboardId });
        await this.wait(500);
    }

    // --- ÜBERARBEITET: Dynamische Texte basierend auf Spar-Entscheidung ---
    getBarkForTrip(character, tripNum, isSavingOnThisChar) {
        const isSaving = !!isSavingOnThisChar;

        // Definition der Dialoge: [0]=Sparen (Negativ), [1]=Ausgeben (Positiv/Normal)
        const barks = {
            mo: {
                1: [
                    { text: "Ich nehme alles, aber du hast die Rationen runtergedreht. Crew fragt, wo das Geld bleibt.", icon: "😐" },
                    { text: "Volle Schüsseln. Stimmung passt, ich nehme meinen Anteil.", icon: "🍲" }
                ],
                2: [
                    { text: "Dein Sparkurs trifft uns. Werftcrew bleibt weg, mein Gastraum auch.", icon: "📉" },
                    { text: "Du fütterst mich, aber das Dorf spart. Gastraum halb leer, ich nehme weniger.", icon: "🤔" }
                ],
                3: [
                    { text: "Deine Kürzungen haben uns ausgetrocknet. Keine Gäste, keine Abnahme.", icon: "🚫" },
                    { text: "Essen gut, aber niemand hat Geld. Ich kaufe nichts.", icon: "💸" }
                ]
            },
            kian: {
                1: [
                    { text: "Ich kaufe alles, aber du drehst mir das Wartungsbudget zu. Die Jungs merken's.", icon: "😠" },
                    { text: "Saubere Wartung. Boot hält, ich nehme meinen Anteil.", icon: "🔧" }
                ],
                2: [
                    { text: "Du drückst meine Kosten, ich verliere Kunden. Weniger Aufträge, weniger Kauf.", icon: "⚠️" },
                    { text: "Boot ok, aber alle sparen. Nachfrage bricht ein, ich kaufe weniger.", icon: "📉" }
                ],
                3: [
                    { text: "Dein Sparkurs legt mich lahm. Kein Umsatz, kein Lohn.", icon: "🔒" },
                    { text: "Premium hin oder her – Markt tot. Ich bin raus.", icon: "🚫" }
                ]
            }
        };

        const charData = barks[character];
        const tripData = charData?.[tripNum];

        // Fallback, falls Trip > 3
        if (!tripData) return { text: "...", icon: "" };

        // Wähle Index 0 (Sparen) oder 1 (Nicht Sparen)
        const variantIndex = isSavingOnThisChar ? 0 : 1;
        const data = tripData[variantIndex];

        return {
            targetId: character === 'mo' ? 'tavern' : 'shipyard',
            speaker: character === 'mo' ? 'Mo' : 'Kian',
            text: data.text,
            icon: data.icon,
            isCrisis: tripNum === 3 // Bei Trip 3 ist alles Krise
        };
    }

    // Sterling-Kommentare während BOOM-Phase
    showSterlingComment(tripNumber) {
        const comments = {
            1: "Sehr gut! Das Motorboot zahlt sich aus. Weiter so!",
            3: "Die Wirtschaft floriert. Genau so funktioniert Wachstum.",
            4: "Expansion ist der Schlüssel. Vergessen Sie das nicht.",
            6: "Beeindruckend. Aber denken Sie daran: Schulden müssen bedient werden."
        };

        const comment = comments[tripNumber];
        if (comment) {
            setTimeout(() => {
                events.emit(EVENTS.SHOW_ADVISOR, {
                    text: comment,
                    duration: 3500
                });
            }, 1500);
        }
    }

    // === NEU: Sterling-Kommentare während CRUNCH-Phase (Zynisch & distanziert) ===
    showSterlingCrunchComment(type) {
        const comments = {
            partial_payment: "Faszinierend. Ein klassischer Liquiditätsengpass. Das Geld fehlt im System.",
            unsold_crates: "Überproduktion in einem schrumpfenden Markt. Lehrbuchmäßig.",
            market_collapse: "Sehen Sie? Ohne Kapitalfluss stirbt der Handel."
        };

        const text = comments[type] || comments.market_collapse;

        // Nutze das Advisor-System (Bubble oben rechts), unterbricht nicht das Spiel
        events.emit(EVENTS.SHOW_ADVISOR, {
            text: text,
            duration: 5000,
            speaker: 'Sterling'
        });
    }

    onBoatBought(data) {
        if (data.type === 'motor') {
            this.flags.hasMotorboat = true;

            if (this.currentPhaseId === 'BOOM') {
                this.markObjectiveDone('buy_motorboat');

                // UI Update
                events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'shipyard', show: false });

                // ENTFERNT: Kamerafokus auf Werft (keine Kamerafahrt mehr)
                // Die Kamera bleibt wo sie ist - der Spieler behält die Kontrolle

                // Kians Bark (direkt, ohne Kamerabewegung)
                setTimeout(() => {
                    events.emit(EVENTS.SHOW_WORLD_BARK, {
                        targetId: 'shipyard',
                        speaker: 'Kian',
                        text: 'Ausgezeichnet! Ich fange sofort an. Gib mir einen Moment!',
                        icon: '🔨'
                    });
                }, 500);
            }
        }
    }

    onGracePeriodEnded() {
        // Alte Logik (für spätere Kapitel)
        this.triggerScene('D3_PAYMENT_SHOCK');
    }

    // NEU: Handler für flexible Kreditrückforderung (BOOM → CRUNCH Übergang)
    onLoanRecall(data) {
        if (this.currentPhaseId !== 'BOOM') return;

        // WICHTIG: Input sofort sperren, damit Boot nicht weiterfahren kann
        input.setLocked(true);
        console.log("🎩 [STERLING] Kredit-Rückforderung aktiv - Input gesperrt!");

        // Szene triggern: Sterling fordert Rückzahlung
        setTimeout(() => {
            this.triggerScene('D2_LOAN_RECALL');
        }, 2000); // Kurze Verzögerung nach Trip
    }

    onEcologicalWarning() {
        // Rani warnt erst, wenn der Trawler aktiv im Einsatz ist und mindestens 2 Fahrten absolviert hat
        const ecoWarningAllowed =
            (this.currentPhaseId === 'CANNIBALIZATION' && (this.flags.cannibalizationTripCount || 0) >= 2);

        if (!ecoWarningAllowed) return;

        if (!this.flags.raniWarned) {
            this.flags.raniWarned = true;
            this.triggerScene('D5_RANI_WARNING');
        }
    }

    onUpgradeBought(data) {
        if (this.currentPhaseId === 'EFFICIENCY') {
            this.markObjectiveDone('buy_tech');
        }
    }

    onPurchaseFailed(data) {
        if (this.currentPhaseId !== 'STAGNATION') return;
        if (!data || data.type !== 'motor') return;

        this.markObjectiveDone('check_price');
        ui.hideDialog();
        ui.hideGuidanceArrow();
        ui.hidePersistentWarning();

        if (this.flags.savingsProposed) return;
        this.flags.savingsProposed = true;
        this.flags.savingsUnlocked = true;

        // ENTFERNT: HQ-Pfeil wird erst nach Dialog durch activate_savings_quest gezeigt
        // ENTFERNT: events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'hq', show: true });
        // ENTFERNT: ui.showPersistentHint('Gehe zum Kontor');

        setTimeout(() => this.triggerScene('D1_PURCHASE_FAIL'), 100);
    }

    onSavingsConfirmed(data) {
        const amount = data && data.amount ? data.amount : 0;
        const config = data && data.config ? data.config : null;

        // WICHTIG: Wenn nichts gespart wird, brechen wir hier ab.
        if (amount <= 0) {
            // UI Feedback kommt aus dem UIManager ("Keine Änderungen").
            // Wir lassen die Phase und den Doom-Loop unberührt.
            return;
        }

        economy.setSavingMode(true, amount, config);
        this.flags.isSaving = true;
        this.markObjectiveDone('open_savings');
        ui.hidePersistentWarning();

        // Reset der Trip-Zähler für die Krisen-Sequenz
        this.savingsTripCount = 0;
        this.flags.waitingForRealization = false;

        events.emit(EVENTS.TOAST, { message: 'Maßnahmen aktiv. Beobachte die Bilanz.' });
        ui.hideGuidanceArrow?.();

        const bm = window.game.boatManager;
        if(bm && bm.boats[0]) bm.startBoat(0);
    }

    onDialogClosed(data) {
        // Sterling-Logik wandert in onCycleExplanationClosed (nach neuem UI-Flow)
    }

    onBankConstructed() {
        if (!this.flags.sterlingInvitationActive || this.flags.hasTakenFirstLoan) return;

        if (this.bankOfferTimeout) clearTimeout(this.bankOfferTimeout);

        this.bankOfferTimeout = setTimeout(() => {
            this.bankOfferTimeout = null;
            if (this.flags.sterlingInvitationActive && !this.flags.hasTakenFirstLoan) {
                this.triggerScene('D2_STERLING_OFFER');
            }
        }, 1200);
    }

    // --- CRISIS SEQUENCE (Phase 1) ---

    // --- PHASE MANAGEMENT ---

    setPhase(phaseId) {
        if (!PHASES[phaseId]) return;

        this.currentPhaseId = phaseId;
        this.activeObjectives = JSON.parse(JSON.stringify(PHASES[phaseId].objectives));

        // Reminder-Timer für Tutorial zurücksetzen
        if (this.tutorialTavernHintTimer) {
            clearTimeout(this.tutorialTavernHintTimer);
            this.tutorialTavernHintTimer = null;
        }

        // Reset Phase-spezifische Flags und Zähler
        if (phaseId === 'STAGNATION') {
            this.flags.isSaving = false;
            this.flags.stagnationExplained = false;
        }

        if (phaseId === 'BOOM') {
            this.boomProfitableTrips = 0;
            this.boomProgressShown = false;
            this.boomWarningShown = false;
        }

        events.emit(DIRECTOR_EVENTS.PHASE_CHANGED, {
            phaseId: phaseId,
            title: PHASES[phaseId].title
        });

        this.updateObjectives();
    }

    markObjectiveDone(objId) {
        const obj = this.activeObjectives.find(o => o.id === objId);
        if (obj && !obj.done) {
            obj.done = true;
            this.updateObjectives();
        }
    }

    resetForPhase(phaseId) {
        // Flags & Zähler zurücksetzen
        this.flags = this.createInitialFlags();
        this.totalFishCaught = 0;
        this.tripsCompleted = 0;
        this.tutorialLoopCount = 0;
        this.savingsTripCount = 0; // Zähler für Spar-Trips zurücksetzen
        this.boomProfitableTrips = 0; // Zähler für BOOM-Trips zurücksetzen
        this.boomProgressShown = false;
        this.boomWarningShown = false;
        this.waitingForBoatClick = false;
        this.waitingForTutorialRelease = false;
        this.nextSceneOnBoatClick = null;
        this.crisisStep = 0;
        this.tutorialObjectivesCompleted = false;
        this.isSceneActive = false;
        this.isIntroRunning = false;
        this.timers = { stagnationStartTime: null, lastStagnationToast: 0 };
        if (this.bankOfferTimeout) {
            clearTimeout(this.bankOfferTimeout);
            this.bankOfferTimeout = null;
        }
        if (this.tutorialTavernHintTimer) {
            clearTimeout(this.tutorialTavernHintTimer);
            this.tutorialTavernHintTimer = null;
        }

        input.setLocked(false);
        ui.hideCinematicLayer();
        ui.hideCinematicCard?.();
        ui.hidePersistentWarning();
        ui.hideGuidanceArrow?.();
        events.emit(DIRECTOR_EVENTS.CLEAR_CRISIS_CARDS);
        events.emit(EVENTS.CMD_SHOW_BOAT_HINT, { show: false });

        // Wirtschaft auf Ausgangszustand setzen
        if (typeof economy.getInitialState === 'function') {
            economy.state = economy.getInitialState();
            economy.broadcastStats();
            economy.setSimulationActive(true);
        }

        // Boote an den Steg zurücksetzen
        const bm = window.game?.boatManager;
        if (bm && bm.boats) {
            bm.boats.forEach((boat) => {
                if (!boat) return;
                boat.state = 0; // STATE.WAITING_FOR_COMMAND
                boat.timer = 0;
                boat.currentWaypointIdx = 0;
                boat.waypoints = [];
                if (boat.mesh && boat.position) {
                    boat.mesh.position.copy(boat.position);
                    boat.mesh.rotation.set(0, Math.PI, 0);
                }
            });
        }
    }

    updateObjectives() {
        events.emit(DIRECTOR_EVENTS.OBJECTIVES_UPDATED, {
            objectives: this.activeObjectives
        });
    }

    // --- DEBUG HELPER ---
    debugJumpToPhase(phaseId) {
        if (!PHASES[phaseId]) return;

        // Basis-Reset, damit keine alten Events/Flags übrig bleiben
        this.resetForPhase(phaseId);

        // Phase-spezifische Startlogik
        switch (phaseId) {
            case 'TUTORIAL':
                this.setPhase('TUTORIAL');
                this.promptBoatStart(); // Startdialog + Boot-Hinweis
                break;

            case 'STAGNATION':
                this.setPhase('STAGNATION');
                events.emit(EVENTS.TOAST, { message: 'Kapitel 1: Stillstand (Debug-Start)' });
                this.panCameraToTentArea();

                setTimeout(() => {
                    this.triggerScene('D1_STERLING_ARRIVAL');
                }, 500);
                break;

            case 'BOOM':
                // WICHTIG: Debug-Start für BOOM beginnt in STAGNATION (vor dem Kredit)!
                // Der Spieler soll den Kredit selbst aufnehmen können.
                // Die Phase wechselt dann automatisch zu BOOM nach Kreditaufnahme.

                // Economy-State vorbereiten (wie am Ende von Kapitel 1)
                economy.state.moneyPlayer = 100; // Vor dem Kredit
                economy.state.loanPrincipal = 0;
                this.flags.isSaving = true; // Wir kommen aus der Spar-Phase
                this.flags.waitingForRealization = true;
                this.flags.savingsUnlocked = true; // Sparbuch war verfügbar
                economy.broadcastStats();

                // Zelt und Bank anzeigen
                events.emit(EVENTS.CMD_SHOW_TENT);

                // Phase auf STAGNATION setzen (damit Bank-Menü funktioniert)
                // Aber mit BOOM-Objectives für die Anzeige
                this.currentPhaseId = 'STAGNATION';
                economy.currentPhaseId = 'STAGNATION'; // WICHTIG: Economy synchronisieren!
                this.activeObjectives = JSON.parse(JSON.stringify(PHASES['BOOM'].objectives));

                // Titel auf BOOM setzen für UI
                events.emit(DIRECTOR_EVENTS.PHASE_CHANGED, {
                    phaseId: 'BOOM',
                    title: PHASES['BOOM'].title
                });
                this.updateObjectives();

                // Kamera-Position sicher setzen (Bank-Bereich)
                // Verwende input direkt statt buildingsRef (könnte null sein)
                if (input && typeof input.setLookTarget === 'function') {
                    input.setLookTarget(new THREE.Vector3(60, 0, 0));
                    input.targetRadius = 420;
                    input.targetHeight = 240;
                    input.targetAngle = Math.PI * 0.5;
                }

                // Kurze Verzögerung, dann Sterling's Einladungs-Szene triggern
                setTimeout(() => {
                    this.triggerScene('D2_STERLING_INVITATION');
                    // Pfeil zur Bank aktivieren (nach Dialog-Close sichtbar)
                    setTimeout(() => {
                        events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'bank_tent', show: true });
                        events.emit(EVENTS.TOAST, { message: 'Gehe zum Zelt und sprich mit Sterling!' });
                    }, 100);
                }, 1000);

                // Toast
                events.emit(EVENTS.TOAST, {
                    message: 'Kapitel 2: Sterling lädt dich zur Bank ein'
                });
                break;

            case 'CRUNCH':
                // WICHTIG: Debug-Start für CRUNCH - Direkt nach Sterling-Zahlung
                // Spieler hat das Motorboot gekauft, den Kredit zurückgezahlt und ist jetzt pleite

                // Economy-State vorbereiten (wie nach Kredit-Rückzahlung)
                economy.state.moneyPlayer = 60; // Nach 220g Zahlung
                economy.state.loanPrincipal = 0; // Kredit zurückgezahlt
                economy.state.accruedInterest = 0;
                economy.state.tripsSinceLoan = 0;
                economy.state.principalDue = 0;
                economy.state.marketHealth = 1.0; // Markt ist noch gesund (Boom gerade vorbei)
                economy.state.boatsRow = 0; // Ruderboot verschrottet
                economy.state.boatsMotor = 1; // Motorboot vorhanden
                economy.broadcastStats();

                // Flags setzen
                this.flags.hasTakenFirstLoan = true;
                this.flags.motorboatPurchased = true;
                this.flags.hasMotorboat = true;
                this.flags.motorboatReady = true;

                // --- NEU: Visuelle Normalisierung sichern ---
                events.emit('world:visual_effect', { type: 'RECOVER' });
                events.emit('world:update_visuals', { health: 1.0 });
                // ------------------------------------------------

                // Zelt und Bank anzeigen
                events.emit(EVENTS.CMD_SHOW_TENT);

                // Phase auf CRUNCH setzen
                this.setPhase('CRUNCH');
                economy.currentPhaseId = 'CRUNCH';

                // WICHTIG: Boote neu initialisieren
                const bmCrunch = window.game?.boatManager;
                if (bmCrunch) {
                    // 1. Existierende Meshes aus der Szene entfernen!
                    bmCrunch.boats.forEach(b => {
                        if (b.mesh) {
                            sceneSetup.scene.remove(b.mesh);
                            // Falls registriert, auch als Interactable entfernen
                            sceneSetup.unregisterInteractable(b.mesh);
                        }
                    });

                    // 2. Array leeren
                    bmCrunch.boats = [];

                    // 3. Motorboot hinzufügen
                    bmCrunch.addBoat('motor');

                    // 4. Boot zum Dock bewegen
                    const motorBoat = bmCrunch.boats[0];
                    if (motorBoat && motorBoat.mesh) {
                        motorBoat.mesh.position.copy(motorBoat.position);
                        motorBoat.mesh.rotation.set(0, Math.PI, 0);
                        motorBoat.state = 0; // WAITING_FOR_COMMAND
                    }
                }

                // Kamera-Position setzen (Overview)
                this.setIslandOverviewCamera();

                // Input freigeben
                input.setLocked(false);

                // D3_INTRO Szene triggern (Lale warnt)
                setTimeout(() => {
                    this.triggerScene('D3_INTRO');
                }, 1000);

                // Toast
                events.emit(EVENTS.TOAST, {
                    message: 'Kapitel 3: Die Abrechnung (Debug-Start)'
                });
                break;

            case 'GROWTH_TRAP':
                // WICHTIG: Debug-Start für GROWTH_TRAP
                // Zustand: Umschuldung akzeptiert (500g erhalten), Zinsuhr tickt, Motorboot ist da.

                // 1. Phase setzen
                this.setPhase('GROWTH_TRAP');
                economy.currentPhaseId = 'GROWTH_TRAP';

                // 2. Economy Reset (Refinanzierung simuliert)
                economy.state.moneyPlayer = 500; // Startkapital durch Kredit
                economy.state.loanPrincipal = 500; // Schuldenlast
                economy.state.accruedInterest = 0;
                economy.state.tripsSinceLoan = 0;
                economy.state.marketHealth = 0.35; // Start in grauer Stimmung

                // Technik & Boote
                economy.state.boatsRow = 0;
                economy.state.boatsMotor = 1;
                economy.state.boatsTrawl = 0;
                economy.state.tech.netType = 'standard'; // Noch kein Schleppnetz!

                economy.broadcastStats();
                events.emit(ECON_EVENTS.MARKET_HEALTH_CHANGED, { health: economy.state.marketHealth });

                // 3. Flags setzen
                this.flags.hasMotorboat = true;
                this.flags.motorboatReady = true; // Kian ist fertig
                this.flags.hasTakenFirstLoan = true;
                this.flags.refinancingDone = true;
                this.flags.growthTrapTripCount = 0;
                this.flags.dredgePurchased = false;
                this.markObjectiveDone('accept_refinance');

                // 4. Visuelle Welt: Entsättigt starten (Katerstimmung)
                events.emit('world:visual_effect', { type: 'STALL' });
                // events.emit('world:update_visuals', { health: 1.0 }); // ENTFERNEN, wir wollen es grau!

                // WICHTIG: Bankgebäude bauen (Zelt weg, Haus hin)
                const bManager = window.game?.buildings;
                if (bManager) {
                    bManager.constructBank();
                }

                // 5. Boote neu initialisieren (Sicherstellen, dass Motorboot da ist)
                const bmTrap = window.game?.boatManager;
                if (bmTrap) {
                    // Alles löschen
                    bmTrap.boats.forEach(b => {
                        if (b.mesh) {
                            sceneSetup.scene.remove(b.mesh);
                            sceneSetup.unregisterInteractable(b.mesh);
                        }
                    });
                    bmTrap.boats = [];

                    // Motorboot erstellen
                    bmTrap.addBoat('motor');

                    // Boot bereit machen
                    const motorBoat = bmTrap.boats[0];
                    if (motorBoat && motorBoat.mesh) {
                        motorBoat.state = 0; // WAITING_FOR_COMMAND
                        // Update Visuals erzwingen (damit noch KEIN Netz zu sehen ist)
                        motorBoat.updateTechVisuals();
                    }
                }

                // 6. Kamera & Input
                this.setIslandOverviewCamera();
                input.setLocked(false);

                // 7. Start-Trigger (KEIN Billboard mehr, sondern Hinweis aufs Boot)
                events.emit(EVENTS.TOAST, {
                    message: 'Kapitel 4: Starte das Boot!'
                });

                // Pfeil über dem Boot anzeigen
                setTimeout(() => {
                    events.emit(EVENTS.CMD_SHOW_BOAT_HINT, { show: true });
                }, 500);

                // Werft blockieren (kein Hint anzeigen)
                events.emit(EVENTS.CMD_SHOW_BUILDING_HINT, { type: 'shipyard', show: false });

                break;

            default:
                this.setPhase(phaseId);
                events.emit(EVENTS.TOAST, { message: `Kapitel gewechselt: ${PHASES[phaseId].title}` });
        }
    }

    showGameOverScreen() {
        // Fade to black mit Game Over Text
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: linear-gradient(to bottom, #0a1929 0%, #000000 100%);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
            transition: opacity 2s ease-in;
            color: #ffffff;
            font-family: 'Segoe UI', sans-serif;
            text-align: center;
            padding: 40px;
        `;

        overlay.innerHTML = `
            <div style="max-width: 800px; animation: fadeInUp 2s ease-out 1s both;">
                <h1 style="font-size: 4rem; margin-bottom: 2rem; font-weight: 700; text-shadow: 0 0 30px rgba(255,255,255,0.3);">
                    Das Ende
                </h1>
                <div style="font-size: 1.4rem; line-height: 1.8; margin-bottom: 3rem; color: #b0c4de;">
                    <p style="margin-bottom: 1.5rem;">
                        Das Meer ist leer. Die Korallen tot. Die Fische verschwunden.
                    </p>
                    <p style="margin-bottom: 1.5rem;">
                        Sterling hat die Insel gepfändet. Die Gemeinschaft ist zerbrochen.
                    </p>
                    <p style="margin-bottom: 1.5rem;">
                        Der Kreislauf, der einst alle ernährte, wurde durch endloses Wachstum zerstört.
                    </p>
                </div>
                <div style="font-size: 1.1rem; color: #8899aa; font-style: italic; margin-top: 4rem;">
                    Ein Spiel über Wirtschaftskreisläufe, Schulden und die Grenzen des Wachstums.
                </div>
            </div>
        `;

        // CSS für Animation hinzufügen
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);

        document.body.appendChild(overlay);

        // Fade in
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 100);

        // Spiel komplett einfrieren
        input.setLocked(true);
        events.emit(EVENTS.CMD_RELEASE_BOATS, { locked: true });

        console.log("🎮 [DIRECTOR] Game Over - Das Spiel ist beendet.");
    }
}

export const director = new Director();
