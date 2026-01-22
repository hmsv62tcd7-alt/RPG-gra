// Autosave helper using localStorage
window.Autosave = (function(){
    const KEY = 'rpg_char_slots_v1';

    function loadSlots() {
        try {
            const raw = localStorage.getItem(KEY);
            if (!raw) return [null, null, null];
            const data = JSON.parse(raw);
            // ensure length 3
            while (data.length < 3) data.push(null);
            return data.slice(0,3);
        } catch(e) {
            return [null, null, null];
        }
    }

    function saveSlots(slots) {
        try {
            localStorage.setItem(KEY, JSON.stringify(slots));
            return true;
        } catch(e) {
            return false;
        }
    }

    function saveGameState(slotIndex, gameState) {
        try {
            const slots = loadSlots();
            if (!slots[slotIndex]) slots[slotIndex] = {};
            // Preserve metadata and add game state
            slots[slotIndex].gameState = gameState;
            saveSlots(slots);
            return true;
        } catch(e) {
            return false;
        }
    }

    function loadGameState(slotIndex) {
        try {
            const slots = loadSlots();
            const slot = slots[slotIndex];
            if (!slot || !slot.gameState) return null;
            return slot.gameState;
        } catch(e) {
            return null;
        }
    }

    return {
        loadSlots, saveSlots, saveGameState, loadGameState
    };
})();
