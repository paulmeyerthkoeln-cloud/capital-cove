/*** START OF FILE src/config/Scenes.js ***/

export const SCENE_DATA = {
    // =========================================================================
    // KAPITEL 0: DER PERFEKTE KREIS (TUTORIAL)
    // Ziel: Verständnis, dass Geld zirkuliert. Ausgaben sind Einkommen anderer.
    // =========================================================================

    'D0_INTRO': {
        type: 'narrative',
        title: 'Kapitel 0: Der Anfang',
        text: 'Dein Boot liegt bereit. Die See ist ruhig. Klicke auf "Starten", um deine erste Fahrt zu beginnen und den Fang einzuholen.',
        speakerLeft: "Kapt'n",
        speakerRight: null,
        focus: 'left',
        cameraTarget: 'BOAT', 
        choices: [
            { id: 'start_game', text: 'Leinen los!', action: 'close' }
        ]
    },

    // --- TAKT 1: EINNAHMEN (GESPLITTET) ---
    'D0_MARKET_ARRIVED': {
        type: 'narrative',
        title: 'Volle Netze',
        text: 'Das Boot liegt tief im Wasser. 50 Prachtexemplare zappeln im Laderaum. Die Dorfbewohner werden bereits aufmerksam.',
        speakerLeft: "Kapt'n",
        speakerRight: null,
        focus: 'left',
        cameraTarget: 'HQ', 
        choices: [
            { 
                id: 'offer_market', 
                text: 'Fang auf dem Markt anbieten', 
                action: 'trigger_scene', 
                param: 'D0_INCOME_MO' 
            }
        ]
    },

    'D0_INCOME_MO': {
        type: 'narrative',
        title: 'Frischer Fang',
        text: 'Mo: "Ahoi! Die Küche in der Taverne ist leer. Ich nehme dir den Großteil des Fangs für 30 Gold ab. Meine Gäste haben Hunger!"',
        speakerLeft: 'Mo',
        speakerRight: null,
        focus: 'left',
        cameraTarget: 'TAVERN', 
        choices: [
            { 
                id: 'income_mo', 
                text: 'An Mo verkaufen', 
                gain: 30, 
                action: 'trigger_coin_leg', 
                param: 'INCOME_MO_PHASE' 
            }
        ]
    },

    'D0_INCOME_KIAN': {
        type: 'narrative',
        title: 'Privatbedarf',
        text: 'Kian: "Nicht so schnell. Ich brauche auch Fisch für mich und meine Familie. Ich nehme den Rest für 20 Gold."',
        speakerLeft: 'Mo',
        speakerRight: 'Kian',
        focus: 'right',
        cameraTarget: 'SHIPYARD', 
        choices: [
            { 
                id: 'income_kian', 
                text: 'An Kian verkaufen', 
                gain: 20, 
                action: 'trigger_coin_leg', 
                param: 'INCOME_KIAN_PHASE' 
            }
        ]
    },

    // --- TAKT 2: REPARATUR ---
    'D0_REPAIR_REQUEST': {
        type: 'narrative',
        title: 'Schaden am Rumpf',
        text: 'Bootsmann: "Kapitän, wir hatten Grundberührung beim Anlegen. Eine Planke ist locker. So können wir nicht wieder raus."',
        speakerLeft: 'Bootsmann',
        speakerRight: null,
        focus: 'left',
        cameraTarget: 'HQ', 
        choices: [
            { id: 'ask_kian', text: 'Kian rufen', action: 'trigger_scene', param: 'D0_REPAIR_OFFER' }
        ]
    },

    'D0_REPAIR_OFFER': {
        type: 'narrative',
        title: 'Die Werft',
        text: 'Kian: "Das sieht übel aus. Für 30 Gold mache ich das sofort dicht. Ich brauche das Geld, um neues Holz zu bestellen."',
        speakerLeft: 'Bootsmann',
        speakerRight: 'Kian',
        focus: 'right',
        cameraTarget: 'SHIPYARD',
        choices: [
            { 
                id: 'pay_repair', 
                text: 'Reparatur bezahlen', 
                cost: 30, 
                action: 'trigger_coin_leg', 
                param: 'REPAIR_PHASE' 
            }
        ]
    },

    // --- TAKT 3: VERPFLEGUNG ---
    'D0_FOOD_REQUEST': {
        type: 'narrative',
        title: 'Knurrende Mägen',
        text: 'Bootsmann: "Das Boot ist dicht, aber die Mannschaft verhungert. Wir brauchen Kraft für die nächste Fahrt."',
        speakerLeft: 'Bootsmann',
        speakerRight: null,
        focus: 'left',
        cameraTarget: 'HQ',
        choices: [
            { id: 'go_tavern', text: 'Zur Taverne', action: 'trigger_scene', param: 'D0_FOOD_OFFER' }
        ]
    },

    'D0_FOOD_OFFER': {
        type: 'narrative',
        title: 'Die Taverne',
        text: 'Mo: "Der Eintopf dampft schon! Für 20 Gold mache ich alle satt. Das Geld brauche ich dringend für neue Gewürze vom Festland."',
        speakerLeft: 'Bootsmann',
        speakerRight: 'Mo',
        focus: 'right',
        cameraTarget: 'TAVERN',
        choices: [
            { 
                id: 'pay_food', 
                text: 'Mannschaft verpflegen', 
                cost: 20, 
                action: 'trigger_coin_leg', 
                param: 'FOOD_PHASE' 
            }
        ]
    },

    // --- ABSCHLUSS TUTORIAL ---
    'D0_SUMMARY': {
        type: 'narrative',
        title: 'Die Bilanz',
        text: 'Lale: "Sieh auf dein Gold. Du hast 50 eingenommen und 50 ausgegeben. Du bist wieder bei 100. Nichts gewonnen, nichts verloren. Aber alle haben gelebt."',
        speakerLeft: 'Lale',
        speakerRight: null,
        focus: 'left',
        cameraTarget: 'HQ', 
        choices: [
            { 
                id: 'show_cycle', 
                text: 'Diagramm ansehen', 
                action: 'show_cycle_visual' 
            }
        ]
    },

    'D0_READY_AGAIN': {
        type: 'narrative',
        title: 'Bereit',
        text: 'Bootsmann: "Kapitän, wir sind bereit zum Auslaufen! Lass uns beweisen, dass der Kreislauf funktioniert."',
        speakerLeft: 'Bootsmann',
        speakerRight: null,
        focus: 'left',
        cameraTarget: 'BOAT', 
        choices: [
            { id: 'release_boat', text: 'An die Arbeit', action: 'release_boat_tutorial' }
        ]
    },

    // =========================================================================
    // KAPITEL 1: DER STILLSTAND (STERLINGS ANKUNFT)
    // =========================================================================

    'D1_STERLING_ARRIVAL': {
        type: 'narrative',
        title: 'Ein Neuer auf der Insel',
        text: 'Gestatten? Sterling. Ich beobachte Ihr kleines Experiment schon eine Weile. Idyllisch... aber schrecklich ineffizient.\n\nIch werde mein Zelt hier aufschlagen. Sie brauchen dringend professionelle Beratung. Komm zu meinem Zelt, wir sprechen sofort.',
        speakerLeft: null,
        speakerRight: 'Sterling',
        focus: 'right',
        cameraTarget: 'TENT', // FIX: Explizit auf TENT setzen, da Bank noch unter der Erde ist
        choices: [
            {
                id: 'build_tent',
                text: 'Äh... willkommen?',
                action: 'build_tent_early'
            }
        ]
    },

    'D1_STERLING_DIRECTIVE': {
        type: 'narrative',
        title: 'Wachstums-Potential',
        text: 'Sehen Sie sich um. Stillstand. Sie haben 100 Gold, morgen haben Sie 100 Gold. Langweilig.\n\nSie brauchen Skalierung! Ein Motorboot. Gehen Sie sofort zur Werft und prüfen Sie das Angebot. Wir müssen wachsen!',
        speakerLeft: null,
        speakerRight: 'Sterling',
        focus: 'right',
        cameraTarget: 'TENT', // FIX: Explizit auf TENT setzen, da Bank noch unter der Erde ist
        choices: [
            {
                id: 'go_shipyard',
                text: 'Zur Werft gehen',
                action: 'activate_shipyard_quest'
            }
        ]
    },

    'D1_PURCHASE_FAIL': {
        type: 'narrative',
        title: 'Zu teuer',
        text: 'Ein Motorboot? Das ist Profi-Ausrüstung. Kostet 200 Gold. Wie ich sehe, hast du nur 100.\n\Ich vergebe keinen Kredit. Wenn du nicht genug einnimmst, musst du wohl deine Ausgaben senken.',
        speakerLeft: "Kapt'n",
        speakerRight: 'Kian',
        focus: 'right',
        cameraTarget: 'SHIPYARD',
        choices: [
            { id: 'try_saving', text: 'Wir müssen sparen', action: 'trigger_scene', param: 'D1_SAVINGS_INTRO' }
        ]
    },

    'D1_SAVINGS_INTRO': {
        type: 'narrative',
        title: 'Sparmaßnahmen',
        text: 'Sparen? Das gefällt mir nicht. Aber wir geben tatsächlich alles aus, was reinkommt. Um 200 Gold für das Boot zu sammeln, müssen wir Mo und Kian weniger zahlen. Geh ins Kontor (HQ) und leite Maßnahmen ein.',
        speakerLeft: 'Lale',
        speakerRight: null,
        focus: 'left',
        cameraTarget: 'HQ',
        choices: [
            // ANPASSUNG: Spezifische Aktion, die den Quest-Trigger im Director auslöst
            { id: 'open_hq', text: 'Zum Kontor', action: 'activate_savings_quest' }
        ]
    },

    'D1_REALIZATION': {
        type: 'narrative',
        title: 'Die Bilanz der Sparsamkeit',
        text: 'Sieh es dir an. Unsere Kunden sind unsere Nachbarn. Indem wir ihre Löhne gekürzt haben, haben wir ihre Kaufkraft vernichtet. Niemand hat mehr Geld, um unseren Fisch zu kaufen. Der Kreislauf ist zusammengebrochen.',
        speakerLeft: 'Lale',
        speakerRight: null,
        focus: 'left',
        cameraTarget: 'HQ',
        choices: [
            // Führt zur Analyse, danach kommt direkt das Kreditangebot (da Sterling schon da ist)
            { id: 'show_broken_cycle', text: 'Analyse ansehen', action: 'show_cycle_visual', param: 'BROKEN' }
        ]
    },

    // =========================================================================
    // KAPITEL 2: DER RETTER (BOOM)
    // =========================================================================

    'D2_STERLING_INVITATION': {
        type: 'narrative',
        title: 'Eine Einladung',
        text: 'Sterling: "Sie sitzen in der Falle, nicht wahr? Kein Wachstum, keine Perspektive. Aber ich habe eine Lösung."\n\nEr deutet auf sein Zelt. "Kommen Sie in meine Bank. Wir besprechen, wie ich Ihnen aus dieser Misere helfen kann."',
        speakerLeft: "Kapt'n",
        speakerRight: 'Sterling',
        focus: 'right',
        cameraTarget: null,
        choices: [
            { id: 'go_to_bank', text: 'Zum Zelt gehen', action: 'go_to_sterling_bank' }
        ]
    },

    'D2_STERLING_OFFER': {
        type: 'narrative',
        title: 'Die neue Filiale',
        text: 'Sterling klopft auf den massiven Tresen.\n\nSterling: "Willkommen in meiner neuen Filiale! Ein Zelt war mir zu... provisorisch. Wir sind hier schließlich, um ernsthafte Geschäfte zu machen."\n\nEr schiebt ein Papier herüber. "Ich biete Ihnen 200 Gold Startkapital. 10% Zinsen. Flexible Rückzahlung."',
        speakerLeft: "Kapt'n",
        speakerRight: 'Sterling',
        focus: 'right',
        cameraTarget: null, // Kein automatischer Kameraschwenk, damit die Kontrolle beim Spieler bleibt
        choices: [
            { id: 'take_loan_200', text: 'Kredit annehmen (+200g)', action: 'take_loan_and_quest', amount: 200 }
        ]
    },

    'D2_BOAT_ORDER': {
        type: 'narrative',
        title: 'Die Bestellung',
        text: 'Kian: "Ein Motorboot? Endlich! 200 Gold, und ich brauche zwei Tage Bauzeit. Damit fängst du fast doppelt so viel Fisch!"\n\nEr reibt sich die Hände. "Und weißt du was? Ich nehme dein altes Ruderboot in Zahlung. Ich verschrotte das alte Ding für dich."',
        speakerLeft: "Kapt'n",
        speakerRight: 'Kian',
        focus: 'right',
        cameraTarget: 'SHIPYARD',
        choices: [
            { id: 'buy_boat', text: 'Motorboot kaufen (-200g)', action: 'buy_motor_boat' }
        ]
    },

    'D2_ECONOMIC_RECOVERY': {
        type: 'narrative',
        title: 'Der Boom beginnt',
        text: 'Lale: "Sieh dir das an! Kian hat 200 Gold bekommen. Er stellt Leute ein! Mo bereitet sich auf volle Tische vor."\n\nSie lächelt. "Das frische Geld vom Festland bringt die Wirtschaft wieder in Gang. Expansion!"',
        speakerLeft: 'Lale',
        speakerRight: null,
        focus: 'left',
        cameraTarget: 'HQ',
        choices: [
            { id: 'continue', text: 'Lass uns arbeiten', action: 'trigger_scene', param: 'D2_STERLING_REMINDER' }
        ]
    },

    'D2_STERLING_REMINDER': {
        type: 'narrative',
        title: 'Flexible Konditionen',
        text: 'Genießen Sie die Expansion. Das Motorboot wird sich lohnen."\n\nEr lächelt geschäftsmäßig. "Übrigens: Flexible Rückzahlung bedeutet, ich fordere den Kredit zurück, sobald ich sehe, dass Sie liquide sind. Ihre Bonität wird es mir danken."',
        speakerLeft: "Kapt'n",
        speakerRight: 'Sterling',
        focus: 'right',
        cameraTarget: null,
        choices: [
            { id: 'acknowledge', text: 'Verstanden', action: 'start_boom_gameplay' }
        ]
    },

    'D2_MO_BOOM': {
        type: 'narrative',
        title: 'Volles Haus',
        text: 'Sowas habe ich lange nicht erlebt! Die Tische sind jeden Abend voll. Ich muss die Küche erweitern, um alle satt zu bekommen!',
        speakerLeft: null,
        speakerRight: 'Mo',
        focus: 'right',
        cameraTarget: null,
        choices: [
            { id: 'continue', text: 'Weiter so!', action: 'close' }
        ]
    },

    'D2_KIAN_BOOM': {
        type: 'narrative',
        title: 'Auftragslage',
        text: 'Ich komme kaum hinterher mit den Wartungen. Habe zwei neue Lehrlinge eingestellt. Endlich lohnt sich die harte Arbeit wieder!',
        speakerLeft: null,
        speakerRight: 'Kian',
        focus: 'right',
        cameraTarget: null,
        choices: [
            { id: 'continue', text: 'Ausgezeichnet', action: 'close' }
        ]
    },

    'D2_LOAN_RECALL': {
        type: 'narrative',
        title: 'Die Rückforderung',
        text: 'Sterling: "Exzellente Arbeit. Ihre Liquidität ist hervorragend. Da wir flexible Konditionen haben, fordere ich den Kredit inkl. Zinsen jetzt zurück, um Ihr Bonitäts-Rating zu verbessern."\n\nEr öffnet sein Buch. "200 Gold Kredit plus 20 Gold Zinsen. 220 Gold gesamt."',
        speakerLeft: "Kapt'n",
        speakerRight: 'Sterling',
        focus: 'right',
        cameraTarget: null, // Kein automatischer Kameraschwenk, damit der Spieler die Kontrolle behält
        choices: [
            { id: 'pay_loan', text: 'Zahlung bestätigen (-220g)', action: 'repay_loan_boom' }
        ]
    },

    'D2_AFTER_REPAYMENT': {
        type: 'narrative',
        title: 'Zahlung abgeschlossen',
        text: 'Sterling: "Perfekt. Die Zahlung ist verbucht. Das verbessert Ihr Rating erheblich."\n\nEr klappt sein Buch zu. "Weiter so. Die Wirtschaft braucht produktive Akteure wie Sie."',
        speakerLeft: "Kapt'n",
        speakerRight: 'Sterling',
        focus: 'right',
        cameraTarget: null,
        choices: [
            { id: 'continue', text: 'Zurück zur Arbeit', action: 'transition_to_crunch' }
        ]
    },

    // =========================================================================
    // KAPITEL 3: DIE ABRECHNUNG (CRUNCH)
    // Die Liquiditätsfalle nach der Kreditrückzahlung.
    // =========================================================================

    'D3_INTRO': {
        type: 'narrative',
        title: 'Katerstimmung',
        text: 'Der Kredit ist getilgt! Wir sind frei... aber sieh dir das Konto an. Nur noch 60 Gold.\n\nDas Motorboot verbraucht Unmengen an Sprit und die Crew will ihren Anteil. Das wird verdammt knapp für die nächste Fahrt.',
        speakerLeft: 'Lale',
        speakerRight: null,
        focus: 'left',
        cameraTarget: 'HQ',
        choices: [
            // Neue Action, um den Pfeil danach zu steuern
            { id: 'risk_it', text: 'Okay!', action: 'start_crunch_gameplay' }
        ]
    },

    // Hinweis: D3_PARTIAL_PAYMENT etc. werden durch dynamische Barks ersetzt.
    // Wir springen direkt zum Finale nach Trip 2.

    'D3_DOWNWARD_SPIRAL': {
        type: 'narrative',
        title: 'Der Stillstand',
        text: 'Faszinierend. Eine klassische Rezession. Die Werft hat keine Aufträge mehr, Kian musste Leute entlassen. Nun fehlt das Geld bei Mo in der Taverne. Die Liquidität ist aus dem System gesogen. Sie stecken fest. Aber ich habe ein Instrument, um Sie da rauszuholen.',
        speakerLeft: null,
        speakerRight: 'Sterling',
        focus: 'right',
        cameraTarget: 'BANK',
        choices: [
            { id: 'ask_solution', text: 'Was schlagen Sie vor?', action: 'trigger_scene', param: 'D3_STERLING_SOLUTION' }
        ]
    },

    'D3_STERLING_SOLUTION': {
        type: 'narrative',
        title: 'Umschuldung',
        text: 'Sterling: "Ganz einfach: Refinanzierung. Ich biete Ihnen 500 Gold zur Umschuldung an."\n\nEr lächelt breit. "Damit können Sie die Durststrecke überbrücken und expandieren. Wachsen Sie aus der Krise heraus. Zinsen sind nur... Zahlen."',
        speakerLeft: 'Lale',
        speakerRight: 'Sterling',
        focus: 'right',
        cameraTarget: 'BANK',
        choices: [
            { id: 'refinance', text: 'Umschuldung akzeptieren (+500g)', action: 'take_refinancing_loan', amount: 500 }
        ]
    },

    // =========================================================================
    // KAPITEL 4: DIE WACHSTUMSFALLE (GROWTH TRAP)
    // Zinslast erzwingt Investition in schädliche Technologie.
    // =========================================================================

    'D4_STERLING_EXPANSION_PITCH': {
        type: 'narrative',
        title: 'Die Umschuldung',
        text: 'Sterling: "Wir strukturieren das um. Ich stelle Ihnen 500 Gold zur Verfügung. Damit sind Sie sofort wieder handlungsfähig."\n\nEr lächelt kühl. "Die Zinsen – sagen wir 50 Gold pro Fahrt – ziehe ich laufend ein. Das hält die Verwaltung schlank. Einverstanden?"',
        speakerLeft: null,
        speakerRight: 'Sterling',
        focus: 'right',
        cameraTarget: 'BANK',
        choices: [
            { id: 'accept_refinance', text: '500 Gold annehmen', action: 'take_refinancing_loan', amount: 500 }
        ]
    },

    'D4_INTEREST_SHOCK': {
        type: 'narrative',
        title: 'Die Abrechnung',
        text: 'Lale: "Chef, wir verbrennen Geld! Das Motorboot bringt 30 Gold Gewinn pro Fahrt, aber Sterling zieht sofort 50 Gold Zinsen ein."\n\nSie schlägt die Seiten im Konto auf. "Somit vernichten wir 20 Gold. Der Kredit frisst uns auf, bevor wir eine zweite Fahrt machen können."',
        speakerLeft: 'Lale',
        speakerRight: null,
        focus: 'left',
        cameraTarget: 'HQ',
        choices: [
            { id: 'ask_sterling', text: 'Sterling fragen', action: 'trigger_scene', param: 'D4_STERLING_ADVICE' }
        ]
    },

    'D4_STERLING_ADVICE': {
        type: 'narrative',
        title: 'Kühle Rechnung',
        text: 'Sterling: "Nicht emotional werden. Es ist eine einfache Rechenaufgabe: +30 Gold aus dem Motorboot, aber -50 Zinsen bedeuten pro Fahrt -20. So halten wir den Kredit nie." \n\nEr wandert zur Werft und streicht mit dem Finger über den Tisch. "Sie müssen den Output erhöhen. Kian hat da eine... effiziente Lösung."',
        speakerLeft: null,
        speakerRight: 'Sterling',
        focus: 'right',
        cameraTarget: 'BANK',
        choices: [
            { id: 'check_upgrade', text: 'Zur Werft', action: 'activate_shipyard_upgrade_quest' }
        ]
    },

    'D4_KIAN_UPGRADE': {
        type: 'narrative',
        title: 'Das Schleppnetz',
        text: 'Kian: "Sterling hat angerufen. Ich kann eine Winde an dein Boot montieren. Damit schleifen wir den Grund ab."\n\nEr kratzt sich am Kopf. "Wir fangen doppelt so viel, aber... naja, der Boden leidet. Kostet 350 Gold."',
        speakerLeft: "Kapt'n",
        speakerRight: 'Kian',
        focus: 'right',
        cameraTarget: 'SHIPYARD',
        choices: [
            { id: 'buy_dredge', text: 'Schleppnetz kaufen (350g)', action: 'buy_dredge_net' }
        ]
    },

    'D4_RANI_INTRO': {
        type: 'narrative',
        title: 'Trübes Wasser',
        text: 'Eine junge Frau steht am Steg und starrt ins Wasser.\n\nRani: "Haben Sie gesehen, was im Netz hängt? Nicht nur Speisefisch. Korallen, Jungfische... Sie pflügen den Boden um. Das Wasser wird trüb."',
        speakerLeft: 'Rani',
        speakerRight: 'Sterling',
        focus: 'left',
        cameraTarget: 'BOAT',
        choices: [
            { id: 'sterling_reply', text: '...', action: 'trigger_scene', param: 'D4_STERLING_REBUTTAL' }
        ]
    },

    'D4_STERLING_REBUTTAL': {
        type: 'narrative',
        title: 'Prioritäten',
        text: 'Sterling tritt hervor.\n\nSterling: "Ignorieren Sie das. Wir schreiben endlich schwarze Zahlen. Der Kredit wird bedient. Das System ist stabil."',
        speakerLeft: 'Rani',
        speakerRight: 'Sterling',
        focus: 'right',
        cameraTarget: 'BANK',
        choices: [
            { id: 'ignore_rani', text: 'Weiterfischen', action: 'close' }
        ]
    },

    'D4_TO_D5_TRANSITION': {
        type: 'narrative',
        title: 'Rechnung geht nicht auf',
        text: 'Sterling tritt ans Ufer und mustert dein Boot.\n\nSterling: "Das Motorboot bringt 30 Gold Gewinn, ich ziehe 50 Gold Zinsen ab. Sie verbrennen 20 Gold pro Fahrt. Sie tilgen so nie."\n\nEr lächelt kühl. "Sie brauchen das größere Boot. Sofort."',
        speakerLeft: "Kapt'n",
        speakerRight: 'Sterling',
        focus: 'right',
        cameraTarget: 'BANK',
        choices: [
            { id: 'what_now', text: 'Was schlagen Sie vor?', action: 'trigger_scene', param: 'D5_STERLING_DEMANDS_TRAWLER' }
        ]
    },

    'D5_STERLING_DEMANDS_TRAWLER': {
        type: 'narrative',
        title: 'Die einzige Lösung',
        text: 'Sterling: "Die Lösung ist trivial: Mehr Output. Kian hat einen Trawler. Der kostet 500 Gold. Ohne ihn zahlen Sie den Kredit nie zurück."\n\nEr schlägt sein Buch auf. "Besorgen Sie das Geld oder ich gebe Ihnen einen Kredit. Dann gehen Sie zur Werft und kaufen den Trawler."',
        speakerLeft: "Kapt'n",
        speakerRight: 'Sterling',
        focus: 'right',
        cameraTarget: 'BANK',
        choices: [
            { id: 'accept', text: 'Ich gehe zur Werft', action: 'start_efficiency_chapter' }
        ]
    },

    'D5_STERLING_LOAN_OFFER': {
        type: 'narrative',
        title: 'Liquiditäts-Spritze',
        text: 'Sterling: "Zu wenig Kapital für den Trawler? Ich gebe Ihnen 400 Gold Vorschuss."\n\nEr lächelt. "Zinsen bleiben 50 Gold pro Fahrt. Wir nennen es Expansion-Finanzierung."',
        speakerLeft: null,
        speakerRight: 'Sterling',
        focus: 'right',
        cameraTarget: 'BANK',
        choices: [
            { id: 'take_loan', text: 'Kredit annehmen (+400g)', action: 'take_efficiency_loan', amount: 400 }
        ]
    },

    'D6_ECOLOGICAL_COLLAPSE': {
        type: 'narrative',
        title: 'Leere Netze',
        text: 'Rani steht am Steg und starrt ins trübe Wasser.\n\nRani: "Es ist vorbei. Ihr habt den Meeresboden kahl gefischt. Die Jungfische sind tot. Es wächst nichts mehr nach."',
        speakerLeft: 'Rani',
        speakerRight: null,
        focus: 'left',
        cameraTarget: 'BOAT',
        choices: [
            { id: 'continue', text: '...', action: 'trigger_scene', param: 'D6_STERLING_FINAL' }
        ]
    },

    'D6_STERLING_FINAL': {
        type: 'narrative',
        title: 'Systemkollaps',
        text: 'Sterling erscheint mit seinem Buch.\n\nSterling: "Bedauerlich. Die Ressource ist erschöpft, Ihre Einnahmen null. Der Kredit kann nicht bedient werden."\n\nEr macht eine Notiz. "Ich übernehme die Insel als Sicherheit. Wirtschaftlich betrachtet war das... unvermeidbar."',
        speakerLeft: null,
        speakerRight: 'Sterling',
        focus: 'right',
        cameraTarget: 'BANK',
        choices: [
            { id: 'game_over', text: 'Game Over', action: 'trigger_collapse' }
        ]
    },

    // =========================================================================
    // SPÄTERE PHASEN (Effizienz, Warnung, Kollaps)
    // Platzhalter für den weiteren Spielverlauf.
    // =========================================================================

    'D5_RANI_WARNING': {
        type: 'narrative',
        title: 'Grenzen des Wachstums',
        text: 'Rani: "Der Trawler ist zu viel! Das Meer hält das nicht aus. Seht ihr nicht, wie das Wasser trüb wird? Die Korallen sterben, die Jungfische verschwinden. Wenn das so weitergeht, gibt es bald nichts mehr!"\n\nSterling: "Dramatisieren Sie nicht. Die Zahlen stimmen. Die Zinsen warten nicht. Weiterfischen."',
        speakerLeft: 'Rani',
        speakerRight: 'Sterling',
        focus: 'left',
        cameraTarget: 'BOAT',
        choices: [
            { id: 'ignore', text: 'Weiterfischen', action: 'close' }
        ]
    },

    'D7_COLLAPSE': {
        type: 'narrative',
        title: 'Das Ende',
        text: 'Kian: "Die Netze sind leer. Es gibt nichts mehr."\n\nSterling: "Bedauerlich. Ich pfände dann mal die Insel. Einen schönen Tag noch."',
        speakerLeft: 'Kian',
        speakerRight: 'Sterling',
        focus: 'right',
        cameraTarget: 'OVERVIEW',
        choices: [
            { id: 'game_over', text: 'Das Ende', action: 'show_game_over_screen' }
        ]
    }
};
