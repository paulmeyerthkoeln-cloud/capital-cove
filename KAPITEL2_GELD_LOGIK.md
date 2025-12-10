# Kapitel 2: Optimierte Geld- und Kreditlogik

## Übersicht

Diese Datei dokumentiert die optimierte Geld- und Kreditlogik für Kapitel 2 (BOOM-Phase).

## Hauptproblem (behoben)

**Vorher:** Nach Kreditaufnahme "ratterte" das Kapital kontinuierlich runter, obwohl es erst bei der Rückzahlung nach 10 Trips reduziert werden sollte.

**Nachher:** Zinsen akkumulieren im Hintergrund, werden aber NICHT automatisch vom Kapital abgezogen. Die Zahlung erfolgt nur zu einem definierten Zeitpunkt.

---

## Die neue Logik im Detail

### 1. Kreditaufnahme (takeLoan)

**Zeitpunkt:** Wenn der Spieler den Kredit von Sterling annimmt

**Was passiert:**
```javascript
economy.takeLoan(300)
```

- ✅ **Kapital erhöht sich sofort**: `moneyPlayer += 300`
- ✅ **Kreditbetrag gespeichert**: `loanPrincipal = 300`
- ✅ **Trip-Counter reset**: `tripsSinceLoan = 0`
- ✅ **Zinsen reset**: `accruedInterest = 0`
- ✅ **Market Health auf 1.0**: Wirtschaft erholt sich (Stimulus-Effekt)

