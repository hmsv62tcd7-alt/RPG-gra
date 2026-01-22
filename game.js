// ============================================
// RPG 2D - Gra w przeglądarce
// ============================================

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
        // Ruch gracza
        this.x += this.velocityX;
        this.y += this.velocityY;

        // Ograniczenie do mapy
        this.x = Math.max(0, Math.min(this.x, MAP_WIDTH - this.width));
        this.y = Math.max(0, Math.min(this.y, MAP_HEIGHT - this.height));
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
    constructor(id, name, description, requiredLevel, expReward, goldReward, mobName, mobCount, rewardItem = null) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.requiredLevel = requiredLevel;
        this.expReward = expReward;
        this.goldReward = goldReward;
        this.mobName = mobName;
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
        // Realistyczne NPC - handlarz/inżynier
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        
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

    getDistance(x, y) {
        const dx = this.x - x;
        const dy = this.y - y;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

class Enemy {
    constructor(x, y, name) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.ENEMY_SIZE;
        this.height = CONFIG.ENEMY_SIZE;
        this.name = name;
        this.maxHp = 50;
        this.hp = 50;
        this.damage = 8;
        this.defense = 2;
        this.isAggro = false;
        this.aggroRange = 150;
        this.isAlive = true;
        this.respawnTimer = 0;
        this.respawnTime = 10; // 10 sekund
        this.spawnX = x;
        this.spawnY = y;
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
        const race = this.race || 'Human';
        
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

        if (race === 'Human') {
            // Dzik (Wild Boar) - for humans
            const bodyGradient = ctx.createLinearGradient(centerX - 12, centerY - 2, centerX + 12, centerY + 12);
            bodyGradient.addColorStop(0, '#4a3728');
            bodyGradient.addColorStop(0.5, '#2a1f18');
            bodyGradient.addColorStop(1, '#1a0f08');
            ctx.fillStyle = bodyGradient;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY + 4, 13, 11, 0, 0, Math.PI * 2);
            ctx.fill();

            // Bristles (włosie na plecach)
            ctx.strokeStyle = '#3a2f28';
            ctx.lineWidth = 2;
            for (let i = -10; i <= 10; i += 3) {
                ctx.beginPath();
                ctx.moveTo(centerX + i, centerY - 5);
                ctx.lineTo(centerX + i - 1, centerY - 9);
                ctx.stroke();
            }

            // Head (czaszka zwierzęcia)
            const headGradient = ctx.createLinearGradient(centerX - 10, centerY - 5, centerX + 5, centerY + 5);
            headGradient.addColorStop(0, '#5a4738');
            headGradient.addColorStop(1, '#2a1f18');
            ctx.fillStyle = headGradient;
            ctx.beginPath();
            ctx.ellipse(centerX - 6, centerY + 2, 8, 6, 0.2, 0, Math.PI * 2);
            ctx.fill();

            // Snout (ryjek)
            ctx.fillStyle = '#3a2f28';
            ctx.beginPath();
            ctx.ellipse(centerX - 13, centerY + 4, 4, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Nostrils
            ctx.fillStyle = '#000';
            ctx.fillRect(centerX - 14.5, centerY + 2.5, 1.5, 1);
            ctx.fillRect(centerX - 14.5, centerY + 4.5, 1.5, 1);

            // Eyes (szalone oczy)
            const eyeColor = this.isAggro ? '#FF0000' : '#FFAA00';
            ctx.fillStyle = eyeColor;
            ctx.fillRect(centerX - 10, centerY - 1, 2.5, 2.5);
            ctx.fillRect(centerX - 4, centerY - 1, 2.5, 2.5);

            // Pupils
            ctx.fillStyle = '#000';
            ctx.fillRect(centerX - 9.5, centerY - 0.5, 1.5, 1.5);
            ctx.fillRect(centerX - 3.5, centerY - 0.5, 1.5, 1.5);

            // Tusks (kły)
            ctx.strokeStyle = '#E8D5C4';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(centerX - 13, centerY + 6);
            ctx.quadraticCurveTo(centerX - 15, centerY + 9, centerX - 14, centerY + 12);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(centerX - 13, centerY + 8);
            ctx.quadraticCurveTo(centerX - 15.5, centerY + 11, centerX - 14.5, centerY + 14);
            ctx.stroke();

            // Legs (nogi)
            ctx.fillStyle = '#1a0f08';
            ctx.fillRect(centerX - 9, centerY + 14, 3, 5);
            ctx.fillRect(centerX - 3, centerY + 14, 3, 5);
            ctx.fillRect(centerX + 3, centerY + 14, 3, 5);
            ctx.fillRect(centerX + 9, centerY + 14, 3, 5);
        } else {
            // Trole (Trolls) - for orcs - large blue creatures
            const bodyGradient = ctx.createLinearGradient(centerX - 12, centerY - 2, centerX + 12, centerY + 12);
            bodyGradient.addColorStop(0, '#3a5a7a');
            bodyGradient.addColorStop(0.5, '#1a3a5a');
            bodyGradient.addColorStop(1, '#0a1a3a');
            ctx.fillStyle = bodyGradient;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY + 4, 14, 13, 0, 0, Math.PI * 2);
            ctx.fill();

            // Spikes on back
            ctx.fillStyle = '#5a7a9a';
            for (let i = -8; i <= 8; i += 4) {
                ctx.beginPath();
                ctx.moveTo(centerX + i, centerY - 8);
                ctx.lineTo(centerX + i - 2, centerY - 13);
                ctx.lineTo(centerX + i + 2, centerY - 13);
                ctx.closePath();
                ctx.fill();
            }

            // Head
            const headGradient = ctx.createLinearGradient(centerX - 8, centerY - 6, centerX + 8, centerY + 2);
            headGradient.addColorStop(0, '#4a6a8a');
            headGradient.addColorStop(1, '#1a3a5a');
            ctx.fillStyle = headGradient;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY - 8, 9, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            // Horns
            ctx.strokeStyle = '#8a8a8a';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX - 6, centerY - 12);
            ctx.lineTo(centerX - 8, centerY - 16);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(centerX + 6, centerY - 12);
            ctx.lineTo(centerX + 8, centerY - 16);
            ctx.stroke();

            // Eyes (red and angry)
            const eyeColor = this.isAggro ? '#FF3333' : '#FF6666';
            ctx.fillStyle = eyeColor;
            ctx.fillRect(centerX - 7, centerY - 9, 2.5, 2.5);
            ctx.fillRect(centerX + 4.5, centerY - 9, 2.5, 2.5);

            // Pupils
            ctx.fillStyle = '#000';
            ctx.fillRect(centerX - 6.5, centerY - 8.5, 1.5, 1.5);
            ctx.fillRect(centerX + 5, centerY - 8.5, 1.5, 1.5);

            // Mouth
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(centerX, centerY - 4, 3, 0, Math.PI);
            ctx.stroke();

            // Legs (nogi)
            ctx.fillStyle = '#0a1a3a';
            ctx.fillRect(centerX - 10, centerY + 14, 5, 6);
            ctx.fillRect(centerX + 5, centerY + 14, 5, 6);
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
        this.enemy = null;
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

        // Utwórz NPC z misjami (różne w zależności od rasy)
        const race = this.selectedChar ? this.selectedChar.race || 'Human' : 'Human';
        if (race === 'Human') {
            this.npcs = [
                new NPC(200, 150, "Kravis Żelazny", [0, 1, 2], 'quest', "Witaj wojowniku! Mam dla ciebie ważne misje!"),
                new NPC(CONFIG.CANVAS_WIDTH - 230, CONFIG.CANVAS_HEIGHT - 180, "Mira Handlarka", [], 'vendor', "Witaj przybyszu! Czy chcesz coś kupić?"),
                new NPC(350, 450, "Olaf Łowca", [], 'quest', "Hej, przyjacielu! Mam parę zadań dla ciebie!")
            ];
            this.enemy = new Enemy(800, 200, "Dzik");
        } else {
            // Orki - inne NPC
            this.npcs = [
                new NPC(200, 150, "Grok Zwycięzca", [0, 1, 2], 'quest', "Witaj, młody wojowniku! Mam dla ciebie zadania!"),
                new NPC(CONFIG.CANVAS_WIDTH - 230, CONFIG.CANVAS_HEIGHT - 180, "Urga Szamanka", [], 'vendor', "Witaj, podróżniku! Mam ciekawe rzeczy do sprzedania!"),
                new NPC(350, 450, "Drog Myśliwy", [], 'quest', "Cześć! Masz chwilę dla mnie?")
            ];
            this.enemy = new Enemy(800, 200, "Trole");
            this.enemy.race = 'Orc';
        }

        // Wygeneruj drzewa
        this.generateTrees();

        // Wygeneruj kwiaty
        this.generateFlowers();
    }

    initQuests() {
        const race = this.selectedChar ? this.selectedChar.race || 'Human' : 'Human';
        if (race === 'Human') {
            this.quests = [
                new Quest(0, "Pierwsze potwory", "Zbierz 3x Mięso Dzika", 1, 10, 15, "Dzik", 3, new Item("Mięso Dzika", "🥩", "drop", 0)),
                new Quest(1, "Szkoła myślistwa", "Polowanie treningowe - zabij 2 Dzików", 1, 20, 25, "Dzik", 2, null),
                new Quest(2, "Prawdziwy Dzik", "Zabij prawdziwego dzika (50% szansy przy każdym zabójstwie)", 1, 60, 80, "Dzik", 1, null)
            ];
        } else {
            // Orc quests - trolls instead
            this.quests = [
                new Quest(0, "Zbieranie Tropów", "Zbierz 3x Pazury Trola", 1, 15, 20, "Trole", 3, new Item("Pazury Trola", "💚", "drop", 0)),
                new Quest(1, "Trening Walki", "Walka treningowa - zabij 2 Troli", 1, 25, 30, "Trole", 2, null),
                new Quest(2, "Wódz Trollów", "Zabij Wodza Trollów (50% szansy)", 1, 80, 100, "Trole", 1, null)
            ];
        }
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

    // ============================================
    // LOGIKA GRY
    // ============================================

    update() {
        this.updatePlayerMovement();
        this.player.update();
        this.updateCamera();
        this.enemy.update(this.player.x, this.player.y);
        
        // Obsługa respawnu wroga
        if (!this.enemy.isAlive) {
            this.enemy.respawnTimer -= 0.016; // ~60 FPS
            if (this.enemy.respawnTimer <= 0) {
                this.enemy.isAlive = true;
                this.enemy.hp = this.enemy.maxHp;
                this.enemy.x = this.enemy.spawnX;
                this.enemy.y = this.enemy.spawnY;
                this.enemy.isAggro = false;
            }
        }
        
        this.checkCollisions();
        
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
    }

    updateCamera() {
        // Docelowa pozycja kamery (centrowuje gracza na ekranie)
        const targetCameraX = this.player.x + this.player.width / 2 - this.cameraOffsetX;
        const targetCameraY = this.player.y + this.player.height / 2 - this.cameraOffsetY;

        // Smooth camera following
        this.cameraX += (targetCameraX - this.cameraX) * this.cameraSmooth;
        this.cameraY += (targetCameraY - this.cameraY) * this.cameraSmooth;

        // Ograniczenia kamery (aby nie wychodzić poza mapę)
        this.cameraX = Math.max(0, Math.min(this.cameraX, MAP_WIDTH - CONFIG.CANVAS_WIDTH));
        this.cameraY = Math.max(0, Math.min(this.cameraY, MAP_HEIGHT - CONFIG.CANVAS_HEIGHT));
    }

    checkCollisions() {
        // Kolizja z wrogiem
        const dx = (this.player.x + this.player.width / 2) - (this.enemy.x + this.enemy.width / 2);
        const dy = (this.player.y + this.player.height / 2) - (this.enemy.y + this.enemy.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 50 && !this.battle && this.enemy.isAlive) {
            this.startBattle();
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
        this.battle = new Battle(this.player, this.enemy);
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
        
        // Sprawdzenie czy wróg umiera
        const enemyDefeated = this.enemy.hp <= 0;
        
        this.battle = null; // Wyczyść bitwę natychmiast

        if (enemyDefeated) {
            // Wróg pokonany - respawn po 10 sekundach
            this.enemy.isAlive = false;
            this.enemy.respawnTimer = this.enemy.respawnTime;
            this.enemy.isAggro = false; // Wyłącz aggro
            this.player.heal(20); // Bonus zdrowia
            
            // Update quest progress
            this.updateQuestProgress();
        }
    }

    updateQuestProgress() {
        // Zliczaj postęp dla aktywnych misji powiązanych z Dzikami
        for (let quest of this.activeQuests) {
            if (quest.completed) continue;
            if (quest.mobName !== "Dzik") continue;

            // Quest 0: meat collection - must add meat to inventory to count
            if (quest.id === 0) {
                const meatItem = new Item("Mięso Dzika", "🥩", 'drop', 0, 1);
                const added = this.player.inventory.addItem(meatItem);
                if (added) {
                    quest.progress++;
                    console.log(`Zebrano mięso (${quest.progress}/${quest.mobCount})`);
                    
                    // 10% szansa na drop ekwipunku
                    if (Math.random() < 0.1) {
                        const equipment = [
                            new Item("Miecz Myśliwego", "⚔", 'weapon', null, 1, 3, 0),
                            new Item("Skórzana Zbroja", "🛡", 'armor', null, 1, 0, 2)
                        ];
                        const randomEq = equipment[Math.floor(Math.random() * equipment.length)];
                        this.player.inventory.addItem(randomEq);
                        console.log(`Padł ${randomEq.name}!`);
                    }
                } else {
                    console.log('Inventory pełny - nie można zebrać mięsa');
                }
            }

            // Quest 1: hunting practice - each kill counts
            else if (quest.id === 1) {
                quest.progress++;
                console.log(`Postęp treningu: ${quest.progress}/${quest.mobCount}`);
            }

            // Quest 2: real boar - 50% chance per kill to be the real one
            else if (quest.id === 2) {
                const success = Math.random() < 0.5;
                if (success) {
                    quest.progress++;
                    console.log('Udało się zabić prawdziwego dzika!');
                } else {
                    console.log('To jeszcze nie był prawdziwy dzik... walcz dalej');
                }
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

        // --- Rysuj tło mapy z trawą ---
        this.drawMapGrass();
        // ---

        // Rysuj wiosłę
        this.drawVillage();

        // Siatka (opcjonalnie)
        this.drawGrid();

        // Rysuj NPC
        for (let npc of this.npcs) {
            npc.draw(this.ctx);
            this.drawNPCQuestMarker(npc);
        }

        // Rysuj wroga
        this.enemy.draw(this.ctx);

        // Rysuj gracza
        this.player.draw(this.ctx);

        // Przywróć stan kontekstu (usuń transformację)
        this.ctx.restore();

        // Info (rysuj poza transformacją, aby być na górze)
        this.drawInfo();

        // Rysuj minimapę
        this.drawMinimap();
    }

    drawMapGrass() {
        // Tło trawy
        this.ctx.fillStyle = '#2d5016';
        this.ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

        // Rysuj zapisany wzór trawy
        for (let tile of this.mapGrassPattern) {
            this.ctx.fillStyle = tile.color;
            this.ctx.fillRect(tile.x, tile.y, tile.size, tile.size);
        }

        // Drogi z piasku
        this.drawSandRoads();
    }

    generateGrassPattern() {
        const pattern = [];
        // Generuj wzór trawy raz, na stałych pozycjach
        for (let x = 0; x < MAP_WIDTH; x += 30) {
            for (let y = 0; y < MAP_HEIGHT; y += 30) {
                // Seed random na podstawie pozycji
                const seed = (x * 73856093) ^ (y * 19349663);
                const random = Math.abs(Math.sin(seed) * 10000) % 1;
                
                if (random > 0.3) {
                    pattern.push({
                        x: x + (seed % 30),
                        y: y + ((seed >> 8) % 30),
                        size: Math.floor((seed % 20) + 5),
                        color: ['#3d6b1f', '#2d5016', '#4a7c1d', '#2b4d14'][Math.floor((seed % 4))]
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

        // Skala (mapa 4000x4000 -> minimap 150x150)
        const scale = 150 / MAP_WIDTH;

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

        // Rysuj wroga (czerwony punkt)
        const enemyMinimapX = this.enemy.x * scale;
        const enemyMinimapY = this.enemy.y * scale;
        this.minimapCtx.fillStyle = '#ff0000';
        this.minimapCtx.beginPath();
        this.minimapCtx.arc(enemyMinimapX, enemyMinimapY, 2, 0, Math.PI * 2);
        this.minimapCtx.fill();

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
        // Tło - wielowarstwowe tereny z teksturą
        const grassGradient = this.ctx.createLinearGradient(0, 0, 0, CONFIG.CANVAS_HEIGHT);
        grassGradient.addColorStop(0, '#3a6e3a');
        grassGradient.addColorStop(0.3, '#2d5a2d');
        grassGradient.addColorStop(0.6, '#1f4620');
        grassGradient.addColorStop(1, '#0d2d0d');
        this.ctx.fillStyle = grassGradient;
        this.ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

        // Dodatna tekstura trawy (szum)
        for (let i = 0; i < 100; i++) {
            this.ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.1})`;
            const rx = Math.random() * CONFIG.CANVAS_WIDTH;
            const ry = Math.random() * CONFIG.CANVAS_HEIGHT;
            this.ctx.fillRect(rx, ry, 2, 2);
        }

        // Ciemniejsza area (las/las)
        const forestGradient = this.ctx.createRadialGradient(150, 250, 0, 150, 250, 300);
        forestGradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
        forestGradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        this.ctx.fillStyle = forestGradient;
        this.ctx.beginPath();
        this.ctx.arc(150, 250, 300, 0, Math.PI * 2);
        this.ctx.fill();

        // Isometryczne kafelki terenu (ulepszone)
        this.drawIsometricTerrain();

        // Woda po lewej stronie (ulepszona)
        this.drawWater(80, 150, 150, 400);

        // Rysuj drzewa (wcześniej generowane)
        for (let tree of this.trees) {
            this.drawLargeTree(tree.x, tree.y);
        }

        // Rysuj kwiaty (wcześniej generowane)
        for (let flower of this.flowers) {
            this.drawFlower(flower.x, flower.y, flower.color);
        }

        // Ścieżka (ulepszona)
        this.drawPath();
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
        // Duże drzewo - realistyczne
        // Cień
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.ellipse(x, y + 60, 50, 15, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Pień (trunk) - bardziej realistyczny
        const trunkGradient = this.ctx.createLinearGradient(x - 8, y - 10, x + 8, y + 50);
        trunkGradient.addColorStop(0, '#6d4c41');
        trunkGradient.addColorStop(0.5, '#4e342e');
        trunkGradient.addColorStop(1, '#3e2723');
        this.ctx.fillStyle = trunkGradient;
        this.ctx.fillRect(x - 8, y, 16, 55);

        // Cień na pniu
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(x + 2, y, 4, 55);

        // Bark texture
        for (let i = 0; i < 8; i++) {
            this.ctx.strokeStyle = `rgba(0, 0, 0, ${0.1 + Math.random() * 0.1})`;
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(x - 8, y + i * 7);
            this.ctx.lineTo(x + 8, y + i * 7);
            this.ctx.stroke();
        }

        // Liście - 4 poziomy (bardziej realistyczne)
        const foliageLevels = [
            { radius: 55, offsetY: -35, color1: '#2d5016', color2: '#1b3a0d', color3: '#0f1f07' },
            { radius: 45, offsetY: -15, color1: '#3d6b1f', color2: '#2d5016', color3: '#1b3a0d' },
            { radius: 35, offsetY: 5, color1: '#4d8228', color2: '#3d6b1f', color3: '#2d5016' },
            { radius: 25, offsetY: 20, color1: '#5d9632', color2: '#4d8228', color3: '#3d6b1f' }
        ];

        for (let foliage of foliageLevels) {
            // Główne liście
            const gradient = this.ctx.createRadialGradient(x, y + foliage.offsetY, foliage.radius * 0.3, x, y + foliage.offsetY, foliage.radius);
            gradient.addColorStop(0, foliage.color1);
            gradient.addColorStop(0.6, foliage.color2);
            gradient.addColorStop(1, foliage.color3);
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y + foliage.offsetY, foliage.radius, 0, Math.PI * 2);
            this.ctx.fill();

            // Cień wewnętrzny
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            this.ctx.beginPath();
            this.ctx.arc(x - foliage.radius * 0.3, y + foliage.offsetY + foliage.radius * 0.2, foliage.radius * 0.5, 0, Math.PI * 2);
            this.ctx.fill();

            // Highlight (światło)
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            this.ctx.beginPath();
            this.ctx.arc(x - foliage.radius * 0.4, y + foliage.offsetY - foliage.radius * 0.3, foliage.radius * 0.4, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Roots (korzenie)
        this.ctx.strokeStyle = '#5d4037';
        this.ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const rootX = x + Math.cos(angle) * 12;
            const rootY = y + 55;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y + 55);
            this.ctx.quadraticCurveTo(rootX + 5, rootY + 8, rootX + 3, rootY + 15);
            this.ctx.stroke();
        }
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
}

// ============================================
// INICJALIZACJA
// ============================================

let game;

window.addEventListener('load', () => {
    game = new Game();
});
