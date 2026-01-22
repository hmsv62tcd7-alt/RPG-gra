// ============================================
// RPG 2D - Gra w przeglądarce
// ============================================

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBYJSqKrGvEjJhkqY9z5x3w1v2u3t4s5r6",
    authDomain: "rpg-gra-default.firebaseapp.com",
    databaseURL: "https://rpg-gra-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "rpg-gra-default",
    storageBucket: "rpg-gra-default.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123def456"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// KONFIGURACJA
const CONFIG = {
    CANVAS_WIDTH: 1200,
    CANVAS_HEIGHT: 700,
    TILE_SIZE: 32,
    PLAYER_SIZE: 30,
    PLAYER_SPEED: 4,
    NPC_SIZE: 30,
    ENEMY_SIZE: 35
};

// MAPA
const MAP_WIDTH = 4000;
const MAP_HEIGHT = 4000;

// Multiplayer
let playerId = 'player_' + Math.random().toString(36).substr(2, 9);
let otherPlayers = {};

// ============================================
// KLASY
// ============================================

class Item {
    constructor(name, icon, type = 'quest', questId = null, quantity = 1, atk = 0, def = 0) {
        this.name = name;
        this.icon = icon;
        this.type = type; // 'quest', 'loot', 'reward', 'drop', 'weapon', 'armor', 'helmet', 'shield', 'accessory'
        this.questId = questId;
        this.quantity = quantity;
        this.atk = atk;  // Attack bonus
        this.def = def;  // Defense bonus
    }
}

class Inventory {
    constructor(maxSlots = 20) {
        this.slots = new Array(maxSlots).fill(null);
        this.maxSlots = maxSlots;
    }

    addItem(item) {
        // Try to stack first (match by name and questId)
        for (let i = 0; i < this.slots.length; i++) {
            const s = this.slots[i];
            if (s && s.name === item.name && s.questId === item.questId) {
                s.quantity = (s.quantity || 1) + (item.quantity || 1);
                return true;
            }
        }

        // Put in empty slot
        const emptySlot = this.slots.indexOf(null);
        if (emptySlot !== -1) {
            // Ensure we place a copy so external refs don't mutate
            this.slots[emptySlot] = new Item(item.name, item.icon, item.type, item.questId, item.quantity || 1);
            return true;
        }
        return false; // Inventory full
    }

    removeItem(index) {
        if (index >= 0 && index < this.slots.length) {
            this.slots[index] = null;
            return true;
        }
        return false;
    }

    removeByQuestId(questId, count = Infinity) {
        // Usuń określoną liczbę itemów powiązanych z daną misją (stack-aware)
        let remaining = count;
        for (let i = 0; i < this.slots.length && remaining > 0; i++) {
            const s = this.slots[i];
            if (s && s.questId === questId) {
                const qty = s.quantity || 1;
                if (qty <= remaining) {
                    // remove whole slot
                    remaining -= qty;
                    this.slots[i] = null;
                } else {
                    // decrease quantity
                    s.quantity = qty - remaining;
                    remaining = 0;
                }
            }
        }
        return count - remaining; // number removed
    }

    getItemCount(questId = null) {
        if (questId === null) {
            return this.slots.filter(item => item !== null).length;
        }
        return this.slots.filter(item => item && item.questId === questId).length;
    }
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.PLAYER_SIZE;
        this.height = CONFIG.PLAYER_SIZE;
        this.speed = CONFIG.PLAYER_SPEED;
        this.maxHp = 100;
        this.hp = 100;
        this.velocityX = 0;
        this.velocityY = 0;
        
        // System exp/level
        this.level = 1;
        this.exp = 0;
        this.maxExp = 100;
        
        // Inventory
        this.inventory = new Inventory(20);
        
        // Equipment
        this.equipment = {
            weapon: null,      // Broń
            armor: null,       // Zbroja
            helmet: null,      // Hełm
            shield: null,      // Tarcza
            accessory: null    // Akcesoria
        };
        
        // Equipment bonuses
        this.equipmentATK = 0;
        this.equipmentDEF = 0;
    }

    update() {
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Ograniczenie do mapy (gracz zostanie ograniczony przez applyMovementWithCollisions w game.js)
        // NIE rób tutaj ograniczeń, bo obecnie applyMovementWithCollisions w game.js kontroluje granice
    }

    draw(ctx) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 12, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        const cls = this.className || 'Wojownik';
        const race = this.race || 'Human';

        // Visual variants per class and race
        if (cls === 'Wojownik') {
            // Heavy armor, shield
            const bodyColor = race === 'Orc' ? '#1a4d1a' : '#6b6b6b';
            const bodyGradient = ctx.createLinearGradient(centerX - 8, centerY - 5, centerX + 8, centerY + 10);
            bodyGradient.addColorStop(0, bodyColor);
            bodyGradient.addColorStop(1, race === 'Orc' ? '#0a2d0a' : '#3a3a3a');
            ctx.fillStyle = bodyGradient;
            ctx.beginPath(); ctx.moveTo(centerX - 7, centerY - 2); ctx.lineTo(centerX + 7, centerY - 2); ctx.lineTo(centerX + 8, centerY + 10); ctx.lineTo(centerX - 8, centerY + 10); ctx.closePath(); ctx.fill();

            // Shield on left
            ctx.fillStyle = race === 'Orc' ? '#8b0000' : '#8b6914'; ctx.beginPath(); ctx.ellipse(centerX - 12, centerY + 2, 6, 8, 0, 0, Math.PI * 2); ctx.fill();

            // Sword on right
            ctx.strokeStyle = '#c0c0c0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(centerX + 10, centerY); ctx.lineTo(centerX + 14, centerY - 10); ctx.stroke();
        } else if (cls === 'Hunter') {
            // Leather, green tone, bow
            const bodyGradient = ctx.createLinearGradient(centerX - 8, centerY - 5, centerX + 8, centerY + 10);
            bodyGradient.addColorStop(0, race === 'Orc' ? '#3a7a3a' : '#2b6b2b'); 
            bodyGradient.addColorStop(1, race === 'Orc' ? '#1a4a1a' : '#154015');
            ctx.fillStyle = bodyGradient; ctx.beginPath(); ctx.moveTo(centerX - 7, centerY - 2); ctx.lineTo(centerX + 7, centerY - 2); ctx.lineTo(centerX + 8, centerY + 10); ctx.lineTo(centerX - 8, centerY + 10); ctx.closePath(); ctx.fill();

            // Quiver
            ctx.fillStyle = '#3a2f28'; ctx.fillRect(centerX - 14, centerY - 2, 4, 10);
            // Bow
            ctx.strokeStyle = race === 'Orc' ? '#cc3333' : '#8b4513'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(centerX + 12, centerY, 8, 1.2, -1.2); ctx.stroke();
        } else if (cls === 'Mag') {
            // Robe, purple for human, dark blue for orc
            const bodyGradient = ctx.createLinearGradient(centerX - 8, centerY - 5, centerX + 8, centerY + 10);
            bodyGradient.addColorStop(0, race === 'Orc' ? '#1a3a5a' : '#5a2b8a'); 
            bodyGradient.addColorStop(1, race === 'Orc' ? '#0a1a3a' : '#2a0f42');
            ctx.fillStyle = bodyGradient; ctx.beginPath(); ctx.moveTo(centerX - 7, centerY - 2); ctx.lineTo(centerX + 7, centerY - 2); ctx.lineTo(centerX + 8, centerY + 10); ctx.lineTo(centerX - 8, centerY + 10); ctx.closePath(); ctx.fill();

            // Staff
            ctx.strokeStyle = race === 'Orc' ? '#ff0000' : '#ffd166'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(centerX + 10, centerY - 6); ctx.lineTo(centerX + 14, centerY + 8); ctx.stroke();
            ctx.fillStyle = race === 'Orc' ? '#ff0000' : '#ff5c8a'; ctx.beginPath(); ctx.arc(centerX + 10, centerY - 8, 3, 0, Math.PI * 2); ctx.fill();
        }

        // Head - green for Orc, tan for Human
        const headGradient = ctx.createRadialGradient(centerX, centerY - 8, 0, centerX, centerY - 8, 5);
        if (race === 'Orc') {
            headGradient.addColorStop(0, '#5a9d5a');
            headGradient.addColorStop(1, '#2d5a2d');
        } else {
            headGradient.addColorStop(0, '#d4a574');
            headGradient.addColorStop(1, '#a0743d');
        }
        ctx.fillStyle = headGradient; ctx.beginPath(); ctx.arc(centerX, centerY - 8, 5, 0, Math.PI * 2); ctx.fill();

        // Eyes - red for Orc
        ctx.fillStyle = race === 'Orc' ? '#ff0000' : '#000'; ctx.fillRect(centerX - 3, centerY - 9, 1.5, 1.5); ctx.fillRect(centerX + 1.5, centerY - 9, 1.5, 1.5);

        // Arms/hands (simple)
        ctx.fillStyle = race === 'Orc' ? '#4a7a4a' : '#d4a574'; ctx.fillRect(centerX - 10, centerY + 8, 3, 2); ctx.fillRect(centerX + 7, centerY + 8, 3, 2);

        // Selection glow
        ctx.strokeStyle = '#00ff66'; ctx.lineWidth = 1; ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(centerX, centerY + 2, 11, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;

        this.drawHPBar(ctx);
    }

    drawHPBar(ctx) {
        const barWidth = 24;
        const barHeight = 3;
        const x = this.x + this.width / 2 - barWidth / 2;
        const y = this.y - 8;

        // Background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 1, y - 1, barWidth + 2, barHeight + 2);

        // HP fill
        const hpPercent = this.hp / this.maxHp;
        const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
        gradient.addColorStop(0, '#00ff00');
        gradient.addColorStop(0.5, '#90ee90');
        gradient.addColorStop(1, '#32cd32');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth * hpPercent, barHeight);

        // Border
        ctx.strokeStyle = '#00ff66';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, barWidth, barHeight);
    }

    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
    }

    heal(amount) {
        this.hp = Math.min(this.maxHp, this.hp + amount);
    }

    addExp(amount) {
        this.exp += amount;
        if (this.exp >= this.maxExp) {
            this.levelUp();
        }
    }

    levelUp() {
        this.level++;
        this.exp -= this.maxExp;
        this.maxExp = Math.floor(this.maxExp * 1.6);
        this.maxHp += 20;
        this.hp = this.maxHp;
    }

    addGold(amount) {
        if (!this.gold) this.gold = 0;
        this.gold += amount;
    }
}

class Quest {
    constructor(id, name, description, requiredLevel, expReward, goldReward, mobType, mobCount, rewardItem = null) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.requiredLevel = requiredLevel;
        this.expReward = expReward;
        this.goldReward = goldReward;
        this.mobType = mobType; // 'boar', 'wolf', 'bear', 'whelp', 'wasp', 'snake'
        this.mobCount = mobCount;
        this.rewardItem = rewardItem; // Item to drop
        this.completed = false;
        this.progress = 0;
        this.rewardClaimed = false; // Czy nagroda została odebrana
    }
}

class NPC {
    constructor(x, y, name, questIds = [], type = 'quest', dialogue = "Cześć! Mam dla ciebie zadania!") {
        this.x = x;
        this.y = y;
        this.width = CONFIG.NPC_SIZE;
        this.height = CONFIG.NPC_SIZE;
        this.name = name;
        this.type = type; // 'quest' lub 'vendor'
        this.dialogue = dialogue;
        this.questIds = questIds;
    }

    draw(ctx) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        // Rozróżnienie: Handlarz Uzbrojenia vs zwykły NPC
        const isMerchant = this.name === "Handlarz Uzbrojenia";
        
        if (isMerchant) {
            // === HANDLARZ UZBROJENIA - luksusowy, bogaty wygląd RPG ===
            
            // Cień
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.beginPath();
            ctx.ellipse(centerX, centerY + 14, 12, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Luksusowy płaszcz z futra (szeroki, bogaty)
            const cloakGrad = ctx.createLinearGradient(centerX - 12, centerY - 6, centerX + 12, centerY + 12);
            cloakGrad.addColorStop(0, '#8b0000'); // ciemna czerwień
            cloakGrad.addColorStop(0.5, '#a52a2a');
            cloakGrad.addColorStop(1, '#6b0000');
            ctx.fillStyle = cloakGrad;
            ctx.beginPath();
            ctx.moveTo(centerX - 11, centerY - 4);
            ctx.lineTo(centerX + 11, centerY - 4);
            ctx.lineTo(centerX + 13, centerY + 12);
            ctx.lineTo(centerX - 13, centerY + 12);
            ctx.closePath();
            ctx.fill();
            
            // Złote wykończenia płaszcza
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX - 11, centerY - 4);
            ctx.lineTo(centerX + 11, centerY - 4);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(centerX - 11, centerY - 4);
            ctx.lineTo(centerX - 13, centerY + 12);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(centerX + 11, centerY - 4);
            ctx.lineTo(centerX + 13, centerY + 12);
            ctx.stroke();

            // Złoty pas z klamrą
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(centerX - 11, centerY + 3, 22, 3);
            // Klamra pasa (diament)
            ctx.fillStyle = '#00bfff';
            ctx.beginPath();
            ctx.moveTo(centerX, centerY + 2.5);
            ctx.lineTo(centerX + 2.5, centerY + 4.5);
            ctx.lineTo(centerX, centerY + 6.5);
            ctx.lineTo(centerX - 2.5, centerY + 4.5);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Głowa (bogatsza karnacja)
            const headGrad = ctx.createRadialGradient(centerX, centerY - 10, 1, centerX, centerY - 10, 6);
            headGrad.addColorStop(0, '#f4d0a8');
            headGrad.addColorStop(1, '#d4a574');
            ctx.fillStyle = headGrad;
            ctx.beginPath();
            ctx.arc(centerX, centerY - 10, 6, 0, Math.PI * 2);
            ctx.fill();

            // Kapelusz/korona handlarza (złoty z piórami)
            ctx.fillStyle = '#8b4513';
            ctx.fillRect(centerX - 7, centerY - 16, 14, 4);
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.moveTo(centerX - 5, centerY - 16);
            ctx.lineTo(centerX, centerY - 20);
            ctx.lineTo(centerX + 5, centerY - 16);
            ctx.closePath();
            ctx.fill();
            // Pióro
            ctx.strokeStyle = '#ff4500';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX + 4, centerY - 17);
            ctx.lineTo(centerX + 7, centerY - 22);
            ctx.stroke();

            // Oczy (bystre, przebiegłe)
            ctx.fillStyle = '#fff';
            ctx.fillRect(centerX - 3, centerY - 11, 2, 2);
            ctx.fillRect(centerX + 1, centerY - 11, 2, 2);
            ctx.fillStyle = '#000';
            ctx.fillRect(centerX - 2.5, centerY - 10.5, 1, 1);
            ctx.fillRect(centerX + 1.5, centerY - 10.5, 1, 1);