**Datei:** [src/logic/Economy.js:395-419](src/logic/Economy.js#L395-L419)

---

### 2. Trip-Abschluss (processFishingTrip)

**Zeitpunkt:** Jedes Mal, wenn das Boot eine Fahrt abschließt

**Was passiert:**

#### A. Normale Einnahmen/Ausgaben
```javascript
// Einnahmen von Mo und Kian (abhängig von marketHealth)
revenue = acceptedCrates * 10g
// Ausgaben für Taverne + Werft
expenses = tavernCost + shipyardCost
// Netto wird sofort verrechnet
moneyPlayer += (revenue - expenses)
```

#### B. Zinsen akkumulieren (aber NICHT abziehen!)
```javascript
economy.accrueInterestForTrip()
```

- ✅ **Trip-Zähler erhöhen**: `tripsSinceLoan += 1`
- ✅ **Zinsen berechnen**: `accruedInterest += (loanPrincipal * 0.008)`
  - 8% Jahreszins / 10 Trips = 0.8% pro Trip
  - Bei 300g Kredit → ca. 2.4g Zinsen pro Trip
- ❌ **KEIN Geldabzug!** Die Zinsen sind nur eine "Verbindlichkeit"
- ✅ **UI Update**: Event `LOAN_STATUS_CHANGED` wird gefeuert
- ✅ **Prüfung**: Wenn 10 Trips erreicht → Event `GRACE_PERIOD_ENDED`

**Datei:** [src/logic/Economy.js:421-453](src/logic/Economy.js#L421-L453)

---

### 3. Grace Period Ende

**Zeitpunkt:** Nach 10 profitablen Trips

**Was passiert:**
```javascript
if (tripsSinceLoan >= 10) {
    emit GRACE_PERIOD_ENDED
}
```

- ✅ **Director wird benachrichtigt**: Szene `D3_PAYMENT_SHOCK` startet
- ✅ **Spieler sieht die Rechnung**: 300g Kredit + ~24g Zinsen = 324g fällig
- ❌ **KEINE automatische Abbuchung!**

**Datei:** [src/core/Director.js:1176-1178](src/core/Director.js#L1176-L1178)

---

### 4. Rückzahlung (processLoanPayment)

**Zeitpunkt:** Wird manuell getriggert (z.B. durch Dialog-Auswahl oder Button)

**Was passiert:**
```javascript
const result = economy.processLoanPayment()
```

#### Fall A: Spieler hat genug Geld
```javascript
if (moneyPlayer >= totalDue) {
    moneyPlayer -= totalDue
    loanPrincipal = 0
    accruedInterest = 0
    emit LOAN_REPAID
    return { success: true }
}
```

#### Fall B: Spieler ist zahlungsunfähig
```javascript
else {
    return {
        success: false,
        due: 324,
        available: 200,
        shortage: 124
    }
}
```

**Datei:** [src/logic/Economy.js:455-491](src/logic/Economy.js#L455-L491)

---

## UI-Anzeige

### Schulden-Anzeige (🏦 Icon)

**Was wird angezeigt:**
```
Zahl: [Kredit + Zinsen] (z.B. "324")
Farbe: Rot (#e74c3c)
Tooltip: "Kredit: 300g | Zinsen: 24g | Fällig in 5 Fahrten"
```

**Nach Zahlung fällig:**
```
Tooltip: "Kredit: 300g | Zinsen: 24g | ZAHLUNG FÄLLIG!"
```

**Datei:** [src/ui/UIManager.js:586-612](src/ui/UIManager.js#L586-L612)

---

## Vermiedene Probleme

### ❌ Problem 1: Kontinuierlicher Kapitalabbau
**Vorher:** `_stepDebtService()` hat jede Tick Zinsen abgezogen
**Jetzt:** Funktion ist vollständig deaktiviert, Kommentar hinzugefügt

**Datei:** [src/logic/Economy.js:217-230](src/logic/Economy.js#L217-L230)

### ❌ Problem 2: Unklar, wann Zahlung fällig ist
**Vorher:** `interestPerTick` war verwirrend
**Jetzt:** Klare Trip-basierte Logik mit UI-Countdown

### ❌ Problem 3: Zinsen waren unsichtbar
**Vorher:** Nur Kredit wurde angezeigt
**Jetzt:** Gesamtschuld + detaillierter Tooltip

---

## Event-Flow (Kapitel 2)

```
1. Spieler nimmt Kredit
   → takeLoan(300)
   → LOAN_STATUS_CHANGED

2. Trip 1-9: Normale Trips
   → processFishingTrip()
   → accrueInterestForTrip()
   → LOAN_STATUS_CHANGED (jedes Mal)

3. Trip 10: Grace Period endet
   → accrueInterestForTrip()
   → GRACE_PERIOD_ENDED
   → Director startet Szene D3_PAYMENT_SHOCK

4. Spieler zahlt zurück (manuell)
   → processLoanPayment()
   → LOAN_REPAID (bei Erfolg)
   → Oder: Szene für Zahlungsunfähigkeit
```

---

## Konfiguration (Balance.js)

```javascript
BALANCE.ECONOMY = {
    // Kredit-Parameter
    loanInterestRate: 0.08,      // 8% Jahreszins
    paymentDueInTrips: 10,       // Zahlung nach 10 Trips

    // Trip-Einnahmen
    CRATES: {
        VALUE_PER_CRATE: 10,     // 1 Kiste = 10 Gold
        TOTAL_COUNT: 5,          // 5 Kisten pro Trip
        DISTRIBUTION: {
            TAVERN: 3,           // Mo bekommt 3
            SHIPYARD: 2          // Kian bekommt 2
        }
    },

    // Trip-Ausgaben
    COSTS: {
        TAVERN: { FULL: 20, BASIC: 5 },
        SHIPYARD: { PREMIUM: 30, BASIC: 10 }
    }
}
```

**Datei:** [src/config/Balance.js](src/config/Balance.js)

---

## Spielablauf in Kapitel 2

### Phase 1: Kreditaufnahme
- Spieler hat ~100g
- Motorboot kostet 200g → zu teuer
- Sterling bietet 300g Kredit an (8% Zinsen)
- Spieler nimmt Kredit → Kapital: 400g

### Phase 2: Motorboot-Kauf
- Spieler kauft Motorboot für 200g
- Verbleibendes Kapital: 200g

### Phase 3: Profitable Trips (1-10)
**Pro Trip (Beispiel):**
- Einnahmen: 50g (5 Kisten à 10g, bei 100% Market Health)
- Ausgaben: 50g (Taverne 20g + Werft 30g)
- **Netto: ±0g bis +10g** (je nach RNG)
- **Zinsen akkumuliert: +2.4g** (unsichtbar, nur in Schuldenanzeige)

**Nach 10 Trips:**
- Kapital: ~200-300g (je nach Glück)
- Schulden: 324g (300g Kredit + 24g Zinsen)
- **Problem:** Spieler kann evtl. nicht zahlen!

### Phase 4: Zahlung oder Krise
**Fall A: Zahlung möglich**
- Spieler zahlt 324g
- Verbleibendes Kapital: gering
- Weiterspiel mit Motorboot

**Fall B: Zahlungsunfähigkeit**
- Spieler hat nur 250g
- Fehlbetrag: 74g
- → Übergang zu Kapitel 3 (CRUNCH)

---

## Optimierungen für Spielgefühl

### 1. Transparenz
- ✅ Schulden-Tooltip zeigt alle Details
- ✅ Countdown bis zur Zahlung sichtbar
- ✅ Keine versteckten Abzüge

### 2. Kontrolle
- ✅ Zahlung erfolgt nur manuell (nicht automatisch)
- ✅ Spieler sieht die Rechnung vorher
- ✅ Kann Strategie anpassen

### 3. Spannung
- ✅ Zinsen laufen im Hintergrund
- ✅ Druck steigt mit jedem Trip
- ✅ Deadline ist klar (10 Trips)

### 4. Einfachheit
- ✅ Keine komplexe Zinsrechnung für Spieler
- ✅ Feste Laufzeit (nicht zeitbasiert)
- ✅ Klare Zahlen (300g → 324g)

---

## Testing-Szenarien

### Szenario 1: Idealer Verlauf
```
Start: 100g
+ Kredit: 300g → 400g
- Motorboot: 200g → 200g
10x Trips: +50g Umsatz, -50g Kosten → 200g
Zahlung: -324g → -124g (FAIL)
```

### Szenario 2: Mit Glück
```
Start: 100g
+ Kredit: 300g → 400g
- Motorboot: 200g → 200g
10x Trips: +60g Umsatz, -50g Kosten, +10g Gewinn → 300g
Zahlung: -324g → -24g (FAIL)
```

### Szenario 3: Viel Glück + Sparsamkeit
```
Start: 100g
+ Kredit: 300g → 400g
- Motorboot: 200g → 200g
10x Trips: +50g, -40g (Sparmodus), +10g → 300g
5x Extra-Trips: +50g → 350g
Zahlung: -324g → 26g (SUCCESS!)
```

---

## Zusammenfassung

Die neue Geld- und Kreditlogik ist:
1. **Einfach** - Kein Tick-basierter Zinsabbau
2. **Transparent** - Alle Zahlen sind sichtbar
3. **Fair** - Zahlung erfolgt zu klarem Zeitpunkt
4. **Spannend** - Druck durch Deadline, aber kontrollierbar

**Ergebnis:** Das Spielgeschehen passt optimal zur Kreditlogik. Der Spieler erlebt den Wachstumszwang organisch, ohne durch versteckte Mechaniken frustriert zu werden.
