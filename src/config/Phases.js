export const PHASES = {
    TUTORIAL: {
        id: 'TUTORIAL',
        title: 'Kapitel 0: Der perfekte Kreis',
        objectives: [
            { id: 'complete_trips', text: 'Absolviere 3 Fahrten', target: 3, current: 0, done: false }
        ]
    },
    STAGNATION: {
        id: 'STAGNATION',
        title: 'Kapitel 1: Der Stillstand',
        objectives: [
            { id: 'check_price', text: 'Prüfe den Preis für das Motorboot (Werft)', done: false },
            { id: 'open_savings', text: 'Nutze das Sparbuch im Kontor (HQ)', done: false },
            // NEU: Ziel für die Zeit nach dem Sparbuch, damit das Panel nicht leer ist
            { id: 'observe_market', text: 'Beobachte die Marktentwicklung', done: false }
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
        title: 'Kapitel 7: Das Ende der Inselwirtschaft',
        objectives: [
            { id: 'epilog', text: 'Sieh der Realität ins Auge', done: false }
        ]
    }
};
