const VALUE_PER_CRATE = 10;
const MOTOR_REVENUE_TARGET = 90;
const DREDGE_REVENUE_TARGET = 150;
const TRAWLER_REVENUE_TARGET = 200;
const MOTOR_CRATE_COUNT = MOTOR_REVENUE_TARGET / VALUE_PER_CRATE;
const DREDGE_CRATE_COUNT = DREDGE_REVENUE_TARGET / VALUE_PER_CRATE;
const TRAWLER_CRATE_COUNT = TRAWLER_REVENUE_TARGET / VALUE_PER_CRATE;

const MOTOR_SHIPYARD_COST = 35;
const MOTOR_TAVERN_COST = 25;
const MOTOR_OPERATION_COST = MOTOR_SHIPYARD_COST + MOTOR_TAVERN_COST;

const DREDGE_SHIPYARD_COST = 50;
const DREDGE_TAVERN_COST = 30;
const DREDGE_OPERATION_COST = DREDGE_SHIPYARD_COST + DREDGE_TAVERN_COST;

const TRAWLER_SHIPYARD_COST = 60;
const TRAWLER_TAVERN_COST = 40;
const TRAWLER_OPERATION_COST = TRAWLER_SHIPYARD_COST + TRAWLER_TAVERN_COST;

export const BALANCE = {
    ECOLOGY: {
        MAX_FISH_STOCK: 10000,
        GROWTH_RATE: 0.125,
        WARNING_THRESHOLD: 0.4
    },
    ECONOMY: {
        START_MONEY: 100, // Startkapital
        
        // BASIS-UMSATZ
        // 5 Kisten * 10 Gold = 50 Gold Umsatz im Normalfall
        REVENUE_PER_TRIP: 50, 

        // NEU: Visuelle Konfiguration für die "Kisten"-Metapher
        // Dies steuert, wie viele Projektile zu welchem Gebäude fliegen
        CRATES: {
            VALUE_PER_CRATE: VALUE_PER_CRATE, // 1 Kiste = 10 Gold
            ROW: {
                TOTAL_COUNT: 5,
                DISTRIBUTION: {
                    TAVERN: 3,
                    SHIPYARD: 2
                }
            },
            MOTOR: {
                TOTAL_COUNT: MOTOR_CRATE_COUNT,      // 90g Umsatz (Skript)
                DISTRIBUTION: {
                    TAVERN: 5,       // 50g
                    SHIPYARD: 4      // 40g
                }
            },
            DREDGE: {
                TOTAL_COUNT: DREDGE_CRATE_COUNT,     // 150g Umsatz (Kapitel 4 Ziel)
                DISTRIBUTION: {
                    TAVERN: 8,       // 80g
                    SHIPYARD: 7      // 70g
                }
            },
            TRAWLER: {
                TOTAL_COUNT: TRAWLER_CRATE_COUNT,     // 200g Umsatz (Kapitel 5 Ziel)
                DISTRIBUTION: {
                    TAVERN: 10,      // 100g
                    SHIPYARD: 10     // 100g
                }
            }
        },
        TRIP_TARGETS: {
            MOTOR: { revenue: MOTOR_REVENUE_TARGET, cost: MOTOR_OPERATION_COST },
            DREDGE: { revenue: DREDGE_REVENUE_TARGET, cost: DREDGE_OPERATION_COST },
            TRAWLER: { revenue: TRAWLER_REVENUE_TARGET, cost: TRAWLER_OPERATION_COST }
        },

        // KOSTEN (Ausgaben) – korrespondieren direkt mit den Billboards
        COSTS: {
            SHIPYARD: {
                PREMIUM: 30, // Billboard: "GENERAL-CHECK"
                BASIC: 10    // Billboard: "FLICKWERK"
            },
            TAVERN: {
                FULL: 20,    // Billboard: "CREW-FESTMAHL"
                BASIC: 5     // Billboard: "NOT-RATION"
            }
        },

        // MARKT-DYNAMIK
        // Wie stark die Marktkraft pro Trip sinkt, wenn gespart wird.
        SAVINGS_DECAY_PER_TRIP: 0.25, 

        FISH_PRICE: 1.0, 
        WAGE_PER_BOAT: 100,
        FIXED_COST: 60,
        CONSUMPTION_PROPENSITY: 0.25
    },
    COSTS: {
        BOATS: {
            ROW: 0,
            MOTOR: 200, // KORRIGIERT: Motorboot kostet exakt 200g (wie im Konzept)
            TRAWLER: 500
        },
        BOAT_OPERATING: {
            // NEU: Betriebskosten pro Trip nach Bootstyp
            ROW: {
                SHIPYARD: 10,  // Basis-Reparatur (günstig)
                TAVERN: 10     // Basis-Verpflegung (günstig, Gesamt: 20g)
            },
            MOTOR: {
                SHIPYARD: MOTOR_SHIPYARD_COST,  // Wartung + Treibstoff (TEUER!)
                TAVERN: MOTOR_TAVERN_COST,     // Verpflegung für größere Crew (GESAMT: 60g pro Fahrt!)
                TOTAL: MOTOR_OPERATION_COST,
                // Total: 60g
            },
            DREDGE: {
                SHIPYARD: DREDGE_SHIPYARD_COST,  // Höherer Verschleiß durch Winde
                TAVERN: DREDGE_TAVERN_COST,    // Crew bleibt gleich
                TOTAL: DREDGE_OPERATION_COST,
                // Total: 80g
            },
            TRAWLER: {
                SHIPYARD: TRAWLER_SHIPYARD_COST,  // Schwerer Verschleiß
                TAVERN: TRAWLER_TAVERN_COST,     // Große Crew
                TOTAL: TRAWLER_OPERATION_COST,
                // Total: 100g
            }
        },
        UPGRADES: {
            NET_SUSTAINABLE: 500,
            NET_DREDGE: 350,
            ENGINE_STEAM: 1500
        }
    },
    TECH: {
        NETS: {
            STANDARD: { catchMod: 1.0, damageMod: 1.0 },
            SUSTAINABLE: { catchMod: 0.7, damageMod: 0.1 },
            DREDGE: { catchMod: 2.0, damageMod: 8.0 }  // WICHTIG: 2x Fang, 8x Schaden!
        },
        ENGINES: {
            SAIL: { speedMod: 1.0 },
            STEAM: { speedMod: 1.5 }
        }
    },
    BANK: {
        INTEREST_RATE: 0.10, // 10% Zinsen (wie im Konzept: 200g → 220g)
        LOAN_SMALL: 200,     // Erster Kredit: 200g
        LOAN_LARGE: 500,     // Umschuldung: 500g
        LOAN_REFINANCE: 500, // Kapitel 4 Umschuldung
        // NEU: Flexible Rückzahlung basierend auf Liquidität
        RECALL_THRESHOLD: 270 // Sterling fordert zurück, wenn Spieler > 270g hat
    }
};