            // Wąsy (długie, zakręcone)
            ctx.strokeStyle = '#654321';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - 7);
            ctx.quadraticCurveTo(centerX - 5, centerY - 6, centerX - 7, centerY - 8);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - 7);
            ctx.quadraticCurveTo(centerX + 5, centerY - 6, centerX + 7, centerY - 8);
            ctx.stroke();

            // Broda (zadbana, krótsza)
            ctx.fillStyle = '#654321';
            ctx.beginPath();
            ctx.arc(centerX, centerY - 6, 3.5, 0, Math.PI);
            ctx.fill();

            // Ręce z pierścieniami
            ctx.fillStyle = '#f4d0a8';
            ctx.fillRect(centerX - 13, centerY + 1, 3, 9);
            ctx.fillRect(centerX + 10, centerY + 1, 3, 9);
            // Złote pierścienie
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(centerX - 12.5, centerY + 7, 2, 1.5);
            ctx.fillRect(centerX + 10.5, centerY + 7, 2, 1.5);

            // Woreczek ze złotem w lewej ręce
            ctx.fillStyle = '#8b7355';
            ctx.beginPath();
            ctx.arc(centerX - 15, centerY + 8, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 8px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('$', centerX - 15, centerY + 10);

            // Miecz w prawej ręce (do sprzedaży)
            ctx.strokeStyle = '#c0c0c0';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(centerX + 15, centerY + 5);
            ctx.lineTo(centerX + 15, centerY + 12);
            ctx.stroke();
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(centerX + 13.5, centerY + 4, 3, 2);

            // Blask bogactwa (aura)
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(centerX, centerY + 2, 14, 0, Math.PI * 2);
            ctx.stroke();
            
        } else {
            // === ZWYKŁY NPC - standardowy wygląd ===
            
            // Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(centerX, centerY + 12, 10, 4, 0, 0, Math.PI * 2);
            ctx.fill();

            // Body (szata handlarza - bardziej kolorowa)
            const bodyGradient = ctx.createLinearGradient(centerX - 8, centerY - 5, centerX + 8, centerY + 10);
            bodyGradient.addColorStop(0, '#c04000');
            bodyGradient.addColorStop(0.5, '#8b3000');
            bodyGradient.addColorStop(1, '#5c2000');
            ctx.fillStyle = bodyGradient;
            ctx.beginPath();
            ctx.moveTo(centerX - 7, centerY - 2);
            ctx.lineTo(centerX + 7, centerY - 2);
            ctx.lineTo(centerX + 8, centerY + 10);
            ctx.lineTo(centerX - 8, centerY + 10);
            ctx.closePath();
            ctx.fill();

            // Rich belt
            ctx.fillStyle = '#d4af37';
            ctx.fillRect(centerX - 9, centerY + 4, 18, 2.5);

            // Head
            const headGradient = ctx.createRadialGradient(centerX, centerY - 8, 0, centerX, centerY - 8, 5);
            headGradient.addColorStop(0, '#d4a574');
            headGradient.addColorStop(1, '#a0743d');
            ctx.fillStyle = headGradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY - 8, 5, 0, Math.PI * 2);
            ctx.fill();

            // Hair
            ctx.fillStyle = '#8b4513';
            ctx.beginPath();
            ctx.arc(centerX, centerY - 10, 6, 0, Math.PI * 2);
            ctx.fill();

            // Eyes
            ctx.fillStyle = '#8B4513';
            ctx.fillRect(centerX - 2.5, centerY - 9, 1.5, 2);
            ctx.fillRect(centerX + 1, centerY - 9, 1.5, 2);

            // Beard
            ctx.fillStyle = '#654321';
            ctx.beginPath();
            ctx.arc(centerX, centerY - 5, 3, 0, Math.PI);
            ctx.fill();

            // Arms with items
            ctx.fillStyle = '#c04000';
            ctx.fillRect(centerX - 10, centerY, 3, 8);
            ctx.fillRect(centerX + 7, centerY, 3, 8);

            // Hands
            ctx.fillStyle = '#d4a574';
            ctx.fillRect(centerX - 10, centerY + 8, 3, 2.5);
            ctx.fillRect(centerX + 7, centerY + 8, 3, 2.5);

            // Item in hand (potion bottle)
            ctx.fillStyle = '#8B008B';
            ctx.fillRect(centerX + 10, centerY + 5, 2, 4);
            ctx.fillStyle = '#FF00FF';
            ctx.fillRect(centerX + 10.5, centerY + 5.5, 1, 2);

            // Quest marker (golden star above head)
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('★', centerX, centerY - 16);

            // Selection glow
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(centerX, centerY + 2, 11, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    }

    getDistance(x, y) {
        const dx = this.x - x;
        const dy = this.y - y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

class Enemy {
    constructor(x, y, name, type = 'boar') {
        this.x = x;
        this.y = y;
        this.width = CONFIG.ENEMY_SIZE;
        this.height = CONFIG.ENEMY_SIZE;
        this.name = name;
        this.type = type; // 'boar', 'wolf', 'bear', 'whelp', 'wasp', 'snake'
        this.difficulty = 'easy'; // 'easy', 'medium', 'hard' - domyślnie łatwy
        this.isAggro = false;
        this.isAlive = true;
        this.respawnTimer = 0;
        this.respawnTime = 10; // 10 sekund
        this.spawnX = x;
        this.spawnY = y;
        this.questId = null; // Misja powiązana z tym potworem
        
        // Statystyki zależne od typu
        this.initStats();
    }
    
    initStats() {
        // Statystyki bazowe dla każdego typu
        const baseStats = {
            'boar': { maxHp: 40, damage: 6, defense: 1, range: 120 },
            'wolf': { maxHp: 45, damage: 8, defense: 2, range: 140 },
            'bear': { maxHp: 80, damage: 12, defense: 4, range: 130 },
            'whelp': { maxHp: 25, damage: 4, defense: 1, range: 100 },
            'wasp': { maxHp: 20, damage: 5, defense: 0, range: 180 },
            'snake': { maxHp: 35, damage: 7, defense: 1, range: 110 }
        };
        
        const baseStat = baseStats[this.type] || baseStats['boar'];
        let multiplier = 1;
        
        // Skaluj statystyki wg trudności
        if (this.difficulty === 'easy') {
            multiplier = 0.8; // Łatwe potwory: -20% HP, DMG
        } else if (this.difficulty === 'medium') {
            multiplier = 1.2; // Średnie: +20% HP, DMG
        } else if (this.difficulty === 'hard') {
            multiplier = 1.6; // Trudne: +60% HP, DMG
        }
        
        this.maxHp = Math.floor(baseStat.maxHp * multiplier);
        this.hp = this.maxHp;
        this.damage = Math.floor(baseStat.damage * multiplier);
        this.defense = baseStat.defense;
        this.aggroRange = baseStat.range;
    }

    update(playerX, playerY) {
        // Sprawdzenie czy gracz jest w zasięgu
        const dx = this.x - playerX;
        const dy = this.y - playerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.isAggro = distance < this.aggroRange;

        // Prosta AI - zbliżanie się do gracza
        if (this.isAggro) {
            const moveSpeed = 1.5;
            if (dx > 0) this.x -= moveSpeed;
            if (dx < 0) this.x += moveSpeed;
            if (dy > 0) this.y -= moveSpeed;
            if (dy < 0) this.y += moveSpeed;
        }
    }

    draw(ctx) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
        // Jeśli nie żywy - pokaż timer respawnu
        if (!this.isAlive) {
            ctx.fillStyle = '#999';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 3;
            ctx.fillText(`Respawn ${Math.ceil(this.respawnTimer)}s`, centerX, centerY - 5);
            ctx.shadowColor = 'transparent';
            return;
        }

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 14, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Rysuj odpowiedni typ potwora
        switch(this.type) {
            case 'boar':
                this.drawBoar(ctx, centerX, centerY);
                break;
            case 'wolf':
                this.drawWolf(ctx, centerX, centerY);
                break;
            case 'bear':
                this.drawBear(ctx, centerX, centerY);
                break;
            case 'whelp':
                this.drawWhelp(ctx, centerX, centerY);
                break;
            case 'wasp':
                this.drawWasp(ctx, centerX, centerY);
                break;
            case 'snake':
                this.drawSnake(ctx, centerX, centerY);
                break;
            default:
                this.drawBoar(ctx, centerX, centerY);
        }

        // Aggro ring
        if (this.isAggro) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2.5;
            ctx.globalAlpha = 0.7;
        } else {
            ctx.strokeStyle = '#8b4513';
            ctx.lineWidth = 1.5;
            ctx.globalAlpha = 0.5;
        }
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 4, 15, 12, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        // HP bar nad wrogiem
        this.drawHPBar(ctx);

        // Nazwa nad głową
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 3;
        ctx.fillText(this.name, centerX, centerY - 15);
        ctx.shadowColor = 'transparent';
    }

    drawBoar(ctx, centerX, centerY) {
        // Dzik (Wild Boar)
        const bodyGradient = ctx.createLinearGradient(centerX - 12, centerY - 2, centerX + 12, centerY + 12);
        bodyGradient.addColorStop(0, '#4a3728');
        bodyGradient.addColorStop(0.5, '#2a1f18');
        bodyGradient.addColorStop(1, '#1a0f08');
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + 4, 13, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bristles
        ctx.strokeStyle = '#3a2f28';
        ctx.lineWidth = 2;
        for (let i = -10; i <= 10; i += 3) {
            ctx.beginPath();
            ctx.moveTo(centerX + i, centerY - 5);
            ctx.lineTo(centerX + i - 1, centerY - 9);
            ctx.stroke();
        }

        // Head
        const headGradient = ctx.createLinearGradient(centerX - 10, centerY - 5, centerX + 5, centerY + 5);
        headGradient.addColorStop(0, '#5a4738');
        headGradient.addColorStop(1, '#2a1f18');
        ctx.fillStyle = headGradient;
        ctx.beginPath();
        ctx.ellipse(centerX - 6, centerY + 2, 8, 6, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        const eyeColor = this.isAggro ? '#FF0000' : '#FFAA00';
        ctx.fillStyle = eyeColor;
        ctx.fillRect(centerX - 10, centerY - 1, 2.5, 2.5);
        ctx.fillRect(centerX - 4, centerY - 1, 2.5, 2.5);

        // Legs
        ctx.fillStyle = '#1a0f08';
        ctx.fillRect(centerX - 9, centerY + 14, 3, 5);
        ctx.fillRect(centerX - 3, centerY + 14, 3, 5);
        ctx.fillRect(centerX + 3, centerY + 14, 3, 5);
        ctx.fillRect(centerX + 9, centerY + 14, 3, 5);
    }

    drawWolf(ctx, centerX, centerY) {
        // Wilk - szary, smukły
        const bodyGradient = ctx.createLinearGradient(centerX - 14, centerY - 1, centerX + 8, centerY + 10);
        bodyGradient.addColorStop(0, '#5a6a7a');
        bodyGradient.addColorStop(0.5, '#3a4a5a');
        bodyGradient.addColorStop(1, '#2a3a4a');
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.ellipse(centerX - 2, centerY + 2, 14, 10, 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Head (ostrzejsze niż dzik)
        ctx.fillStyle = '#4a5a6a';
        ctx.beginPath();
        ctx.ellipse(centerX - 10, centerY - 2, 8, 7, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.fillStyle = '#3a4a5a';
        ctx.beginPath();
        ctx.moveTo(centerX - 14, centerY - 5);
        ctx.lineTo(centerX - 16, centerY - 12);
        ctx.lineTo(centerX - 12, centerY - 6);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(centerX - 8, centerY - 6);
        ctx.lineTo(centerX - 6, centerY - 13);
        ctx.lineTo(centerX - 4, centerY - 6);
        ctx.closePath();
        ctx.fill();

        // Eyes
        ctx.fillStyle = this.isAggro ? '#FF4444' : '#FFBB00';
        ctx.fillRect(centerX - 11, centerY - 3, 2, 2);
        ctx.fillRect(centerX - 5, centerY - 3, 2, 2);

        // Teeth
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX - 11, centerY + 2);
        ctx.lineTo(centerX - 11, centerY + 4);
        ctx.moveTo(centerX - 9, centerY + 2);
        ctx.lineTo(centerX - 9, centerY + 4);
        ctx.stroke();

        // Legs
        ctx.fillStyle = '#2a3a4a';
        ctx.fillRect(centerX - 10, centerY + 12, 2.5, 5);
        ctx.fillRect(centerX - 4, centerY + 12, 2.5, 5);
        ctx.fillRect(centerX + 2, centerY + 12, 2.5, 5);
        ctx.fillRect(centerX + 8, centerY + 12, 2.5, 5);

        // Tail
        ctx.strokeStyle = '#3a4a5a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(centerX + 10, centerY + 3);
        ctx.quadraticCurveTo(centerX + 15, centerY, centerX + 14, centerY - 8);
        ctx.stroke();
    }

    drawBear(ctx, centerX, centerY) {
        // Niedźwiedź - duży, brązowy
        const bodyGradient = ctx.createLinearGradient(centerX - 14, centerY - 3, centerX + 12, centerY + 14);
        bodyGradient.addColorStop(0, '#6b4423');
        bodyGradient.addColorStop(0.5, '#4a2f1a');
        bodyGradient.addColorStop(1, '#2a1a0a');
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.ellipse(centerX + 1, centerY + 5, 15, 13, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head (duża)
        ctx.fillStyle = '#5a3a1a';
        ctx.beginPath();
        ctx.ellipse(centerX - 8, centerY, 10, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Ears
        ctx.fillStyle = '#3a2a0a';
        ctx.beginPath();
        ctx.arc(centerX - 14, centerY - 7, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX - 2, centerY - 8, 4, 0, Math.PI * 2);
        ctx.fill();

        // Eyes (małe i groźne)
        ctx.fillStyle = this.isAggro ? '#FF2222' : '#FFAA00';
        ctx.fillRect(centerX - 11, centerY - 1, 1.5, 1.5);
        ctx.fillRect(centerX - 3, centerY - 1, 1.5, 1.5);

        // Snout
        ctx.fillStyle = '#4a2a0a';
        ctx.beginPath();
        ctx.ellipse(centerX - 11, centerY + 2, 3, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Claws
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            const x = centerX - 10 + i * 4;
            ctx.beginPath();
            ctx.moveTo(x, centerY + 18);
            ctx.lineTo(x, centerY + 21);
            ctx.stroke();
        }

        // Legs (grube)
        ctx.fillStyle = '#2a1a0a';
        ctx.fillRect(centerX - 11, centerY + 15, 4, 6);
        ctx.fillRect(centerX - 3, centerY + 15, 4, 6);
        ctx.fillRect(centerX + 5, centerY + 15, 4, 6);
        ctx.fillRect(centerX + 13, centerY + 15, 4, 6);
    }

    drawWhelp(ctx, centerX, centerY) {
        // Małe szczenię - młody wilk
        const bodyGradient = ctx.createLinearGradient(centerX - 10, centerY - 1, centerX + 6, centerY + 8);
        bodyGradient.addColorStop(0, '#6a7a8a');
        bodyGradient.addColorStop(1, '#3a4a5a');
        ctx.fillStyle = bodyGradient;
        ctx.beginPath();
        ctx.ellipse(centerX - 1, centerY + 1, 10, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head (małe)
        ctx.fillStyle = '#5a6a7a';
        ctx.beginPath();
        ctx.ellipse(centerX - 7, centerY - 2, 6, 5, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Small ears
        ctx.fillStyle = '#4a5a6a';
        ctx.beginPath();
        ctx.arc(centerX - 10, centerY - 5, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Eyes (wielkie jak u szczeniąt)
        ctx.fillStyle = this.isAggro ? '#FF5555' : '#FFCC00';
        ctx.fillRect(centerX - 8, centerY - 3, 1.5, 1.5);
        ctx.fillRect(centerX - 4, centerY - 3, 1.5, 1.5);

        // Legs (cienkie)
        ctx.fillStyle = '#3a4a5a';
        ctx.fillRect(centerX - 8, centerY + 8, 2, 4);
        ctx.fillRect(centerX - 2, centerY + 8, 2, 4);
        ctx.fillRect(centerX + 4, centerY + 8, 2, 4);
    }

    drawWasp(ctx, centerX, centerY) {
        // Osa - latająca, żółto-czarna
        // Abdomen
        ctx.fillStyle = '#FFD700';
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.ellipse(centerX - 1 + i * 1.5, centerY + 2, 4, 6 - i * 1.5, 0, 0, Math.PI * 2);
            if (i % 2 === 0) ctx.fillStyle = '#FFD700';
            else ctx.fillStyle = '#000';
            ctx.fill();
        }

        // Thorax (środek ciała)
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(centerX - 2, centerY - 3, 4, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head (mały)
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(centerX - 2, centerY - 9, 2, 0, Math.PI * 2);
        ctx.fill();

        // Eyes (duże)
        ctx.fillStyle = this.isAggro ? '#FF3333' : '#00FF00';
        ctx.beginPath();
        ctx.arc(centerX - 3.5, centerY - 8.5, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX - 0.5, centerY - 8.5, 1, 0, Math.PI * 2);
        ctx.fill();

        // Sting
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(centerX - 1, centerY + 9);
        ctx.lineTo(centerX - 1, centerY + 13);
        ctx.stroke();

        // Wings
        ctx.strokeStyle = 'rgba(200, 220, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(centerX - 6, centerY - 2, 3, 4, 0.3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(centerX + 2, centerY - 2, 3, 4, -0.3, 0, Math.PI * 2);
        ctx.stroke();

        // Legs
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(centerX - 2 - i * 1.5, centerY);
            ctx.lineTo(centerX - 4 - i * 2, centerY + 3);
            ctx.stroke();
        }
    }

    drawSnake(ctx, centerX, centerY) {
        // Wąż - wężowy kształt
        // Body (przede wszystkim)
        ctx.strokeStyle = '#2a6b2a';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(centerX + 10, centerY - 2);
        ctx.quadraticCurveTo(centerX + 5, centerY - 8, centerX - 2, centerY - 5);
        ctx.quadraticCurveTo(centerX - 8, centerY - 2, centerX - 10, centerY + 5);
        ctx.stroke();

        // Pattern na ciele (prążki)
        ctx.strokeStyle = '#1a4a1a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX + 8, centerY - 3);
        ctx.quadraticCurveTo(centerX + 4, centerY - 7, centerX - 2, centerY - 6);
        ctx.stroke();

        // Head (trójkątny)
        ctx.fillStyle = '#2a7a2a';
        ctx.beginPath();
        ctx.moveTo(centerX - 10, centerY + 2);
        ctx.lineTo(centerX - 12, centerY + 6);
        ctx.lineTo(centerX - 8, centerY + 6);
        ctx.closePath();
        ctx.fill();

        // Eyes (żółte)
        ctx.fillStyle = this.isAggro ? '#FF4444' : '#FFDD00';
        ctx.beginPath();
        ctx.arc(centerX - 11, centerY + 3, 1, 0, Math.PI * 2);
        ctx.fill();

        // Tongue
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(centerX - 10, centerY + 5);
        ctx.lineTo(centerX - 13, centerY + 7);
        ctx.moveTo(centerX - 10, centerY + 5);
        ctx.lineTo(centerX - 7, centerY + 7);
        ctx.stroke();

        // Tail (zwijany)
        ctx.strokeStyle = '#2a6b2a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(centerX + 10, centerY - 2);
        ctx.quadraticCurveTo(centerX + 14, centerY + 2, centerX + 12, centerY + 8);
        ctx.stroke();
    }

    drawHPBar(ctx) {
        const barWidth = 32;
        const barHeight = 5;
        const x = this.x + this.width / 2 - barWidth / 2;
        const y = this.y - 14;

        // Background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(x - 2, y - 2, barWidth + 4, barHeight + 4);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - 2, y - 2, barWidth + 4, barHeight + 4);

        // HP fill
        const hpPercent = this.hp / this.maxHp;
        const gradient = ctx.createLinearGradient(x, y, x + barWidth, y);
        gradient.addColorStop(0, '#ff0000');
        gradient.addColorStop(0.5, '#ff6666');
        gradient.addColorStop(1, '#cc0000');
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth * hpPercent, barHeight);

        // Border
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, barWidth, barHeight);
    }

    takeDamage(damage) {
        const actualDamage = Math.max(1, damage - this.defense);
        this.hp = Math.max(0, this.hp - actualDamage);
        return actualDamage;
    }

    getDistance(x, y) {
        const dx = this.x - x;
        const dy = this.y - y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

class Battle {
    constructor(player, enemy) {
        this.player = player;
        this.enemy = enemy;
        this.log = ["Walka się zaczyna! Atakuj gdy możesz!"];
        this.battleActive = true;

        // Cooldown systemy
        this.playerAttackCd = 0;
        this.playerSkill1Cd = 0;
        this.playerSkill2Cd = 0;

        this.enemyAttackCd = 2; // Wróg czeka 2 sekundy na początek

        // Umiejętności
        this.skills = {
            attack: { name: 'Atak', cd: 0.8, damage: 12, icon: '⚔' },
            skill1: { name: 'Gwóźdź lodowy', cd: 3, damage: 25, icon: '❄' },
            skill2: { name: 'Eksplozja energii', cd: 5, damage: 35, icon: '⚡' }
        };
    }

    update(deltaTime = 0.016) {
        // Zmniejszaj cooldowny
        this.playerAttackCd = Math.max(0, this.playerAttackCd - deltaTime);
        this.playerSkill1Cd = Math.max(0, this.playerSkill1Cd - deltaTime);
        this.playerSkill2Cd = Math.max(0, this.playerSkill2Cd - deltaTime);
        this.enemyAttackCd = Math.max(0, this.enemyAttackCd - deltaTime);

        // AI wroga - atakuje w regularnych odstępach (tylko jeśli żywy)
        if (this.enemyAttackCd <= 0 && this.enemy.hp > 0) {
            this.enemyAttack();
            this.enemyAttackCd = 2 + Math.random();
        }

        // Sprawdź koniec walki
        if (this.player.hp <= 0) {
            this.log.push("✗ Zostałeś pokonany!");
            this.battleActive = false;
        }
        if (this.enemy.hp <= 0) {
            this.log.push("✓ Dzik został pokonany!");
            this.log.push("+ 15 EXP zdobyte!");
            this.log.push("+ 20 Gold!");
            this.player.addExp(15);
            this.player.addGold(20);
            this.battleActive = false;
        }
    }

    playerAttack() {
        if (this.playerAttackCd > 0) return;

        const damage = 12 + Math.floor(Math.random() * 8);
        const actualDamage = this.enemy.takeDamage(damage);
        
        this.log.push(`⚔ Atakujesz za ${actualDamage} DMG!`);
        this.playerAttackCd = this.skills.attack.cd;
    }

    playerSkill1() {
        if (this.playerSkill1Cd > 0) return;

        const damage = 25 + Math.floor(Math.random() * 10);
        const actualDamage = this.enemy.takeDamage(damage);
        
        this.log.push(`❄ Gwóźdź lodowy! ${actualDamage} DMG!`);
        this.playerSkill1Cd = this.skills.skill1.cd;
    }

    playerSkill2() {
        if (this.playerSkill2Cd > 0) return;

        const damage = 35 + Math.floor(Math.random() * 15);
        const actualDamage = this.enemy.takeDamage(damage);
        
        this.log.push(`⚡ Eksplozja energii! ${actualDamage} DMG!`);
        this.playerSkill2Cd = this.skills.skill2.cd;
    }

    enemyAttack() {
        const damage = 8 + Math.floor(Math.random() * 5);
        this.player.takeDamage(damage);
        
        this.log.push(`▸ Dzik cię zaatakował za ${damage} DMG!`);
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CONFIG.CANVAS_WIDTH;
        this.canvas.height = CONFIG.CANVAS_HEIGHT;

        // Minimap
        this.minimapCanvas = document.getElementById('minimap');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        this.minimapCanvas.width = 150;
        this.minimapCanvas.height = 150;

        // Wygeneruj mapę trawy raz
        this.mapGrassPattern = this.generateGrassPattern();

        this.gameRunning = false;
        this.player = null;
        this.npcs = [];
        this.enemies = []; // Lista wrogów
        this.currentEnemy = null; // Aktualny wróg w walce
        this.keys = {};
        this.battle = null;
        this.trees = [];
        this.flowers = [];
        this.quests = [];
        this.activeQuests = [];
        this.desertParticles = [];  // Statyczne cząstki piasku
        this.desertSwirls = [];     // Statyczne zawijasy wiatru
        this.desertPathRocks = [];  // Statyczne skały na ścieżce
        this.cactiDetails = {};     // Wygenerowane detale kaktusów
        this.flowerDetails = {};    // Wygenerowane detale kwiatów
        this.treeDetails = {};      // Wygenerowane detale drzew (stabilne tekstury)

        // Multiplayer
        this.otherPlayers = {};     // Inni gracze online

        // Camera system
        this.cameraX = 0;
        this.cameraY = 0;
        this.cameraOffsetX = CONFIG.CANVAS_WIDTH / 2;
        this.cameraOffsetY = CONFIG.CANVAS_HEIGHT / 2;
        this.cameraSmooth = 0.1; // Smooth camera follow (0-1, higher = faster)

        this.setupEventListeners();
    }

    // ============================================
    // INICJALIZACJA
    // ============================================

    setupEventListeners() {
        // Menu
        const newGameBtn = document.getElementById('newGameBtn');
        if (newGameBtn) {
            console.log('[Game] Attaching click listener to newGameBtn');
            newGameBtn.addEventListener('click', () => {
                console.log('[Game] newGameBtn clicked!');
                this.startGame();
            });
        } else {
            console.error('[Game] newGameBtn element not found during setup!');
        }

        // Klawiatura
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Pause menu handlers
        this.setupPauseMenuHandlers();

        // Walka - skill bar
        document.getElementById('skillBtn1').addEventListener('click', () => this.handleBattleAction('attack'));
        document.getElementById('skillBtn2').addEventListener('click', () => this.handleBattleAction('skill1'));
        document.getElementById('skillBtn3').addEventListener('click', () => this.handleBattleAction('skill2'));
        
        // Też klawiszami 1,2,3
        document.addEventListener('keydown', (e) => {
            if (!this.battle) return;
            if (e.key === '1') this.handleBattleAction('attack');
            if (e.key === '2') this.handleBattleAction('skill1');
            if (e.key === '3') this.handleBattleAction('skill2');
        });

        // Canvas click dla interakcji z NPC
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));

        // Equipment panel tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                document.querySelectorAll('.equipment-tab').forEach(tab => tab.classList.remove('active'));
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.getElementById(tabName + 'Tab').classList.add('active');
                e.target.classList.add('active');
            });
        });

        // Modal buttons
        const modalAccept = document.getElementById('modalAccept');
        const modalReject = document.getElementById('modalReject');
        const modalClaim = document.getElementById('modalClaim');
        const modalClose = document.getElementById('modalClose');

        if (modalAccept) modalAccept.addEventListener('click', () => {
            if (this._modalState && this._modalState.type === 'offer') {
                this.acceptQuest(this._modalState.quest.id);
                this.hideQuestModal();
                alert(`${this._modalState.npc.name}: Przyjąłeś misję!`);
            }
        });
        if (modalReject) modalReject.addEventListener('click', () => { this.hideQuestModal(); });
        if (modalClaim) modalClaim.addEventListener('click', () => {
            if (this._modalState && this._modalState.type === 'claim') {
                this.claimQuestReward(this._modalState.quest.id);
                this.hideQuestModal();
                alert(`${this._modalState.npc.name}: Otrzymałeś nagrodę!`);
            }
        });
        if (modalClose) modalClose.addEventListener('click', () => { this.hideQuestModal(); });

        // Close buttons for panels
        const closeInventoryBtn = document.getElementById('closeInventoryBtn');
        const closeEquipmentBtn = document.getElementById('closeEquipmentBtn');
        
        if (closeInventoryBtn) {
            closeInventoryBtn.addEventListener('click', () => {
                const invPanel = document.getElementById('inventoryPanel');
                if (invPanel) invPanel.classList.remove('visible');
            });
        }
        
        if (closeEquipmentBtn) {
            closeEquipmentBtn.addEventListener('click', () => {
                const eqPanel = document.getElementById('equipmentPanel');
                if (eqPanel) eqPanel.classList.remove('visible');
            });
        }

        // Dialogue continue button
        const dialogueContinue = document.getElementById('dialogueContinue');
        if (dialogueContinue) {
            dialogueContinue.addEventListener('click', () => this.continueDialogue());
        }

        // HUD Toggle button
        const hudToggleBtn = document.getElementById('hudToggleBtn');
        if (hudToggleBtn) {
            hudToggleBtn.addEventListener('click', () => {
                const hud = document.getElementById('hud');
                if (hud) hud.classList.toggle('visible');
            });
        }
    }

    handleCanvasClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        // Przelicz koordynaty ze względu na kamerę
        const worldClickX = clickX + this.cameraX;
        const worldClickY = clickY + this.cameraY;

        // Sprawdź czy kliknięto na NPC
        for (let npc of this.npcs) {
            const dx = worldClickX - (npc.x + npc.width / 2);
            const dy = worldClickY - (npc.y + npc.height / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 25) {
                this.openQuestMenu(npc);
                break;
            }
        }
    }

    // Show/hide quest modal
    showQuestModal(npc, payload) {
        this._modalState = Object.assign({ npc }, payload || {});
        const modal = document.getElementById('questModal');
        if (!modal) return;
        const title = document.getElementById('modalTitle');
        const desc = document.getElementById('modalDesc');
        const expEl = document.getElementById('modalExp');
        const goldEl = document.getElementById('modalGold');
        const acceptBtn = document.getElementById('modalAccept');
        const rejectBtn = document.getElementById('modalReject');
        const claimBtn = document.getElementById('modalClaim');

        if (payload.type === 'claim') {
            title.textContent = `Odbierz nagrodę od ${npc.name}`;
            desc.textContent = payload.quest.name + '\n' + (payload.quest.description || '');
            expEl.textContent = payload.quest.expReward || 0;
            goldEl.textContent = payload.quest.goldReward || 0;
            acceptBtn.style.display = 'none';
            rejectBtn.style.display = 'none';
            claimBtn.style.display = 'inline-block';
        } else if (payload.type === 'offer') {
            title.textContent = `Nowa misja u ${npc.name}`;
            desc.textContent = payload.quest.name + '\n' + (payload.quest.description || '');
            expEl.textContent = payload.quest.expReward || 0;
            goldEl.textContent = payload.quest.goldReward || 0;
            acceptBtn.style.display = 'inline-block';
            rejectBtn.style.display = 'inline-block';
            claimBtn.style.display = 'none';
        }

        modal.classList.remove('hidden');
    }

    hideQuestModal() {
        const modal = document.getElementById('questModal');
        if (!modal) return;
        modal.classList.add('hidden');
        this._modalState = null;
    }

    openQuestMenu(npc) {
        // Najpierw pokaż dialog
        this.showDialogue(npc);
    }

    showDialogue(npc) {
        this._currentNPC = npc;
        const modal = document.getElementById('dialogueModal');
        const npcNameEl = document.getElementById('dialogueNPCName');
        const textEl = document.getElementById('dialogueText');
        
        npcNameEl.textContent = npc.name;
        textEl.textContent = npc.dialogue;
        
        modal.classList.remove('hidden');
    }

    continueDialogue() {
        const npc = this._currentNPC;
        const modal = document.getElementById('dialogueModal');
        
        if (!npc) return;
        
        modal.classList.add('hidden');
        
        // W zależności od typu NPC
        if (npc.type === 'vendor') {
            // Otwórz sklep
            setTimeout(() => {
                const eqPanel = document.getElementById('equipmentPanel');
                if (eqPanel) {
                    // Przejdź na tab sklepu
                    document.querySelectorAll('.equipment-tab').forEach(tab => tab.classList.remove('active'));
                    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    document.getElementById('shopTab').classList.add('active');
                    document.querySelector('[data-tab="shop"]').classList.add('active');
                    
                    // Pokaż panel ekwipunku
                    eqPanel.classList.add('visible');
                }
            }, 50);
        } else {
            // Pokaż misje
            setTimeout(() => {
                this.showQuestFromNPC(npc);
            }, 50);
        }
    }

    showQuestFromNPC(npc) {
        // Check for completed quests to claim
        const completedQuests = npc.questIds
            .map(id => this.quests[id])
            .filter(q => q && q.completed && !q.rewardClaimed);

        if (completedQuests.length > 0) {
            // Show claim modal for first completed
            const quest = completedQuests[0];
            this.showQuestModal(npc, { type: 'claim', quest });
            return;
        }

        // Available new quests (not accepted yet)
        const availableQuests = npc.questIds
            .map(id => this.quests[id])
            .filter(q => q && !q.completed && this.player.level >= q.requiredLevel && !this.activeQuests.some(aq => aq.id === q.id));

        if (availableQuests.length === 0) {
            // Inform player no quests available
            this.showQuestModal(npc, { type: 'offer', quest: { name: 'Brak nowych misji', description: `${npc.name}: Nie mam dla ciebie nowych misji!`, expReward: 0, goldReward: 0 } });
            return;
        }

        // Show offer modal for first available quest
        this.showQuestModal(npc, { type: 'offer', quest: availableQuests[0] });
    }

    buyFromShop(item) {
        const cost = item.cost;
        if (!this.player.gold) this.player.gold = 0;

        if (this.player.gold < cost) {
            alert(`Nie masz wystarczająco złota! Potrzebujesz ${cost}, a masz ${this.player.gold}`);
            return;
        }

        // Spróbuj dodać do ekwipunku
        const newItem = new Item(item.name, item.icon, item.type, null, 1, item.atk, item.def);
        if (this.player.inventory.addItem(newItem)) {
            this.player.gold -= cost;
            alert(`Kupiłeś: ${item.icon} ${item.name} za ${cost} złota!\nZłoto: ${this.player.gold}`);
            this.updateHUD();
            this.updateShopDisplay();
        } else {
            alert('Ekwipunek jest pełny!');
        }
    }

    handleBattleAction(action) {
        if (!this.battle) return;

        if (action === 'attack') this.battle.playerAttack();
        if (action === 'skill1') this.battle.playerSkill1();
        if (action === 'skill2') this.battle.playerSkill2();

        if (!this.battle.battleActive) {
            setTimeout(() => this.endBattle(), 1000);
        }

        this.updateBattleHUD();
    }

    startGame() {
        try {
            console.log('[Game] startGame() called');
            
            // Ukryj menu, pokaż grę
            const mainMenu = document.getElementById('mainMenu');
            const gameContainer = document.getElementById('gameContainer');
            const loadingScreen = document.getElementById('loadingScreen');
            
            console.log('[Game] Elements found:', { mainMenu: !!mainMenu, gameContainer: !!gameContainer, loadingScreen: !!loadingScreen });
            
            if (mainMenu) mainMenu.classList.add('hidden');
            if (gameContainer) gameContainer.classList.remove('hidden');
            
            // Pokaż ekran ładowania, potem wybór postaci
            this.showLoadingScreen();
            this.startLoadingSequence(5000).then(() => {
                console.log('[Game] Loading sequence complete, showing char modal');
                this.hideLoadingScreen();
                // Load/create character slots and show character modal
                this.charSlots = window.Autosave ? window.Autosave.loadSlots() : [null, null, null];
                console.log('[Game] Character slots loaded:', this.charSlots);
                this.showCharModal();
                
                // Inicjalizuj Firebase multiplayer
                this.initMultiplayer();
            });
        } catch(e) {
            console.error('[Game] Error in startGame():', e);
        }
    }

    showLoadingScreen() {
        const el = document.getElementById('loadingScreen');
        if (el) el.classList.remove('hidden');
    }

    hideLoadingScreen() {
        const el = document.getElementById('loadingScreen');
        if (el) el.classList.add('hidden');
    }

    startLoadingSequence(duration = 5000) {
        return new Promise((resolve) => {
            const fill = document.getElementById('loadingBarFill');
            if (!fill) { setTimeout(resolve, duration); return; }
            const start = Date.now();
            // Use setInterval to update the bar reliably across environments
            const interval = 50;
            const timer = setInterval(() => {
                const elapsed = Date.now() - start;
                const pct = Math.min(1, elapsed / duration);
                try { fill.style.width = (pct * 100) + '%'; } catch(e) {}
                if (pct >= 1) {
                    clearInterval(timer);
                    resolve();
                }
            }, interval);
        });
    }

    showCharModal() {
        const modal = document.getElementById('charModal');
        if (!modal) {
            console.error('[Game] charModal element not found!');
            return;
        }
        console.log('[Game] showCharModal() - removing hidden class from modal');
        modal.classList.remove('hidden');
        
        // populate slots
        if (!this.charSlots) this.charSlots = window.Autosave ? window.Autosave.loadSlots() : [null,null,null];
        const container = document.getElementById('charSlots');
        if (!container) {
            console.error('[Game] charSlots container not found!');
            return;
        }
        console.log('[Game] Rendering character slots:', this.charSlots);
        
        container.innerHTML = '';
        for (let i = 0; i < 3; i++) {
            const slot = this.charSlots[i];
            const div = document.createElement('div');
            div.className = 'char-slot';
            div.dataset.index = i;
            if (slot) {
                const classEmoji = slot.className === 'Wojownik' ? '🛡️' : slot.className === 'Hunter' ? '🏹' : '🔮';
                const raceEmoji = slot.race === 'Orc' ? '🟢' : '👤';
                div.innerHTML = `<div class="name">${slot.name}</div><div class="cls">${raceEmoji} ${slot.race || 'Human'} | ${classEmoji} ${slot.className}</div><div class="char-actions"><button class="small-btn select">Wybierz</button><button class="small-btn delete">Usuń</button></div>`;
            } else {
                div.innerHTML = `<div class="name">Pusty slot</div><div class="cls">Brak postaci</div><div class="char-actions"><button class="small-btn create">Stwórz</button></div>`;
            }
            container.appendChild(div);
        }

        // attach handlers
        try {
            container.querySelectorAll('.small-btn.create').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    try {
                        const idx = parseInt(e.target.closest('.char-slot').dataset.index);
                        this.promptCreateCharacter(idx);
                    } catch(err) {
                        console.error('[Game] Error in create button:', err);
                    }
                });
            });
            container.querySelectorAll('.small-btn.delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    try {
                        const idx = parseInt(e.target.closest('.char-slot').dataset.index);
                        if (confirm('Usunąć tę postać?')) {
                            this.charSlots[idx] = null;
                            if (window.Autosave) window.Autosave.saveSlots(this.charSlots);
                            this.showCharModal();
                        }
                    } catch(err) {
                        console.error('[Game] Error in delete button:', err);
                    }
                });
            });
            container.querySelectorAll('.small-btn.select').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    try {
                        const idx = parseInt(e.target.closest('.char-slot').dataset.index);
                        this.selectCharacter(idx);
                    } catch(err) {
                        console.error('[Game] Error in select button:', err);
                    }
                });
            });

            const closeBtn = document.getElementById('modalCloseChar');
            if (closeBtn) closeBtn.onclick = () => { modal.classList.add('hidden'); };
        } catch(err) {
            console.error('[Game] Error attaching handlers in showCharModal:', err);
        }
    }

    promptCreateCharacter(index) {
        // Open inline create UI inside the char modal
        console.log('[Game] promptCreateCharacter() for slot', index);
        this.showCreateCharacterUI(index);
    }

    showCreateCharacterUI(index) {
        const modal = document.getElementById('charModal');
        if (!modal) return;
        const container = document.getElementById('charSlots');
        container.innerHTML = '';

        const panel = document.createElement('div');
        panel.className = 'create-panel';

        // RACE SELECTION
        const raceLabel = document.createElement('div');
        raceLabel.style.fontSize = '1.1rem';
        raceLabel.style.fontWeight = 'bold';
        raceLabel.style.marginBottom = '8px';
        raceLabel.textContent = 'Wybierz Rasę:';
        panel.appendChild(raceLabel);

        const raceGrid = document.createElement('div');
        raceGrid.className = 'class-grid';

        const races = [
            { key: 'Human', name: 'Ludzie', desc: 'Zrównoważeni', img: '👤' },
            { key: 'Orc', name: 'Orki', desc: 'Silni i brutalny', img: '🟢' }
        ];

        let selectedRace = races[0].key;

        races.forEach(race => {
            const card = document.createElement('div');
            card.className = 'class-card';
            card.dataset.key = race.key;
            card.innerHTML = `<div class="cls-emoji" style="font-size:48px">${race.img}</div><div class="cls-name">${race.name}</div><div class="cls-desc">${race.desc}</div>`;
            card.addEventListener('click', () => {
                selectedRace = race.key;
                raceGrid.querySelectorAll('.class-card').forEach(c => c.classList.remove('class-selected'));
                card.classList.add('class-selected');
            });
            raceGrid.appendChild(card);
        });

        // mark default
        setTimeout(() => { const first = raceGrid.querySelector('.class-card'); if (first) first.classList.add('class-selected'); }, 10);

        panel.appendChild(raceGrid);

        // CLASS SELECTION
        const classLabel = document.createElement('div');
        classLabel.style.fontSize = '1.1rem';
        classLabel.style.fontWeight = 'bold';
        classLabel.style.marginTop = '15px';
        classLabel.style.marginBottom = '8px';
        classLabel.textContent = 'Wybierz Klasę:';
        panel.appendChild(classLabel);

        const classGrid = document.createElement('div');
        classGrid.className = 'class-grid';

        const classes = [
            { key: 'Wojownik', name: 'Wojownik', desc: 'Tank blisko', img: '🛡️' },
            { key: 'Hunter', name: 'Hunter', desc: 'Strzały z dystansu', img: '🏹' },
            { key: 'Mag', name: 'Mag', desc: 'Magia obszarowa', img: '🔮' }
        ];

        let selectedClass = classes[0].key;

        classes.forEach(cls => {
            const card = document.createElement('div');
            card.className = 'class-card';
            card.dataset.key = cls.key;
            card.innerHTML = `<div class="cls-emoji" style="font-size:48px">${cls.img}</div><div class="cls-name">${cls.name}</div><div class="cls-desc">${cls.desc}</div>`;
            card.addEventListener('click', () => {
                selectedClass = cls.key;
                classGrid.querySelectorAll('.class-card').forEach(c => c.classList.remove('class-selected'));
                card.classList.add('class-selected');
            });
            classGrid.appendChild(card);
        });

        // mark default
        setTimeout(() => { const first = classGrid.querySelector('.class-card'); if (first) first.classList.add('class-selected'); }, 10);

        panel.appendChild(classGrid);

        const nameRow = document.createElement('div');
        nameRow.className = 'create-row';
        nameRow.innerHTML = `<input id="newCharName" type="text" placeholder="Nazwa postaci" value="Bohater ${index+1}" />`;

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'create-confirm';
        confirmBtn.textContent = 'Stwórz postać';
        confirmBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('newCharName');
            const name = nameInput ? nameInput.value.trim() : '';
            if (!name) { alert('Wpisz nazwę postaci'); return; }
            // find selected race and class
            const raceEl = raceGrid.querySelector('.class-card.class-selected');
            const classEl = classGrid.querySelector('.class-card.class-selected');
            const raceKey = raceEl ? raceEl.dataset.key : 'Human';
            const classKey = classEl ? classEl.dataset.key : 'Wojownik';
            this.charSlots[index] = { name: name, race: raceKey, className: classKey };
            if (window.Autosave) window.Autosave.saveSlots(this.charSlots);
            this.showCharModal();
        });

        nameRow.appendChild(confirmBtn);
        panel.appendChild(nameRow);
        container.appendChild(panel);
    }

    selectCharacter(index) {
        const slot = this.charSlots[index];
        if (!slot) return;
        this.selectedChar = slot;
        this._currentCharSlotIndex = index;
        // hide modal and show gameContainer
        document.getElementById('charModal').classList.add('hidden');
        document.getElementById('gameContainer').classList.remove('hidden');
        // Reset game state if already running
        this.gameRunning = false;
        if (this._gameLoopId) cancelAnimationFrame(this._gameLoopId);
        // Now initialize game world and player with selected class
        this.initGame();
        this.applySelectedClassToPlayer();
        // Try to load saved game state for this character
        if (window.Autosave) {
            const savedState = window.Autosave.loadGameState(index);
            if (savedState) {
                this.restoreGameState(savedState);
            } else {
                // First time: accept default first quest if available
                this.acceptQuest(0);
            }
        } else {
            this.acceptQuest(0);
        }
        this.gameRunning = true;
        // start/restart autosave loop
        if (this._autosaveInterval) clearInterval(this._autosaveInterval);
        this._autosaveInterval = setInterval(() => {
            this.saveGameState();
        }, 15000);
        this.gameLoop();
    }

    applySelectedClassToPlayer() {
        if (!this.selectedChar || !this.player) return;
        const cls = this.selectedChar.className || 'Wojownik';
        const race = this.selectedChar.race || 'Human';
        this.player.className = cls;
        this.player.race = race;
        if (cls === 'Wojownik') {
            this.player.maxHp = 140; this.player.hp = this.player.maxHp; this.player.speed = 3;
        } else if (cls === 'Hunter') {
            this.player.maxHp = 110; this.player.hp = this.player.maxHp; this.player.speed = 4;
        } else if (cls === 'Mag') {
            this.player.maxHp = 80; this.player.hp = this.player.maxHp; this.player.speed = 3.2;
        }
        // Bonus dla Orków
        if (race === 'Orc') {
            this.player.maxHp = Math.floor(this.player.maxHp * 1.2);
            this.player.hp = this.player.maxHp;
        }
        // update HUD immediately
        this.updateHUD();
    }

    initGame() {
        // Utwórz gracza
        this.player = new Player(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
        this.player.gold = 500;  // Starter gold

        // Utwórz misje (race-specific)
        this.initQuests();

        // Utwórz 3 NPC z różnymi misjami
        const race = this.selectedChar ? this.selectedChar.race || 'Human' : 'Human';
        if (race === 'Human') {
            // Ludzie: Kravis (misje 0-2), Mira (misje 3-5), Olaf (misje 6-9)
            this.npcs = [
                new NPC(300, 300, "Kravis Żelazny", [0, 1, 2], 'quest', "Witaj wojowniku! Mam dla ciebie misje dla młodych!"),
                new NPC(500, 350, "Mira Handlarka", [3, 4, 5], 'quest', "Cześć przyjacielu! Mam dla ciebie interesujące zadania!"),
                new NPC(400, 500, "Olaf Łowca", [6, 7, 8, 9], 'quest', "Aha! Silny wyglądzisz. Mam dla ciebie niebezpieczne misje!")
            ];
        } else {
            // Orki: Grok (misje 0-2), Urga (misje 3-5), Drog (misje 6-9)
            this.npcs = [
                new NPC(300, 300, "Grok Zwycięzca", [0, 1, 2], 'quest', "Witaj, młody wojowniku! Zacznij od tych zadań!"),
                new NPC(500, 350, "Urga Szamanka", [3, 4, 5], 'quest', "Magia i bestie czekają! Czy jesteś gotów?"),
                new NPC(400, 500, "Drog Myśliwy", [6, 7, 8, 9], 'quest', "Wielkie bestie czekają na mocnych wojowników!")
            ];
        }

        // Generuj 25 potworów na całej mapie
        this.generateEnemies();

        // Wygeneruj drzewa
        this.generateTrees();

        // Wygeneruj kwiaty
        this.generateFlowers();

        // Budynki wioski (blokady + teleport do wnętrza żółtego domu)
        this.villageBuildings = this.createVillageBuildings();

        // Konfiguracja małej mapy wnętrza
        this.interiorMapSize = { width: 900, height: 600 };
        this.interiorSpawn = {
            x: this.interiorMapSize.width / 2 - this.player.width / 2,
            y: this.interiorMapSize.height - 220
        };
        const yellowHouse = this.getVillageBuildingByName('yellowHouse');
        const doorCenterX = yellowHouse ? yellowHouse.doorCenterX : CONFIG.CANVAS_WIDTH / 2;
        const groundAfterDoor = yellowHouse ? yellowHouse.y + yellowHouse.height + 8 : CONFIG.CANVAS_HEIGHT / 2;
        this.interiorReturnDest = {
            x: doorCenterX - this.player.width / 2,
            y: groundAfterDoor
        };
        this.interiorExitZone = {
            x: this.interiorMapSize.width / 2 - 60,
            y: this.interiorMapSize.height - 150,
            width: 120,
            height: 120
        };

        // Lada w sklepie (wnętrze żółtego domu) - wąska bariera
        this.interiorCounter = {
            x: this.interiorMapSize.width - 220,
            y: 80,
            width: 50,
            height: this.interiorMapSize.height - 240
        };

        // NPC Handlarz Uzbrojenia za ladą (po prawej stronie lady)
        this.interiorNPC = new NPC(
            this.interiorCounter.x + this.interiorCounter.width + 30,
            this.interiorCounter.y + this.interiorCounter.height / 2 - 15,
            "Handlarz Uzbrojenia",
            [],
            'shop',
            "Witaj wędrowcze! Mam najlepsze wyposażenie w okolicy!"
        );

        // System dwóch map
        this.currentMap = 1; // 1 = wioska, 2 = miasto

        // Teleport na prawym brzegu mapy (do mapy 2)
        this.teleportZone = {
            x: MAP_WIDTH - 150,
            y: MAP_HEIGHT / 2 - 100,
            width: 100,
            height: 200,
            toMap: 2,
            destX: 300,
            destY: 400,
            active: true
        };

        // Teleport powrotny na mapie 2 (lewy brzeg)
        this.returnTeleportZone = {
            x: 50,
            y: MAP_HEIGHT / 2 - 100,
            width: 100,
            height: 200,
            toMap: 1,
            destX: MAP_WIDTH - 300,
            destY: MAP_HEIGHT / 2,
            active: true
        };
    }

    initQuests() {
        // 10 misji dla każdego poziomu 1-10 z skalowanymi nagrodami
        this.quests = [
            // LEVEL 1-3 (ŁATWO - wokół obozu)
            new Quest(0, "Małe Dziki", "Zbierz 3x Mięso Dzika", 1, 60, 40, "whelp", 3, new Item("Mięso Dzika", "🥩", "drop", 0)),
            new Quest(1, "Łowy Wilczków", "Zabij 4 Wilczków", 2, 85, 65, "whelp", 4, new Item("Pazury Wilczka", "🐾", "drop", 1)),
            new Quest(2, "Polowanie na Dziki", "Zabij 5 Dzików", 3, 120, 100, "boar", 5, new Item("Mięso Dzika", "🥩", "drop", 2)),
            
            // LEVEL 4-6 (ŚREDNIO - środek mapy)
            new Quest(3, "Węże Leśne", "Zbierz 4x Jad Węża", 4, 160, 140, "snake", 4, new Item("Jad Węża", "☠", "drop", 3)),
            new Quest(4, "Polowanie na Wilki", "Zabij 5 Wilków", 5, 200, 180, "wolf", 5, new Item("Futro Wilka", "🐺", "drop", 4)),
            new Quest(5, "Osadnictwo Os", "Zabij 6 Os", 6, 240, 220, "wasp", 6, new Item("Żądło Osy", "⚔", "drop", 5)),
            
            // LEVEL 7-10 (TRUDNO - koniec mapy)
            new Quest(6, "Polowanie na Niedźwiedzie", "Zabij 3 Niedźwiedzie", 7, 320, 300, "bear", 3, new Item("Szapa Niedźwiedzia", "🐾", "drop", 6)),
            new Quest(7, "Wielkie Polowanie", "Zabij 5 Wilków i 3 Niedźwiedzie", 8, 400, 380, "wolf", 5, new Item("Futro Wspaniałe", "👑", "drop", 7)),
            new Quest(8, "Mistrz Zwierołowu", "Zabij 10 różnych stworzeń", 9, 500, 450, "boar", 10, new Item("Medal Myśliwego", "🏅", "drop", 8)),
            new Quest(9, "Zagrożenie Lasu", "Zabij wszystkie groźne bestie (5 Niedźwiedzi, 10 Wilków)", 10, 700, 600, "bear", 15, new Item("Klucz Skarbu", "🔑", "drop", 9))
        ];
    }

    saveGameState() {
        if (!window.Autosave || this._currentCharSlotIndex === undefined) return;
        const state = {
            hp: this.player.hp,
            maxHp: this.player.maxHp,
            level: this.player.level,
            exp: this.player.exp,
            maxExp: this.player.maxExp,
            gold: this.player.gold || 0,
            x: this.player.x,
            y: this.player.y,
            inventory: this.player.inventory.slots.map(item => item ? {
                name: item.name,
                icon: item.icon,
                type: item.type,
                questId: item.questId,
                quantity: item.quantity
            } : null),
            activeQuests: this.activeQuests.map(q => ({
                id: q.id,
                completed: q.completed,
                progress: q.progress,
                rewardClaimed: q.rewardClaimed
            }))
        };
        window.Autosave.saveGameState(this._currentCharSlotIndex, state);
    }

    restoreGameState(state) {
        if (!state || !this.player) return;
        // Restore player stats
        this.player.hp = state.hp || this.player.maxHp;
        this.player.maxHp = state.maxHp || 100;
        this.player.level = state.level || 1;
        this.player.exp = state.exp || 0;
        this.player.maxExp = state.maxExp || 100;
        this.player.gold = state.gold || 0;
        this.player.x = state.x !== undefined ? state.x : CONFIG.CANVAS_WIDTH / 2;
        this.player.y = state.y !== undefined ? state.y : CONFIG.CANVAS_HEIGHT / 2;

        // Restore inventory
        if (state.inventory) {
            this.player.inventory.slots = state.inventory.map(itemData => {
                if (!itemData) return null;
                const item = new Item(itemData.name, itemData.icon, itemData.type, itemData.questId, itemData.quantity);
                return item;
            });
        }

        // Restore quests
        if (state.activeQuests) {
            this.activeQuests = state.activeQuests.map(qData => {
                const quest = this.quests[qData.id];
                if (quest) {
                    quest.completed = qData.completed;
                    quest.progress = qData.progress;
                    quest.rewardClaimed = qData.rewardClaimed;
                    return quest;
                }
                return null;
            }).filter(q => q !== null);
        }
    }

    generateEnemies() {
        // Generuj 25 potworów na całej mapie z podziałem na strefy trudności
        this.enemies = [];
        const enemyNames = {
            'boar': ['Dzik', 'Dzik Leśny', 'Śnieżny Dzik'],
            'wolf': ['Wilk', 'Wilk Szary', 'Wilk Alfa'],
            'bear': ['Niedźwiedź', 'Niedźwiedź Brunatny', 'Niedźwiedź Górski'],
            'whelp': ['Wilczek', 'Małe Szczenię', 'Szczenię Wilka'],
            'wasp': ['Osa', 'Osa Gigantyczna', 'Osa Warjatka'],
            'snake': ['Wąż', 'Wąż Żmija', 'Wąż Wędrujący']
        };
        
        // STREFA 1: OBÓZ (łatwa) - misje 1-3 (poziomy 1-3)
        // Pozycja gracza zwykle ok 2000x2000, obóz w okolicy ~1500-2500
        const campX = 1800, campY = 1800;
        const campRadius = 600; // Promień około obozu
        
        // Dziki i Wilki dla początkujących
        const easyTypes = ['boar', 'whelp', 'wolf'];
        for (let i = 0; i < 8; i++) {
            const type = easyTypes[i % easyTypes.length];
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * campRadius;
            const x = campX + Math.cos(angle) * distance;
            const y = campY + Math.sin(angle) * distance;
            
            const typeNames = enemyNames[type];
            const name = typeNames[Math.floor(Math.random() * typeNames.length)];
            
            const enemy = new Enemy(x, y, name, type);
            enemy.difficulty = 'easy'; // Łatwy
            this.enemies.push(enemy);
        }
        
        // STREFA 2: ŚREDNIOZAAWANSOWANA (1000-2500 od obozu)
        // Misje 4-6 (poziomy 4-6)
        for (let i = 0; i < 9; i++) {
            const types = ['snake', 'wasp', 'wolf', 'boar'];
            const type = types[i % types.length];
            
            // Losowa pozycja dalej od obozu
            const x = 500 + Math.random() * 2000;
            const y = 500 + Math.random() * 2000;
            
            // Jeśli zbyt blisko obozu, przesuń
            const distToCamp = Math.sqrt(Math.pow(x - campX, 2) + Math.pow(y - campY, 2));
            if (distToCamp < campRadius + 400) continue;
            
            const typeNames = enemyNames[type];
            const name = typeNames[Math.floor(Math.random() * typeNames.length)];
            
            const enemy = new Enemy(x, y, name, type);
            enemy.difficulty = 'medium'; // Średni
            this.enemies.push(enemy);
        }
        
        // STREFA 3: TRUDNA (koniec mapy 2500-4000)
        // Misje 7-10 (poziomy 7-10)
        for (let i = 0; i < 8; i++) {
            const types = ['bear', 'snake', 'wasp', 'wolf'];
            const type = types[i % types.length];
            
            // Losowa pozycja na końcu mapy
            const x = 2500 + Math.random() * 1300;
            const y = 2500 + Math.random() * 1300;
            
            const typeNames = enemyNames[type];
            const name = typeNames[Math.floor(Math.random() * typeNames.length)];
            
            const enemy = new Enemy(x, y, name, type);
            enemy.difficulty = 'hard'; // Trudny
            this.enemies.push(enemy);
        }
    }

    generateTrees() {
        // Rozrzuć 100 drzew po całej mapie
        this.trees = [];
        for (let i = 0; i < 100; i++) {
            this.trees.push({
                x: Math.random() * MAP_WIDTH,
                y: Math.random() * MAP_HEIGHT
            });
        }
    }

    generateFlowers() {
        // Rozrzuć 100 kwiatów po całej mapie
        this.flowers = [];
        const colors = ['#ff69b4', '#ffd700', '#ff6347', '#9370db'];
        for (let i = 0; i < 100; i++) {
            this.flowers.push({
                x: Math.random() * MAP_WIDTH,
                y: Math.random() * MAP_HEIGHT,
                color: colors[Math.floor(Math.random()*colors.length)]
            });
        }
    }

    getFlowerGroup(centerX, centerY) {
        const flowers = [];
        const colors = ['#ff69b4', '#ffd700', '#ff6347', '#9370db'];
        for (let i = 0; i < 5; i++) {
            flowers.push({
                x: centerX + (Math.random() - 0.5) * 60,
                y: centerY + (Math.random() - 0.5) * 60,
                color: colors[Math.floor(Math.random() * colors.length)]
            });
        }
        return flowers;
    }

    // ============================================
    // OBSŁUGA WEJŚCIA
    // ============================================

    handleKeyDown(e) {
        this.keys[e.key.toUpperCase()] = true;
        this.keys[e.key.toLowerCase()] = true;
        this.keys[e.key] = true;

        // Obsługa strzałek
        const key = e.key;
        if (key === 'ArrowUp') this.keys['UP'] = true;
        if (key === 'ArrowDown') this.keys['DOWN'] = true;
        if (key === 'ArrowLeft') this.keys['LEFT'] = true;
        if (key === 'ArrowRight') this.keys['RIGHT'] = true;

        // Obsługa inventoryu (klawisz I)
        if (key === 'i' || key === 'I') {
            const invPanel = document.getElementById('inventoryPanel');
            if (invPanel) {
                invPanel.classList.toggle('visible');
            }
        }

        // Obsługa ekwipunku (klawisz C)
        if (key === 'c' || key === 'C') {
            const eqPanel = document.getElementById('equipmentPanel');
            if (eqPanel) {
                eqPanel.classList.toggle('visible');
            }
        }

        // Interakcja z NPC (klawisz E)
        if (key === 'e' || key === 'E') {
            // znajdź najbliższego NPC w zasięgu
            let nearest = null;
            let bestDist = 9999;
            for (let npc of this.npcs) {
                const dx = (this.player.x + this.player.width/2) - (npc.x + npc.width/2);
                const dy = (this.player.y + this.player.height/2) - (npc.y + npc.height/2);
                const d = Math.sqrt(dx*dx + dy*dy);
                if (d < bestDist) { bestDist = d; nearest = npc; }
            }
            if (nearest && bestDist <= 80) {
                // Pokaż dialog od NPC
                this.openQuestMenu(nearest);
            }
        }

        // Pause menu (ESC)
        if (key === 'Escape') {
            // Zamknij dialog jeśli jest otwarty
            const dialogueModal = document.getElementById('dialogueModal');
            if (dialogueModal && !dialogueModal.classList.contains('hidden')) {
                dialogueModal.classList.add('hidden');
                return;
            }
            this.togglePauseMenu();
        }
    }

    handleKeyUp(e) {
        this.keys[e.key.toUpperCase()] = false;
        this.keys[e.key.toLowerCase()] = false;
        this.keys[e.key] = false;

        // Obsługa strzałek
        const key = e.key;
        if (key === 'ArrowUp') this.keys['UP'] = false;
        if (key === 'ArrowDown') this.keys['DOWN'] = false;
        if (key === 'ArrowLeft') this.keys['LEFT'] = false;
        if (key === 'ArrowRight') this.keys['RIGHT'] = false;
    }

    togglePauseMenu() {
        const pauseMenu = document.getElementById('pauseMenu');
        if (!pauseMenu) return;
        const isHidden = pauseMenu.classList.contains('hidden');
        if (isHidden) {
            pauseMenu.classList.remove('hidden');
        } else {
            pauseMenu.classList.add('hidden');
        }
    }

    setupPauseMenuHandlers() {
        const resumeBtn = document.getElementById('pauseResume');
        const selectCharBtn = document.getElementById('pauseSelectChar');
        const logoutBtn = document.getElementById('pauseLogout');

        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => {
                this.togglePauseMenu();
            });
        }

        if (selectCharBtn) {
            selectCharBtn.addEventListener('click', () => {
                // Stop the game loop
                this.gameRunning = false;
                if (this._autosaveInterval) clearInterval(this._autosaveInterval);
                // Hide game and show char modal
                document.getElementById('gameContainer').classList.add('hidden');
                document.getElementById('pauseMenu').classList.add('hidden');
                this.showCharModal();
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                // Stop the game loop
                this.gameRunning = false;
                if (this._autosaveInterval) clearInterval(this._autosaveInterval);
                // Hide everything and show main menu
                document.getElementById('gameContainer').classList.add('hidden');
                document.getElementById('pauseMenu').classList.add('hidden');
                document.getElementById('mainMenu').classList.remove('hidden');
            });
        }
    }

    updatePlayerMovement() {
        this.player.velocityX = 0;
        this.player.velocityY = 0;

        // WASD
        if (this.keys['W']) this.player.velocityY = -this.player.speed;
        if (this.keys['S']) this.player.velocityY = this.player.speed;
        if (this.keys['A']) this.player.velocityX = -this.player.speed;
        if (this.keys['D']) this.player.velocityX = this.player.speed;

        // Strzałki
        if (this.keys['UP']) this.player.velocityY = -this.player.speed;
        if (this.keys['DOWN']) this.player.velocityY = this.player.speed;
        if (this.keys['LEFT']) this.player.velocityX = -this.player.speed;
        if (this.keys['RIGHT']) this.player.velocityX = this.player.speed;
    }

    getCurrentMapBounds() {
        if (this.currentMap === 3 && this.interiorMapSize) {
            return { width: this.interiorMapSize.width, height: this.interiorMapSize.height };
        }
        return { width: MAP_WIDTH, height: MAP_HEIGHT };
    }

    getPlayerRect(x = this.player.x, y = this.player.y) {
        return { x, y, width: this.player.width, height: this.player.height };
    }

    rectsIntersect(a, b) {
        if (!a || !b) return false;
        return (
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y
        );
    }

    createVillageBuildings() {
        const doorW = 34;
        const doorH = 46;
        const makeHouse = (name, x, y, width, height, allowDoorEntry = false, teleportToInterior = false) => {
            const doorX = x + width / 2 - doorW / 2;
            const doorY = y + height - doorH;
            const doorRect = { x: doorX, y: doorY, width: doorW, height: doorH };
            return {
                name,
                x,
                y,
                width,
                height,
                doorRect,
                doorTriggerRect: { x: doorX - 6, y: doorY - 2, width: doorW + 12, height: doorH + 8 },
                doorCenterX: doorX + doorW / 2,
                allowDoorEntry,
                teleportToInterior
            };
        };

        return [
            makeHouse('redHouse', 200, 200, 120, 100),
            makeHouse('blueHouse', 400, 200, 100, 90),
            makeHouse('greenHouse', 620, 200, 110, 95),
            makeHouse('orangeHouse', 220, 400, 130, 110),
            makeHouse('purpleHouse', 450, 420, 100, 95),
            makeHouse('yellowHouse', 650, 450, 115, 100, true, true)
        ];
    }

    getVillageBuildingByName(name) {
        if (!this.villageBuildings) return null;
        return this.villageBuildings.find((b) => b.name === name) || null;
    }

    collidesWithVillageBuildings(rect) {
        if (this.currentMap !== 1 || !this.villageBuildings) return false;
        for (let b of this.villageBuildings) {
            const insideBuilding = this.rectsIntersect(rect, { x: b.x, y: b.y, width: b.width, height: b.height });
            if (!insideBuilding) continue;

            const atDoor = b.allowDoorEntry && b.doorRect && this.rectsIntersect(rect, b.doorRect);
            if (!atDoor) {
                return true; // blokujemy wejście w bryłę budynku
            }
        }
        return false;
    }

    collidesWithInteriorCounter(rect) {
        if (this.currentMap !== 3 || !this.interiorCounter) return false;
        return this.rectsIntersect(rect, this.interiorCounter);
    }

    applyMovementWithCollisions() {
        if (!this.player) return;
        const bounds = this.getCurrentMapBounds();
        let nextX = this.player.x;
        let nextY = this.player.y;

        // Najpierw oś X
        if (this.player.velocityX !== 0) {
            const candX = nextX + this.player.velocityX;
            const testRect = this.getPlayerRect(candX, nextY);
            if (!this.collidesWithVillageBuildings(testRect) && !this.collidesWithInteriorCounter(testRect)) {
                nextX = candX;
            }
        }

        // Następnie oś Y
        if (this.player.velocityY !== 0) {
            const candY = nextY + this.player.velocityY;
            const testRect = this.getPlayerRect(nextX, candY);
            if (!this.collidesWithVillageBuildings(testRect) && !this.collidesWithInteriorCounter(testRect)) {
                nextY = candY;
            }
        }

        // Ograniczenie do rozmiaru aktualnej mapy
        nextX = Math.max(0, Math.min(nextX, bounds.width - this.player.width));
        nextY = Math.max(0, Math.min(nextY, bounds.height - this.player.height));

        this.player.x = nextX;
        this.player.y = nextY;
    }

    enterYellowHouseInterior() {
        const spawnX = this.interiorSpawn ? this.interiorSpawn.x : CONFIG.CANVAS_WIDTH / 2;
        const spawnY = this.interiorSpawn ? this.interiorSpawn.y : CONFIG.CANVAS_HEIGHT / 2;
        this.currentMap = 3;
        this.player.x = spawnX;
        this.player.y = spawnY;
        this.player.velocityX = 0;
        this.player.velocityY = 0;
    }

    exitYellowHouseInterior() {
        const destX = this.interiorReturnDest ? this.interiorReturnDest.x : CONFIG.CANVAS_WIDTH / 2;
        const destY = this.interiorReturnDest ? this.interiorReturnDest.y : CONFIG.CANVAS_HEIGHT / 2;
        this.currentMap = 1;
        this.player.x = destX;
        this.player.y = destY;
        this.player.velocityX = 0;
        this.player.velocityY = 0;
    }

    // ============================================
    // LOGIKA GRY
    // ============================================

    update() {
        this.updatePlayerMovement();
        this.applyMovementWithCollisions();
        this.updateCamera();
        
        // Update wszystkich wrogów
        for (let enemy of this.enemies) {
            enemy.update(this.player.x, this.player.y);
            
            // Obsługa respawnu wroga
            if (!enemy.isAlive) {
                enemy.respawnTimer -= 0.016; // ~60 FPS
                if (enemy.respawnTimer <= 0) {
                    enemy.isAlive = true;
                    enemy.hp = enemy.maxHp;
                    enemy.x = enemy.spawnX;
                    enemy.y = enemy.spawnY;
                    enemy.isAggro = false;
                }
            }
        }
        
        this.checkCollisions();
        
        // Sprawdź teleport do miasta (mapa 1 -> mapa 2)
        if (this.currentMap === 1 && this.teleportZone && this.teleportZone.active) {
            if (this.player.x >= this.teleportZone.x &&
                this.player.x <= this.teleportZone.x + this.teleportZone.width &&
                this.player.y >= this.teleportZone.y &&
                this.player.y <= this.teleportZone.y + this.teleportZone.height) {
                // Teleportuj do miasta
                this.currentMap = 2;
                this.player.x = this.teleportZone.destX;
                this.player.y = this.teleportZone.destY;
            }
        }

        // Sprawdź teleport powrotny (mapa 2 -> mapa 1)
        if (this.currentMap === 2 && this.returnTeleportZone && this.returnTeleportZone.active) {
            if (this.player.x >= this.returnTeleportZone.x &&
                this.player.x <= this.returnTeleportZone.x + this.returnTeleportZone.width &&
                this.player.y >= this.returnTeleportZone.y &&
                this.player.y <= this.returnTeleportZone.y + this.returnTeleportZone.height) {
                // Teleportuj do wioski
                this.currentMap = 1;
                this.player.x = this.returnTeleportZone.destX;
                this.player.y = this.returnTeleportZone.destY;
            }
        }

        // Sprawdź teleport do wnętrza żółtego domu
        if (this.currentMap === 1 && this.villageBuildings) {
            const yellow = this.getVillageBuildingByName('yellowHouse');
            if (yellow && yellow.doorTriggerRect && this.rectsIntersect(this.getPlayerRect(), yellow.doorTriggerRect)) {
                this.enterYellowHouseInterior();
            }
        }

        // Sprawdź teleport wyjścia z wnętrza
        if (this.currentMap === 3 && this.interiorExitZone && this.rectsIntersect(this.getPlayerRect(), this.interiorExitZone)) {
            this.exitYellowHouseInterior();
        }
        
        // Update walki w czasie rzeczywistym
        if (this.battle) {
            this.battle.update();
            
            // Jeśli walka się skończyła, zakończ batalię
            if (!this.battle.battleActive) {
                this.endBattle();
            } else {
                this.updateBattleHUD();
            }
        }
        
        this.updateHUD();
        
        // Synchronizuj pozycję gracza na Firebase (co 200ms)
        if (!this.lastSyncTime) this.lastSyncTime = 0;
        if (Date.now() - this.lastSyncTime > 200) {
            this.syncPlayerToFirebase();
            this.lastSyncTime = Date.now();
        }
    }

    updateCamera() {
        // Docelowa pozycja kamery (centrowuje gracza na ekranie)
        const targetCameraX = this.player.x + this.player.width / 2 - this.cameraOffsetX;
        const targetCameraY = this.player.y + this.player.height / 2 - this.cameraOffsetY;

        // Smooth camera following
        this.cameraX += (targetCameraX - this.cameraX) * this.cameraSmooth;
        this.cameraY += (targetCameraY - this.cameraY) * this.cameraSmooth;

        // Ograniczenia kamery (aby nie wychodzić poza mapę)
        const bounds = this.getCurrentMapBounds();
        this.cameraX = Math.max(0, Math.min(this.cameraX, bounds.width - CONFIG.CANVAS_WIDTH));
        this.cameraY = Math.max(0, Math.min(this.cameraY, bounds.height - CONFIG.CANVAS_HEIGHT));
    }

    checkCollisions() {
        // Kolizja z wrogami
        for (let enemy of this.enemies) {
            if (!enemy.isAlive) continue;
            
            const dx = (this.player.x + this.player.width / 2) - (enemy.x + enemy.width / 2);
            const dy = (this.player.y + this.player.height / 2) - (enemy.y + enemy.height / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 50 && !this.battle) {
                this.currentEnemy = enemy;
                this.startBattle();
                return;
            }
        }

        // Kolizje z NPC
        for (let npc of this.npcs) {
            const dx = (this.player.x + this.player.width / 2) - (npc.x + npc.width / 2);
            const dy = (this.player.y + this.player.height / 2) - (npc.y + npc.height / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 60) {
                this.checkQuestProgressAndRewards(npc);
            }
        }
    }

    checkQuestProgressAndRewards(npc) {
        // Placeholder for NPC proximity interactions. Actual quest progress is
        // handled when enemy dies (updateQuestProgress) and rewards are claimed
        // via openQuestMenu(npc) when interacting.
    }

    completeQuest(quest) {
        // Nie dodawaj nagrody od razu - gracz musi odebrać u NPC
        quest.rewardClaimed = false;
        console.log(`Misja ukończona! Idź do ${this.getNPCNameForQuest(quest.id)} aby odebrać nagrodę!`);
        
        // Daj quest item do inventoryu
        if (quest.rewardItem) {
            // For drop-style quests we don't give full reward here — items are collected on kill.
            if (quest.rewardItem.type !== 'drop') {
                this.player.inventory.addItem(quest.rewardItem);
                console.log(`+${quest.rewardItem.name} do inventoryu`);
            }
        }
        // Refresh UI
        this.updateQuestPanel();
        this.updateInventoryDisplay();
    }
    dropQuestItems(questId) {
        // Dropuj pojedyncze przedmioty za zabitego Dzika (stackable)
        const quest = this.quests[questId];
        if (!quest) return false;

        // Quest 0: Mięso Dzika - 100% drop, 1 sztuka na zabójstwo
        if (questId === 0) {
            const meatItem = new Item("Mięso Dzika", "🥩", 'drop', 0, 1);
            const added = this.player.inventory.addItem(meatItem);
            if (added) {
                console.log(`+1 Mięso Dzika do inventoryu`);
                return true;
            }
            return false;
        }
        return false;
    }

    claimQuestReward(questId) {
        const quest = this.quests[questId];
        if (quest && quest.completed && !quest.rewardClaimed) {
            this.player.addExp(quest.expReward);
            this.player.addGold(quest.goldReward);
            quest.rewardClaimed = true;
            
            // Usuń quest item z inventoryu (tylko potrzebną ilość)
            const removed = this.player.inventory.removeByQuestId(questId, quest.mobCount || Infinity);
            console.log(`Usunięto ${removed} przedmiotów związanych z misją ${questId}`);
            
            console.log(`Nagrodę odebrałeś! +${quest.expReward} EXP, +${quest.goldReward} Gold`);
            this.updateQuestPanel();
            this.updateInventoryDisplay();
            return true;
        }
        return false;
    }

    getNPCNameForQuest(questId) {
        // Zwróć NPC którą dała misję
        const quest = this.quests[questId];
        for (let npc of this.npcs) {
            if (npc.questIds.includes(questId)) {
                return npc.name;
            }
        }
        return "NPC";
    }

    acceptQuest(questId) {
        const quest = this.quests[questId];
        if (!quest) return;
        if (this.player.level >= quest.requiredLevel && !quest.completed) {
            // avoid duplicates
            if (!this.activeQuests.some(aq => aq.id === questId)) {
                this.activeQuests.push(quest);
                console.log(`Zaakceptowałeś misję: ${quest.name}`);
                this.updateQuestPanel();
            }
        }
    }

    startBattle() {
        if (!this.currentEnemy) return;
        this.battle = new Battle(this.player, this.currentEnemy);
        // Assign class-specific skills to the battle instance
        const cls = (this.player && this.player.className) ? this.player.className : 'Wojownik';
        if (cls === 'Wojownik') {
            this.battle.skills = {
                attack: { name: 'Atak', cd: 0.8, damage: 14, icon: '⚔' },
                skill1: { name: 'Roztrzaskanie', cd: 4, damage: 30, icon: '🛡' },
                skill2: { name: 'Ryk bojowy', cd: 6, damage: 0, icon: '🔊' }
            };
        } else if (cls === 'Hunter') {
            this.battle.skills = {
                attack: { name: 'Strzała', cd: 0.6, damage: 10, icon: '🏹' },
                skill1: { name: 'Pułapka', cd: 5, damage: 0, icon: '🪤' },
                skill2: { name: 'Szalony salwa', cd: 7, damage: 26, icon: '🎯' }
            };
        } else if (cls === 'Mag') {
            this.battle.skills = {
                attack: { name: 'Uderzenie magiczne', cd: 1.0, damage: 8, icon: '🔮' },
                skill1: { name: 'Kula ognia', cd: 4, damage: 32, icon: '🔥' },
                skill2: { name: 'Lodowa kolumna', cd: 6, damage: 22, icon: '❄' }
            };
        }
        document.getElementById('battleHUD').classList.remove('hidden');
    }

    endBattle() {
        if (!this.battle) return; // Bezpieczeństwo
        
        document.getElementById('battleHUD').classList.add('hidden');
        
        // Sprawdzenie czy gracz zginie
        const playerDied = this.player.hp <= 0;
        
        // Sprawdzenie czy wróg umiera
        const enemyDefeated = this.currentEnemy && this.currentEnemy.hp <= 0;
        
        this.battle = null; // Wyczyść bitwę natychmiast

        if (playerDied) {
            // Gracz zginie - respawn w wiosce
            this.respawnPlayer();
        } else if (enemyDefeated) {
            // Wróg pokonany - respawn po 10 sekundach
            this.currentEnemy.isAlive = false;
            this.currentEnemy.respawnTimer = this.currentEnemy.respawnTime;
            this.currentEnemy.isAggro = false; // Wyłącz aggro
            this.player.heal(20); // Bonus zdrowia
            
            // Update quest progress
            this.updateQuestProgress(this.currentEnemy);
        }
    }

    respawnPlayer() {
        // Respawn gracza w wiosce (spawn point)
        this.player.hp = this.player.maxHp; // Pełne HP
        this.player.x = 2000; // Środek mapy - wioska
        this.player.y = 2000;
        
        // Wróć na mapę 1 jeśli był na mapie 2
        this.currentMap = 1;
        
        // Komunikat
        console.log('💀 Zostałeś pokonany! Odradzasz się w wiosce...');
        
        // Opcjonalnie: kara za śmierć (np. -10% gold)
        const goldLoss = Math.floor((this.player.gold || 0) * 0.1);
        if (goldLoss > 0) {
            this.player.gold = Math.max(0, (this.player.gold || 0) - goldLoss);
            console.log(`💰 Straciłeś ${goldLoss} złota...`);
        }
        
        // Autozapis
        this.saveGameState();
    }

    updateQuestProgress(defeatedEnemy) {
        if (!defeatedEnemy) return;
        
        // Mapuj typ potwora do dropa
        const dropItems = {
            'boar': new Item("Mięso Dzika", "🥩", 'drop', null, 1),
            'wolf': new Item("Futro Wilka", "🐺", 'drop', null, 1),
            'bear': new Item("Szapa Niedźwiedzia", "🐾", 'drop', null, 1),
            'whelp': new Item("Pazury Wilczka", "🐾", 'drop', null, 1),
            'wasp': new Item("Żądło Osy", "⚔", 'drop', null, 1),
            'snake': new Item("Jad Węża", "☠", 'drop', null, 1)
        };
        
        // Zliczaj postęp dla aktywnych misji
        for (let quest of this.activeQuests) {
            if (quest.completed) continue;
            if (quest.mobType !== defeatedEnemy.type) continue;
            
            // Dropuj item z potwora
            const dropItem = dropItems[defeatedEnemy.type];
            if (dropItem) {
                const added = this.player.inventory.addItem(new Item(dropItem.name, dropItem.icon, dropItem.type, quest.id, 1));
                if (added) {
                    quest.progress++;
                    console.log(`${dropItem.name} +1 (${quest.progress}/${quest.mobCount})`);
                } else {
                    console.log('Inventory pełny - nie można zebrać dropa');
                }
            } else {
                quest.progress++;
            }
            
            if (quest.progress >= quest.mobCount) {
                quest.completed = true;
                this.completeQuest(quest);
            }
        }
    }

    updateBattleHUD() {
        if (!this.battle) return;

        // HP gracza
        const playerHpPercent = (this.battle.player.hp / this.battle.player.maxHp) * 100;
        document.getElementById('battlePlayerHp').style.width = playerHpPercent + '%';
        document.getElementById('battlePlayerHpText').textContent = `${this.battle.player.hp}/${this.battle.player.maxHp}`;

        // HP wroga
        const enemyHpPercent = (this.battle.enemy.hp / this.battle.enemy.maxHp) * 100;
        document.getElementById('battleEnemyHp').style.width = enemyHpPercent + '%';
        document.getElementById('battleEnemyHpText').textContent = `${this.battle.enemy.hp}/${this.battle.enemy.maxHp}`;

        // Cooldowny skillów
        document.getElementById('skillCD1').textContent = this.battle.playerAttackCd > 0 ? this.battle.playerAttackCd.toFixed(1) + 's' : 'Gotów';
        document.getElementById('skillCD2').textContent = this.battle.playerSkill1Cd > 0 ? this.battle.playerSkill1Cd.toFixed(1) + 's' : 'Gotów';
        document.getElementById('skillCD3').textContent = this.battle.playerSkill2Cd > 0 ? this.battle.playerSkill2Cd.toFixed(1) + 's' : 'Gotów';

        // Disable przyciski gdy cooldown
        document.getElementById('skillBtn1').disabled = this.battle.playerAttackCd > 0;
        document.getElementById('skillBtn2').disabled = this.battle.playerSkill1Cd > 0;
        document.getElementById('skillBtn3').disabled = this.battle.playerSkill2Cd > 0;

        // Update skill icons/names based on assigned skills
        try {
            const s1 = this.battle.skills.attack;
            const s2 = this.battle.skills.skill1;
            const s3 = this.battle.skills.skill2;
            const btn1 = document.getElementById('skillBtn1');
            const btn2 = document.getElementById('skillBtn2');
            const btn3 = document.getElementById('skillBtn3');
            if (btn1) { btn1.querySelector('.skill-icon').textContent = s1.icon; btn1.querySelector('.skill-name').textContent = s1.name; }
            if (btn2) { btn2.querySelector('.skill-icon').textContent = s2.icon; btn2.querySelector('.skill-name').textContent = s2.name; }
            if (btn3) { btn3.querySelector('.skill-icon').textContent = s3.icon; btn3.querySelector('.skill-name').textContent = s3.name; }
        } catch (e) {}
    }

    updateHUD() {
        const hpPercent = (this.player.hp / this.player.maxHp) * 100;
        document.getElementById('hpFill').style.width = hpPercent + '%';
        document.getElementById('hpText').textContent = `${this.player.hp}/${this.player.maxHp}`;
        document.getElementById('posText').textContent = `Pozycja: ${Math.floor(this.player.x)}, ${Math.floor(this.player.y)}`;
        
        // Exp/Level
        const expPercent = (this.player.exp / this.player.maxExp) * 100;
        document.getElementById('expFill').style.width = expPercent + '%';
        document.getElementById('levelText').textContent = `LVL: ${this.player.level}`;
        document.getElementById('expText').textContent = `EXP: ${this.player.exp}/${this.player.maxExp}`;
        
        // Gold
        const goldElement = document.getElementById('goldText');
        if (goldElement) {
            goldElement.textContent = `Gold: ${this.player.gold || 0}`;
        }

        // Update inventory display
        this.updateInventoryDisplay();

        // Update quest panel
        this.updateQuestPanel();
    }

    updateInventoryDisplay() {
        const inventoryGrid = document.getElementById('inventoryGrid');
        if (!inventoryGrid) return;
        
        inventoryGrid.innerHTML = '';
        
        for (let i = 0; i < this.player.inventory.slots.length; i++) {
            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            
            const item = this.player.inventory.slots[i];
            if (item) {
                const qty = item.quantity && item.quantity > 1 ? `<span class="inv-count">x${item.quantity}</span>` : '';
                slot.innerHTML = `<div class="inventory-item">${item.icon}${qty}</div>`;
                slot.title = `${item.name} ${item.quantity && item.quantity > 1 ? 'x' + item.quantity : ''}`;
                slot.style.borderColor = '#d4af37';
            } else {
                slot.classList.add('empty');
            }
            
            inventoryGrid.appendChild(slot);
        }
        
        // Update item count
        const invText = document.getElementById('invText');
        if (invText) {
            const itemCount = this.player.inventory.getItemCount();
            invText.textContent = `Przedmioty: ${itemCount}/${this.player.inventory.slots.length}`;
        }
        
        // Update equipment display
        this.updateEquipmentDisplay();
    }

    updateEquipmentDisplay() {
        const eqPanel = document.getElementById('equipmentPanel');
        if (!eqPanel) return;
        
        // Update equipment slots
        const slots = eqPanel.querySelectorAll('.equipment-slot');
        slots.forEach(slot => {
            const slotType = slot.dataset.slot;
            const item = this.player.equipment[slotType];
            
            if (item) {
                slot.innerHTML = item.icon || '?';
                slot.classList.add('occupied');
                slot.title = `${item.name}`;
            } else {
                slot.innerHTML = ['helmet', 'armor', 'weapon', 'shield', 'accessory'][['helmet', 'armor', 'weapon', 'shield', 'accessory'].indexOf(slotType)] === 'helmet' ? '👤' :
                                 ['helmet', 'armor', 'weapon', 'shield', 'accessory'][['helmet', 'armor', 'weapon', 'shield', 'accessory'].indexOf(slotType)] === 'armor' ? '🛡' :
                                 ['helmet', 'armor', 'weapon', 'shield', 'accessory'][['helmet', 'armor', 'weapon', 'shield', 'accessory'].indexOf(slotType)] === 'weapon' ? '⚔' :
                                 ['helmet', 'armor', 'weapon', 'shield', 'accessory'][['helmet', 'armor', 'weapon', 'shield', 'accessory'].indexOf(slotType)] === 'shield' ? '🔰' : '💍';
                slot.classList.remove('occupied');
                slot.title = `Puste - ${slotType}`;
            }
            
            // Attach right-click handler
            slot.oncontextmenu = (e) => {
                e.preventDefault();
                this.showEquipmentContextMenu(slotType, e);
            };
        });
        
        // Update stats
        document.getElementById('eqATK').textContent = this.player.equipmentATK;
        document.getElementById('eqDEF').textContent = this.player.equipmentDEF;
        
        // Update shop display
        this.updateShopDisplay();
    }

    updateShopDisplay() {
        const shopGrid = document.getElementById('shopGrid');
        if (!shopGrid) return;
        
        const shopItems = [
            { name: 'Miecz Starter', icon: '⚔', type: 'weapon', cost: 200, atk: 3, def: 0 },
            { name: 'Tarcza Starter', icon: '🔰', type: 'shield', cost: 200, atk: 0, def: 4 },
            { name: 'Skórzana Zbroja', icon: '🛡', type: 'armor', cost: 200, atk: 0, def: 2 },
            { name: 'Hełm Starter', icon: '👤', type: 'helmet', cost: 200, atk: 0, def: 2 },
            { name: 'Pierścionek Siły', icon: '💍', type: 'accessory', cost: 200, atk: 1, def: 1 }
        ];
        
        shopGrid.innerHTML = '';
        shopItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'shop-item';
            div.innerHTML = `
                <div class="shop-item-icon">${item.icon}</div>
                <div class="shop-item-name">${item.name}</div>
                <div class="shop-item-cost">💰 ${item.cost}</div>
            `;
            div.onclick = () => this.buyFromShop(item);
            shopGrid.appendChild(div);
        });
        
        // Update gold display
        const goldDisplay = document.getElementById('shopGold');
        if (goldDisplay) {
            goldDisplay.textContent = this.player.gold || 0;
        }
    }

    toggleEquipmentTab(tabName) {
        // Pokazuj/ukryj equipment panel
        const eqPanel = document.getElementById('equipmentPanel');
        if (eqPanel) {
            eqPanel.classList.toggle('visible');
        }
        
        // Zmień zakładkę
        document.querySelectorAll('.equipment-tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        
        const activeTab = document.getElementById(tabName + 'Tab');
        if (activeTab) activeTab.classList.add('active');
        
        const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }

    showEquipmentContextMenu(slotType, event) {
        const item = this.player.equipment[slotType];
        if (!item) {
            // Puste slot - pokaż opcję załóż
            this.showEquipmentMenu(slotType);
        } else {
            // Wyposażone - pokaż opcję zdejmij
            this.unequipItem(slotType);
        }
    }

    updateQuestPanel() {
        const questList = document.getElementById('questList');
        if (!questList) return;
        
        questList.innerHTML = '';
        
        if (this.activeQuests.length === 0) {
            questList.innerHTML = '<div style="color: #888; text-align: center; padding: 10px;">Brak aktywnych misji</div>';
            return;
        }

        for (let quest of this.activeQuests) {
            const questItem = document.createElement('div');
            questItem.className = `quest-item ${quest.completed ? 'completed' : ''}`;
            
            const progressText = quest.completed ? '✓ Ukończona' : `${quest.progress}/${quest.mobCount}`;
            
            questItem.innerHTML = `
                <div class="quest-name">${quest.name}</div>
                <div class="quest-description">${quest.description}</div>
                <div class="quest-progress">${progressText}</div>
            `;
            
            questList.appendChild(questItem);
        }
    }

    // ============================================
    // RYSOWANIE
    // ============================================

    draw() {
        // Czyszczenie canvas
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Zapisz stan kontekstu przed transformacją kamery
        this.ctx.save();

        // Zastosuj transformację kamery (przesuń view względem gracza)
        this.ctx.translate(-this.cameraX, -this.cameraY);

        // --- Rysuj tło i planszę w zależności od currentMap ---
        if (this.currentMap === 1) {
            // MAPA 1: WIOSKA
            this.drawMapGrass();
            this.drawVillage();
        } else if (this.currentMap === 2) {
            // MAPA 2: WIELKIE MIASTO
            this.drawBigCity();
        } else if (this.currentMap === 3) {
            // MAPA 3: WNĘTRZE ŻÓŁTEGO DOMU
            this.drawYellowHouseInterior();
        }
        // ---

        // Siatka debug wyłączona

        // Rysuj NPC (tylko na mapach 1 i 2, nie w wnętrzach)
        if (this.currentMap !== 3) {
            for (let npc of this.npcs) {
                npc.draw(this.ctx);
                this.drawNPCQuestMarker(npc);
            }
        }

        // Rysuj NPC Handlarza we wnętrzu (mapa 3)
        if (this.currentMap === 3 && this.interiorNPC) {
            this.interiorNPC.draw(this.ctx);
            // Rysuj nazwę nad NPC
            this.ctx.fillStyle = '#d4af37';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = '#000';
            this.ctx.shadowBlur = 2;
            this.ctx.fillText(this.interiorNPC.name, this.interiorNPC.x + this.interiorNPC.width / 2, this.interiorNPC.y - 10);
            this.ctx.shadowColor = 'transparent';
        }

        // Rysuj wrogów (tylko na mapach 1 i 2, nie w wnętrzach)
        if (this.currentMap !== 3) {
            for (let enemy of this.enemies) {
                enemy.draw(this.ctx);
            }
        }

        // Rysuj gracza
        this.player.draw(this.ctx);

        // Rysuj innych graczy (multiplayer)
        if (this.currentMap === 1 || this.currentMap === 2) {
            this.drawOtherPlayers();
        }

        // Rysuj portale teleportacji
        if (this.currentMap === 1) {
            this.drawTeleportPortal();
        } else if (this.currentMap === 2) {
            this.drawReturnTeleportPortal();
        } else if (this.currentMap === 3) {
            this.drawYellowHouseExit();
        }

        // Przywróć stan kontekstu (usuń transformację)
        this.ctx.restore();

        // Info (rysuj poza transformacją, aby być na górze)
        this.drawInfo();

        // Rysuj minimapę
        this.drawMinimap();
    }

    drawMapGrass() {
        // Pikselowa baza trawy
        this.ctx.fillStyle = '#2f6b3a';
        this.ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

        // Nałożona ziarnista tekstura (precomputed pattern)
        for (let tile of this.mapGrassPattern) {
            if (tile.type === 'dot') {
                this.ctx.fillStyle = tile.color;
                this.ctx.fillRect(tile.x, tile.y, tile.size, tile.size);
            } else if (tile.type === 'tuft') {
                this.ctx.strokeStyle = tile.color;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(tile.x, tile.y);
                this.ctx.lineTo(tile.x, tile.y - tile.h);
                this.ctx.moveTo(tile.x + 2, tile.y + 1);
                this.ctx.lineTo(tile.x + 2 + tile.tilt, tile.y - tile.h + 2);
                this.ctx.stroke();
            }
        }

        // Drogi z piasku
        this.drawSandRoads();
    }

    generateGrassPattern() {
        const pattern = [];
        const rand = (seed) => Math.abs(Math.sin(seed) * 43758.5453123) % 1;
        // Drobne piksele i kępki źdźbeł, pozycje deterministyczne
        for (let x = 0; x < MAP_WIDTH; x += 10) {
            for (let y = 0; y < MAP_HEIGHT; y += 10) {
                const seed = (x * 73856093) ^ (y * 19349663);
                const r = rand(seed);

                if (r > 0.35) {
                    const colorDots = ['#2a6234', '#2c7039', '#245b2e'];
                    pattern.push({
                        type: 'dot',
                        x: x + Math.floor(rand(seed + 1) * 9),
                        y: y + Math.floor(rand(seed + 2) * 9),
                        size: 2,
                        color: colorDots[Math.floor(rand(seed + 3) * colorDots.length)]
                    });
                }

                if (r > 0.7) {
                    const colorTuft = ['#3e8b4a', '#3a7e45'];
                    pattern.push({
                        type: 'tuft',
                        x: x + 2 + Math.floor(rand(seed + 4) * 6),
                        y: y + 9,
                        h: 6 + Math.floor(rand(seed + 5) * 6),
                        tilt: Math.floor((rand(seed + 6) - 0.5) * 4),
                        color: colorTuft[Math.floor(rand(seed + 7) * colorTuft.length)]
                    });
                }
            }
        }
        return pattern;
    }

    drawSandRoads() {
        // Główna droga pionowa
        this.ctx.fillStyle = '#c9a876';
        this.ctx.fillRect(MAP_WIDTH / 2 - 60, 0, 120, MAP_HEIGHT);

        // Główna droga pozioma
        this.ctx.fillRect(0, MAP_HEIGHT / 2 - 60, MAP_WIDTH, 120);

        // Drogi boczne
        this.ctx.fillStyle = '#b39968';
        this.ctx.fillRect(400, 300, 200, 40);
        this.ctx.fillRect(2500, 1500, 300, 50);
        this.ctx.fillRect(800, 2000, 250, 45);
    }

    drawMinimap() {
        // Tło minimapy
        this.minimapCtx.fillStyle = '#000';
        this.minimapCtx.fillRect(0, 0, 150, 150);

        const bounds = this.getCurrentMapBounds();
        const scale = 150 / bounds.width;

        // Rysuj mapę
        this.minimapCtx.fillStyle = '#2d5016';
        this.minimapCtx.fillRect(0, 0, 150, 150);

        // Rysuj gracza (biały punkt)
        const playerMinimapX = this.player.x * scale;
        const playerMinimapY = this.player.y * scale;
        this.minimapCtx.fillStyle = '#fff';
        this.minimapCtx.beginPath();
        this.minimapCtx.arc(playerMinimapX, playerMinimapY, 3, 0, Math.PI * 2);
        this.minimapCtx.fill();

        // Rysuj wrogów (czerwone punkty)
        this.minimapCtx.fillStyle = '#ff0000';
        for (let enemy of this.enemies) {
            if (!enemy.isAlive) continue;
            const enemyMinimapX = enemy.x * scale;
            const enemyMinimapY = enemy.y * scale;
            this.minimapCtx.beginPath();
            this.minimapCtx.arc(enemyMinimapX, enemyMinimapY, 2, 0, Math.PI * 2);
            this.minimapCtx.fill();
        }

        // Rysuj NPC (żółte punkty)
        this.minimapCtx.fillStyle = '#ffdd00';
        for (let npc of this.npcs) {
            const npcMinimapX = npc.x * scale;
            const npcMinimapY = npc.y * scale;
            this.minimapCtx.beginPath();
            this.minimapCtx.arc(npcMinimapX, npcMinimapY, 1.5, 0, Math.PI * 2);
            this.minimapCtx.fill();
        }

        // Obramowanie
        this.minimapCtx.strokeStyle = '#8b7355';
        this.minimapCtx.lineWidth = 2;
        this.minimapCtx.strokeRect(0, 0, 150, 150);
    }

    drawNPCQuestMarker(npc) {
        // Rysuj marker misji nad NPC
        const availableQuests = npc.questIds.map(id => this.quests[id]).filter(q => q && !q.completed && this.player.level >= q.requiredLevel);
        const acceptedQuests = npc.questIds.filter(id => this.activeQuests.some(aq => aq.id === id));
        const completedQuests = npc.questIds.map(id => this.quests[id]).filter(q => q && q.completed && !q.rewardClaimed);

        // Completed (claimable) has highest priority
        if (completedQuests.length > 0) {
            this.ctx.fillStyle = '#00ff66';
            this.ctx.font = 'bold 18px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('?', npc.x + npc.width / 2, npc.y - 25);
        } else if (acceptedQuests.length > 0) {
            // Already accepted — show a small marker (dot)
            this.ctx.fillStyle = '#ffaa33';
            this.ctx.beginPath();
            this.ctx.arc(npc.x + npc.width/2, npc.y - 22, 4, 0, Math.PI*2);
            this.ctx.fill();
        } else if (availableQuests.length > 0) {
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 18px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('!', npc.x + npc.width / 2, npc.y - 25);
        }

        // Rysuj imię nad NPC
        this.ctx.fillStyle = '#d4af37';
        this.ctx.font = 'bold 10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.shadowColor = '#000';
        this.ctx.shadowBlur = 2;
        this.ctx.fillText(npc.name, npc.x + npc.width / 2, npc.y - 10);
        this.ctx.shadowColor = 'transparent';
    }

    drawGrid() {
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 0.5;

        for (let x = 0; x < CONFIG.CANVAS_WIDTH; x += CONFIG.TILE_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, CONFIG.CANVAS_HEIGHT);
            this.ctx.stroke();
        }

        for (let y = 0; y < CONFIG.CANVAS_HEIGHT; y += CONFIG.TILE_SIZE) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(CONFIG.CANVAS_WIDTH, y);
            this.ctx.stroke();
        }
    }

    drawVillage() {
        // Sprawdź rasę gracza
        const race = this.player && this.player.race ? this.player.race : 'Human';
        
        if (race === 'Orc') {
            this.drawDesert();
        } else {
            this.drawGrasslandVillage();
        }
    }

    drawDesert() {
        // RED DESERT - modern 2025 style RPG terrain
        // Main gradient - desert sand with red tones
        const desertGradient = this.ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_HEIGHT);
        desertGradient.addColorStop(0, '#8B4513');      // Brown top
        desertGradient.addColorStop(0.3, '#A0522D');    // Sienna
        desertGradient.addColorStop(0.5, '#CD853F');    // Peru - main desert color
        desertGradient.addColorStop(0.7, '#D2691E');    // Chocolate
        desertGradient.addColorStop(1, '#8B4513');      // Brown bottom
        this.ctx.fillStyle = desertGradient;
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Sand dunes with radial gradients (modern effect)
        const dune1 = this.ctx.createRadialGradient(200, 300, 50, 200, 300, 250);
        dune1.addColorStop(0, 'rgba(255, 200, 100, 0.3)');
        dune1.addColorStop(1, 'rgba(139, 69, 19, 0.2)');
        this.ctx.fillStyle = dune1;
        this.ctx.beginPath();
        this.ctx.arc(200, 300, 250, 0, Math.PI * 2);
        this.ctx.fill();

        const dune2 = this.ctx.createRadialGradient(1000, 200, 40, 1000, 200, 280);
        dune2.addColorStop(0, 'rgba(255, 220, 120, 0.3)');
        dune2.addColorStop(1, 'rgba(160, 82, 45, 0.2)');
        this.ctx.fillStyle = dune2;
        this.ctx.beginPath();
        this.ctx.arc(1000, 200, 280, 0, Math.PI * 2);
        this.ctx.fill();

        // Sand texture - statyczne cząstki (wygenerowane raz)
        if (this.desertParticles.length === 0) {
            for (let i = 0; i < 150; i++) {
                this.desertParticles.push({
                    x: Math.random() * CONFIG.CANVAS_WIDTH,
                    y: Math.random() * CONFIG.CANVAS_HEIGHT,
                    size: Math.random() * 3 + 0.5,
                    opacity: Math.random() * 0.15 + 0.05
                });
            }
        }
        
        // Rysuj statyczne cząstki
        for (let p of this.desertParticles) {
            this.ctx.fillStyle = `rgba(210, 105, 30, ${p.opacity})`;
            this.ctx.fillRect(p.x, p.y, p.size, p.size);
        }

        // Red rock formations (cliffs)
        this.drawRockFormation(150, 100, 120, 180, '#B22222'); // Firebrick
        this.drawRockFormation(950, 150, 100, 160, '#DC143C'); // Crimson
        this.drawRockFormation(500, 500, 140, 200, '#8B0000'); // Dark red

        // Sand swirls/wind patterns (statyczne - wygenerowane raz)
        if (this.desertSwirls.length === 0) {
            for (let i = 0; i < 5; i++) {
                this.desertSwirls.push({
                    x: Math.random() * CONFIG.CANVAS_WIDTH,
                    y: Math.random() * CONFIG.CANVAS_HEIGHT,
                    angle: Math.random() * Math.PI * 2,
                    opacity: 0.1 + Math.random() * 0.1,
                    lineWidth: 2 + Math.random() * 3,
                    radius: 30 + Math.random() * 40
                });
            }
        }
        
        // Rysuj statyczne zawijasy wiatru
        for (let s of this.desertSwirls) {
            this.ctx.strokeStyle = `rgba(255, 200, 100, ${s.opacity})`;
            this.ctx.lineWidth = s.lineWidth;
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.radius, s.angle, s.angle + Math.PI * 0.7);
            this.ctx.stroke();
        }

        // Sky glow (hot desert effect)
        const skyGlow = this.ctx.createLinearGradient(0, 0, 0, 150);
        skyGlow.addColorStop(0, 'rgba(255, 100, 50, 0.1)');
        skyGlow.addColorStop(1, 'rgba(255, 150, 100, 0)');
        this.ctx.fillStyle = skyGlow;
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, 150);

        // Rysuj drzewa (modyfikuj wygląd dla pustyni - kaktus)
        for (let tree of this.trees) {
            this.drawCactus(tree.x, tree.y);
        }

        // Rysuj kwiaty (zmodyfikuj do kwiatów pustyni)
        for (let flower of this.flowers) {
            this.drawDesertFlower(flower.x, flower.y);
        }

        // Ścieżka pustyni
        this.drawDesertPath();
    }

    drawRockFormation(x, y, width, height, color) {
        // Draw layered rock formation
        const layers = 4;
        for (let i = 0; i < layers; i++) {
            const layerY = y + (i * height / layers);
            const layerWidth = width - (i * width / layers * 0.3);
            const layerHeight = height / layers;
            
            // Darker shade for depth
            const shadeColor = this.darkenColor(color, 0.2 * i);
            this.ctx.fillStyle = shadeColor;
            
            // Irregular rock shape
            this.ctx.beginPath();
            this.ctx.moveTo(x - layerWidth / 2, layerY);
            this.ctx.lineTo(x + layerWidth / 2, layerY);
            this.ctx.quadraticCurveTo(x + layerWidth / 2 + 10, layerY + layerHeight / 2, x + layerWidth / 2, layerY + layerHeight);
            this.ctx.lineTo(x - layerWidth / 2, layerY + layerHeight);
            this.ctx.quadraticCurveTo(x - layerWidth / 2 - 10, layerY + layerHeight / 2, x - layerWidth / 2, layerY);
            this.ctx.closePath();
            this.ctx.fill();

            // Rock details
            this.ctx.strokeStyle = `rgba(0, 0, 0, 0.3)`;
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
        }
    }

    darkenColor(color, amount) {
        const col = parseInt(color.substring(1), 16);
        const r = Math.max(0, (col >> 16) - Math.floor(255 * amount));
        const g = Math.max(0, ((col >> 8) & 0x00FF) - Math.floor(255 * amount));
        const b = Math.max(0, (col & 0x0000FF) - Math.floor(255 * amount));
        return "#" + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).substring(1);
    }

    drawCactus(x, y) {
        const key = `cactus_${x}_${y}`;
        
        // Generuj detale tylko raz
        if (!this.cactiDetails[key]) {
            const spines = [];
            for (let i = 0; i < 15; i++) {
                spines.push({
                    sx: x - 8 + Math.random() * 16,
                    sy: y - 30 + Math.random() * 35,
                    angle: Math.random() * Math.PI * 2
                });
            }
            this.cactiDetails[key] = spines;
        }
        
        const spines = this.cactiDetails[key];
        
        // Cactus body
        this.ctx.fillStyle = '#228B22';
        this.ctx.fillRect(x - 8, y - 30, 16, 35);

        // Cactus arms
        this.ctx.fillRect(x - 20, y - 15, 12, 10);
        this.ctx.fillRect(x + 8, y - 10, 12, 12);

        // Spines (statyczne)
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 1;
        for (let spine of spines) {
            this.ctx.beginPath();
            this.ctx.moveTo(spine.sx, spine.sy);
            this.ctx.lineTo(spine.sx + Math.cos(spine.angle) * 4, spine.sy + Math.sin(spine.angle) * 4);
            this.ctx.stroke();
        }

        // Shadow
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + 32, 12, 4, 0, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawDesertFlower(x, y) {
        const key = `flower_${x}_${y}`;
        
        // Generuj detale tylko raz
        if (!this.flowerDetails[key]) {
            const petals = [];
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const px = x + Math.cos(angle) * 4;
                const py = y + Math.sin(angle) * 4;
                petals.push({ px, py });
            }
            this.flowerDetails[key] = petals;
        }
        
        const petals = this.flowerDetails[key];
        
        // Desert flower (smaller, more sparse)
        this.ctx.fillStyle = '#FF6347'; // Tomato red
        for (let petal of petals) {
            this.ctx.beginPath();
            this.ctx.arc(petal.px, petal.py, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Center
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Stem
        this.ctx.strokeStyle = '#8B7355';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x, y + 12);
        this.ctx.stroke();
    }

    drawDesertPath() {
        // Sand path
        this.ctx.fillStyle = 'rgba(255, 220, 130, 0.4)';
        this.ctx.beginPath();
        this.ctx.moveTo(300, 250);
        this.ctx.quadraticCurveTo(500, 200, 700, 350);
        this.ctx.quadraticCurveTo(850, 420, 950, 500);
        this.ctx.lineWidth = 80;
        this.ctx.stroke();

        // Path details - rocks scattered (statyczne, wygenerowane raz)
        if (this.desertPathRocks.length === 0) {
            for (let i = 0; i < 12; i++) {
                const t = i / 12;
                const px = 300 + (950 - 300) * t + (Math.random() - 0.5) * 60;
                const py = 250 + (500 - 250) * t + (Math.random() - 0.5) * 40;
                const opacity = 0.3 + Math.random() * 0.3;
                const radius = 4 + Math.random() * 3;
                this.desertPathRocks.push({ px, py, opacity, radius });
            }
        }
        
        // Rysuj statyczne skały
        for (let rock of this.desertPathRocks) {
            this.ctx.fillStyle = `rgba(139, 69, 19, ${rock.opacity})`;
            this.ctx.beginPath();
            this.ctx.arc(rock.px, rock.py, rock.radius, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawGrasslandVillage() {
        if (this.currentMap === 1) {
            // MAPA 1: Wioska startowa
            this.drawStartVillage();
            this.drawFantasyRoad();
            this.drawTeleportPortal();

            // Rysuj drzewa
            const villageBounds = { x1: 120, y1: 120, x2: 900, y2: 820 };
            for (let tree of this.trees) {
                if (tree.x >= villageBounds.x1 && tree.x <= villageBounds.x2 && tree.y >= villageBounds.y1 && tree.y <= villageBounds.y2) {
                    continue; // omijaj drzewa w obrębie wioski, by nie nachodziły na budynki
                }
                this.drawLargeTree(tree.x, tree.y);
            }

            // Rysuj kwiaty
            for (let flower of this.flowers) {
                this.drawFlower(flower.x, flower.y, flower.color);
            }
        } else if (this.currentMap === 2) {
            // MAPA 2: Duże miasto
            this.drawBigCity();
            this.drawReturnTeleportPortal();

            // Mniej drzew w mieście
            for (let i = 0; i < Math.min(5, this.trees.length); i++) {
                this.drawLargeTree(this.trees[i].x, this.trees[i].y);
            }
        }
    }

    drawStartVillage() {
        // Wioska startowa w lewej części mapy (200-800, 200-700)
        // Tło wioski
        this.ctx.fillStyle = '#4a7c2d';
        this.ctx.fillRect(150, 150, 700, 600);

        // Płot wokół wioski
        this.ctx.strokeStyle = '#654321';
        this.ctx.lineWidth = 8;
        this.ctx.strokeRect(150, 150, 700, 600);

        // Dom 1 (czerwony dach)
        this.drawHouse(200, 200, 120, 100, '#8b4513', '#b22222');
        
        // Dom 2 (niebieski dach)
        this.drawHouse(400, 200, 100, 90, '#a0826d', '#4169e1');
        
        // Dom 3 (zielony dach)
        this.drawHouse(620, 200, 110, 95, '#8b7355', '#228b22');
        
        // Dom 4 (pomarańczowy dach)
        this.drawHouse(220, 400, 130, 110, '#9a7b4f', '#ff8c00');
        
        // Dom 5 (fioletowy dach)
        this.drawHouse(450, 420, 100, 95, '#8b6f47', '#9370db');
        
        // Dom 6 (żółty dach)
        this.drawHouse(650, 450, 115, 100, '#a0826d', '#ffd700');

        // Studnia na środku
        this.drawWell(400, 550);

        // Znak wioski
        this.drawVillageSign(250, 650);
    }

    drawHouse(x, y, width, height, wallColor, roofColor) {
        // Styl mocniej RPG: kamienna podmurówka, drewniane belki, dach z głębią i witrażowe okna.
        const baseWall = wallColor || '#d7c9a4';
        const wallShadow = '#9a8c6a';
        const wallLight = '#efe4c5';
        const roofBase = roofColor || '#b86a32';
        const roofShadow = '#7a4420';
        const timber = '#6b4528';
        const mortar = '#4b4335';

        // Deterministyczny rand (stabilny szum)
        const seedBase = (Math.floor(x) * 83492791) ^ (Math.floor(y) * 19349663);
        const rand = (o) => Math.abs(Math.sin(seedBase + o) * 43758.5453123) % 1;

        // Podmurówka kamienna
        const foundationH = Math.max(12, Math.floor(height * 0.18));
        this.ctx.fillStyle = '#8a7c68';
        this.ctx.fillRect(x, y + height - foundationH, width, foundationH);
        this.ctx.strokeStyle = '#44382a';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y + height - foundationH, width, foundationH);
        this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        for (let i = 0; i < 6; i++) {
            const rx = x + Math.floor(rand(i * 7) * width * 0.9);
            const rw = 14 + Math.floor(rand(i * 7 + 1) * 22);
            const ry = y + height - foundationH + 4 + Math.floor(rand(i * 7 + 2) * (foundationH - 8));
            this.ctx.strokeRect(rx, ry, rw, 6);
        }

        // Cień pod budynkiem
        this.ctx.fillStyle = 'rgba(0,0,0,0.2)';
        this.ctx.fillRect(x + 6, y + height - 6, width + 8, 8);

        // Ściana główna z gradientem
        const g = this.ctx.createLinearGradient(x, y, x, y + height - foundationH);
        g.addColorStop(0, wallLight);
        g.addColorStop(1, baseWall);
        this.ctx.fillStyle = g;
        this.ctx.fillRect(x, y, width, height - foundationH);

        // Lewy cień, prawy highlight
        const shadeW = Math.max(8, Math.floor(width * 0.1));
        this.ctx.fillStyle = 'rgba(0,0,0,0.18)';
        this.ctx.fillRect(x, y, shadeW, height - foundationH);
        this.ctx.fillStyle = 'rgba(255,255,255,0.09)';
        this.ctx.fillRect(x + width - shadeW, y, shadeW, height - foundationH);

        // Plamki tynku
        this.ctx.fillStyle = 'rgba(0,0,0,0.07)';
        for (let i = 0; i < 90; i++) {
            const px = x + Math.floor(rand(i * 5) * width);
            const py = y + Math.floor(rand(i * 5 + 1) * (height - foundationH));
            this.ctx.fillRect(px, py, 2, 2);
        }
        this.ctx.fillStyle = 'rgba(255,255,255,0.06)';
        for (let i = 0; i < 60; i++) {
            const px = x + Math.floor(rand(300 + i * 3) * width);
            const py = y + Math.floor(rand(500 + i * 3) * (height - foundationH));
            this.ctx.fillRect(px, py, 2, 2);
        }

        // Belki drewniane (poziome i pionowe)
        this.ctx.strokeStyle = timber;
        this.ctx.lineWidth = 5;
        // poziome
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + 24);
        this.ctx.lineTo(x + width, y + 24);
        this.ctx.moveTo(x, y + height - foundationH - 4);
        this.ctx.lineTo(x + width, y + height - foundationH - 4);
        this.ctx.stroke();
        // pionowe
        this.ctx.beginPath();
        const columns = 3;
        for (let i = 0; i <= columns; i++) {
            const cx = x + (i / columns) * width;
            this.ctx.moveTo(cx, y);
            this.ctx.lineTo(cx, y + height - foundationH - 2);
        }
        this.ctx.stroke();

        // Obramowanie ścian
        this.ctx.strokeStyle = '#2b1a12';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        // Dach głęboki z cieniowaniem
        this.ctx.fillStyle = roofBase;
        this.ctx.strokeStyle = 'rgba(0,0,0,0)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x - 14, y + 6);
        this.ctx.lineTo(x + width / 2, y - 46);
        this.ctx.lineTo(x + width + 14, y + 6);
        this.ctx.closePath();
        this.ctx.fill();

        // Cień pod okapem
        this.ctx.fillStyle = 'rgba(0,0,0,0.22)';
        this.ctx.beginPath();
        this.ctx.moveTo(x - 14, y + 6);
        this.ctx.lineTo(x + width + 14, y + 6);
        this.ctx.lineTo(x + width + 14, y + 12);
        this.ctx.lineTo(x - 14, y + 12);
        this.ctx.closePath();
        this.ctx.fill();

        // Dachówka: gładki gradient bez linii
        const roofGrad = this.ctx.createLinearGradient(x, y - 46, x, y + 8);
        roofGrad.addColorStop(0, this.darkenColor(roofBase, 0.08));
        roofGrad.addColorStop(1, roofBase);
        this.ctx.fillStyle = roofGrad;
        this.ctx.beginPath();
        this.ctx.moveTo(x - 14, y + 6);
        this.ctx.lineTo(x + width / 2, y - 46);
        this.ctx.lineTo(x + width + 14, y + 6);
        this.ctx.closePath();
        this.ctx.fill();

        // Kalnica pominięta, żeby dach był gładki

        // Drzwi z łukiem
        const doorW = 34;
        const doorH = 46;
        const doorX = x + width / 2 - doorW / 2;
        const doorY = y + height - doorH;
        const doorGrad = this.ctx.createLinearGradient(doorX, doorY, doorX + doorW, doorY + doorH);
        doorGrad.addColorStop(0, '#7d542b');
        doorGrad.addColorStop(1, '#5a3b1e');
        this.ctx.fillStyle = doorGrad;
        this.ctx.fillRect(doorX, doorY, doorW, doorH);
        // łuk
        this.ctx.beginPath();
        this.ctx.moveTo(doorX, doorY + 12);
        this.ctx.quadraticCurveTo(doorX + doorW / 2, doorY - 6, doorX + doorW, doorY + 12);
        this.ctx.lineTo(doorX + doorW, doorY + doorH);
        this.ctx.lineTo(doorX, doorY + doorH);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.strokeStyle = '#2b1a12';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        // pionowe deski
        this.ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(doorX + doorW / 3, doorY + 4);
        this.ctx.lineTo(doorX + doorW / 3, doorY + doorH);
        this.ctx.moveTo(doorX + (2 * doorW) / 3, doorY + 4);
        this.ctx.lineTo(doorX + (2 * doorW) / 3, doorY + doorH);
        this.ctx.stroke();
        this.ctx.fillStyle = '#d9c27a';
        this.ctx.fillRect(doorX + doorW - 11, doorY + doorH / 2 - 2, 4, 4);

        // Okna z witrażowym światłem
        const winW = 26;
        const winH = 30;
        const winY = y + 18;
        const leftWinX = x + 14;
        const rightWinX = x + width - winW - 14;
        const drawWindow = (wx) => {
            const glass = this.ctx.createLinearGradient(wx, winY, wx + winW, winY + winH);
            glass.addColorStop(0, '#ffeec2');
            glass.addColorStop(1, '#ffcc73');
            this.ctx.fillStyle = glass;
            this.ctx.fillRect(wx, winY, winW, winH);
            this.ctx.strokeStyle = '#2b1a12';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(wx, winY, winW, winH);
            this.ctx.strokeStyle = 'rgba(0,0,0,0.35)';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(wx + winW / 2, winY);
            this.ctx.lineTo(wx + winW / 2, winY + winH);
            this.ctx.moveTo(wx, winY + winH / 2);
            this.ctx.lineTo(wx + winW, winY + winH / 2);
            this.ctx.stroke();
        };
        drawWindow(leftWinX);
        drawWindow(rightWinX);
    }

    drawWell(x, y) {
        // Base studni
        this.ctx.fillStyle = '#696969';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 30, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Wnętrze (ciemne)
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 20, 0, Math.PI * 2);
        this.ctx.fill();

        // Słupki
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(x - 35, y - 60, 10, 60);
        this.ctx.fillRect(x + 25, y - 60, 10, 60);

        // Daszek
        this.ctx.fillStyle = '#b22222';
        this.ctx.beginPath();
        this.ctx.moveTo(x - 40, y - 60);
        this.ctx.lineTo(x, y - 80);
        this.ctx.lineTo(x + 40, y - 60);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
    }

    drawVillageSign(x, y) {
        // Słupek
        this.ctx.fillStyle = '#654321';
        this.ctx.fillRect(x - 5, y, 10, 60);

        // Tablica
        this.ctx.fillStyle = '#deb887';
        this.ctx.fillRect(x - 60, y + 10, 120, 40);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x - 60, y + 10, 120, 40);

        // Tekst
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('START VILLAGE', x, y + 35);
    }

    drawFantasyRoad() {
        // Droga fantasy z piasku i kamieni
        const roadY = MAP_HEIGHT / 2 - 80;
        const roadHeight = 160;
        
        // Piasek - jaśniejszy brąz
        this.ctx.fillStyle = '#d2b48c';
        this.ctx.fillRect(850, roadY, MAP_WIDTH - 850, roadHeight);

        // Ciemniejsze brzegi (ziemia)
        this.ctx.fillStyle = '#8b7355';
        this.ctx.fillRect(850, roadY, MAP_WIDTH - 850, 20);
        this.ctx.fillRect(850, roadY + roadHeight - 20, MAP_WIDTH - 850, 20);

        // Kamienie na drodze (losowe, ale deterministyczne)
        this.ctx.fillStyle = '#696969';
        for (let i = 0; i < 40; i++) {
            const seed = i * 12345;
            const x = 850 + ((seed * 7) % (MAP_WIDTH - 850));
            const y = roadY + 20 + ((seed * 13) % (roadHeight - 40));
            const size = 8 + (seed % 15);
            
            // Kamień (nieregularny)
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Cień kamienia
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.ellipse(x + 2, y + 2, size * 0.8, size * 0.5, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#696969';
        }

        // Mniejsze kamyczki
        this.ctx.fillStyle = '#808080';
        for (let i = 0; i < 80; i++) {
            const seed = i * 54321;
            const x = 850 + ((seed * 11) % (MAP_WIDTH - 850));
            const y = roadY + 20 + ((seed * 17) % (roadHeight - 40));
            const size = 3 + (seed % 5);
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, size, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Trawa przy brzegach
        this.ctx.fillStyle = '#228b22';
        for (let i = 0; i < 30; i++) {
            const seed = i * 98765;
            const x = 850 + ((seed * 19) % (MAP_WIDTH - 850));
            const side = (seed % 2);
            const y = side === 0 ? roadY + 5 : roadY + roadHeight - 5;
            
            // Kępka trawy
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x - 3, y + 8);
            this.ctx.lineTo(x + 3, y + 8);
            this.ctx.closePath();
            this.ctx.fill();
        }
    }

    drawTeleportPortal() {
        if (!this.teleportZone || this.currentMap !== 1) return;

        const x = this.teleportZone.x + this.teleportZone.width / 2;
        const y = this.teleportZone.y + this.teleportZone.height / 2;

        // Kamienny portal fantasy
        const time = Date.now() / 1000;
        
        // Lewy słup
        this.ctx.fillStyle = '#4a4a4a';
        this.ctx.fillRect(x - 70, y - 100, 30, 200);
        this.ctx.strokeStyle = '#2a2a2a';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x - 70, y - 100, 30, 200);
        
        // Prawy słup
        this.ctx.fillRect(x + 40, y - 100, 30, 200);
        this.ctx.strokeRect(x + 40, y - 100, 30, 200);
        
        // Górny łuk
        this.ctx.beginPath();
        this.ctx.arc(x, y - 100, 70, Math.PI, 0, false);
        this.ctx.lineTo(x + 70, y - 100);
        this.ctx.lineTo(x + 40, y - 100);
        this.ctx.arc(x, y - 100, 40, 0, Math.PI, true);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Portal energii (pulsujący)
        const radius = 60 + Math.sin(time * 2) * 5;
        const gradient = this.ctx.createRadialGradient(x, y, 10, x, y, radius);
        gradient.addColorStop(0, 'rgba(0, 255, 255, 0.9)');
        gradient.addColorStop(0.5, 'rgba(0, 150, 255, 0.6)');
        gradient.addColorStop(1, 'rgba(0, 50, 150, 0.2)');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, 40, 80, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Wewnętrzny błysk
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(x - 10, y - 20, 15, 30, 0.3, 0, Math.PI * 2);
        this.ctx.fill();

        // Magiczne cząsteczki
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 + time * 0.5;
            const dist = 50 + Math.sin(time * 3 + i) * 10;
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;
            this.ctx.fillStyle = `rgba(0, 255, 255, ${0.5 + Math.sin(time * 2 + i) * 0.5})`;
            this.ctx.beginPath();
            this.ctx.arc(px, py, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Runy na słupach
        this.ctx.fillStyle = '#00ffff';
        this.ctx.font = 'bold 20px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('◊', x - 55, y - 50);
        this.ctx.fillText('◊', x - 55, y);
        this.ctx.fillText('◊', x - 55, y + 50);
        this.ctx.fillText('◊', x + 55, y - 50);
        this.ctx.fillText('◊', x + 55, y);
        this.ctx.fillText('◊', x + 55, y + 50);

        // Tekst
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText('DO MIASTA', x, y - 120);
        this.ctx.fillText('DO MIASTA', x, y - 120);
    }

    drawReturnTeleportPortal() {
        if (!this.returnTeleportZone || this.currentMap !== 2) return;

        const x = this.returnTeleportZone.x + this.returnTeleportZone.width / 2;
        const y = this.returnTeleportZone.y + this.returnTeleportZone.height / 2;

        // Kamienny portal powrotny
        const time = Date.now() / 1000;
        
        // Lewy słup
        this.ctx.fillStyle = '#4a4a4a';
        this.ctx.fillRect(x - 70, y - 100, 30, 200);
        this.ctx.strokeStyle = '#2a2a2a';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x - 70, y - 100, 30, 200);
        
        // Prawy słup
        this.ctx.fillRect(x + 40, y - 100, 30, 200);
        this.ctx.strokeRect(x + 40, y - 100, 30, 200);
        
        // Górny łuk
        this.ctx.beginPath();
        this.ctx.arc(x, y - 100, 70, Math.PI, 0, false);
        this.ctx.lineTo(x + 70, y - 100);
        this.ctx.lineTo(x + 40, y - 100);
        this.ctx.arc(x, y - 100, 40, 0, Math.PI, true);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Portal energii (zielony dla powrotu)
        const radius = 60 + Math.sin(time * 2) * 5;
        const gradient = this.ctx.createRadialGradient(x, y, 10, x, y, radius);
        gradient.addColorStop(0, 'rgba(50, 255, 50, 0.9)');
        gradient.addColorStop(0.5, 'rgba(0, 200, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(0, 100, 0, 0.2)');

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, 40, 80, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Magiczne cząsteczki
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 + time * 0.5;
            const dist = 50 + Math.sin(time * 3 + i) * 10;
            const px = x + Math.cos(angle) * dist;
            const py = y + Math.sin(angle) * dist;
            this.ctx.fillStyle = `rgba(50, 255, 50, ${0.5 + Math.sin(time * 2 + i) * 0.5})`;
            this.ctx.beginPath();
            this.ctx.arc(px, py, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Tekst
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText('DO WIOSKI', x, y - 120);
        this.ctx.fillText('DO WIOSKI', x, y - 120);
    }

    drawYellowHouseInterior() {
        // Tło: podłoga z drewna w drewnianej chacie
        const woodBase = '#8b6f47';
        const woodLight = '#a88b5f';
        const woodDark = '#6e5a3a';

        this.ctx.fillStyle = woodBase;
        this.ctx.fillRect(0, 0, this.interiorMapSize.width, this.interiorMapSize.height);

        // Deski pionowe
        const boardWidth = 40;
        for (let x = 0; x < this.interiorMapSize.width; x += boardWidth) {
            const shade = x % (boardWidth * 3) === 0 ? woodLight : woodDark;
            this.ctx.fillStyle = shade;
            this.ctx.fillRect(x, 0, boardWidth - 2, this.interiorMapSize.height);
        }

        // Smugi i szczeliny między deskami
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.lineWidth = 2;
        for (let x = 0; x < this.interiorMapSize.width; x += boardWidth) {
            this.ctx.beginPath();
            this.ctx.moveTo(x + boardWidth - 2, 0);
            this.ctx.lineTo(x + boardWidth - 2, this.interiorMapSize.height);
            this.ctx.stroke();
        }

        // Krawędzie planszy (ściany – ciemniejszy obszar, aby różnicować od podłogi)
        this.ctx.fillStyle = 'rgba(40, 30, 20, 0.5)';
        this.ctx.fillRect(0, 0, this.interiorMapSize.width, 20); // ściana górna
        this.ctx.fillRect(0, 0, 20, this.interiorMapSize.height); // ściana lewa
        this.ctx.fillRect(this.interiorMapSize.width - 20, 0, 20, this.interiorMapSize.height); // ściana prawa
        this.ctx.fillRect(0, this.interiorMapSize.height - 20, this.interiorMapSize.width, 20); // ściana dolna

        // Rysuj wąską ladę (bariera między graczem a handlarzem)
        if (this.interiorCounter) {
            const c = this.interiorCounter;
            
            // Blat lady (ciemny brąz)
            this.ctx.fillStyle = '#654321';
            this.ctx.fillRect(c.x, c.y, c.width, c.height);
            
            // Cień/głębia
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.fillRect(c.x, c.y, c.width, 15);
            
            // Pionowe deski lady
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
            this.ctx.lineWidth = 2;
            for (let i = 0; i <= 8; i++) {
                const lineY = c.y + (i * c.height / 8);
                this.ctx.beginPath();
                this.ctx.moveTo(c.x, lineY);
                this.ctx.lineTo(c.x + c.width, lineY);
                this.ctx.stroke();
            }
            
            // Obramowanie lady
            this.ctx.strokeStyle = '#3d2812';
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(c.x, c.y, c.width, c.height);
            
            // Górna krawędź lady (jasniejsza, szersza dla efektu blatu)
            this.ctx.fillStyle = '#8b6f47';
            this.ctx.fillRect(c.x - 5, c.y, c.width + 10, 12);
            this.ctx.strokeStyle = '#3d2812';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(c.x - 5, c.y, c.width + 10, 12);

            // Przedmioty na ladzie
            const itemY = c.y + 25;
            const itemsPerRow = 4;
            const itemSpacing = (c.width + 10) / itemsPerRow;
            const startX = c.x - 2 + itemSpacing / 2;

            // Miecz
            this.drawEquipmentOnCounter(startX + 0, itemY, 'sword');
            // Zbroja
            this.drawEquipmentOnCounter(startX + itemSpacing, itemY, 'armor');
            // Różdzka
            this.drawEquipmentOnCounter(startX + itemSpacing * 2, itemY, 'staff');
            // Łuk
            this.drawEquipmentOnCounter(startX + itemSpacing * 3, itemY, 'bow');
        }
    }

    drawEquipmentOnCounter(x, y, type) {
        switch(type) {
            case 'sword':
                // Miecz
                this.ctx.strokeStyle = '#c0c0c0';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x, y + 25);
                this.ctx.stroke();
                // Rękojeść
                this.ctx.fillStyle = '#8b4513';
                this.ctx.fillRect(x - 2, y + 22, 4, 6);
                // Garda
                this.ctx.fillStyle = '#ffd700';
                this.ctx.fillRect(x - 5, y + 19, 10, 3);
                break;
            case 'armor':
                // Zbroja (korpus)
                this.ctx.fillStyle = '#696969';
                this.ctx.fillRect(x - 4, y + 5, 8, 12);
                // Ramiona
                this.ctx.fillRect(x - 6, y + 7, 2, 8);
                this.ctx.fillRect(x + 4, y + 7, 2, 8);
                // Świecenie
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(x - 3, y + 8);
                this.ctx.lineTo(x + 3, y + 8);
                this.ctx.stroke();
                break;
            case 'staff':
                // Kij
                this.ctx.strokeStyle = '#8b4513';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x, y + 26);
                this.ctx.stroke();
                // Top (magiczna sfera)
                this.ctx.fillStyle = '#9370db';
                this.ctx.beginPath();
                this.ctx.arc(x, y - 2, 3, 0, Math.PI * 2);
                this.ctx.fill();
                // Blask magii
                this.ctx.strokeStyle = 'rgba(147, 112, 219, 0.6)';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.arc(x, y - 2, 5, 0, Math.PI * 2);
                this.ctx.stroke();
                break;
            case 'bow':
                // Łuk
                this.ctx.strokeStyle = '#8b6f47';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.arc(x, y + 12, 6, 0, Math.PI * 2);
                this.ctx.stroke();
                // Struna
                this.ctx.strokeStyle = '#d4a574';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.moveTo(x, y + 6);
                this.ctx.lineTo(x, y + 18);
                this.ctx.stroke();
                // Strzała
                this.ctx.strokeStyle = '#ff4500';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(x - 5, y + 12);
                this.ctx.lineTo(x + 3, y + 12);
                this.ctx.stroke();
                break;
        }
    }

    drawYellowHouseExit() {
        // Wizualizacja strefy wyjścia jako podświetlony prostokąt lub drzwi
        if (!this.interiorExitZone) return;
        const z = this.interiorExitZone;
        const centerX = z.x + z.width / 2;
        const centerY = z.y + z.height / 2;

        // Podświetlony obszar
        const grad = this.ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, z.width / 2);
        grad.addColorStop(0, 'rgba(255, 255, 100, 0.7)');
        grad.addColorStop(1, 'rgba(255, 255, 100, 0)');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(z.x, z.y, z.width, z.height);

        // Znak "WYJŚCIE"
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText('WYJŚCIE', centerX, centerY - 10);
        this.ctx.fillText('WYJŚCIE', centerX, centerY - 10);
    }

    drawBigCity() {
        // Duże miasto fantasy (mapa 2) - PEŁNA MAPA!
        
        // TŁO: Cały ekran z brukowanym tłem miasta
        const backgroundGradient = this.ctx.createLinearGradient(0, 0, 0, MAP_HEIGHT);
        backgroundGradient.addColorStop(0, '#5a4a3a');
        backgroundGradient.addColorStop(0.5, '#6b5d4f');
        backgroundGradient.addColorStop(1, '#4a3a2a');
        this.ctx.fillStyle = backgroundGradient;
        this.ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

        // Kamienne bruki po całej mapie (tekstura)
        this.ctx.strokeStyle = '#3a2a1a';
        this.ctx.lineWidth = 1;
        for (let x = 0; x < MAP_WIDTH; x += 30) {
            for (let y = 0; y < MAP_HEIGHT; y += 30) {
                this.ctx.beginPath();
                this.ctx.moveTo(x, y);
                this.ctx.lineTo(x + 28, y + 2);
                this.ctx.lineTo(x + 30, y + 30);
                this.ctx.lineTo(x + 2, y + 28);
                this.ctx.closePath();
                this.ctx.stroke();
            }
        }

        // Główne ulice
        this.ctx.fillStyle = '#8b7355';
        this.ctx.fillRect(0, MAP_HEIGHT / 2 - 80, MAP_WIDTH, 160); // Główna ulica pozioma
        this.ctx.fillRect(MAP_WIDTH / 2 - 80, 0, 160, MAP_HEIGHT); // Główna ulica pionowa

        // GŁÓWNE BUDYNKI - Centrum miasta
        const centerX = MAP_WIDTH / 2;
        const centerY = MAP_HEIGHT / 2;

        // Ratusz (gigantyczny w centrum)
        this.drawTownHall(centerX - 100, centerY - 75);

        // SKLEPY - Górna lewa kwadrant
        this.drawShop(300, 200, 'SKLEP', '#ff6347');
        this.drawShop(550, 200, 'KARCZMA', '#daa520');
        this.drawShop(800, 200, 'KOWAL', '#708090');
        this.drawShop(200, 450, 'APTEKA', '#32cd32');
        this.drawShop(450, 450, 'BANK', '#4169e1');
        this.drawShop(700, 450, 'MAGAZYN', '#8b4513');

        // DOMY MIESZKALNE - Różne części miasta
        this.drawSmallHouse(200, 250, '#d2691e');
        this.drawSmallHouse(300, 250, '#cd853f');
        this.drawSmallHouse(900, 250, '#daa520');
        this.drawSmallHouse(1000, 250, '#b8860b');
        
        this.drawSmallHouse(150, 800, '#8b4513');
        this.drawSmallHouse(250, 800, '#d2691e');
        this.drawSmallHouse(350, 800, '#cd853f');
        this.drawSmallHouse(1000, 900, '#daa520');
        this.drawSmallHouse(1100, 900, '#b8860b');

        // FONTANNIE - Różne lokalizacje
        this.drawFountain(centerX, centerY + 150);
        this.drawFountain(600, 600);
        this.drawFountain(1100, 500);

        // DREWNIANY MUR MIASTA - Obramowanie
        this.drawCityWall(50, 50, MAP_WIDTH - 100, MAP_HEIGHT - 100);

        // DRZEWA DEKORACYJNE - W całym mieście
        for (let i = 0; i < 30; i++) {
            const tx = 150 + (i % 5) * 300 + Math.random() * 50;
            const ty = 300 + Math.floor(i / 5) * 350 + Math.random() * 50;
            this.drawTreeCity(tx, ty);
        }

        // LATARNIE - Po ulicach
        for (let i = 0; i < 15; i++) {
            const lx = 100 + i * 250;
            const ly = MAP_HEIGHT / 2 - 100;
            this.drawLantern(lx, ly);
        }

        // Banner powitalny
        this.drawCityBanner();
    }

    drawTreeCity(x, y) {
        // Pikselowa, kompaktowa wersja drzewka miejskiego
        const key = `citytree_${Math.round(x)}_${Math.round(y)}`;
        if (!this.treeDetails[key]) {
            const seedBase = (Math.floor(x) * 92821) ^ (Math.floor(y) * 68917);
            const rand = (o) => Math.abs(Math.sin(seedBase + o) * 127.53125) % 1;
            const palettes = [
                { top: '#3aa45a', mid: '#2d8b4b', dark: '#1f6233', outline: '#0f301a', sparkle: '#6ad68c' },
                { top: '#4fb072', mid: '#3b955f', dark: '#2c6c45', outline: '#103624', sparkle: '#7de0a0' }
            ];
            this.treeDetails[key] = palettes[Math.floor(rand(5) * palettes.length)];
        }
        const p = this.treeDetails[key];

        // Cień
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + 24, 24, 7, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Pień
        this.ctx.fillStyle = '#7b5234';
        this.ctx.strokeStyle = '#2b1a12';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(x - 5, y, 10, 24);
        this.ctx.strokeRect(x - 5, y, 10, 24);

        // Korona
        this.ctx.fillStyle = p.dark;
        this.ctx.strokeStyle = p.outline;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(x, y - 12, 18, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = p.mid;
        this.ctx.beginPath();
        this.ctx.arc(x, y - 12, 15, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = p.top;
        this.ctx.beginPath();
        this.ctx.arc(x, y - 12, 12, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = p.sparkle;
        for (let i = 0; i < 8; i++) {
            this.ctx.fillRect(x - 8 + (i % 4) * 4, y - 18 + Math.floor(i / 4) * 5, 2, 2);
        }
    }

    drawLantern(x, y) {
        // Latarnia
        this.ctx.fillStyle = '#666';
        this.ctx.fillRect(x - 3, y, 6, 25);
        
        this.ctx.fillStyle = '#ffd700';
        this.ctx.fillRect(x - 10, y - 10, 20, 15);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x - 10, y - 10, 20, 15);
    }

    drawCityBanner() {
        // Banner na górze miasta
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(MAP_WIDTH / 2 - 150, 50, 300, 50);
        
        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = 'bold 32px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('VALDRHEIM', MAP_WIDTH / 2, 85);
        
        this.ctx.fillStyle = '#ffff99';
        this.ctx.font = '14px Arial';
        this.ctx.fillText('Wielkie Miasto Przygód', MAP_WIDTH / 2, 105);
    }

    drawTownHall(x, y) {
        // Ratusz - duży budynek
        const width = 200;
        const height = 150;

        // Ściany
        this.ctx.fillStyle = '#dcdcdc';
        this.ctx.fillRect(x, y, width, height);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x, y, width, height);

        // Dach (duży trójkąt)
        this.ctx.fillStyle = '#8b0000';
        this.ctx.beginPath();
        this.ctx.moveTo(x - 20, y);
        this.ctx.lineTo(x + width / 2, y - 60);
        this.ctx.lineTo(x + width + 20, y);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Wieża zegarowa
        this.ctx.fillStyle = '#a9a9a9';
        this.ctx.fillRect(x + width / 2 - 20, y - 120, 40, 60);
        this.ctx.strokeRect(x + width / 2 - 20, y - 120, 40, 60);

        // Zegar
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(x + width / 2, y - 90, 15, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Wskazówki zegara
        this.ctx.beginPath();
        this.ctx.moveTo(x + width / 2, y - 90);
        this.ctx.lineTo(x + width / 2, y - 100);
        this.ctx.moveTo(x + width / 2, y - 90);
        this.ctx.lineTo(x + width / 2 + 8, y - 90);
        this.ctx.stroke();

        // Szpic wieży
        this.ctx.fillStyle = '#ffd700';
        this.ctx.beginPath();
        this.ctx.moveTo(x + width / 2 - 25, y - 120);
        this.ctx.lineTo(x + width / 2, y - 150);
        this.ctx.lineTo(x + width / 2 + 25, y - 120);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Drzwi główne
        this.ctx.fillStyle = '#654321';
        this.ctx.fillRect(x + width / 2 - 30, y + height - 60, 60, 60);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x + width / 2 - 30, y + height - 60, 60, 60);

        // Okna
        this.ctx.fillStyle = '#87ceeb';
        for (let i = 0; i < 3; i++) {
            const wx = x + 30 + i * 70;
            this.ctx.fillRect(wx, y + 30, 30, 30);
            this.ctx.strokeRect(wx, y + 30, 30, 30);
            this.ctx.fillRect(wx, y + 80, 30, 30);
            this.ctx.strokeRect(wx, y + 80, 30, 30);
        }

        // Napis
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('RATUSZ', x + width / 2, y + 20);
    }

    drawShop(x, y, name, color) {
        const width = 120;
        const height = 100;

        // Ściany
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        // Dach
        this.ctx.fillStyle = '#654321';
        this.ctx.beginPath();
        this.ctx.moveTo(x - 10, y);
        this.ctx.lineTo(x + width / 2, y - 30);
        this.ctx.lineTo(x + width + 10, y);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Drzwi
        this.ctx.fillStyle = '#8b4513';
        this.ctx.fillRect(x + width / 2 - 15, y + height - 40, 30, 40);
        this.ctx.strokeRect(x + width / 2 - 15, y + height - 40, 30, 40);

        // Okno
        this.ctx.fillStyle = '#87ceeb';
        this.ctx.fillRect(x + 20, y + 30, 35, 35);
        this.ctx.strokeRect(x + 20, y + 30, 35, 35);
        this.ctx.fillRect(x + width - 55, y + 30, 35, 35);
        this.ctx.strokeRect(x + width - 55, y + 30, 35, 35);

        // Napis
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3;
        this.ctx.strokeText(name, x + width / 2, y + 15);
        this.ctx.fillText(name, x + width / 2, y + 15);
    }

    drawSmallHouse(x, y, color) {
        const width = 70;
        const height = 70;

        // Ściany
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        // Dach
        this.ctx.fillStyle = '#b22222';
        this.ctx.beginPath();
        this.ctx.moveTo(x - 5, y);
        this.ctx.lineTo(x + width / 2, y - 25);
        this.ctx.lineTo(x + width + 5, y);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Drzwi
        this.ctx.fillStyle = '#654321';
        this.ctx.fillRect(x + width / 2 - 10, y + height - 30, 20, 30);
        this.ctx.strokeRect(x + width / 2 - 10, y + height - 30, 20, 30);

        // Okno
        this.ctx.fillStyle = '#87ceeb';
        this.ctx.fillRect(x + 10, y + 15, 20, 20);
        this.ctx.strokeRect(x + 10, y + 15, 20, 20);
    }

    drawFountain(x, y) {
        // Basen fontanny
        this.ctx.fillStyle = '#4682b4';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 40, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Obramowanie
        this.ctx.strokeStyle = '#696969';
        this.ctx.lineWidth = 5;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 45, 0, Math.PI * 2);
        this.ctx.stroke();

        // Kolumna środkowa
        this.ctx.fillStyle = '#708090';
        this.ctx.fillRect(x - 8, y - 30, 16, 30);

        // Woda (efekt tryskania)
        this.ctx.strokeStyle = '#87ceeb';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const ex = x + Math.cos(angle) * 15;
            const ey = y + Math.sin(angle) * 15 - 30;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y - 30);
            this.ctx.quadraticCurveTo(x, y - 50, ex, ey);
            this.ctx.stroke();
        }
    }

    drawCityWall(x, y, width, height) {
        // Drewniany mur z palisadą (fantasy style)
        const wallColor = '#5c4033';
        const darkWood = '#3d2817';
        
        // Dolna część muru (grubsze belki)
        this.ctx.fillStyle = darkWood;
        this.ctx.fillRect(x, y, width, 20);
        this.ctx.fillRect(x, y + height - 20, width, 20);
        
        // Pionowe pale (po lewej i prawej)
        for (let i = 0; i < height; i += 15) {
            // Lewa strona
            this.ctx.fillStyle = wallColor;
            this.ctx.fillRect(x, y + i, 20, 12);
            this.ctx.strokeStyle = darkWood;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x, y + i, 20, 12);
            
            // Prawa strona
            this.ctx.fillRect(x + width - 20, y + i, 20, 12);
            this.ctx.strokeRect(x + width - 20, y + i, 20, 12);
        }
        
        // Górne i dolne pale (poziome)
        for (let i = 20; i < width - 20; i += 15) {
            // Góra
            this.ctx.fillStyle = wallColor;
            this.ctx.fillRect(x + i, y, 12, 20);
            this.ctx.strokeStyle = darkWood;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(x + i, y, 12, 20);
            
            // Dół
            this.ctx.fillRect(x + i, y + height - 20, 12, 20);
            this.ctx.strokeRect(x + i, y + height - 20, 12, 20);
        }
        
        // Wieże narożne (4 rogi)
        this.drawTower(x - 30, y - 30);
        this.drawTower(x + width + 10, y - 30);
        this.drawTower(x - 30, y + height + 10);
        this.drawTower(x + width + 10, y + height + 10);
    }
    
    drawTower(x, y) {
        // Wieża strażnicza
        const towerWidth = 40;
        const towerHeight = 60;
        
        // Podstawa wieży (kamienna)
        this.ctx.fillStyle = '#696969';
        this.ctx.fillRect(x, y, towerWidth, towerHeight);
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, towerWidth, towerHeight);
        
        // Dach wieży (stożek)
        this.ctx.fillStyle = '#8b4513';
        this.ctx.beginPath();
        this.ctx.moveTo(x - 5, y);
        this.ctx.lineTo(x + towerWidth / 2, y - 30);
        this.ctx.lineTo(x + towerWidth + 5, y);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // Okno w wieży
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(x + 12, y + 20, 16, 20);
        
        // Pochódnia/światło
        this.ctx.fillStyle = '#ff6347';
        this.ctx.beginPath();
        this.ctx.arc(x + 20, y + 15, 4, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawFlower(x, y, color) {
        // Petal
        this.ctx.fillStyle = color;
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const px = x + Math.cos(angle) * 5;
            const py = y + Math.sin(angle) * 5;
            this.ctx.beginPath();
            this.ctx.arc(px, py, 4, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Center
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Stem z liśćmi
        this.ctx.strokeStyle = '#228b22';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.quadraticCurveTo(x - 2, y + 8, x - 1, y + 18);
        this.ctx.stroke();

        // Liście
        this.ctx.fillStyle = 'rgba(34, 139, 34, 0.7)';
        this.ctx.beginPath();
        this.ctx.ellipse(x - 4, y + 8, 3, 2, -0.3, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.ellipse(x + 3, y + 12, 3, 2, 0.3, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawIsometricTerrain() {
        // Rysuje izometryczne kafelki terenu z cieniami
        this.ctx.globalAlpha = 0.15;
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 0.5;

        const tileWidth = 40;
        const tileHeight = 20;

        for (let row = 0; row < 25; row++) {
            for (let col = 0; col < 35; col++) {
                const screenX = col * (tileWidth / 2) - row * (tileWidth / 2);
                const screenY = row * (tileHeight / 2) + col * (tileHeight / 2);

                // Rysuj izometryczny kafelek
                this.ctx.beginPath();
                this.ctx.moveTo(screenX + tileWidth / 2, screenY);
                this.ctx.lineTo(screenX + tileWidth, screenY + tileHeight / 2);
                this.ctx.lineTo(screenX + tileWidth / 2, screenY + tileHeight);
                this.ctx.lineTo(screenX, screenY + tileHeight / 2);
                this.ctx.closePath();
                this.ctx.stroke();
            }
        }
        this.ctx.globalAlpha = 1;
    }

    drawWater(x, y, width, height) {
        // Woda - realistyczna z animacją
        const waterGradient = this.ctx.createLinearGradient(x, y, x, y + height);
        waterGradient.addColorStop(0, '#2196F3');
        waterGradient.addColorStop(0.4, '#1976D2');
        waterGradient.addColorStop(0.7, '#1565C0');
        waterGradient.addColorStop(1, '#0D47A1');
        this.ctx.fillStyle = waterGradient;
        this.ctx.beginPath();
        this.ctx.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Cień wody
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.beginPath();
        this.ctx.arc(x + width / 2, y + height / 2, width / 2 - 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Fale z lepszym efektem
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            const radius = (width / 2) * (0.8 - i * 0.2);
            this.ctx.beginPath();
            this.ctx.arc(x + width / 2, y + height / 2, radius, 0, Math.PI * 2);
            this.ctx.stroke();
        }

        // Shimmer (połysk)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.beginPath();
        this.ctx.arc(x + width / 3, y + height / 3, 15, 0, Math.PI * 2);
        this.ctx.fill();
    }

    drawForest(x, y) {
        // Las - wiele drzew
        for (let i = 0; i < 4; i++) {
            const treeX = x + (Math.random() - 0.5) * 100;
            const treeY = y + (Math.random() - 0.5) * 100;
            this.drawLargeTree(treeX, treeY);
        }
    }

    drawLargeTree(x, y) {
        // Pikselowo-cieniowane drzewo w stylu ref
        const key = `tree_${Math.round(x)}_${Math.round(y)}`;
        if (!this.treeDetails[key]) {
            const seedBase = (Math.floor(x) * 73856093) ^ (Math.floor(y) * 19349663);
            const rand = (o) => Math.abs(Math.sin(seedBase + o) * 43758.5453123) % 1;
            const palettes = [
                { top: '#3aa45a', mid: '#2d8b4b', dark: '#1f6233', outline: '#0f301a', sparkle: '#6ad68c' },
                { top: '#4fb072', mid: '#3b955f', dark: '#2c6c45', outline: '#103624', sparkle: '#7de0a0' },
                { top: '#3e9a60', mid: '#2f8350', dark: '#245f3a', outline: '#0f2f1b', sparkle: '#62c987' }
            ];
            this.treeDetails[key] = {
                palette: palettes[Math.floor(rand(5) * palettes.length)],
                trunkShade: rand(10),
                leafDither: rand(20)
            };
        }

        const p = this.treeDetails[key].palette;
        const trunkH = 44;
        const trunkW = 14;

        // Cień elipsa
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + trunkH * 0.9, 34, 10, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Pień z ciemnym outline
        this.ctx.fillStyle = '#7b5234';
        this.ctx.strokeStyle = '#2b1a12';
        this.ctx.lineWidth = 2;
        this.ctx.fillRect(x - trunkW / 2, y, trunkW, trunkH);
        this.ctx.strokeRect(x - trunkW / 2, y, trunkW, trunkH);

        // Przecinające się segmenty kory
        this.ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        for (let i = 0; i < 6; i++) {
            const yLine = y + 6 + i * 6;
            this.ctx.beginPath();
            this.ctx.moveTo(x - trunkW / 2 + 2, yLine);
            this.ctx.lineTo(x + trunkW / 2 - 2, yLine);
            this.ctx.stroke();
        }

        // Korona: trzy koncentryczne placki z outline i ditherem
        const layers = [
            { r: 34, color: p.dark },
            { r: 30, color: p.mid },
            { r: 24, color: p.top }
        ];

        // Outline korony
        this.ctx.fillStyle = p.dark;
        this.ctx.strokeStyle = p.outline;
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(x, y - 18, layers[0].r, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();

        // Środkowe warstwy
        for (let i = 1; i < layers.length; i++) {
            this.ctx.fillStyle = layers[i].color;
            this.ctx.beginPath();
            this.ctx.arc(x, y - 18, layers[i].r, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Drobne piksele połysku i cienia dla tekstury
        this.ctx.fillStyle = p.sparkle;
        for (let i = 0; i < 14; i++) {
            const ang = (i / 14) * Math.PI * 2;
            const rx = x + Math.cos(ang) * (12 + (i % 3));
            const ry = y - 18 + Math.sin(ang) * (12 + (i % 4));
            this.ctx.fillRect(rx, ry, 2, 2);
        }

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        for (let i = 0; i < 10; i++) {
            const rx = x - 10 + (i % 5) * 5;
            const ry = y - 8 + Math.floor(i / 5) * 6;
            this.ctx.fillRect(rx, ry, 2, 2);
        }

        // Korzenie
        this.ctx.strokeStyle = '#4a2f21';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x - 4, y + trunkH);
        this.ctx.lineTo(x - 10, y + trunkH + 8);
        this.ctx.moveTo(x + 4, y + trunkH);
        this.ctx.lineTo(x + 10, y + trunkH + 8);
        this.ctx.stroke();
    }

    drawForest(x, y) {
        // Już nie potrzebna - drzewa są wcześniej generowane
    }

    drawPath() {
        // Droga przez środek - realistyczna z teksturą
        // Główna droga
        const roadGradient = this.ctx.createLinearGradient(400, 250, 400, 370);
        roadGradient.addColorStop(0, '#9d8b7e');
        roadGradient.addColorStop(0.5, '#8b7d6f');
        roadGradient.addColorStop(1, '#7d6f61');
        this.ctx.fillStyle = roadGradient;
        this.ctx.fillRect(400, 250, 400, 120);

        // Cień drogi
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        this.ctx.fillRect(400, 250, 400, 120);

        // Tekstura drogi (kamienie/piach)
        this.ctx.globalAlpha = 0.6;
        for (let i = 0; i < 200; i++) {
            const x = 400 + Math.random() * 400;
            const y = 250 + Math.random() * 120;
            const size = Math.random() * 3;
            this.ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.3})`;
            this.ctx.fillRect(x, y, size, size);
        }
        this.ctx.globalAlpha = 1;

        // Linia markowania drogi
        this.ctx.strokeStyle = 'rgba(255, 255, 200, 0.4)';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([10, 10]);
        this.ctx.beginPath();
        this.ctx.moveTo(600, 250);
        this.ctx.lineTo(600, 370);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Krawędzie drogi z trawą
        this.ctx.fillStyle = 'rgba(45, 90, 45, 0.3)';
        this.ctx.fillRect(390, 250, 10, 120);
        this.ctx.fillRect(800, 250, 10, 120);

        // Ozdobne kamienie wzdłuż drogi
        this.ctx.fillStyle = '#b0a090';
        for (let i = 0; i < 4; i++) {
            const py = 280 + i * 20;
            this.ctx.fillRect(375, py, 5, 8);
            this.ctx.fillRect(820, py, 5, 8);
        }
    }

    drawInfo() {
        // Instrukcje gry
        this.ctx.fillStyle = '#00ff99';
        this.ctx.font = '11px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.shadowColor = '#000';
        this.ctx.shadowBlur = 2;
        this.ctx.fillText('WASD / Strzałki - ruch, 1/2/3 - umiejętności', CONFIG.CANVAS_WIDTH - 10, 20);
        this.ctx.shadowColor = 'transparent';
    }

    // ============================================
    // SYSTEM EKWIPUNKU
    // ============================================

    showEquipmentMenu(slotType) {
        // Wyświetl menu z dostępnymi przedmiotami
        const availableItems = this.player.inventory.slots.filter(item => {
            if (!item) return false;
            // Filtruj przedmioty które można wyposażyć
            if (slotType === 'weapon' && item.type === 'weapon') return true;
            if (slotType === 'armor' && item.type === 'armor') return true;
            if (slotType === 'helmet' && item.type === 'helmet') return true;
            if (slotType === 'shield' && item.type === 'shield') return true;
            if (slotType === 'accessory' && item.type === 'accessory') return true;
            return false;
        });

        if (availableItems.length === 0) {
            alert(`Nie masz przedmiotów typu: ${slotType}`);
            return;
        }

        // Stwórz alert z opcjami
        let message = `Dostępne przedmioty na ${slotType}:\n\n`;
        availableItems.forEach((item, i) => {
            message += `${i + 1}. ${item.icon} ${item.name}\n`;
        });
        message += `\nWpisz numer (0 = usuń):`;

        const choice = prompt(message);
        if (choice === null) return;

        const num = parseInt(choice);
        if (num === 0) {
            // Usuń wyposażenie
            this.unequipItem(slotType);
            return;
        }

        if (num > 0 && num <= availableItems.length) {
            const selectedItem = availableItems[num - 1];
            this.equipItem(slotType, selectedItem);
        }
    }

    equipItem(slotType, item) {
        // Usuń poprzedni item jeśli istnieje
        const oldItem = this.player.equipment[slotType];
        if (oldItem) {
            this.player.inventory.addItem(oldItem);
        }

        // Wyposażyć nowy item
        this.player.equipment[slotType] = item;

        // Usuń z ekwipunku
        const invIndex = this.player.inventory.slots.indexOf(item);
        if (invIndex !== -1) {
            this.player.inventory.removeItem(invIndex);
        }

        // Recalculate bonuses
        this.recalculateEquipmentBonuses();

        // Update display
        this.updateEquipmentDisplay();
        this.updateInventoryDisplay();
    }

    unequipItem(slotType) {
        const item = this.player.equipment[slotType];
        if (!item) return;

        // Dodaj z powrotem do ekwipunku
        if (this.player.inventory.addItem(item)) {
            this.player.equipment[slotType] = null;
            this.recalculateEquipmentBonuses();
            this.updateEquipmentDisplay();
            this.updateInventoryDisplay();
        } else {
            alert('Ekwipunek jest pełny!');
        }
    }

    recalculateEquipmentBonuses() {
        // Resetuj bonusy
        this.player.equipmentATK = 0;
        this.player.equipmentDEF = 0;

        // Dodaj bonusy z każdego wyposażenia
        if (this.player.equipment.weapon) {
            this.player.equipmentATK += this.player.equipment.weapon.atk || 5;
        }
        if (this.player.equipment.armor) {
            this.player.equipmentDEF += this.player.equipment.armor.def || 3;
        }
        if (this.player.equipment.helmet) {
            this.player.equipmentDEF += this.player.equipment.helmet.def || 2;
        }
        if (this.player.equipment.shield) {
            this.player.equipmentDEF += this.player.equipment.shield.def || 4;
        }
        if (this.player.equipment.accessory) {
            this.player.equipmentATK += this.player.equipment.accessory.atk || 1;
            this.player.equipmentDEF += this.player.equipment.accessory.def || 1;
        }
    }

    // ============================================
    // GŁÓWNA PĘTLA GRY
    // ============================================

    gameLoop() {
        if (!this.gameRunning) return;

        this.update();
        this.draw();

        this._gameLoopId = requestAnimationFrame(() => this.gameLoop());
    }

    // ============================================
    // MULTIPLAYER - Firebase
    // ============================================

    initMultiplayer() {
        if (!this.player) return;
        
        // Ustaw listener dla innych graczy
        database.ref('players').on('value', (snapshot) => {
            const data = snapshot.val() || {};
            
            // Usuń graczy którzy się rozłączyli
            for (let id in this.otherPlayers) {
                if (!data[id] || id === playerId) {
                    delete this.otherPlayers[id];
                }
            }
            
            // Zaktualizuj pozostałych graczy
            for (let id in data) {
                if (id !== playerId) {
                    this.otherPlayers[id] = data[id];
                }
            }
        });
    }

    syncPlayerToFirebase() {
        if (!this.player) return;
        
        const playerData = {
            x: this.player.x,
            y: this.player.y,
            name: this.player.name || 'Gracz',
            level: this.player.level || 1,
            className: this.player.className || 'Wojownik',
            timestamp: Date.now()
        };
        
        database.ref('players/' + playerId).set(playerData);
    }

    drawOtherPlayers() {
        for (let id in this.otherPlayers) {
            const other = this.otherPlayers[id];
            if (!other) continue;
            
            // Rysuj drugiego gracza na mapie
            const centerX = other.x + this.player.width / 2;
            const centerY = other.y + this.player.height / 2;
            
            // Cień
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.ellipse(centerX, centerY + 12, 10, 4, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Głowa
            this.ctx.fillStyle = '#d4a574';
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY - 8, 5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Ciało
            this.ctx.fillStyle = '#c04000';
            this.ctx.fillRect(centerX - 7, centerY - 2, 14, 12);
            
            // Nazwa nad graczem
            this.ctx.fillStyle = '#FFD700';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(other.name || 'Gracz', centerX, centerY - 18);
        }
    }
}

// ============================================
// INICJALIZACJA
// ============================================

let game;

window.addEventListener('load', () => {
    game = new Game();
});
