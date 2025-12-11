import { events, EVENTS, ECON_EVENTS, DIRECTOR_EVENTS } from '../core/Events.js';
import { BALANCE } from '../config/Balance.js';
class Economy {
constructor() {
this.state = this.getInitialState();
this.currentPhaseId = 'TUTORIAL';
this.savingsTripCounter = 0; // Zähler für Trips im Sparmodus
this.crunchTripCounter = 0; // Zähler für Trips im Crunch-Modus (Kapitel 3)
}
getInitialState() {
    return {
        isSimulationRunning: false,
        moneyPlayer: 100, 
        moneyCirculation: 500, 
        moneyBank: 0,
        
        // Neuer zentraler Wert: Wie gesund ist der Kreislauf?
        // 1.0 = Gesund (Geld fließt)
        // 0.5 = Stagnation (Geld wird knapp)
        // 0.0 = Kollaps (Niemand kauft etwas)
        marketHealth: 1.0,
        
        isSavingActive: false,
        savingsRate: 0.0,
        currentSavingsAmount: 0, // Konkreter Betrag, der pro Trip gespart wird
        savingsConfig: { tavernLevel: 'full', shipyardLevel: 'premium' },
        
        loanPrincipal: 0,
        loanInterestRate: 0.08, // 8% pro Jahr (für Anzeige)
        accruedInterest: 0, // Aufgelaufene Zinsen
        tripsSinceLoan: 0, // Zähler für Trips seit Kreditaufnahme
        paymentDueInTrips: 10, // Zahlung fällig nach X Trips
        interestPerTick: 0, // DEPRECATED - wird nicht mehr verwendet
        principalDue: 0,
        
        fishStock: BALANCE.ECOLOGY.MAX_FISH_STOCK,
        maxFishStock: BALANCE.ECOLOGY.MAX_FISH_STOCK,
        
        boatsRow: 1,
        boatsMotor: 0,
        boatsTrawl: 0,
        
        tech: {
            netType: 'standard',
            engineType: 'sail'
        },
        
        employmentRate: 1.0, 
        marketDemandFactor: 1.0,
        forceNextTripParams: null, // NEU: Ermöglicht geskriptete Wirtschaftsergebnisse
        
        tickIndex: 0
    };
}

init() {
    this.state = this.getInitialState();
    this.currentPhaseId = 'TUTORIAL';
    
    events.on(DIRECTOR_EVENTS.PHASE_CHANGED, (data) => {
        if (data && data.phaseId) {
            this.currentPhaseId = data.phaseId;
            // Reset beim Phasenwechsel, falls nötig
            if (data.phaseId === 'STAGNATION') {
                this.state.marketHealth = 1.0;
                this.state.isSavingActive = false;
            }
            // Reset für Crunch Phase
            if (data.phaseId === 'CRUNCH') {
                this.crunchTripCounter = 0;
            }
        }
    });
    
    this.broadcastStats();
}

forceNextTrip(params) {
    // params kann enthalten: { health: 0.2, acceptedRate: 0.3 }
    this.state.forceNextTripParams = params;
}

setSimulationActive(isActive) {
    this.state.isSimulationRunning = isActive;
    this.broadcastStats();
}

/**
 * Aktiviert den Sparmodus.
 * @param {boolean} isActive 
 * @param {number} amount - Wie viel Gold pro Trip eingespart wird (z.B. 25g).
 */
setSavingMode(isActive, amount = 0, config = null) {
    this.state.isSavingActive = isActive;
    this.state.currentSavingsAmount = amount;
    this.state.savingsRate = isActive ? 0.5 : 0.0;

    // Config speichern (fallback Worst-Case wenn nichts übergeben wird)
    this.state.savingsConfig = config || { tavernLevel: 'basic', shipyardLevel: 'basic' };

    // Reset des Counters, wenn Sparmaßnahmen neu aktiviert werden
    if (isActive) {
        this.savingsTripCounter = 0;
    } else {
        this.state.marketHealth = 1.0;
    }
    
    this.broadcastStats();
}

/**
 * Reduziert die Marktgesundheit gezielt.
 * Wird vom Director in Phase 1 aufgerufen, um die Spirale zu simulieren.
 */
decayMarketHealth(amount) {
    this.state.marketHealth -= amount;
    if (this.state.marketHealth < 0) this.state.marketHealth = 0;
    if (this.state.marketHealth > 1) this.state.marketHealth = 1;
    
    events.emit(ECON_EVENTS.MARKET_HEALTH_CHANGED, { health: this.state.marketHealth });
    this.broadcastStats();
}

// --- MAIN TICK LOOP ---

tick() {
    if (!this.state.isSimulationRunning) return;

    // HINWEIS: Wir haben die automatische Finanz-Simulation (Wages, Costs, Debt) 
    // vollständig entfernt. Geld ändert sich JETZT NUR NOCH durch explizite Aktionen 
    // (Fishing Trips, Käufe, Events).
    // Das verhindert das "Runterrattern" des Kapitals im Hintergrund.

    // 1. Ökologie läuft immer weiter (Fische vermehren sich)
    this._stepRegeneration();

    // 2. UI-Werte stabilisieren
    // Employment Rate ist rein visuell für das HUD, wir koppeln sie an MarketHealth
    this.state.employmentRate = this.state.marketHealth;
    this.state.marketDemandFactor = this.state.marketHealth;

    // 3. Sicherheitsnetz: nie ins Negative fallen lassen (außer durch Events gesteuert)
    if (this.state.moneyPlayer < 0 && this.currentPhaseId === 'TUTORIAL') {
        this.state.moneyPlayer = 0;
    }

    // 4. Updates an UI senden
    this._stepIndicatorsAndEmit();

    this.state.tickIndex++;
}

// --- INTERNE SIMULATIONS-SCHRITTE ---

_stepWagesAndCosts() {
    // In Phase 1 (Stagnation) niemals automatische Abzüge
    if (this.currentPhaseId === 'STAGNATION') {
        return;
    }

    // Fixkosten, die im Hintergrund laufen (für Phase 2+)
    const totalBoats = this.state.boatsRow + this.state.boatsMotor + this.state.boatsTrawl;
    const baseWageBill = BALANCE.ECONOMY.FIXED_COST + (BALANCE.ECONOMY.WAGE_PER_BOAT * totalBoats);
    
    // Sparmaßnahmen reduzieren die Lohnkosten
    const effectiveBill = baseWageBill * (1.0 - this.state.savingsRate);
    
    let wagesPaid = Math.min(effectiveBill, this.state.moneyPlayer);
    
    // Wenn kein Geld da ist, sinkt die Beschäftigung
    if (baseWageBill > 0) {
        const currentRatio = wagesPaid / baseWageBill;
        // Träge Anpassung
        this.state.employmentRate = this.state.employmentRate * 0.9 + currentRatio * 0.1;
    } else {
        this.state.employmentRate = 1.0;
    }

    this.state.moneyPlayer -= wagesPaid;
    this.state.moneyCirculation += wagesPaid;

    if (wagesPaid > 0) {
        events.emit(ECON_EVENTS.EXPENSES_PAID, { 
            amount: wagesPaid, 
            intensity: this.state.employmentRate 
        });
    }
}

_stepMarketCirculation() {
    // Geld fließt von den Nachbarn zurück zum Spieler (passives Einkommen / lokaler Markt)
    // Kopplung: Wenn employmentRate sinkt (weniger Löhne), sinkt auch der Rückfluss.
    
    // In Phase 1 (Stagnation) nutzen wir marketHealth direkt als Faktor
    let demandFactor = this.state.employmentRate;
    if (this.state.isSavingActive) {
        demandFactor = Math.min(demandFactor, this.state.marketHealth);
    }

    const baseConsumption = this.state.moneyCirculation * BALANCE.ECONOMY.CONSUMPTION_PROPENSITY;
    const actualConsumption = baseConsumption * demandFactor;
    
    if (actualConsumption > 0) {
        this.state.moneyCirculation -= actualConsumption;
        this.state.moneyPlayer += actualConsumption;

        events.emit(ECON_EVENTS.INCOME_RECEIVED, { 
            amount: actualConsumption,
            intensity: demandFactor
        });
    }

    this.state.marketDemandFactor = demandFactor;
}

_stepDebtService() {
    // VOLLSTÄNDIG DEAKTIVIERT
    //
    // Alte Logik: Zinsen wurden pro Tick vom Kapital abgezogen → PROBLEMATISCH!
    // Neue Logik:
    //   - Zinsen akkumulieren nur bei Trip-Abschluss (siehe accrueInterestForTrip)
    //   - Zahlung erfolgt NUR manuell nach Grace Period (siehe processLoanPayment)
    //   - Kein automatischer Geldabzug während der Laufzeit!

    this.state.interestPerTick = 0; // Deprecated, wird nicht mehr verwendet

    // WICHTIG: Hier darf KEIN Geld abgezogen werden!
    // Die Schulden sind eine "Verbindlichkeit", kein laufender Cashflow.
}

_stepRegeneration() {
    // 1. Wenn Schleppnetz (Dredge) aktiv ist: KEINE Erholung!
    // Das Ökosystem ist beschädigt. Der Bestand erholt sich nicht mehr.
    if (this.state.tech.netType === 'dredge') {
        // Optional: Langsames Sterben des Rests durch Verschmutzung (0.1% pro Tick)
        // Das garantiert, dass der Graph unten bleibt und das Wasser dreckig.
        this.state.fishStock *= 0.999;
        
        // WARNUNG auslösen, wenn es kritisch wird
        const ratio = this.state.fishStock / BALANCE.ECOLOGY.MAX_FISH_STOCK;
        if (ratio < BALANCE.ECOLOGY.WARNING_THRESHOLD) {
            events.emit(ECON_EVENTS.ECOLOGICAL_WARNING, { 
                fishStock: this.state.fishStock, 
                percent: ratio * 100 
            });
        }
        return; // HIER ABBRECHEN -> Keine Regeneration!
    }

    // 2. Normale Regeneration (nur für Ruderboot/Motorboot ohne Dredge)
    const ratio = this.state.fishStock / BALANCE.ECOLOGY.MAX_FISH_STOCK;
    
    // Logistisches Wachstum
    const regeneration = BALANCE.ECOLOGY.GROWTH_RATE * this.state.fishStock * (1 - ratio);
    
    this.state.fishStock += regeneration;
    if (this.state.fishStock > BALANCE.ECOLOGY.MAX_FISH_STOCK) {
        this.state.fishStock = BALANCE.ECOLOGY.MAX_FISH_STOCK;
    }

    if (ratio < BALANCE.ECOLOGY.WARNING_THRESHOLD) {
        events.emit(ECON_EVENTS.ECOLOGICAL_WARNING, { 
            fishStock: this.state.fishStock, 
            percent: ratio * 100 
        });
    }
}

_stepIndicatorsAndEmit() {
    this.broadcastStats();
}

// --- ÖFFENTLICHE API ---

processFishingTrip(boatType) {
    const forceParams = this.state.forceNextTripParams;

    // 0. FORCE OVERRIDE CHECK
    if (forceParams && forceParams.health !== undefined) {
        this.state.marketHealth = forceParams.health;
        events.emit(ECON_EVENTS.MARKET_HEALTH_CHANGED, { health: this.state.marketHealth });
    }

    // --- FIX: Typ-Bestimmung ganz nach oben ziehen ---
    // Damit gelten die DREDGE/TRAULER-Werte sowohl für Einnahmen (Kisten) als auch für Kosten.
    let typeKey = boatType.toUpperCase();

    if (typeKey === 'MOTOR' && this.state.tech.netType === 'dredge') {
        typeKey = 'DREDGE'; // Schaltet auf High-Yield / High-Cost um (150g Umsatz)
    }
    if (typeKey === 'TRAWLER') {
        typeKey = 'TRAWLER'; // eigener High-Yield Typ
    }

    // Konfiguration laden (nutzt jetzt DREDGE falls aktiv)
    const crateConfig = BALANCE.ECONOMY.CRATES[typeKey] || BALANCE.ECONOMY.CRATES.ROW;
    const totalCratesExpected = crateConfig.TOTAL_COUNT;
    const valuePerCrate = BALANCE.ECONOMY.CRATES.VALUE_PER_CRATE;

    // Phase bestimmen
    const isStagnationMode = this.state.isSavingActive; // Kapitel 1 Logik
    const isBoomMode = this.currentPhaseId === 'BOOM';
    const isCrunchMode = this.currentPhaseId === 'CRUNCH';
    const isGrowthTrapMode = this.currentPhaseId === 'GROWTH_TRAP'; // NEU

    // Zähler erhöhen, wenn wir im Crunch sind
    if (isCrunchMode) {
        this.crunchTripCounter++;
    }

    // 1. KOSTEN BERECHNEN
    // -----------------------------------------------------
    let costTavern, costShipyard;

    // A) Sparmodus (Kapitel 1)
    if (isStagnationMode) {
        const config = this.state.savingsConfig || { tavernLevel: 'full', shipyardLevel: 'premium' };
        costTavern = (config.tavernLevel === 'basic') ? BALANCE.ECONOMY.COSTS.TAVERN.BASIC : BALANCE.ECONOMY.COSTS.TAVERN.FULL;
        costShipyard = (config.shipyardLevel === 'basic') ? BALANCE.ECONOMY.COSTS.SHIPYARD.BASIC : BALANCE.ECONOMY.COSTS.SHIPYARD.PREMIUM;
    }
    // B) Normaler Betrieb (Kapitel 2, 3, 4...)
    else {
        // Hier nutzen wir den bereits oben ermittelten typeKey
        const boatCosts = BALANCE.COSTS.BOAT_OPERATING[typeKey] || BALANCE.COSTS.BOAT_OPERATING.ROW;
        costTavern = boatCosts.TAVERN;
        costShipyard = boatCosts.SHIPYARD;
    }

    const totalExpenses = costTavern + costShipyard;


    // 2. LIQUIDITÄTSPRÜFUNG & BEZAHLUNG (Der Crunch)
    // -----------------------------------------------------
    // Wir prüfen: Hat der Spieler genug Geld?
    const moneyAvailable = this.state.moneyPlayer;
    
    // In BOOM/STAGNATION übernimmt oft der Director die visuelle Abbuchung später.
    // In CRUNCH (Kapitel 3) machen wir es hier hart und sofort.
    const actualPaid = Math.min(moneyAvailable, totalExpenses);
    const isPartialPayment = actualPaid < totalExpenses;
    
    // Geld abziehen
    // HINWEIS: In BOOM, STAGNATION und GROWTH_TRAP übernimmt der Director die visuelle Abbuchung.
    if (!isBoomMode && !isStagnationMode && !isCrunchMode && !isGrowthTrapMode) {
        this.state.moneyPlayer -= actualPaid;
    }

    // Verteilung der Zahlung (Priorität Werft für Reparatur, Rest Taverne)
    let paidToShipyard = 0;
    let paidToTavern = 0;

    if (isPartialPayment) {
        paidToShipyard = Math.min(actualPaid, costShipyard); // Kian kriegt zuerst
        paidToTavern = actualPaid - paidToShipyard;          // Mo kriegt den Rest
    } else {
        paidToShipyard = costShipyard;
        paidToTavern = costTavern;
    }


    // 3. MARKT-REAKTION (Market Health Update)
    // -----------------------------------------------------
    // Wenn nicht voll bezahlt wurde, sinkt die Marktgesundheit sofort.
    
    if (isPartialPayment) {
        // Harter Abstrafung bei Teilzahlung
        this.state.marketHealth = Math.max(0, this.state.marketHealth - 0.25);
        events.emit(ECON_EVENTS.MARKET_HEALTH_CHANGED, { health: this.state.marketHealth });
    } else {
        // Leichte Erholung bei voller Zahlung (nur wenn nicht in Stagnation-Script)
        if (!isStagnationMode && this.state.marketHealth < 1.0) {
            this.state.marketHealth = Math.min(1.0, this.state.marketHealth + 0.05);
            events.emit(ECON_EVENTS.MARKET_HEALTH_CHANGED, { health: this.state.marketHealth });
        }
    }

    // Harte Skript-Logik für Kapitel 1 (Stagnation) überschreibt obenstehendes
    if (isStagnationMode) {
        this.savingsTripCounter++;
        // Trip 1: -10%, Trip 2: -30%, Trip 3: Crash
        if (this.savingsTripCounter === 1) this.decayMarketHealth(0.1);
        else if (this.savingsTripCounter === 2) this.decayMarketHealth(0.3);
        else {
            this.state.marketHealth = 0.0;
            events.emit(ECON_EVENTS.MARKET_HEALTH_CHANGED, { health: 0.0 });
        }
    }


    // 4. EINNAHMEN BERECHNEN (Abhängig von Market Health)
    // -----------------------------------------------------
    let cratesMo = crateConfig.DISTRIBUTION.TAVERN;
    let cratesKian = crateConfig.DISTRIBUTION.SHIPYARD;

    let acceptedMo = 0;
    let acceptedKian = 0;
    let isCrash = false;

    // Wie viele Kisten werden tatsächlich gekauft? 
    // Formel: Angebot * Marktgesundheit (abgerundet)
    acceptedMo = Math.floor(cratesMo * this.state.marketHealth);
    acceptedKian = Math.floor(cratesKian * this.state.marketHealth);

    // FORCE OVERRIDE: Accepted Rate
    if (forceParams && forceParams.acceptedRate !== undefined) {
        acceptedMo = Math.floor(cratesMo * forceParams.acceptedRate);
        acceptedKian = Math.floor(cratesKian * forceParams.acceptedRate);
    }

    // Spezialfall Stagnation Skript (Kapitel 1)
    let isSavingMo = false;
    let isSavingKian = false;

    if (isStagnationMode) {
        const config = this.state.savingsConfig || {};
        isSavingMo = config.tavernLevel === 'basic';
        isSavingKian = config.shipyardLevel === 'basic';

        if (this.savingsTripCounter === 1) { acceptedMo = 3; acceptedKian = 2; } // Noch normal
        else if (this.savingsTripCounter === 2) { 
            // Cross-Effect: Wer spart, kauft beim anderen nicht
            acceptedMo = isSavingKian ? 1 : 2; 
            acceptedKian = isSavingMo ? 1 : 1; 
        } 
        else { acceptedMo = 0; acceptedKian = 0; isCrash = true; }
    }

    // CRUNCH Check (Kapitel 3)
    if (this.state.marketHealth < 0.2) isCrash = true;

    // --- FIX: CRUNCH TRIP 1 OVERRIDE (Volle Kistenanzahl erzwingen) ---
    // Trip 1 soll sich noch normal anfühlen (volle Abnahme wie in Kapitel 2),
    // auch wenn das Geld für die Bezahlung fehlt.
    if (isCrunchMode && this.crunchTripCounter === 1) {
        acceptedMo = cratesMo;   // Volle Abnahme Mo
        acceptedKian = cratesKian; // Volle Abnahme Kian
    }
    // ------------------------------------------------------------------

    // Finanzielle Auswertung
    const revenueMo = acceptedMo * valuePerCrate;
    const revenueKian = acceptedKian * valuePerCrate;
    const revenue = revenueMo + revenueKian;

    const potentialRevenue = totalCratesExpected * valuePerCrate;
    const unsoldCrates = totalCratesExpected - (acceptedMo + acceptedKian);


    // 5. FISCHBESTAND REDUZIEREN
    // -----------------------------------------------------
    let catchAmount = 15; 
    if (boatType === 'motor') catchAmount = 25; 
    if (boatType === 'trawler') catchAmount = 50;

    // KAPITEL 4 MECHANIK: Aggressive Zerstörung durch Schleppnetz
    if (this.state.tech.netType === 'dredge') {
        // Kollateralschaden: Zerstört 18% des verbleibenden Bestands pro Fahrt!
        // Nach ca. 4 Fahrten sind wir so bei ~50% Bestand (Kapitel-Ziel).
        const environmentalDamage = this.state.fishStock * 0.18;
        this.state.fishStock -= environmentalDamage;
        
        // Der Fang ist hoch (Effizienz), aber der Schaden ist riesig
        catchAmount = 60; 
    }

    // Normalen Fang abziehen
    catchAmount = Math.min(catchAmount, this.state.fishStock);
    this.state.fishStock -= catchAmount;

    // Safety: Nicht unter 0 fallen
    if (this.state.fishStock < 0) this.state.fishStock = 0;


    // 6. EINNAHMEN GUTSCHREIBEN
    // -----------------------------------------------------
    // In BOOM/STAGNATION/GROWTH_TRAP macht das der Director visuell.
    if (!isBoomMode && !isStagnationMode && !isCrunchMode && !isGrowthTrapMode) {
        this.state.moneyPlayer += revenue;
    }

    // Netto für Statistiken
    const netGain = revenue - actualPaid;


    // 7. DATENPAKET SCHNÜREN
    // -----------------------------------------------------
    this.broadcastStats();

    // Event feuern (für UI / Director)
    const tripData = {
        boatType,
        catchAmount: Math.floor(catchAmount),
        revenue: revenue,
        expenses: totalExpenses,
        profit: netGain,

        // CRUNCH METRICS
        isPartialPayment: isPartialPayment,
        actualPaid: actualPaid,
        potentialRevenue: potentialRevenue,
        unsoldCrates: unsoldCrates,
        marketHealth: this.state.marketHealth,

        financials: {
            mo: {
                revenue: revenueMo,
                cost: costTavern,
                paid: paidToTavern,
                isSaving: isSavingMo
            },
            kian: {
                revenue: revenueKian,
                cost: costShipyard,
                paid: paidToShipyard,
                isSaving: isSavingKian
            }
        },

        crates: {
            total: totalCratesExpected,
            mo: { sent: cratesMo, accepted: acceptedMo },
            kian: { sent: cratesKian, accepted: acceptedKian }
        },

        isCrash: isCrash,
        isStagnationSequence: isStagnationMode,
        isCrunchSequence: isCrunchMode,
        isGrowthTrapSequence: isGrowthTrapMode,
        tripNumber: this.savingsTripCounter
    };

    events.emit(ECON_EVENTS.TRIP_COMPLETED, tripData);

    // Floating Text nur senden, wenn KEINE Sequenz läuft (also nicht in Growth Trap etc.)
    if (!isStagnationMode && !isBoomMode && !isCrunchMode && !isGrowthTrapMode) {
        events.emit(EVENTS.MONEY_CHANGED, {
            amount: netGain,
            reason: 'trip',
            isPartialPayment: isPartialPayment,
            expenses: totalExpenses
        });
    }

    // Reset forced params so they only apply once
    this.state.forceNextTripParams = null;

    return tripData;
}

takeLoan(amount, interestRate = null) {
    this.state.moneyPlayer += amount;
    this.state.loanPrincipal += amount;
    this.state.tripsSinceLoan = 0; // Reset Trip-Counter
    this.state.accruedInterest = 0; // Reset Zinsen
    this.state.principalDue = 0; // Noch nichts fällig

    // NEU: Zinssatz überschreibbar (für flexibles Recall)
    if (interestRate !== null) {
        this.state.loanInterestRate = interestRate;
    } else {
        this.state.loanInterestRate = BALANCE.BANK.INTEREST_RATE;
    }

    // Reset Market Health bei Geldspritze (Stimulus)
    if (amount >= 200) {
        this.state.marketHealth = 1.0;
        this.state.isSavingActive = false;
        this.state.currentSavingsAmount = 0;
        events.emit(ECON_EVENTS.MARKET_HEALTH_CHANGED, { health: 1.0 });
    }

    this.broadcastStats();

    // Info-Event für UI (zeigt Kreditstatus)
    events.emit(ECON_EVENTS.LOAN_STATUS_CHANGED, {
        principal: this.state.loanPrincipal,
        interest: this.state.accruedInterest,
        tripsSinceLoan: this.state.tripsSinceLoan,
        dueInTrips: this.state.paymentDueInTrips
    });
}

// NEU: Prüft, ob Sterling den Kredit sofort zurückfordern soll (flexible Konditionen)
// KAPITEL 2 (BOOM): Sterling fordert zurück, sobald der Spieler >= 270g hat
checkLoanRecall() {
    // Nur wenn ein Kredit läuft und noch nicht fällig ist
    if (this.state.loanPrincipal <= 0 || this.state.principalDue > 0) return false;

    // WICHTIG: Prüfung erfolgt SOFORT bei >= RECALL_THRESHOLD (270g)
    // Die paymentDueInTrips (Runden-Counter) wird IGNORIERT!
    if (this.state.moneyPlayer >= BALANCE.BANK.RECALL_THRESHOLD) {
        // Berechne Zinsen (falls noch nicht geschehen)
        if (this.state.accruedInterest === 0) {
            this.state.accruedInterest = this.state.loanPrincipal * this.state.loanInterestRate;
        }

        const totalDue = this.state.loanPrincipal + this.state.accruedInterest;

        // Markiere Kredit als sofort fällig
        this.state.principalDue = totalDue;

        // Event: Sterling fordert Rückzahlung (Director handhabt die Szene)
        events.emit(ECON_EVENTS.LOAN_RECALL_TRIGGERED, {
            totalDue: totalDue,
            principal: this.state.loanPrincipal,
            interest: this.state.accruedInterest,
            playerCash: this.state.moneyPlayer,
            threshold: BALANCE.BANK.RECALL_THRESHOLD
        });

        return true;
    }
    return false;
}

// Neue Methode: Zinsberechnung pro Trip
accrueInterestForTrip() {
    if (this.state.loanPrincipal <= 0) return;

    this.state.tripsSinceLoan += 1;

    // NEU (BOOM-Konzept): Zinsen werden sofort beim Kredit berechnet (Flat 10%)
    // Wir akkumulieren sie nicht pro Trip, sondern setzen sie einmalig.
    if (this.state.accruedInterest === 0) {
        this.state.accruedInterest = this.state.loanPrincipal * this.state.loanInterestRate;
    }

    // WICHTIG: Zinsen werden NICHT vom Kapital abgezogen!
    // Sie sammeln sich nur als "Schuld" an.

    // UI Update für Fortschrittsanzeige
    events.emit(ECON_EVENTS.LOAN_STATUS_CHANGED, {
        principal: this.state.loanPrincipal,
        interest: this.state.accruedInterest,
        tripsSinceLoan: this.state.tripsSinceLoan,
        dueInTrips: this.state.paymentDueInTrips - this.state.tripsSinceLoan
    });

    // NEU: Prüfe flexible Rückzahlung (Sterling fordert bei Liquidität)
    // Dies ersetzt die feste Grace Period
    this.checkLoanRecall();
}

// Neue Methode: Zahlung durchführen (wird nur manuell getriggert, nie automatisch!)
processLoanPayment() {
    const totalDue = this.state.loanPrincipal + this.state.accruedInterest;

    if (this.state.moneyPlayer >= totalDue) {
        // Erfolgreiche Zahlung
        this.state.moneyPlayer -= totalDue;

        // Wichtig: Alle Kreditvariablen zurücksetzen
        const paidPrincipal = this.state.loanPrincipal;
        const paidInterest = this.state.accruedInterest;

        this.state.loanPrincipal = 0;
        this.state.accruedInterest = 0;
        this.state.tripsSinceLoan = 0;
        this.state.principalDue = 0;

        this.broadcastStats();

        events.emit(ECON_EVENTS.LOAN_REPAID, {
            totalPaid: totalDue,
            principal: paidPrincipal,
            interest: paidInterest
        });

        return { success: true, paid: totalDue, principal: paidPrincipal, interest: paidInterest };
    } else {
        // Zahlungsunfähigkeit
        const shortage = totalDue - this.state.moneyPlayer;
        return {
            success: false,
            due: totalDue,
            available: this.state.moneyPlayer,
            shortage: shortage
        };
    }
}

getShipyardOptions() {
    const options = [];

    // Boot-Käufe (wie bisher)
    if (this.currentPhaseId === 'STAGNATION' || this.currentPhaseId === 'BOOM') {
        if (this.state.boatsMotor === 0) {
            const motorCost = BALANCE.COSTS.BOATS.MOTOR;
            const canAfford = this.state.moneyPlayer >= motorCost;
            options.push({
                id: 'buy_motor',
                label: `Motorboot kaufen`,
                cost: motorCost,
                available: canAfford,
                description: 'Schneller & höhere Kapazität'
            });
        }
    }

    // NEU: Schleppnetz-/Trawler-Upgrade in GROWTH_TRAP (freigeschaltet) und EFFICIENCY
    const director = window.director;
    const isGrowthTrapUnlocked = this.currentPhaseId === 'GROWTH_TRAP' && director && director.flags.dredgeUpgradeUnlocked;
    const isEfficiency = this.currentPhaseId === 'EFFICIENCY';
    const trawlerAlreadyBought = director?.flags?.trawlerPurchased;

    if (isEfficiency) {
        if (!trawlerAlreadyBought) {
            const trawlerCost = BALANCE.COSTS.BOATS.TRAWLER;
            const canAfford = this.state.moneyPlayer >= trawlerCost;
            const shortfall = Math.max(0, trawlerCost - this.state.moneyPlayer);
            options.push({
                id: 'buy_trawler',
                label: 'Trawler kaufen',
                cost: trawlerCost,
                // Button immer anklickbar, Director bietet Kredit bei Bedarf an
                available: true,
                description: canAfford
                    ? 'Großes Schleppnetzboot (zerstört die Umwelt!)'
                    : `Großes Schleppnetzboot (dir fehlen ${shortfall}g)`
            });
        }
        // In Kapitel 5 keine weiteren Angebote
        return options;
    }

    if (isGrowthTrapUnlocked && !trawlerAlreadyBought) {
        if (this.state.tech.netType !== 'dredge') {
            const dredgeCost = BALANCE.COSTS.UPGRADES.NET_DREDGE;
            const canAfford = this.state.moneyPlayer >= dredgeCost;
            options.push({
                id: 'buy_dredge_upgrade',
                label: 'Schleppnetz-Upgrade',
                cost: dredgeCost,
                available: canAfford,
                description: 'Doppelte Fangmenge (zerstört Meeresboden!)'
            });
        }
    }

    return options;
}

buyBoat(type) {
    let cost = 0;
    if (type === 'row') cost = BALANCE.COSTS.BOATS.ROW;
    if (type === 'motor') cost = BALANCE.COSTS.BOATS.MOTOR;
    if (type === 'trawler') cost = BALANCE.COSTS.BOATS.TRAWLER;

    if (this.state.moneyPlayer >= cost) {
        this.state.moneyPlayer -= cost;

        // NEU: Beim Motorboot-Kauf das Ruderboot verschrotten (Kians Inzahlungnahme)
        if (type === 'motor' && this.state.boatsRow > 0) {
            this.state.boatsRow--;  // Ruderboot entfernen
            this.state.boatsMotor++; // Motorboot hinzufügen
        } else {
            // Normale Logik für andere Boote
            if (type === 'row') this.state.boatsRow++;
            if (type === 'motor') this.state.boatsMotor++;
            if (type === 'trawler') this.state.boatsTrawl++;
        }

        events.emit(ECON_EVENTS.BOAT_BOUGHT, { type: type });
        this.broadcastStats();
        return true;
    }

    events.emit(ECON_EVENTS.PURCHASE_FAILED, { type: type, cost: cost });
    return false;
}

buyUpgrade(category, id) {
    let cost = 0;
    let name = '';
    
    if (category === 'NETS' && id === 'dredge') { 
        cost = BALANCE.COSTS.UPGRADES.NET_DREDGE; 
        name = 'Schleppnetz'; 
    }

    if (this.state.moneyPlayer >= cost) {
        this.state.moneyPlayer -= cost;
        
        if (category === 'NETS') this.state.tech.netType = id;
        if (category === 'ENGINES') this.state.tech.engineType = id;

        events.emit(ECON_EVENTS.UPGRADE_BOUGHT, { category, id, name });
        this.broadcastStats();
        return true;
    }

    return false;
}

broadcastStats() {
    events.emit(EVENTS.STATS_UPDATED, { ...this.state });
}
}
export const economy = new Economy();
