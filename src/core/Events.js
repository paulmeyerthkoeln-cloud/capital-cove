/*** START OF FILE src/core/Events.js ***/

export const EVENTS = {
    GAME_TICK: 'core:game_tick',
    GAME_OVER: 'core:game_over',
    STATS_UPDATED: 'ui:stats_updated',
    TOAST: 'ui:toast',
    MONEY_CHANGED: 'ui:money_changed',
    FLOATING_TEXT: 'ui:floating_text',

    // NEU: Boom Sequenz Events
    START_BOOM_CONSTRUCTION: 'world:start_boom_construction',
    END_BOOM_CONSTRUCTION: 'world:end_boom_construction',

    BOAT_BOUGHT: 'world:boat_bought',
    BOAT_UNLOADING: 'world:boat_unloading',
    BUILDING_CLICKED: 'world:building_clicked',
    CMD_START_BOAT: 'cmd:start_boat',
    CMD_SHOW_BOAT_HINT: 'cmd:show_boat_hint',
    CMD_RELEASE_BOATS: 'cmd:release_boats',
    CMD_SHOW_TENT: 'cmd:show_tent',
    BANK_CONSTRUCTED: 'world:bank_constructed',
    UI_DIALOG_OPENED: 'ui:dialog_opened',
    UI_DIALOG_CLOSED: 'ui:dialog_closed',
    SAVINGS_CONFIRMED: 'ui:savings_confirmed',
    CYCLE_EXPLANATION_CLOSED: 'ui:cycle_explanation_closed',
    CMD_SHOW_BUILDING_HINT: 'cmd:show_building_hint',
    SHOW_ADVISOR: 'ui:show_advisor',

    TRIGGER_COIN_LEG: 'world:trigger_coin_leg',

    VISUAL_DELIVERY_START: 'world:visual_delivery_start',
    VISUAL_DELIVERY_RETURN: 'world:visual_delivery_return',
    BUILDING_REACTION: 'world:building_reaction',
    SHOW_BILLBOARD: 'ui:show_billboard',
    SHOW_WORLD_BARK: 'ui:show_world_bark'
};

export const ECON_EVENTS = {
    TRIP_COMPLETED: 'economy:trip_completed',
    PURCHASE_FAILED: 'economy:purchase_failed',
    UPGRADE_BOUGHT: 'economy:upgrade_bought',
    BOAT_BOUGHT: 'economy:boat_bought',
    DEBT_THRESHOLD: 'economy:debt_threshold',
    MARKET_CRASH: 'economy:market_crash',
    ECOLOGICAL_WARNING: 'economy:ecological_warning',
    GRACE_PERIOD_ENDED: 'economy:grace_period_ended',
    MONEY_CIRCULATED: 'economy:money_circulated',
    EXPENSES_PAID: 'economy:expenses_paid',
    INCOME_RECEIVED: 'economy:income_received',
    SAVINGS_CHANGED: 'economy:savings_changed',
    MARKET_HEALTH_CHANGED: 'economy:market_health_changed',
    LOAN_STATUS_CHANGED: 'economy:loan_status_changed',
    LOAN_REPAID: 'economy:loan_repaid',
    LOAN_RECALL_TRIGGERED: 'economy:loan_recall_triggered'
};

export const DIRECTOR_EVENTS = {
    PHASE_CHANGED: 'director:phase_changed',
    SCENE_START: 'director:scene_start',
    SCENE_END: 'director:scene_end',
    OBJECTIVES_UPDATED: 'director:objectives_updated'
};

class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    on(eventName, handler) {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }
        this.listeners.get(eventName).add(handler);
    }

    off(eventName, handler) {
        if (!this.listeners.has(eventName)) return;
        this.listeners.get(eventName).delete(handler);
    }

    emit(eventName, payload) {
        if (!this.listeners.has(eventName)) return;
        this.listeners.get(eventName).forEach(handler => {
            try {
                handler(payload);
            } catch (err) {
                console.error(`❌ Error in EventBus listener for "${eventName}":`, err);
            }
        });
    }
}

export const events = new EventBus();
