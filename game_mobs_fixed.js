// ============================================
// RPG 2D - Gra w przeglądarce
// ============================================

// Wersja gry
const GAME_VERSION = '1.0.0';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyB59jEt8zSwFwDdoND89LuT-s-xwl2vjKI",
  authDomain: "rpg-gra.firebaseapp.com",
  databaseURL: "https://rpg-gra-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "rpg-gra",
  storageBucket: "rpg-gra.firebasestorage.app",
  messagingSenderId: "513783473198",
  appId: "1:513783473198:web:dd2f6c68a6f344f291abbf",
  measurementId: "G-7C2C97NV14"
};

// Initialize Firebase
console.log('[Firebase] Initializing Firebase...');
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();
console.log('[Firebase] Firebase initialized, database:', database);

// Inicjalizuj wersję w Firebase jeśli nie istnieje
function initializeGameVersion() {
    database.ref('system/version').once('value', (snapshot) => {
        if (!snapshot.exists()) {
            // Wersja nie istnieje, stwórz ją
            database.ref('system/version').set(GAME_VERSION).then(() => {
                console.log('[Firebase] Game version initialized:', GAME_VERSION);
            }).catch(error => {
                console.error('[Firebase] Error initializing version:', error);
            });
        } else {
            console.log('[Firebase] Game version already exists:', snapshot.val());
        }
    });
}

// Wywołaj inicjalizację wersji
initializeGameVersion();

// Flaga wskazująca czy jesteśmy w grze
let isInGame = false;

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
let playerId = null;
let currentUser = null;
let otherPlayers = {};

// Check auth state at startup
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('[Auth] Logged in as:', user.email);
        currentUser = user;
        playerId = 'player_' + user.uid.substr(0, 9);
        showMainMenu();
    } else {
        console.log('[Auth] Not logged in');
        currentUser = null;
        playerId = null;
        showAuthScreen();
    }
});

// ============================================
// SYSTEM STATYSTYK KLAS
// ============================================

const ClassType = {
    MAG: 'mag',
    WOJ: 'woj',
    HUNTER: 'hunter'
};

// Definicje statystyk dla każdej klasy
const CLASS_STATS = {
    [ClassType.MAG]: {
        start: { str: 1, int: 3, zrn: 2, vit: 5, bonusHp: 0 },
        gains: { str: 1, int: 2, zrn: 1, vit: 1, bonusHp: 0 }
    },
    [ClassType.WOJ]: {
        start: { str: 3, int: 1, zrn: 2, vit: 9, bonusHp: 0 },
        gains: { str: 2, int: 1, zrn: 1, vit: 1, bonusHp: 5 }
    },
    [ClassType.HUNTER]: {
        start: { str: 1, int: 1, zrn: 3, vit: 7, bonusHp: 0 },
        gains: { str: 1, int: 1, zrn: 2, vit: 1, bonusHp: 1 }
    }
};

// Struktura statystyk
class Stats {
    constructor(str = 0, int = 0, zrn = 0, vit = 0, bonusHp = 0, hp = 0) {
        this.str = str;
        this.int = int;
        this.zrn = zrn;
        this.vit = vit;
        this.bonusHp = bonusHp;
        this.hp = hp;
    }
}

// Funkcja obliczająca staty na dany level
function getStats(classType, level) {
    if (!CLASS_STATS[classType] || level < 1) {
        console.error('Invalid class or level:', classType, level);
        return new Stats();
    }
    
    const classData = CLASS_STATS[classType];
    const levelMultiplier = level - 1;
    
    const str = classData.start.str + classData.gains.str * levelMultiplier;
    const int = classData.start.int + classData.gains.int * levelMultiplier;
    const zrn = classData.start.zrn + classData.gains.zrn * levelMultiplier;
    const vit = classData.start.vit + classData.gains.vit * levelMultiplier;
    const bonusHp = classData.start.bonusHp + classData.gains.bonusHp * levelMultiplier;
    const hp = vit * 10 + bonusHp;
    
    return new Stats(str, int, zrn, vit, bonusHp, hp);
}

// TESTY - Sprawdzenie obliczania statystyk
console.log('[Stats] === TESTY SYSTEMU STATYSTYK ===');
const magL1 = getStats(ClassType.MAG, 1);
const magL2 = getStats(ClassType.MAG, 2);
console.log(`[Stats] MAG lvl 1: STR=${magL1.str}, INT=${magL1.int}, ZRN=${magL1.zrn}, VIT=${magL1.vit}, HP=${magL1.hp} (oczekiwane: 50)`);
console.log(`[Stats] MAG lvl 2: STR=${magL2.str}, INT=${magL2.int}, ZRN=${magL2.zrn}, VIT=${magL2.vit}, HP=${magL2.hp} (oczekiwane: 60)`);

const wojL1 = getStats(ClassType.WOJ, 1);
const wojL2 = getStats(ClassType.WOJ, 2);
console.log(`[Stats] WOJ lvl 1: STR=${wojL1.str}, INT=${wojL1.int}, ZRN=${wojL1.zrn}, VIT=${wojL1.vit}, HP=${wojL1.hp} (oczekiwane: 90)`);
console.log(`[Stats] WOJ lvl 2: STR=${wojL2.str}, INT=${wojL2.int}, ZRN=${wojL2.zrn}, VIT=${wojL2.vit}, HP=${wojL2.hp} (oczekiwane: 105)`);

const hunterL1 = getStats(ClassType.HUNTER, 1);
const hunterL2 = getStats(ClassType.HUNTER, 2);
console.log(`[Stats] HUNTER lvl 1: STR=${hunterL1.str}, INT=${hunterL1.int}, ZRN=${hunterL1.zrn}, VIT=${hunterL1.vit}, HP=${hunterL1.hp} (oczekiwane: 70)`);
console.log(`[Stats] HUNTER lvl 2: STR=${hunterL2.str}, INT=${hunterL2.int}, ZRN=${hunterL2.zrn}, VIT=${hunterL2.vit}, HP=${hunterL2.hp} (oczekiwane: 81)`);
console.log('[Stats] === KONIEC TESTÓW ===');

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
    constructor(x, y, classType = ClassType.WOJ, level = 1) {
        this.x = x;
        this.y = y;
        this.width = CONFIG.PLAYER_SIZE;
        this.height = CONFIG.PLAYER_SIZE;
        this.speed = CONFIG.PLAYER_SPEED;
        
        // Klasa i level
        this.classType = classType;
        this.level = level;
        
        // Staty z systemu
        this.stats = getStats(classType, level);
        this.maxHp = this.stats.hp;
        this.hp = this.stats.hp;
        
        // System exp
        this.exp = 0;
        this.maxExp = 80; // balans: wolniejszy progres, ale exp też leci z mobów
        
        this.velocityX = 0;
        this.velocityY = 0;
        
        // Inventory
        this.inventory = new Inventory(20);
        
        // Equipment
        this.equipment = {
            helmet: null,      // Hełm
            weapon: null,      // Broń
            shield: null,      // Tarcza
            accessory: null,   // Pierścionek
            boots: null,       // Buty
            necklace: null     // Naszyjnik
        };
        
        // Equipment bonuses
        this.equipmentATK = 0;
        this.equipmentDEF = 0;
        
        // Combat system
        this.currentTarget = null;
        this.lastAttackTime = 0;
        this.attackCooldown = 0;
        this.moveToTarget = null; // Position do którego się porusza
        
        // Skill system
        this.skill1LastTime = 0;
        this.skill2LastTime = 0;
        this.skill3LastTime = 0;
        this.skill1Cooldown = 0;
        this.skill2Cooldown = 0;
        this.skill3Cooldown = 0;
        
        // Special effects
        this.shieldHP = 0; // Dodatkowy shield
        this.shieldEndTime = 0;
    }

    takeDamage(damage) {
        // Sprawdź czy shield jeszcze aktywny
        const now = Date.now();
        if (this.shieldEndTime && now < this.shieldEndTime && this.shieldHP > 0) {
            // Shield absorbuje damage
            const shieldDamage = Math.min(this.shieldHP, damage);
            this.shieldHP -= shieldDamage;
            const remainingDamage = damage - shieldDamage;
            
            if (remainingDamage > 0) {
                this.hp = Math.max(0, this.hp - remainingDamage);
                return damage;
            }
            return damage;
        }
        
        // Brak shield - zwykły damage
        this.hp = Math.max(0, this.hp - damage);
        return damage;
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
        this.maxExp = Math.floor(this.maxExp * 1.35 + 20); // łagodniejsza krzywa exp do ~10lv po całej mapie
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

// ========== PROJECTILE CLASS ==========
class Projectile {
    constructor(x, y, targetX, targetY, speed = 300, damage = 10, type = 'arrow') {
        this.x = x;
        this.y = y;
        this.targetX = targetX;
        this.targetY = targetY;
        this.speed = speed; // px/s
        this.damage = damage;
        this.type = type; // 'arrow', 'orb'
        this.alive = true;
        
        // Oblicz kierunek
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0) {
            this.vx = (dx / dist) * speed;
            this.vy = (dy / dist) * speed;
        } else {
            this.vx = 0;
            this.vy = 0;
        }
        
        this.width = 8;
        this.height = 8;
        this.trailParticles = []; // Ślad cząsteczek
    }
    
    update(deltaTime) {
        const dt = deltaTime || 0.016; // ~60 FPS
        
        // Aktualizuj pozycję
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Sprawdź czy dotarł do celu (w promieniu 15px)
        const dx = this.x - this.targetX;
        const dy = this.y - this.targetY;
        const distToTarget = Math.sqrt(dx * dx + dy * dy);
        
        if (distToTarget < 15) {
            this.alive = false;
        }
        
        // Sprawdź czy wyleciał poza mapę
        if (this.x < -50 || this.x > MAP_WIDTH + 50 || 
            this.y < -50 || this.y > MAP_HEIGHT + 50) {
            this.alive = false;
        }
        
        // Dodaj cząsteczki śladu (co kilka updatów)
        if (Math.random() < 0.3) {
            this.trailParticles.push({
                x: this.x,
                y: this.y,
                life: 0.3,
                maxLife: 0.3,
                type: this.type
            });
        }
        
        // Update śladu
        for (let i = this.trailParticles.length - 1; i >= 0; i--) {
            this.trailParticles[i].life -= dt;
            if (this.trailParticles[i].life <= 0) {
                this.trailParticles.splice(i, 1);
            }
        }
    }
    
    draw(ctx) {
        // Rysuj ślad
        for (let particle of this.trailParticles) {
            const alpha = particle.life / particle.maxLife;
            ctx.globalAlpha = alpha * 0.6;
            
            if (particle.type === 'arrow') {
                ctx.fillStyle = '#ffcc00';
                ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
            } else if (particle.type === 'orb') {
                ctx.fillStyle = '#6699ff';
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
                ctx.fill();
            } else if (particle.type === 'fireball') {
                ctx.fillStyle = '#ff6633';
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        ctx.globalAlpha = 1;
        
        // Rysuj sam projectile
        if (this.type === 'arrow') {
            // Strzała - żółta
            ctx.fillStyle = '#ffcc00';
            ctx.save();
            ctx.translate(this.x, this.y);
            
            // Oblicz kąt
            const angle = Math.atan2(this.vy, this.vx);
            ctx.rotate(angle);
            
            // Trójkąt (głowica strzały)
            ctx.beginPath();
            ctx.moveTo(4, 0);
            ctx.lineTo(-3, -3);
            ctx.lineTo(-2, 0);
            ctx.lineTo(-3, 3);
            ctx.closePath();
            ctx.fill();
            
            ctx.restore();
        } else if (this.type === 'orb') {
            // Magiczna kula - niebieska z blaskiem
            ctx.fillStyle = '#6699ff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = '#99ccff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.type === 'fireball') {
            // Kula Ognia - pomarańczowa/czerwona z blaskiem
            ctx.fillStyle = '#ff6633';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
            ctx.fill();
            
            // Środkowy punkt (jaśniejszy)
            ctx.fillStyle = '#ffaa66';
            ctx.beginPath();
            ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Glow
            ctx.strokeStyle = 'rgba(255, 102, 51, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 7, 0, Math.PI * 2);
            ctx.stroke();
        }
    }
    
    // Sprawdzenie kolizji z wrogiem
    checkCollisionWithEnemy(enemy) {
        const dx = this.x - (enemy.x + enemy.width / 2);
        const dy = this.y - (enemy.y + enemy.height / 2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < (this.width / 2 + enemy.width / 2);
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
        this.isTargeted = false; // True gdy wybrany jako cel przez gracza
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

        // Poziomy potworów (do wyświetlania i balansu exp/gold)
        const baseLevels = {
            'wolf': 1,
            'boar': 2,
            'whelp': 2,
            'bear': 3,
            'wasp': 5,
            'snake': 6,
            'spider': 7,
            'bandit': 8,
            'golem': 9
        };

        // ELITA (specjalny przypadek) — Golem Starożytny
        const isEliteGolem = (this.type === 'golem' && /Starożytny/i.test(this.name));
        this.level = isEliteGolem ? 10 : (baseLevels[this.type] || 1);
        this.isElite = isEliteGolem;

        
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

        // Nagrody za zabicie (EXP zawsze, gold z szansą)
        // EXP rośnie z levelem i trudnością, ale nie pozwala wbić 10lv w 10 minut.
        const diffMul = (this.difficulty === "easy") ? 0.9 : (this.difficulty === "medium") ? 1.15 : 1.35;
        const baseExpByLevel = {1: 6, 2: 8, 3: 11, 4: 14, 5: 18, 6: 22, 7: 26, 8: 30, 9: 36, 10: 50};
        this.expReward = Math.floor((baseExpByLevel[this.level] || 6) * diffMul);

        // Gold — szansa + zakres zależny od levela
        const goldChanceByLevel = {1: 0.18, 2: 0.20, 3: 0.22, 5: 0.26, 6: 0.30, 7: 0.33, 8: 0.36, 9: 0.40, 10: 0.55};
        const goldRangeByLevel = {
            1: [1, 4],
            2: [2, 6],
            3: [3, 8],
            5: [4, 10],
            6: [5, 12],
            7: [6, 15],
            8: [8, 20],
            9: [10, 26],
            10: [25, 55]
        };
        const gr = goldRangeByLevel[this.level] || [1, 4];
        this.goldDropChance = goldChanceByLevel[this.level] ?? 0.2;
        this.goldMin = gr[0];
        this.goldMax = gr[1];
}

    update(playerX, playerY) {
        // SAFE_RECT w WORLD coords - prostokąt pokrywający kamienną podłogę + margines
        const SAFE_RECT = { x: 135, y: 95, w: 570, h: 590 };
        
        // Helper: sprawdzić czy punkt jest w safe zone
        const insideSafe = (px, py) => {
            return px >= SAFE_RECT.x && px <= SAFE_RECT.x + SAFE_RECT.w &&
                   py >= SAFE_RECT.y && py <= SAFE_RECT.y + SAFE_RECT.h;
        };
        
        // 1) NO ENTER: Jeśli mob jest w safe zone -> wypchnij go na zewnątrz i zablokuj
        if (insideSafe(this.x, this.y)) {
            // Znajdź najbliższy punkt poza safe zone
            const cx = SAFE_RECT.x + SAFE_RECT.w / 2; // Środek rect
            const cy = SAFE_RECT.y + SAFE_RECT.h / 2;
            const dx = this.x - cx;
            const dy = this.y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // Wypchnij na oś o 20px od krawędzi
            const pushDist = Math.max(SAFE_RECT.w, SAFE_RECT.h) / 2 + 20;
            this.x = cx + (dx / dist) * pushDist;
            this.y = cy + (dy / dist) * pushDist;
            
            // Reset ruchu i targetowania
            this.velocityX = 0;
            this.velocityY = 0;
            this.target = null;
            this.isAggro = false;
            return; // Wyjdź z update - nie da się targetować w safe zone
        }
        
        // 2) Sprawdzenie czy gracz jest w safe zone
        const playerInSafeZone = insideSafe(playerX, playerY);
        
        if (playerInSafeZone) {
            // Gracz w safe zone -> nie targetuj
            this.target = null;
            this.isAggro = false;
            return;
        }
        
        // 3) Normalna AI: sprawdzenie zasięgu i zbliżanie się
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
        
        // Jeśli HP spadło do 0, oznacz jako martwego
        if (this.hp <= 0) {
            this.isAlive = false;
            this.respawnTimer = this.respawnTime; // Ustaw timer respawnu na 10 sekund
        }
        
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
        this.projectiles = []; // Pociski (strzały, magiczne kule)
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
        this.friendsList = [];      // Lista znajomych
        this.incomingFriendRequests = [];

        // Trade & Whisper
        this.tradeOfferSlots = new Set();
        this.tradeOfferGold = 0;
        this.tradeAccepted = false;
        this.tradeTimeout = null;
        this.tradeApplied = false;
        this.whisperChats = {};
        this.currentWhisperWith = null;

        // Camera system
        this.cameraX = 0;
        this.cameraY = 0;
        this.cameraOffsetX = CONFIG.CANVAS_WIDTH / 2;
        this.cameraOffsetY = CONFIG.CANVAS_HEIGHT / 2;
        this.cameraSmooth = 0.1; // Smooth camera follow (0-1, higher = faster)

        // Dynamiczny rozmiar canvasu dopasowany do kontenera gry
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        this.setupEventListeners();
        this.initToastSystem();
    }

    // ========== TOAST NOTIFICATION SYSTEM ==========
    initToastSystem() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:20000;';
        document.body.appendChild(container);
    }

    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container') || document.body;
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            background: ${type === 'success' ? '#44ff44' : type === 'error' ? '#ff4444' : '#4a90e2'};
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            margin-bottom: 10px;
            min-width: 250px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        `;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    }

    playSound(type = 'click') {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            gain.gain.setValueAtTime(0.1, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            if (type === 'success') {
                osc.frequency.setValueAtTime(400, audioContext.currentTime);
                osc.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            } else if (type === 'error') {
                osc.frequency.setValueAtTime(200, audioContext.currentTime);
            } else {
                osc.frequency.setValueAtTime(300, audioContext.currentTime);
            }
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + 0.1);
        } catch (e) {}
    }

    centerPanel(panel) {
        if (!panel) return;
        panel.style.left = '50%';
        panel.style.top = '50%';
        panel.style.transform = 'translate(-50%, -50%)';
    }

    makePanelDraggable(panelId) {
        const panel = document.getElementById(panelId);
        if (!panel) return;
        const handle = panel.querySelector('.panel-header') || panel;
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        const onMouseMove = (e) => {
            if (!isDragging) return;
            panel.style.left = `${e.clientX - offsetX}px`;
            panel.style.top = `${e.clientY - offsetY}px`;
            panel.style.transform = 'none';
            panel.dataset.dragged = 'true';
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        handle.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // tylko lewy przycisk
            isDragging = true;
            const rect = panel.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            panel.style.transform = 'none';
            panel.dataset.dragged = 'true';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
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
        // Skill 1 (Atak) - działa zarówno w walce jak i w eksploracji
        document.getElementById('skillBtn1').addEventListener('click', () => {
            if (this.battle) {
                this.handleBattleAction('attack');
            } else {
                // Normalny atak w eksploracji
                this.basicAttack();
            }
        });
        document.getElementById('skillBtn2').addEventListener('click', () => {
            if (this.battle) {
                this.handleBattleAction('skill1');
            } else {
                this.castSkill(2);
            }
        });
        document.getElementById('skillBtn3').addEventListener('click', () => {
            if (this.battle) {
                this.handleBattleAction('skill2');
            } else {
                this.castSkill(3);
            }
        });
        
        // Też klawiszami 1,2,3
        document.addEventListener('keydown', (e) => {
            if (e.key === '1') {
                if (this.battle) {
                    this.handleBattleAction('attack');
                } else {
                    this.basicAttack();
                }
            }
            if (e.key === '2') {
                if (this.battle) {
                    this.handleBattleAction('skill1');
                } else {
                    this.castSkill(2);
                }
            }
            if (e.key === '3') {
                if (this.battle) {
                    this.handleBattleAction('skill2');
                } else {
                    this.castSkill(3);
                }
            }
        });

        // Canvas click dla interakcji z NPC
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
        // Prawy przycisk myszy dla context menu na innych gracza
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.handleCanvasRightClick(e);
        });

        // Zamknij context menu przy lewym kliknięciu
        document.addEventListener('click', () => {
            const contextMenu = document.getElementById('playerContextMenu');
            if (contextMenu) contextMenu.classList.add('hidden');
        });

        // Setup context menu buttons
        this.setupContextMenuHandlers();

        // Selected player HUD clear button
        const clearSel = document.getElementById('clearSelectedPlayer');
        if (clearSel) {
            clearSel.addEventListener('click', () => {
                this.selectedPlayerId = null;
                this.selectedPlayerData = null;
                const hud = document.getElementById('selectedPlayerHud');
                if (hud) hud.classList.add('hidden');
            });
        }

        // Friends panel toggle (hotkey F)
        const friendsPanelToggle = (e) => {
            if ((e.key === 'f' || e.key === 'F') && document.activeElement.id !== 'chatInput') {
                this.showFriendsPanel();
            }
        };
        document.addEventListener('keydown', friendsPanelToggle);


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
                const invPanel = document.getElementById('inventoryWindow');
                if (invPanel) invPanel.classList.remove('visible');
            });
        }
        
        if (closeEquipmentBtn) {
            closeEquipmentBtn.addEventListener('click', () => {
                const eqPanel = document.getElementById('equipmentWindow');
                if (eqPanel) eqPanel.classList.remove('visible');
            });
        }

        // Draggable panels (inventory, equipment)
        this.makePanelDraggable('inventoryWindow');
        this.makePanelDraggable('equipmentWindow');

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

        // Najpierw sprawdź, czy kliknięto innego gracza (zaznaczenie celu gracza)
        if (this.selectPlayerAt(worldClickX, worldClickY)) {
            return;
        }

        // Następnie sprawdź czy kliknięto na wroga (targeting system)
        let clickedEnemy = null;
        for (let enemy of this.enemies) {
            if (!enemy.isAlive) continue; // Zignoruj martwych wrogów
            
            const dx = worldClickX - (enemy.x + enemy.width / 2);
            const dy = worldClickY - (enemy.y + enemy.height / 2);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < enemy.width / 2 + 5) {
                clickedEnemy = enemy;
                break;
            }
        }
        
        // Jeśli kliknięto na wroga, ustaw go jako cel
        if (clickedEnemy) {
            // Wyłącz isTargeted u poprzedniego celu
            if (this.player.currentTarget) {
                this.player.currentTarget.isTargeted = false;
            }
            // Ustaw nowy cel
            this.player.currentTarget = clickedEnemy;
            clickedEnemy.isTargeted = true;
            return;
        }

        // Jeśli kliknięto na puste miejsce, usuń cel wroga i odznacz gracza
        if (this.player.currentTarget) {
            this.player.currentTarget.isTargeted = false;
            this.player.currentTarget = null;
        }
        this.selectedPlayerId = null;
        this.selectedPlayerData = null;

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
                const eqPanel = document.getElementById('equipmentWindow');
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
        // Załaduj umiejętności natychmiast bez opóźnienia
        this.updateSkillUI();
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
        isInGame = true;  // Gracz wszedł do gry
        lastNotifiedUpdateVersion = null;  // Zresetuj żeby móc wysłać nowe powiadomienia
        // Initialize multiplayer after player is fully ready
        this.initMultiplayer();
        // Send system message to chat
        sendSystemMessage(`${slot.name} zalogował się do gry`);
        // Inicjalizuj sprawdzanie aktualizacji (tylko gdy gracz jest w grze)
        initUpdateCheck();
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
        // Staty są już wyliczone w konstruktorze Player na podstawie classType i level
        // Tylko dodaj rasę i bonus HP jeśli to Orc
        if (race === 'Orc') {
            this.player.maxHp = Math.floor(this.player.maxHp * 1.2);
            this.player.stats.bonusHp = this.player.maxHp - (this.player.stats.vit * 10);
            this.player.hp = this.player.maxHp;
        }
        // update HUD immediately
        this.updateHUD();
    }

    resizeCanvas() {
        const container = document.getElementById('gameContainer');
        const rect = container ? container.getBoundingClientRect() : { width: CONFIG.CANVAS_WIDTH, height: CONFIG.CANVAS_HEIGHT };
        // Fallbacky na wypadek dziwnych wartości
        const safeWidth = Number.isFinite(rect.width) && rect.width > 0 ? rect.width : CONFIG.CANVAS_WIDTH;
        const safeHeight = Number.isFinite(rect.height) && rect.height > 0 ? rect.height : CONFIG.CANVAS_HEIGHT;
        this.canvas.width = safeWidth;
        this.canvas.height = safeHeight;
        this.cameraOffsetX = this.canvas.width / 2;
        this.cameraOffsetY = this.canvas.height / 2;
    }

    initGame() {
        // Mapuj klasy z CSS na ClassType enum
        const classMap = {
            'Mag': ClassType.MAG,
            'Wojownik': ClassType.WOJ,
            'Hunter': ClassType.HUNTER
        };
        
        const classType = classMap[this.selectedChar?.className || 'Wojownik'] || ClassType.WOJ;
        const level = this.selectedChar?.level || 1;
        
        // Utwórz gracza z systemem statystyk
        this.player = new Player(CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2, classType, level);
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
        // Ale załaduj z Firebase jeśli już istnieją (serwerowi wrogowie)
        this.loadOrGenerateEnemies();

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
        const safeX = Number.isFinite(state.x) ? state.x : CONFIG.CANVAS_WIDTH / 2;
        const safeY = Number.isFinite(state.y) ? state.y : CONFIG.CANVAS_HEIGHT / 2;
        this.player.x = safeX;
        this.player.y = safeY;

        // Przywróć staty na podstawie poziomu
        if (this.player.level > 1) {
            this.player.stats = getStats(this.player.classType, this.player.level);
            this.player.maxHp = this.player.stats.hp;
            if (this.player.hp > this.player.maxHp) {
                this.player.hp = this.player.maxHp;
            }
        }

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

    loadOrGenerateEnemies() {
        // Ładuj wrogów z Firebase (serwerowych) lub wygeneruj nowych jeśli nie ma
        if (!currentUser) {
            this.generateEnemies();
            return;
        }

        database.ref('gameState/map' + this.currentMap + '/enemiesTemplate').once('value').then((snapshot) => {
            const enemiesTemplate = snapshot.val();
            
            if (enemiesTemplate && enemiesTemplate.length > 0) {
                // Wrogowie już istnieją w Firebase - załaduj ich
                console.log('[Multiplayer] Loading enemies from Firebase:', enemiesTemplate.length);
                this.enemies = [];
                
                for (let template of enemiesTemplate) {
                    const enemy = new Enemy(template.x, template.y, template.name, template.type);
                    enemy.difficulty = template.difficulty;
                    enemy.maxHp = template.maxHp;
                    enemy.hp = template.hp;
                    enemy.isAlive = template.isAlive;
                    enemy.respawnTimer = template.respawnTimer || 0;
                    this.enemies.push(enemy);
                }
            } else {
                // Wrogowie nie istnieją - wygeneruj nowych i zapisz do Firebase
                console.log('[Multiplayer] Generating new enemies and saving to Firebase');
                this.generateEnemies();
                
                // Zapisz template wrogów do Firebase (pozycje, typy)
                const enemiesTemplate = this.enemies.map(enemy => ({
                    x: enemy.x,
                    y: enemy.y,
                    name: enemy.name,
                    type: enemy.type,
                    difficulty: enemy.difficulty,
                    maxHp: enemy.maxHp,
                    hp: enemy.hp,
                    isAlive: enemy.isAlive,
                    respawnTimer: enemy.respawnTimer
                }));
                
                database.ref('gameState/map' + this.currentMap + '/enemiesTemplate').set(enemiesTemplate);
            }
        }).catch((error) => {
            console.error('[Multiplayer] Error loading enemies:', error);
            this.generateEnemies();
        });
    }

    generateEnemies() {
        // Rozrzuceni przeciwnicy po mapie, ale z kontrolą stref (żeby low-lv nie lądował na końcu mapy)
        this.enemies = [];

        const campX = 1800, campY = 1800;
        
        // SAFE_RECT w WORLD coords - prostokąt pokrywający kamienną podłogę + margines
        const SAFE_RECT = { x: 135, y: 95, w: 570, h: 590 };
        
        // Helper: sprawdzić czy punkt jest w safe zone
        const insideSafe = (px, py) => {
            return px >= SAFE_RECT.x && px <= SAFE_RECT.x + SAFE_RECT.w &&
                   py >= SAFE_RECT.y && py <= SAFE_RECT.y + SAFE_RECT.h;
        };
        
        console.log('[SAFE_ZONE] SAFE_RECT:', SAFE_RECT, 'Safe zone coords test:',
            `topLeft(${SAFE_RECT.x},${SAFE_RECT.y})`, 
            `bottomRight(${SAFE_RECT.x + SAFE_RECT.w},${SAFE_RECT.y + SAFE_RECT.h})`);
        
        // Debug instrukcja w konsoli
        console.log('%c=== SAFE ZONE FIX - DEBUG INFO ===', 'color: #00FF00; font-weight: bold; font-size: 14px;');
        console.log('%cSAFE ZONE ACTIVE: Green rect on map shows safe zone', 'color: #00FF00; font-size: 12px;');
        console.log('%cTo clear old cache from Firebase, run:', 'color: #FFFF00; font-size: 11px;');
        console.log('%c  window.gameManager?.debugClearEnemiesCache()', 'color: #FF9900; font-size: 11px; font-family: monospace;');
        console.log('%cThen reload page (F5) to regenerate enemies', 'color: #FFFF00; font-size: 11px;');
        console.log('%c========================================', 'color: #00FF00; font-weight: bold;');
        
        let seedCounter = 1;
        const seededRandom = (seed) => {
            const x = Math.sin(seed) * 10000;
            return x - Math.floor(x);
        };
        const rand = () => seededRandom(seedCounter++);

        // Konfiguracja mobów (nazwy + level + ew. ELITA)
        const mobCfg = {
            wolf:   { level: 1, names: ['Wilk', 'Wilk Szary', 'Wilk Alfa'] },
            boar:   { level: 2, names: ['Dzik', 'Dzik Leśny', 'Śnieżny Dzik'] },
            whelp:  { level: 2, names: ['Wilczek', 'Małe Szczenię', 'Szczenię Wilka'] },
            bear:   { level: 3, names: ['Niedźwiedź', 'Niedźwiedź Brunatny', 'Niedźwiedź Górski'] },
            wasp:   { level: 5, names: ['Osa', 'Osa Gigantyczna', 'Osa Warjatka'] },
            snake:  { level: 6, names: ['Wąż', 'Wąż Żmija', 'Wąż Wędrujący'] },
            spider: { level: 7, names: ['Pająk', 'Pająk Jadowity', 'Tarantula'] },
            bandit: { level: 8, names: ['Bandyta', 'Rabuś', 'Zbójca'] },
            golem:  { level: 9, names: ['Golem', 'Golem Kamienny'] }
        };

        const margin = 140; // bezpieczny margines od krawędzi mapy (żeby nie „przyklejało” do końca)
        const inBounds = (x, y) => x >= margin && x <= MAP_WIDTH - margin && y >= margin && y <= MAP_HEIGHT - margin;

        // Pomocnicza funkcja do kładzenia mobów w paśmie odległości z minimalnym dystansem
        const placeZone = (count, distMin, distMax, minSpacing, pool, difficulty, pairChance = 0.22) => {
            const placed = [];
            let attempts = 0;

            while (placed.length < count && attempts < count * 80) {
                attempts++;

                const angle = rand() * Math.PI * 2;
                const dist = distMin + rand() * (distMax - distMin);
                const x = campX + Math.cos(angle) * dist;
                const y = campY + Math.sin(angle) * dist;

                // Zamiast clamp — odrzucaj pozycje poza mapą (eliminuje zbijanie na końcach mapy)
                if (!inBounds(x, y)) continue;

                // REJECT: SAFE ZONE (NO SPAWN) - jeśli punkt w safe zone, retry
                if (insideSafe(x, y)) {
                    continue; // Losuj ponownie, nie dodawaj do placed
                }

                let tooClose = false;
                for (const p of placed) {
                    const dx = p.x - x;
                    const dy = p.y - y;
                    if (dx * dx + dy * dy < minSpacing * minSpacing) { tooClose = true; break; }
                }
                if (tooClose) continue;

                placed.push({ x, y });

                // mała para obok (2 max) — ale bez wielkich kup
                if (placed.length < count && rand() < pairChance) {
                    const oa = rand() * Math.PI * 2;
                    const od = 28 + rand() * 36;
                    const nx = x + Math.cos(oa) * od;
                    const ny = y + Math.sin(oa) * od;
                    if (inBounds(nx, ny)) {
                        let ok = true;
                        for (const p of placed) {
                            const dx = p.x - nx;
                            const dy = p.y - ny;
                            if (dx * dx + dy * dy < (minSpacing * 0.75) * (minSpacing * 0.75)) { ok = false; break; }
                        }
                        if (ok) placed.push({ x: nx, y: ny });
                    }
                }
            }

            // Utwórz wrogów z rozstawionych pozycji
            placed.slice(0, count).forEach((pos) => {
                const entry = pool[Math.floor(rand() * pool.length)];
                const cfg = mobCfg[entry] || mobCfg.boar;

                let baseName = cfg.names[Math.floor(rand() * cfg.names.length)];
                let level = cfg.level || 1;

                // ELITA: Golem Starożytny (rzadko, tylko w hard)
                if (entry === 'golem' && difficulty === 'hard' && rand() < 0.10) {
                    baseName = "Golem Starożytny (ELITA)";
                    level = 10;
                }

                const name = `${baseName} (${level}lv)`;
                const enemy = new Enemy(pos.x, pos.y, name, entry);
                enemy.difficulty = difficulty;
                if (typeof enemy.initStats === 'function') enemy.initStats();
                this.enemies.push(enemy);
            });
        };

        // Strefy (od obozu):
        // - Zone1: lvl 1-3 (nie ma prawa wolf respować się na końcu)
        // - Zone2: lvl 2-6
        // - Zone3: lvl 6-10 (dalej od obozu)
        placeZone(70, 180, 950, 120, ['wolf', 'boar', 'whelp', 'bear'], 'easy', 0.25);
        placeZone(65, 1050, 1850, 140, ['boar', 'bear', 'wasp', 'snake'], 'medium', 0.22);
        placeZone(55, 1950, 2850, 160, ['snake', 'wasp', 'spider', 'bandit', 'golem'], 'hard', 0.18);
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
        // Jeśli czat jest aktywny, nie obsługuj skrótów klawiszowych
        const chatInput = document.getElementById('chatInput');
        if (chatInput && document.activeElement === chatInput) {
            return; // Nie obsługuj skrótów gdy pisze się na czacie
        }

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
            const invPanel = document.getElementById('inventoryWindow');
            if (invPanel) {
                const nowVisible = invPanel.classList.toggle('visible');
                if (nowVisible && !invPanel.dataset.dragged) {
                    this.centerPanel(invPanel);
                }
            }
        }

        // Obsługa ekwipunku (klawisz C)
        if (key === 'c' || key === 'C') {
            const eqPanel = document.getElementById('equipmentWindow');
            if (eqPanel) {
                const nowVisible = eqPanel.classList.toggle('visible');
                if (nowVisible && !eqPanel.dataset.dragged) {
                    this.centerPanel(eqPanel);
                }
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

        // Atak (klawisz 1)
        if (key === '1') {
            this.basicAttack();
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

        // Jeśli gracz ma cel do podejścia (moveToTarget), idź w jego kierunku
        if (this.player.moveToTarget) {
            const targetX = this.player.moveToTarget.x + this.player.moveToTarget.width / 2;
            const targetY = this.player.moveToTarget.y + this.player.moveToTarget.height / 2;
            const playerCenterX = this.player.x + this.player.width / 2;
            const playerCenterY = this.player.y + this.player.height / 2;
            
            const dx = targetX - playerCenterX;
            const dy = targetY - playerCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Jeśli dotarł do celu (w promieniu 30px), zatrzymaj się
            if (distance < 30) {
                this.player.moveToTarget = null;
            } else if (distance > 0) {
                // Poruszaj się w kierunku celu
                const speed = this.player.speed;
                this.player.velocityX = (dx / distance) * speed;
                this.player.velocityY = (dy / distance) * speed;
            }
        } else {
            // Normalna kontrola gracza (WASD/Strzałki)
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
        if (!this.player) return;
        if (!Number.isFinite(this.player.x) || !Number.isFinite(this.player.y)) {
            this.player.x = MAP_WIDTH / 2;
            this.player.y = MAP_HEIGHT / 2;
        }
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
        
        // Update projektyli
        this.updateProjectiles();
        
        // Auto-attack dla Maga i Huntera gdy mają cel w zasięgu
        if (this.player.currentTarget && this.player.currentTarget.isAlive) {
            const playerCenterX = this.player.x + this.player.width / 2;
            const playerCenterY = this.player.y + this.player.height / 2;
            const targetCenterX = this.player.currentTarget.x + this.player.currentTarget.width / 2;
            const targetCenterY = this.player.currentTarget.y + this.player.currentTarget.height / 2;
            
            const dx = targetCenterX - playerCenterX;
            const dy = targetCenterY - playerCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Wojownik - auto-atakuje z 40px gdy w zasięgu
            if (this.player.classType === ClassType.WOJ) {
                const meleeRange = 40;
                if (distance <= meleeRange) {
                    this.basicAttack();
                }
            }
            // Mag - auto-atakuje z 220px gdy w zasięgu
            else if (this.player.classType === ClassType.MAG) {
                const magicRange = 220;
                if (distance <= magicRange) {
                    this.basicAttack();
                }
            }
            // Hunter - auto-atakuje z 260px gdy w zasięgu
            else if (this.player.classType === ClassType.HUNTER) {
                const arrowRange = 260;
                if (distance <= arrowRange) {
                    this.basicAttack();
                }
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
        if (!this.player) return;

        let px = this.player.x;
        let py = this.player.y;
        if (!Number.isFinite(px) || !Number.isFinite(py)) {
            px = MAP_WIDTH / 2;
            py = MAP_HEIGHT / 2;
        }

        // Docelowa pozycja kamery (centrowuje gracza na ekranie)
        let targetCameraX = px + this.player.width / 2 - this.cameraOffsetX;
        let targetCameraY = py + this.player.height / 2 - this.cameraOffsetY;

        if (!Number.isFinite(targetCameraX)) targetCameraX = 0;
        if (!Number.isFinite(targetCameraY)) targetCameraY = 0;

        // Smooth camera following
        this.cameraX += (targetCameraX - this.cameraX) * this.cameraSmooth;
        this.cameraY += (targetCameraY - this.cameraY) * this.cameraSmooth;

        // Ograniczenia kamery (aby nie wychodzić poza mapę)
        const bounds = this.getCurrentMapBounds();
        this.cameraX = Math.max(0, Math.min(this.cameraX, bounds.width - CONFIG.CANVAS_WIDTH));
        this.cameraY = Math.max(0, Math.min(this.cameraY, bounds.height - CONFIG.CANVAS_HEIGHT));

        if (!Number.isFinite(this.cameraX)) this.cameraX = 0;
        if (!Number.isFinite(this.cameraY)) this.cameraY = 0;
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
        
        // NIE chowaj battleHUD - zawsze powinien być widoczny z przyciskiem Ataku
        // document.getElementById('battleHUD').classList.add('hidden');
        
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
        

            // Nagrody za zabicie (EXP + gold z szansą)
            if (typeof this.currentEnemy.expReward === "number") {
                this.player.addExp(this.currentEnemy.expReward);
            }
            if (Math.random() < (this.currentEnemy.goldDropChance ?? 0)) {
                const gmin = this.currentEnemy.goldMin ?? 1;
                const gmax = this.currentEnemy.goldMax ?? gmin;
                const gold = gmin + Math.floor(Math.random() * (gmax - gmin + 1));
                this.player.addGold(gold);
                console.log(`💰 +${gold} gold`);
            }
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
            'wasp': new Item("Żądło Osy", "🦂", 'drop', null, 1),
            'snake': new Item("Jad Węża", "☠", 'drop', null, 1),
            'spider': new Item("Pajęczyna", "🕸", 'drop', null, 1),
            'bandit': new Item("Sakwa Bandyty", "💰", 'drop', null, 1),
            'golem': new Item("Odłamek Kamienia", "💎", 'drop', null, 1)
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

    updateAttackButtonCooldown() {
        // Aktualizuj cooldown przycisku Ataku w eksploracji (nie w walce)
        if (this.battle) return; // W walce obsługuje to updateBattleHUD
        
        const now = Date.now();
        const cooldown = this.player.classType === ClassType.MAG ? 800 : 
                        this.player.classType === ClassType.HUNTER ? 750 : 1000; // WOJ
        
        const timeSinceAttack = now - this.player.lastAttackTime;
        const remainingCooldown = Math.max(0, (cooldown - timeSinceAttack) / 1000);
        
        const skillCD1 = document.getElementById('skillCD1');
        const skillBtn1 = document.getElementById('skillBtn1');
        
        if (skillCD1) {
            if (remainingCooldown > 0) {
                skillCD1.textContent = remainingCooldown.toFixed(1) + 's';
                skillBtn1.disabled = true;
                skillBtn1.style.opacity = '0.5';
            } else {
                skillCD1.textContent = 'GOTÓW';
                skillBtn1.disabled = false;
                skillBtn1.style.opacity = '1';
            }
        }
        
        // Aktualizuj skill cooldowny
        const now2 = Date.now();
        
        // Skill 2
        const skill2CD = 1200;
        const timeSinceSkill2 = now2 - this.player.skill2LastTime;
        const skill2Remaining = Math.max(0, (skill2CD - timeSinceSkill2) / 1000);
        const skillCD2 = document.getElementById('skillCD2');
        const skillBtn2 = document.getElementById('skillBtn2');
        if (skillCD2) {
            if (skill2Remaining > 0) {
                skillCD2.textContent = skill2Remaining.toFixed(1) + 's';
                skillBtn2.disabled = true;
                skillBtn2.style.opacity = '0.5';
            } else {
                skillCD2.textContent = 'GOTÓW';
                skillBtn2.disabled = false;
                skillBtn2.style.opacity = '1';
            }
        }
        
        // Skill 3
        const skill3CD = 15000;
        const timeSinceSkill3 = now2 - this.player.skill3LastTime;
        const skill3Remaining = Math.max(0, (skill3CD - timeSinceSkill3) / 1000);
        const skillCD3 = document.getElementById('skillCD3');
        const skillBtn3 = document.getElementById('skillBtn3');
        if (skillCD3) {
            if (skill3Remaining > 0) {
                skillCD3.textContent = skill3Remaining.toFixed(1) + 's';
                skillBtn3.disabled = true;
                skillBtn3.style.opacity = '0.5';
            } else {
                skillCD3.textContent = 'GOTÓW';
                skillBtn3.disabled = false;
                skillBtn3.style.opacity = '1';
            }
        }
        
        // Aktualizuj HP gracza w battle HUD podczas eksploracji
        const playerHpPercent = (this.player.hp / this.player.maxHp) * 100;
        const battlePlayerHp = document.getElementById('battlePlayerHp');
        const battlePlayerHpText = document.getElementById('battlePlayerHpText');
        const battlePlayerName = document.getElementById('battlePlayerName');
        
        if (battlePlayerHp) battlePlayerHp.style.width = playerHpPercent + '%';
        if (battlePlayerHpText) battlePlayerHpText.textContent = `${this.player.hp}/${this.player.maxHp}`;
        if (battlePlayerName) battlePlayerName.textContent = `${this.player.name || 'Ty'} (LVL ${this.player.level})`;
    }

    updateSkillUI() {
        // Aktualizuj ikony i nazwy umiejętności na podstawie klasy postaci
        if (this.player.classType === ClassType.MAG) {
            // Mag: Skill1=Kula Magii, Skill2=Kula Ognia, Skill3=Obrona
            document.getElementById('skill1Icon').textContent = '🔵';
            document.getElementById('skill1Name').textContent = 'Kula Magii';
            
            document.getElementById('skill2Icon').textContent = '🔥';
            document.getElementById('skill2Name').textContent = 'Kula Ognia';
            
            document.getElementById('skill3Icon').textContent = '🛡';
            document.getElementById('skill3Name').textContent = 'Obrona';
        } 
        else if (this.player.classType === ClassType.HUNTER) {
            // Hunter: Skill1=Atak (Strzała)
            document.getElementById('skill1Icon').textContent = '🏹';
            document.getElementById('skill1Name').textContent = 'Strzała';
            
            document.getElementById('skill2Icon').textContent = '⚡';
            document.getElementById('skill2Name').textContent = 'Volley';
            
            document.getElementById('skill3Icon').textContent = '⭐';
            document.getElementById('skill3Name').textContent = 'Pułapka';
        } 
        else if (this.player.classType === ClassType.WOJ) {
            // Wojownik: Skill1=Atak (Miecz)
            document.getElementById('skill1Icon').textContent = '⚔';
            document.getElementById('skill1Name').textContent = 'Cios';
            
            document.getElementById('skill2Icon').textContent = '🗡';
            document.getElementById('skill2Name').textContent = 'Pancerna Tafa';
            
            document.getElementById('skill3Icon').textContent = '💪';
            document.getElementById('skill3Name').textContent = 'Furia';
        }
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
        
        // Update stats in equipment panel
        this.updateEquipmentStatsUI();

        // Update attack button cooldown (eksploracja)
        this.updateAttackButtonCooldown();

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
        const eqPanel = document.getElementById('equipmentWindow');
        if (!eqPanel) return;
        
        // Map slot types to emojis
        const slotEmojis = {
            helmet: '⛑',
            weapon: '⚔',
            shield: '🛡',
            accessory: '', // renderowane CSS (diament)
            boots: '',      // renderowane CSS (but)
            necklace: ''    // renderowane CSS (łańcuch)
        };
        const slotTitles = {
            helmet: 'Hełm',
            weapon: 'Broń',
            shield: 'Tarcza/Orb',
            accessory: 'Pierścionek',
            boots: 'Buty',
            necklace: 'Naszyjnik'
        };
        
        // Update equipment slots
        const slots = eqPanel.querySelectorAll('.equipment-slot');
        slots.forEach(slot => {
            const slotType = slot.dataset.slot;
            const item = this.player.equipment[slotType];
            
            if (item) {
                slot.innerHTML = item.icon || '';
                slot.classList.add('occupied');
                slot.title = `${item.name}`;
            } else {
                slot.innerHTML = slotEmojis[slotType] || '';
                slot.classList.remove('occupied');
                slot.title = slotTitles[slotType] || '';
            }
            
            // Attach right-click handler
            slot.oncontextmenu = (e) => {
                e.preventDefault();
                this.showEquipmentContextMenu(slotType, e);
            };
        });
        
        // Update stats in equipment panel
        document.getElementById('eqATK').textContent = this.player.equipmentATK;
        document.getElementById('eqDEF').textContent = this.player.equipmentDEF;
        
        // Update stats in equipment panel
        this.updateEquipmentStatsUI();
        
        // Update shop display
        this.updateShopDisplay();
    }

    updateEquipmentStatsUI() {
        // Zaktualizuj wszystkie staty w panelu ekwipunku
        const stats = this.player.stats;
        const eqAtkEl = document.getElementById('eqATK');
        const eqDefEl = document.getElementById('eqDEF');
        const eqStrEl = document.getElementById('eqSTR');
        const eqIntEl = document.getElementById('eqINT');
        const eqZrnEl = document.getElementById('eqZRN');
        const eqVitEl = document.getElementById('eqVIT');
        const eqHpEl = document.getElementById('eqHP');
        const eqSpecialLabelEl = document.getElementById('eqSpecialLabel');
        const eqSpecialEl = document.getElementById('eqSpecial');
        
        // Oblicz ATK i DEF na podstawie statów
        // ATK = STR * 2 + INT * 1 + ZRN * 1 + bonusy ekwipunku
        // DEF = VIT * 1 + STR * 1 + bonusy ekwipunku
        const atk = stats.str * 2 + stats.int * 1 + stats.zrn * 1 + this.player.equipmentATK;
        const def = stats.vit * 1 + stats.str * 1 + this.player.equipmentDEF;
        
        if (eqAtkEl) eqAtkEl.textContent = atk;
        if (eqDefEl) eqDefEl.textContent = def;
        if (eqStrEl) eqStrEl.textContent = stats.str;
        if (eqIntEl) eqIntEl.textContent = stats.int;
        if (eqZrnEl) eqZrnEl.textContent = stats.zrn;
        if (eqVitEl) eqVitEl.textContent = stats.vit;
        if (eqHpEl) eqHpEl.textContent = `${this.player.hp}/${this.player.maxHp}`;
        
        // Specjalna cecha klasy
        const specialValue = 5; // Tymczasowa wartość bazowa
        let specialLabel = 'BLOK:'; // Default
        
        if (this.player.classType === ClassType.WOJ) {
            specialLabel = 'BLOK:';
        } else if (this.player.classType === ClassType.HUNTER) {
            specialLabel = 'UNIK:';
        } else if (this.player.classType === ClassType.MAG) {
            specialLabel = 'CRIT:';
        }
        
        if (eqSpecialLabelEl) eqSpecialLabelEl.textContent = specialLabel;
        if (eqSpecialEl) eqSpecialEl.textContent = `${specialValue}%`;
    }

    // ========== ATTACK SYSTEM ==========
    basicAttack() {
        // Sprawdzenie warunków ataku
        if (!this.player.currentTarget) {
            return; // Brak celu
        }
        
        if (!this.player.currentTarget.isAlive) {
            this.player.currentTarget = null;
            return; // Cel nie żyje
        }
        
        const now = Date.now();
        const target = this.player.currentTarget;
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        const targetCenterX = target.x + target.width / 2;
        const targetCenterY = target.y + target.height / 2;
        
        const dx = targetCenterX - playerCenterX;
        const dy = targetCenterY - playerCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // ========== WOJOWNIK - Melee (40px range) ==========
        if (this.player.classType === ClassType.WOJ) {
            const meleeRange = 40;
            const cooldown = 1000;
            
            if (now - this.player.lastAttackTime < cooldown) {
                return; // Cooldown nie minął
            }
            
            // Jeśli za daleko, idź do celu
            if (distance > meleeRange) {
                this.player.moveToTarget = target;
                return;
            }
            
            // W zasięgu - wykonaj cios
            this.player.lastAttackTime = now;
            const stats = this.player.stats;
            const baseDamage = stats.str * 2 + 5;
            const bonusDamage = this.player.equipmentATK || 0;
            const totalDamage = baseDamage + bonusDamage;
            
            // Obniżenie przez obronę
            const actualDamage = target.takeDamage(totalDamage);
            
            // Wizualizacja
            this.createDamageText(targetCenterX, targetCenterY, actualDamage);
            this.createAttackEffect(playerCenterX, playerCenterY, 'melee');
            
            // Natychmiast synchronizuj wroga po trafieniu
            this.syncSingleEnemyToFirebase(target);
            
        } 
        // ========== MAG - Magic Orb (220px range) - podstawowy atak ==========
        else if (this.player.classType === ClassType.MAG) {
            const magicRange = 220;
            const cooldown = 800;
            
            if (now - this.player.lastAttackTime < cooldown) {
                return; // Cooldown nie minął
            }
            
            // Jeśli za daleko, idź do celu
            if (distance > magicRange) {
                this.player.moveToTarget = target;
                return;
            }
            
            // W zasięgu - zatrzymaj się i atakuj
            this.player.moveToTarget = null;
            
            // W zasięgu - stwórz Kulę Magii
            this.player.lastAttackTime = now;
            const stats = this.player.stats;
            const baseDamage = stats.int * 2 + 3;
            const bonusDamage = this.player.equipmentATK || 0;
            const totalDamage = baseDamage + bonusDamage;
            
            const projectile = new Projectile(
                playerCenterX,
                playerCenterY,
                targetCenterX,
                targetCenterY,
                420, // speed px/s
                totalDamage,
                'orb'
            );
            
            projectile.targetEnemy = target;
            this.projectiles.push(projectile);
            
            // Wyślij projektył do innych graczy
            this.sendProjectileToFirebase(projectile);
        }
        // ========== HUNTER - Ranged Arrows (260px range) - podstawowy atak ==========
        else if (this.player.classType === ClassType.HUNTER) {
            const arrowRange = 260;
            const cooldown = 750;
            
            if (now - this.player.lastAttackTime < cooldown) {
                return; // Cooldown nie minął
            }
            
            // Jeśli za daleko, idź do celu
            if (distance > arrowRange) {
                this.player.moveToTarget = target;
                return;
            }
            
            // W zasięgu - zatrzymaj się i atakuj
            this.player.moveToTarget = null;
            
            // W zasięgu - stwórz strzałę
            this.player.lastAttackTime = now;
            const stats = this.player.stats;
            const baseDamage = stats.zrn * 2 + stats.str * 1 + 2;
            const bonusDamage = this.player.equipmentATK || 0;
            const totalDamage = baseDamage + bonusDamage;
            
            const projectile = new Projectile(
                playerCenterX,
                playerCenterY,
                targetCenterX,
                targetCenterY,
                520, // speed px/s (szybsza niż orb)
                totalDamage,
                'arrow'
            );
            
            projectile.targetEnemy = target;
            this.projectiles.push(projectile);
            
            // Wyślij projektył do innych graczy
            this.sendProjectileToFirebase(projectile);
        }
    }
    
    createDamageText(x, y, damage) {
        // TODO: Można dodać floating damage text
        // Na razie tylko aplikujemy obrażenia
    }

    createAttackEffect(x, y, type) {
        // Wizualne efekty dla ataków
        // Będą rysowane w draw()
    }

    // ========== SKILL SYSTEM ==========
    
    castSkill(skillNumber) {
        if (!this.player.currentTarget || !this.player.currentTarget.isAlive) {
            return;
        }

        const now = Date.now();
        const target = this.player.currentTarget;
        const playerCenterX = this.player.x + this.player.width / 2;
        const playerCenterY = this.player.y + this.player.height / 2;
        const targetCenterX = target.x + target.width / 2;
        const targetCenterY = target.y + target.height / 2;
        const dx = targetCenterX - playerCenterX;
        const dy = targetCenterY - playerCenterY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // ===== SKILL 1 - Magic Orb (Kula Magii) - wszyscy =====
        if (skillNumber === 1) {
            const cooldown = 800;
            if (now - this.player.skill1LastTime < cooldown) return;
            this.player.skill1LastTime = now;

            if (this.player.classType === ClassType.MAG) {
                if (distance > 220) return;
                
                const stats = this.player.stats;
                const baseDamage = stats.int * 2 + 3;
                const bonusDamage = this.player.equipmentATK || 0;
                const totalDamage = baseDamage + bonusDamage;

                const projectile = new Projectile(
                    playerCenterX, playerCenterY,
                    targetCenterX, targetCenterY,
                    420, totalDamage, 'orb'
                );
                projectile.targetEnemy = target;
                this.projectiles.push(projectile);
                
                // Wyślij projektył do innych graczy
                this.sendProjectileToFirebase(projectile);
            }
        }

        // ===== SKILL 2 - Fireball (Kula Ognia) - Mag =====
        if (skillNumber === 2) {
            const cooldown = 1200;
            if (now - this.player.skill2LastTime < cooldown) return;
            this.player.skill2LastTime = now;

            if (this.player.classType === ClassType.MAG) {
                if (distance > 240) return;
                
                const stats = this.player.stats;
                const baseDamage = stats.int * 2 + 8; // Stronger than orb
                const bonusDamage = this.player.equipmentATK || 0;
                const totalDamage = baseDamage + bonusDamage;

                const projectile = new Projectile(
                    playerCenterX, playerCenterY,
                    targetCenterX, targetCenterY,
                    380, totalDamage, 'fireball'
                );
                projectile.targetEnemy = target;
                this.projectiles.push(projectile);
                
                // Wyślij projektył do innych graczy
                this.sendProjectileToFirebase(projectile);
            }
        }

        // ===== SKILL 3 - Magic Shield (Obrona Magi) - Mag =====
        if (skillNumber === 3) {
            const cooldown = 15000; // 15 seconds
            if (now - this.player.skill3LastTime < cooldown) return;
            this.player.skill3LastTime = now;

            if (this.player.classType === ClassType.MAG) {
                // Dodaj shield
                const shieldAmount = 10;
                this.player.shieldHP = shieldAmount;
                this.player.shieldEndTime = now + 10000; // 10 seconds duration
            }
        }
    }

    updateProjectiles() {
        // Update wszystkich projektyli
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update(0.016); // ~60 FPS
            
            // Sprawdź kolizję z wrogiem
            if (projectile.targetEnemy && projectile.targetEnemy.isAlive) {
                if (projectile.checkCollisionWithEnemy(projectile.targetEnemy)) {
                    // Trafienie!
                    const actualDamage = projectile.targetEnemy.takeDamage(projectile.damage);
                    this.createDamageText(
                        projectile.targetEnemy.x + projectile.targetEnemy.width / 2,
                        projectile.targetEnemy.y + projectile.targetEnemy.height / 2,
                        actualDamage
                    );
                    projectile.alive = false;
                    
                    // Natychmiast synchronizuj wroga po trafieniu
                    this.syncSingleEnemyToFirebase(projectile.targetEnemy);
                }
            }
            
            // Usuń martwego projektyla
            if (!projectile.alive) {
                this.projectiles.splice(i, 1);
            }
        }
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
        const eqPanel = document.getElementById('equipmentWindow');
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
        if (!Number.isFinite(this.currentMap)) this.currentMap = 1;
        if (this.player) {
            if (!Number.isFinite(this.player.x)) this.player.x = MAP_WIDTH / 2;
            if (!Number.isFinite(this.player.y)) this.player.y = MAP_HEIGHT / 2;
            if (!this.player.width) this.player.width = CONFIG.PLAYER_SIZE;
            if (!this.player.height) this.player.height = CONFIG.PLAYER_SIZE;
        }
        // Czyszczenie canvas
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Debug overlay na początku klatki (poza transformacją kamery)
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillStyle = 'rgba(255,255,255,0.9)';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`CANVAS ${this.canvas.width}x${this.canvas.height}`, 20, 20);
        if (this.player) {
            this.ctx.fillText(`player ${this.player.x.toFixed(1)},${this.player.y.toFixed(1)}`, 20, 40);
        }
        this.ctx.fillText(`cam ${Math.round(this.cameraX)},${Math.round(this.cameraY)}`, 20, 60);
        this.ctx.restore();

        // Zapisz stan kontekstu przed transformacją kamery
        this.ctx.save();

        // Zastosuj transformację kamery (przesuń view względem gracza)
        this.ctx.translate(-this.cameraX, -this.cameraY);

        // --- Rysuj tło i planszę w zależności od currentMap ---
        if (this.currentMap === 1) {
            this.drawMapGrass();
            this.drawVillage();
        } else if (this.currentMap === 2) {
            this.drawBigCity();
        } else if (this.currentMap === 3) {
            this.drawYellowHouseInterior();
        } else {
            // Bezpieczny fallback: zawsze rysuj trawę
            this.drawMapGrass();
        }
        // ---

        // DEBUG: Narysuj safe zone rect na mapie (WORLD coords)
        if (this.currentMap === 1) {
            const SAFE_RECT = { x: 135, y: 95, w: 570, h: 590 };
            console.log("[DEBUG_DRAW] SAFE_RECT:", SAFE_RECT);
            
            // Rysuj prostokąt
            this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(SAFE_RECT.x, SAFE_RECT.y, SAFE_RECT.w, SAFE_RECT.h);
            
            // Rysuj tekst z wartościami (środek)
            const textX = SAFE_RECT.x + SAFE_RECT.w / 2;
            const textY = SAFE_RECT.y + SAFE_RECT.h / 2;
            this.ctx.fillStyle = '#00FF00';
            this.ctx.font = 'bold 14px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = '#000';
            this.ctx.shadowBlur = 3;
            this.ctx.fillText(`SAFE_ZONE (135,95 -> 705,685)`, textX, textY);
            this.ctx.shadowColor = 'transparent';
        }

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
                
                // Rysuj marker targetowania
                if (enemy.isTargeted) {
                    this.drawTargetMarker(enemy);
                }
            }
        }

        // Rysuj gracza
        this.player.draw(this.ctx);
        
        // Rysuj shield efekt gracza
        if (this.player.shieldHP > 0 && this.player.shieldEndTime && Date.now() < this.player.shieldEndTime) {
            this.drawPlayerShield();
        }

        // Rysuj projektyle (tylko na mapach 1 i 2)
        if (this.currentMap !== 3) {
            for (let projectile of this.projectiles) {
                projectile.draw(this.ctx);
            }
        }

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

        // Rysuj teleporty (fioletowe prostokąty)
        if (this.currentMap === 1 && this.teleportZone) {
            this.minimapCtx.fillStyle = 'rgba(138, 43, 226, 0.6)';
            this.minimapCtx.fillRect(
                this.teleportZone.x * scale,
                this.teleportZone.y * scale,
                this.teleportZone.width * scale,
                this.teleportZone.height * scale
            );
            this.minimapCtx.strokeStyle = '#8a2be2';
            this.minimapCtx.lineWidth = 1;
            this.minimapCtx.strokeRect(
                this.teleportZone.x * scale,
                this.teleportZone.y * scale,
                this.teleportZone.width * scale,
                this.teleportZone.height * scale
            );
        }
        
        if (this.currentMap === 2 && this.returnTeleportZone) {
            this.minimapCtx.fillStyle = 'rgba(138, 43, 226, 0.6)';
            this.minimapCtx.fillRect(
                this.returnTeleportZone.x * scale,
                this.returnTeleportZone.y * scale,
                this.returnTeleportZone.width * scale,
                this.returnTeleportZone.height * scale
            );
            this.minimapCtx.strokeStyle = '#8a2be2';
            this.minimapCtx.lineWidth = 1;
            this.minimapCtx.strokeRect(
                this.returnTeleportZone.x * scale,
                this.returnTeleportZone.y * scale,
                this.returnTeleportZone.width * scale,
                this.returnTeleportZone.height * scale
            );
        }

        // Rysuj gracza (biały punkt)
        const playerMinimapX = this.player.x * scale;
        const playerMinimapY = this.player.y * scale;
        this.minimapCtx.fillStyle = '#fff';
        this.minimapCtx.beginPath();
        this.minimapCtx.arc(playerMinimapX, playerMinimapY, 3, 0, Math.PI * 2);
        this.minimapCtx.fill();

        // Rysuj innych graczy (niebieskie punkty) - tylko na tej samej mapie
        this.minimapCtx.fillStyle = '#00bfff';
        for (let id in this.otherPlayers) {
            const other = this.otherPlayers[id];
            if (!other || other.currentMap !== this.currentMap) continue;
            const otherMinimapX = other.x * scale;
            const otherMinimapY = other.y * scale;
            this.minimapCtx.beginPath();
            this.minimapCtx.arc(otherMinimapX, otherMinimapY, 2.5, 0, Math.PI * 2);
            this.minimapCtx.fill();
        }

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

    drawTargetMarker(enemy) {
        // Rysuj marker targetowania wokół wroga
        const centerX = enemy.x + enemy.width / 2;
        const centerY = enemy.y + enemy.height / 2;
        const radius = enemy.width / 2 + 8;
        
        // Pulsujący okrąg (na podstawie czasu)
        const time = Date.now() / 1000;
        const pulse = 0.5 + 0.5 * Math.sin(time * 3); // Pulsuje 3x na sekundę
        
        // Zewnętrzny okrąg (pulsujący)
        this.ctx.strokeStyle = `rgba(255, 100, 100, ${pulse * 0.8})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Wewnętrzny okrąg (stały)
        this.ctx.strokeStyle = 'rgba(255, 50, 50, 0.6)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius - 4, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Cztery punkty wskazujące (N, E, S, W)
        const pointRadius = radius + 6;
        this.ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
        const points = [
            { x: centerX, y: centerY - pointRadius }, // N
            { x: centerX + pointRadius, y: centerY }, // E
            { x: centerX, y: centerY + pointRadius }, // S
            { x: centerX - pointRadius, y: centerY }  // W
        ];
        
        for (let point of points) {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    drawPlayerShield() {
        // Rysuj blue shield efekt wokół gracza
        const centerX = this.player.x + this.player.width / 2;
        const centerY = this.player.y + this.player.height / 2;
        const now = Date.now();
        const shieldEndTime = this.player.shieldEndTime;
        const shieldDuration = 10000; // 10 seconds
        const timeRemaining = Math.max(0, shieldEndTime - now);
        const progress = timeRemaining / shieldDuration;
        
        // Niebieska poswiata (pulsująca)
        const pulse = 0.6 + 0.4 * Math.sin(now / 200);
        const radius = this.player.width / 2 + 15;
        
        // Główny glow
        const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, `rgba(100, 150, 255, ${pulse * 0.3})`);
        gradient.addColorStop(0.5, `rgba(100, 150, 255, ${pulse * 0.15})`);
        gradient.addColorStop(1, `rgba(100, 150, 255, 0)`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Okrąg obramowania (solidny)
        this.ctx.strokeStyle = `rgba(100, 180, 255, ${pulse * 0.8})`;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius - 5, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Wewnętrzny okrąg
        this.ctx.strokeStyle = `rgba(150, 200, 255, ${pulse * 0.6})`;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius - 10, 0, Math.PI * 2);
        this.ctx.stroke();
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
        this.updateGameTime();  // Aktualizuj zegar

        this._gameLoopId = requestAnimationFrame(() => this.gameLoop());
    }

    updateGameTime() {
        const timeEl = document.getElementById('gameTime');
        if (!timeEl) return;
        
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        timeEl.textContent = `${hours}:${minutes}:${seconds}`;
    }


    // ============================================
    // MULTIPLAYER - Firebase
    // ============================================

    initMultiplayer() {
        console.log('[Multiplayer] initMultiplayer called!');
        console.log('[Multiplayer] database:', database);
        console.log('[Multiplayer] this.player:', this.player);
        console.log('[Multiplayer] Initializing with user:', currentUser?.uid);

        // Ustaw bezpieczną mapę startową
        if (this.player && !Number.isFinite(this.player.currentMap)) {
            this.player.currentMap = 1;
        }
        if (!Number.isFinite(this.currentMap)) {
            this.currentMap = (this.player && Number.isFinite(this.player.currentMap)) ? this.player.currentMap : 1;
        }
        
        // Ustaw listener dla innych graczy
        try {
            database.ref('users').on('value', (snapshot) => {
                const usersData = snapshot.val() || {};
                console.log('[Multiplayer] Received users data:', usersData);
                
                // Usuń graczy którzy się rozłączyli
                for (let uid in this.otherPlayers) {
                    if (!usersData[uid] || uid === currentUser.uid) {
                        delete this.otherPlayers[uid];
                    }
                }
                
                // Zaktualizuj pozostałych graczy
                for (let uid in usersData) {
                    if (uid !== currentUser.uid && usersData[uid].player) {
                        const p = usersData[uid].player;
                        if (!Number.isFinite(p.currentMap)) p.currentMap = 1;
                        this.otherPlayers[uid] = p;
                        console.log('[Multiplayer] Updated player:', uid, p);
                    }
                }
            }, (error) => {
                console.error('[Multiplayer] Firebase error:', error);
            });

            // Listener dla stanu wrogów (serwerowych)
            database.ref('gameState/map' + this.currentMap + '/enemies').on('value', (snapshot) => {
                const enemiesData = snapshot.val() || {};
                console.log('[Multiplayer] Received enemies data:', enemiesData);
                
                // Aktualizuj stan wrogów w lokalnej grze
                for (let i = 0; i < this.enemies.length; i++) {
                    const enemy = this.enemies[i];
                    const spawnKey = `enemy_${i}`;
                    
                    if (enemiesData[spawnKey]) {
                        const serverEnemy = enemiesData[spawnKey];
                        console.log('[Multiplayer] Updating enemy', i, 'HP:', serverEnemy.hp, 'isAlive:', serverEnemy.isAlive);
                        
                        enemy.hp = serverEnemy.hp;
                        enemy.maxHp = serverEnemy.maxHp || enemy.maxHp;
                        enemy.isAlive = serverEnemy.isAlive;
                        enemy.respawnTimer = serverEnemy.respawnTimer;
                        // Nie synchronizuj pozycji - AI powinno być lokalne
                    }
                }
            });

            // Listener dla projektylów od innych graczy
            database.ref('gameState/map' + this.currentMap + '/projectiles').on('child_added', (snapshot) => {
                const projectileData = snapshot.val();
                if (projectileData && projectileData.uid !== currentUser.uid) {
                    // Stwórz projektyl od innego gracza
                    const projectile = new Projectile(
                        projectileData.x,
                        projectileData.y,
                        projectileData.targetX,
                        projectileData.targetY,
                        projectileData.speed,
                        projectileData.damage,
                        projectileData.type
                    );
                    projectile.fromOtherPlayer = true;
                    projectile.firedByUid = projectileData.uid;
                    this.projectiles.push(projectile);
                }
            });

        } catch (e) {
            console.error('[Multiplayer] Exception:', e);
        }
    }

    syncPlayerToFirebase() {
        if (!this.player || !currentUser) return;
        
        const playerData = {
            x: this.player.x,
            y: this.player.y,
            name: this.selectedChar ? this.selectedChar.name : 'Gracz',
            level: this.player.level || 1,
            className: this.player.className || 'Wojownik',
            currentMap: Number.isFinite(this.currentMap) ? this.currentMap : 1,  // Dodaj informację o mapie
            timestamp: Date.now()
        };
        
        database.ref('users/' + currentUser.uid + '/player').set(playerData).then(() => {
            console.log('[Multiplayer] Player synced:', playerData);
        }).catch((error) => {
            console.error('[Multiplayer] Sync error:', error);
        });
        
        // Synchronizuj stan wrogów (serwerowy)
        this.syncEnemiesToFirebase();
    }

    syncEnemiesToFirebase() {
        if (!currentUser || this.enemies.length === 0) return;
        
        const enemiesData = {};
        
        for (let i = 0; i < this.enemies.length; i++) {
            const enemy = this.enemies[i];
            enemiesData[`enemy_${i}`] = {
                hp: enemy.hp,
                maxHp: enemy.maxHp,
                isAlive: enemy.isAlive,
                respawnTimer: enemy.respawnTimer,
                timestamp: Date.now()
            };
        }
        
        database.ref('gameState/map' + this.currentMap + '/enemies').set(enemiesData).catch((error) => {
            console.error('[Multiplayer] Error syncing enemies:', error);
        });
    }

    syncSingleEnemyToFirebase(enemy) {
        if (!currentUser || !enemy) return;
        
        // Znajdź indeks wroga w tablicy
        const enemyIndex = this.enemies.indexOf(enemy);
        if (enemyIndex === -1) return;
        
        const enemyData = {
            hp: enemy.hp,
            maxHp: enemy.maxHp,
            isAlive: enemy.isAlive,
            respawnTimer: enemy.respawnTimer,
            timestamp: Date.now()
        };
        
        database.ref('gameState/map' + this.currentMap + '/enemies/enemy_' + enemyIndex).set(enemyData).catch((error) => {
            console.error('[Multiplayer] Error syncing single enemy:', error);
        });
    }

    sendProjectileToFirebase(projectile) {
        if (!currentUser) return;
        
        const projectileData = {
            x: projectile.x,
            y: projectile.y,
            targetX: projectile.targetX,
            targetY: projectile.targetY,
            speed: projectile.speed,
            damage: projectile.damage,
            type: projectile.type,
            uid: currentUser.uid,
            timestamp: Date.now()
        };
        
        // Dodaj projektyl do listy (auto-usuwany po zniszczeniu)
        const ref = database.ref('gameState/map' + this.currentMap + '/projectiles').push();
        ref.set(projectileData).catch((error) => {
            console.error('[Multiplayer] Error sending projectile:', error);
        });
        
        // Usuń projektył po 5 sekundach (żeby nie zaśmiecał bazę)
        setTimeout(() => {
            ref.remove();
        }, 5000);
    }

    // ========== CONTEXT MENU & INTERACTIONS ==========
    handleCanvasRightClick(e) {
        // Wymagaj wcześniejszego zaznaczenia gracza lewym przyciskiem
        if (!this.selectedPlayerId || !this.otherPlayers[this.selectedPlayerId]) {
            sendSystemMessage('Najpierw zaznacz gracza lewym przyciskiem.');
            return;
        }

        const selected = this.otherPlayers[this.selectedPlayerId];
        if (!selected || selected.currentMap !== this.currentMap) {
            sendSystemMessage('Wybrany gracz nie jest na tej mapie.');
            return;
        }

        this.showContextMenu(this.selectedPlayerId, selected, e.clientX, e.clientY);
    }

    showContextMenu(playerId, playerData, x, y) {
        const contextMenu = document.getElementById('playerContextMenu');
        const playerName = document.getElementById('contextPlayerName');
        if (!contextMenu || !playerName) return;

        playerName.textContent = playerData.name || 'Gracz';
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        contextMenu.classList.remove('hidden');
        this.selectedPlayerId = playerId;
        this.selectedPlayerData = playerData;
    }

    setupContextMenuHandlers() {
        const closePartyBtn = document.getElementById('closeParty');
        const leavePartyBtn = document.getElementById('leaveParty');
        const closeTradeBtn = document.getElementById('closeTrade');

        const contextInviteParty = document.getElementById('contextInviteParty');
        if (contextInviteParty) {
            contextInviteParty.addEventListener('click', () => {
                if (this.selectedPlayerId) {
                    this.sendPartyInvite(this.selectedPlayerId);
                    const contextMenu = document.getElementById('playerContextMenu');
                    if (contextMenu) contextMenu.classList.add('hidden');
                }
            });
        }

        const contextTrade = document.getElementById('contextTrade');
        if (contextTrade) {
            contextTrade.addEventListener('click', () => {
                if (this.selectedPlayerId) {
                    this.sendTradeInvite(this.selectedPlayerId);
                    const contextMenu = document.getElementById('playerContextMenu');
                    if (contextMenu) contextMenu.classList.add('hidden');
                }
            });
        }

        const contextAddFriend = document.getElementById('contextAddFriend');
        if (contextAddFriend) {
            contextAddFriend.addEventListener('click', () => {
                if (this.selectedPlayerId) {
                    this.sendFriendRequest(this.selectedPlayerId);
                    const contextMenu = document.getElementById('playerContextMenu');
                    if (contextMenu) contextMenu.classList.add('hidden');
                }
            });
        }

        const contextWhisper = document.getElementById('contextWhisper');
        if (contextWhisper) {
            contextWhisper.addEventListener('click', () => {
                if (this.selectedPlayerData) {
                    const chatInput = document.getElementById('chatInput');
                    if (chatInput) {
                        chatInput.value = `/w ${this.selectedPlayerData.name} `;
                        chatInput.focus();
                    }
                    const contextMenu = document.getElementById('playerContextMenu');
                    if (contextMenu) contextMenu.classList.add('hidden');
                }
            });
        }

        if (closePartyBtn) {
            closePartyBtn.addEventListener('click', () => {
                const partyPanel = document.getElementById('partyPanel');
                if (partyPanel) partyPanel.classList.add('hidden');
            });
        }
        if (leavePartyBtn) {
            leavePartyBtn.addEventListener('click', () => {
                this.leaveParty();
            });
        }
        if (closeTradeBtn) {
            closeTradeBtn.addEventListener('click', () => {
                this.cancelTrade();
            });
        }

        this.listenForInvites();
        this.loadFriendsList();
        this.listenForFriendRequests();
    }

    // ========== LEFT-CLICK PLAYER SELECTION ==========
    selectPlayerAt(worldX, worldY) {
        let foundId = null;
        let found = null;
        for (let id in this.otherPlayers) {
            const other = this.otherPlayers[id];
            if (!other || other.currentMap !== this.currentMap) continue;
            const left = other.x;
            const right = other.x + this.player.width;
            const top = other.y;
            const bottom = other.y + this.player.height;
            if (worldX >= left && worldX <= right && worldY >= top && worldY <= bottom) {
                foundId = id;
                found = other;
                break;
            }
        }
        if (foundId) {
            this.selectedPlayerId = foundId;
            this.selectedPlayerData = found;
            sendSystemMessage(`Zaznaczono gracza: ${found.name || 'Gracz'}`);
            const contextMenu = document.getElementById('playerContextMenu');
            if (contextMenu) contextMenu.classList.add('hidden');
            const hud = document.getElementById('selectedPlayerHud');
            const hudName = document.getElementById('selectedPlayerName');
            if (hud && hudName) {
                hudName.textContent = found.name || 'Gracz';
                hud.classList.remove('hidden');
            }
            return true;
        }
        return false;
    }

    // ========== PARTY SYSTEM ==========
    sendPartyInvite(targetPlayerId) {
        if (!currentUser) return;
        const inviteData = {
            from: currentUser.uid,
            fromName: this.selectedChar?.name || 'Gracz',
            timestamp: Date.now()
        };
        database.ref('invites/' + targetPlayerId + '/party').set(inviteData).then(() => {
            sendSystemMessage('Wysłano zaproszenie do party!');
        }).catch((error) => {
            console.error('[Party] Error sending invite:', error);
        });
    }

    listenForInvites() {
        if (!currentUser) return;
        database.ref('invites/' + currentUser.uid + '/party').on('value', (snapshot) => {
            const invite = snapshot.val();
            if (invite) {
                const accept = confirm(`${invite.fromName} zaprasza Cię do party. Akceptujesz?`);
                if (accept) {
                    this.acceptPartyInvite(invite.from);
                }
                database.ref('invites/' + currentUser.uid + '/party').remove();
            }
        });
        database.ref('invites/' + currentUser.uid + '/trade').on('value', (snapshot) => {
            const invite = snapshot.val();
            if (invite) {
                const accept = confirm(`${invite.fromName} zaprasza Cię do handlu. Akceptujesz?`);
                if (accept) {
                    this.acceptTradeInvite(invite.from);
                }
                database.ref('invites/' + currentUser.uid + '/trade').remove();
            }
        });
    }

    acceptPartyInvite(leaderId) {
        if (!currentUser) return;
        const partyData = {
            uid: currentUser.uid,
            name: this.selectedChar?.name || 'Gracz',
            level: this.player.level,
            hp: this.player.hp,
            maxHp: this.player.maxHp
        };
        database.ref('parties/' + leaderId + '/members/' + currentUser.uid).set(partyData).then(() => {
            this.currentPartyId = leaderId;
            this.updatePartyPanel();
            document.getElementById('partyPanel').classList.remove('hidden');
            sendSystemMessage('Dołączyłeś do party!');
        });
    }

    updatePartyPanel() {
        if (!this.currentPartyId) return;
        database.ref('parties/' + this.currentPartyId + '/members').once('value').then((snapshot) => {
            const members = snapshot.val() || {};
            const membersList = document.getElementById('partyMembers');
            const leaveBtn = document.getElementById('leaveParty');
            if (!membersList) return;
            membersList.innerHTML = '';
            if (Object.keys(members).length === 0) {
                membersList.innerHTML = '<div class="party-empty">Nie jesteś w grupie</div>';
                leaveBtn.classList.add('hidden');
            } else {
                leaveBtn.classList.remove('hidden');
                for (let uid in members) {
                    const member = members[uid];
                    const memberDiv = document.createElement('div');
                    memberDiv.className = 'party-member';
                    memberDiv.innerHTML = `
                        <div class="party-member-name">${member.name} (Lvl ${member.level})</div>
                        <div class="party-member-hp">HP: ${member.hp}/${member.maxHp}</div>
                    `;
                    membersList.appendChild(memberDiv);
                }
            }
        });
    }

    leaveParty() {
        if (!this.currentPartyId || !currentUser) return;
        database.ref('parties/' + this.currentPartyId + '/members/' + currentUser.uid).remove().then(() => {
            this.currentPartyId = null;
            document.getElementById('partyPanel').classList.add('hidden');
            sendSystemMessage('Opuściłeś party.');
        });
    }

    // ========== TRADE SYSTEM ==========
    getTradeIdFor(partnerId) {
        if (!currentUser || !partnerId) return null;
        const a = currentUser.uid;
        const b = partnerId;
        return (a < b) ? `${a}_${b}` : `${b}_${a}`;
    }

    canAcceptTrade() {
        if (!this.player || !this.player.inventory) return false;
        const emptySlots = this.player.inventory.slots.filter(s => s === null).length;
        const partnerOffer = this.getPartnerCurrentOffer();
        const itemsIn = (partnerOffer && partnerOffer.items) ? partnerOffer.items.length : 0;
        if (itemsIn > emptySlots) {
            this.showToast('Brak miejsca w ekwipunku!', 'error');
            return false;
        }
        const myGold = this.player.gold || 0;
        const goldNeeded = (partnerOffer && partnerOffer.gold) ? partnerOffer.gold : 0;
        if (myGold < goldNeeded) {
            this.showToast(`Brakuje złota! Potrzebujesz ${goldNeeded}, masz ${myGold}`, 'error');
            return false;
        }
        return true;
    }

    getPartnerCurrentOffer() {
        if (!this.tradeState || !this.currentTradePartnerId) return null;
        return this.tradeState.offers && this.tradeState.offers[this.currentTradePartnerId];
    }

    startTradeSession(partnerId) {
        if (!currentUser) return;
        const tradeId = this.getTradeIdFor(partnerId);
        if (!tradeId) return;
        this.currentTradeId = tradeId;
        this.tradeOfferSlots = new Set();
        this.tradeOfferGold = 0;
        this.tradeAccepted = false;
        this.tradeApplied = false;
        this.startTradeTimeout();
        const baseRef = database.ref('trades/' + tradeId);
        baseRef.once('value').then((snap) => {
            if (!snap.exists()) {
                baseRef.set({
                    participants: { a: currentUser.uid, b: partnerId },
                    offers: {
                        [currentUser.uid]: { items: [], gold: 0, accepted: false },
                        [partnerId]: { items: [], gold: 0, accepted: false }
                    },
                    completed: false,
                    createdAt: Date.now()
                });
            }
        });
        baseRef.on('value', (snap) => {
            this.tradeState = snap.val() || {};
            this.resetTradeTimeout();
            if (this.tradeState && this.tradeState.finalized && !this.tradeApplied) {
                this.applyTradeFinalization(this.tradeState);
            } else {
                this.updateTradeWindow();
            }
        });
    }

    startTradeTimeout() {
        this.clearTradeTimeout();
        this.tradeTimeout = setTimeout(() => {
            if (this.currentTradeId) {
                this.showToast('Handel wygasł z powodu bezczynności.', 'error');
                this.playSound('error');
                database.ref('trades/' + this.currentTradeId).remove();
                this.cancelTrade();
            }
        }, 30000);
    }

    resetTradeTimeout() {
        this.clearTradeTimeout();
        this.startTradeTimeout();
    }

    clearTradeTimeout() {
        if (this.tradeTimeout) clearTimeout(this.tradeTimeout);
        this.tradeTimeout = null;
    }

    updateTradeOfferInFirebase() {
        if (!currentUser || !this.currentTradeId) return;
        const myId = currentUser.uid;
        const items = [];
        if (this.player && this.player.inventory) {
            this.tradeOfferSlots.forEach((idx) => {
                const it = this.player.inventory.slots[idx];
                if (it) items.push({ slotIndex: idx, name: it.name, icon: it.icon, quantity: it.quantity || 1 });
            });
        }
        database.ref(`trades/${this.currentTradeId}/offers/${myId}`).update({
            items,
            gold: this.tradeOfferGold || 0,
            accepted: this.tradeAccepted || false
        });
    }

    toggleTradeAccept() {
        if (!currentUser || !this.currentTradeId) return;
        if (!this.tradeAccepted && !this.canAcceptTrade()) {
            return;
        }
        this.tradeAccepted = !this.tradeAccepted;
        this.updateTradeOfferInFirebase();
        this.playSound(this.tradeAccepted ? 'success' : 'click');
        const state = this.tradeState || {};
        const mine = currentUser.uid;
        const partner = this.currentTradePartnerId;
        const myOffer = state.offers && state.offers[mine];
        const partnerOffer = state.offers && state.offers[partner];
        const leader = this.getTradeIdFor(partner).split('_')[0];
        if (myOffer && partnerOffer && myOffer.accepted && partnerOffer.accepted && mine === leader && !state.finalized) {
            database.ref('trades/' + this.currentTradeId).update({
                finalized: { offers: state.offers },
                completed: true
            });
        }
    }

    applyTradeFinalization(finalState) {
        if (!currentUser || !finalState || !finalState.finalized) return;
        const mine = currentUser.uid;
        const partner = this.currentTradePartnerId;
        const offers = finalState.finalized.offers || {};
        const myOffer = offers[mine] || { items: [], gold: 0 };
        const partnerOffer = offers[partner] || { items: [], gold: 0 };
        const toRemove = (myOffer.items || []).map(i => i.slotIndex).sort((a,b)=>b-a);
        toRemove.forEach(idx => {
            if (this.player && this.player.inventory && this.player.inventory.slots[idx]) {
                this.player.inventory.removeItem(idx);
            }
        });
        (partnerOffer.items || []).forEach(it => {
            this.player.inventory.addItem(new Item(it.name, it.icon, 'trade', null, it.quantity || 1));
        });
        if (!this.player.gold) this.player.gold = 0;
        this.player.gold = Math.max(0, (this.player.gold || 0) - (myOffer.gold || 0) + (partnerOffer.gold || 0));
        this.showToast('✅ Handel zakończony!', 'success');
        this.playSound('success');
        this.tradeApplied = true;
        setTimeout(() => {
            if (this.currentTradeId) {
                database.ref('trades/' + this.currentTradeId).remove().catch(e => console.error('Trade cleanup:', e));
            }
        }, 2000);
        this.cancelTrade();
    }

    sendTradeInvite(targetPlayerId) {
        if (!currentUser) return;
        const inviteData = {
            from: currentUser.uid,
            fromName: this.selectedChar?.name || 'Gracz',
            timestamp: Date.now()
        };
        database.ref('invites/' + targetPlayerId + '/trade').set(inviteData).then(() => {
            sendSystemMessage('Wysłano zaproszenie do handlu!');
            // Pre-init trade session so it exists when accepted
            this.currentTradePartnerId = targetPlayerId;
            this.startTradeSession(targetPlayerId);
        }).catch((error) => {
            console.error('[Trade] Error sending invite:', error);
        });
    }

    acceptTradeInvite(partnerId) {
        if (!currentUser) return;
        this.currentTradePartnerId = partnerId;
        this.startTradeSession(partnerId);
        this.openTradeWindow();
    }

    openTradeWindow() {
        const tradeWindow = document.getElementById('tradeWindow');
        const partnerName = document.getElementById('tradePartnerName');
        const partnerName2 = document.getElementById('tradePartnerName2');
        const yourGoldInput = document.getElementById('tradeYourGold');
        const acceptBtn = document.getElementById('tradeAccept');
        if (!tradeWindow) return;
        database.ref('users/' + this.currentTradePartnerId + '/player').once('value').then((snapshot) => {
            const partner = snapshot.val();
            if (partner) {
                partnerName.textContent = partner.name;
                partnerName2.textContent = partner.name;
            }
        });
        // Handlers for your gold and accept
        if (yourGoldInput) {
            yourGoldInput.oninput = () => {
                const val = Math.max(0, parseInt(yourGoldInput.value || '0', 10) || 0);
                yourGoldInput.value = String(val);
                this.tradeOfferGold = val;
                this.updateTradeOfferInFirebase();
            };
        }
        if (acceptBtn) {
            acceptBtn.onclick = () => this.toggleTradeAccept();
        }
        tradeWindow.classList.remove('hidden');
        this.updateTradeWindow();
    }

    updateTradeWindow() {
        const yourItemsEl = document.getElementById('tradeYourItems');
        const partnerItemsEl = document.getElementById('tradePartnerItems');
        const partnerGoldEl = document.getElementById('tradePartnerGold');
        const partnerStatusEl = document.getElementById('tradePartnerStatus');
        if (!yourItemsEl || !partnerItemsEl) return;
        // Render your inventory with offer toggles
        yourItemsEl.innerHTML = '';
        if (!this.player || !this.player.inventory) return;
        if (!this.tradeOfferSlots) this.tradeOfferSlots = new Set();
        this.player.inventory.slots.forEach((item, idx) => {
            if (!item) return;
            const el = document.createElement('div');
            el.className = 'trade-item';
            const offered = this.tradeOfferSlots.has(idx);
            el.style.border = offered ? '1px solid #ffd700' : '1px solid transparent';
            el.innerHTML = `<span>${item.icon || '📦'}</span><span>${item.name} x${item.quantity || 1}</span>`;
            el.onclick = () => {
                if (offered) this.tradeOfferSlots.delete(idx); else this.tradeOfferSlots.add(idx);
                this.updateTradeOfferInFirebase();
                this.updateTradeWindow();
            };
            yourItemsEl.appendChild(el);
        });
        // Render partner offer from tradeState
        partnerItemsEl.innerHTML = '';
        const state = this.tradeState || {};
        const partnerId = this.currentTradePartnerId;
        const pOffer = state.offers && partnerId ? state.offers[partnerId] : null;
        if (pOffer && Array.isArray(pOffer.items)) {
            pOffer.items.forEach((it) => {
                const el = document.createElement('div');
                el.className = 'trade-item';
                el.innerHTML = `<span>${it.icon || '📦'}</span><span>${it.name} x${it.quantity || 1}</span>`;
                partnerItemsEl.appendChild(el);
            });
        }
        if (partnerGoldEl) partnerGoldEl.textContent = String((pOffer && pOffer.gold) || 0);
        if (partnerStatusEl) partnerStatusEl.textContent = (pOffer && pOffer.accepted) ? '✅ Zaakceptował' : 'Oczekiwanie...';
    }

    cancelTrade() {
        const tradeWindow = document.getElementById('tradeWindow');
        if (tradeWindow) tradeWindow.classList.add('hidden');
        this.currentTradePartnerId = null;
        this.currentTradeId = null;
        this.tradeOfferSlots = new Set();
        this.tradeOfferGold = 0;
        this.tradeAccepted = false;
        this.clearTradeTimeout();
        if (this.currentTradeId) {
            database.ref('trades/' + this.currentTradeId).remove().catch(e => {});
        }
    }

    // ========== FRIEND SYSTEM ==========
    sendFriendRequest(targetPlayerId) {
        if (!currentUser) return;
        const requestData = {
            from: currentUser.uid,
            fromName: this.selectedChar?.name || 'Gracz',
            timestamp: Date.now()
        };
        database.ref('friendRequests/' + targetPlayerId).push(requestData).then(() => {
            this.showToast('✅ Zaproszenie do znajomych wysłane!', 'success');
            this.playSound('success');
        }).catch((error) => {
            console.error('[Friends] Error:', error);
            this.showToast('❌ Błąd wysyłania zaproszenia', 'error');
        });
    }

    listenForFriendRequests() {
        if (!currentUser) return;
        database.ref('friendRequests/' + currentUser.uid).on('child_added', (snapshot) => {
            const request = snapshot.val();
            if (request && request.from !== currentUser.uid) {
                const accept = confirm(`${request.fromName} wysłał zaproszenie do znajomych. Zaakceptujesz?`);
                if (accept) {
                    this.acceptFriendRequest(request.from, snapshot.key);
                } else {
                    snapshot.ref.remove();
                }
            }
        });
    }

    acceptFriendRequest(senderId, requestKey) {
        if (!currentUser) return;
        // Add mutual friends
        database.ref('friends/' + currentUser.uid + '/' + senderId).set({ addedAt: Date.now() });
        database.ref('friends/' + senderId + '/' + currentUser.uid).set({ addedAt: Date.now() });
        // Remove request
        database.ref('friendRequests/' + currentUser.uid + '/' + requestKey).remove();
        this.showToast('✅ Dodano do znajomych!', 'success');
        this.playSound('success');
    }

    loadFriendsList() {
        if (!currentUser) return;
        database.ref('friends/' + currentUser.uid).on('value', (snapshot) => {
            this.friendsList = [];
            const friends = snapshot.val() || {};
            for (let friendId in friends) {
                this.friendsList.push(friendId);
            }
        });
    }

    // ========== WHISPER SYSTEM ==========
    sendWhisper(recipientId, message) {
        if (!currentUser || !message.trim()) return;
        const msgData = {
            from: currentUser.uid,
            fromName: this.selectedChar?.name || 'Gracz',
            text: message.trim(),
            timestamp: Date.now()
        };
        const chatKey = currentUser.uid < recipientId ? `${currentUser.uid}_${recipientId}` : `${recipientId}_${currentUser.uid}`;
        database.ref('whispers/' + chatKey).push(msgData);
        this.showToast(`💬 Wiadomość wysłana do gracza`, 'info', 1500);
    }

    listenToWhispers(senderId) {
        if (!currentUser) return;
        const chatKey = currentUser.uid < senderId ? `${currentUser.uid}_${senderId}` : `${senderId}_${currentUser.uid}`;
        database.ref('whispers/' + chatKey).orderByChild('timestamp').limitToLast(20).on('child_added', (snapshot) => {
            const msg = snapshot.val();
            if (!this.whisperChats[senderId]) this.whisperChats[senderId] = [];
            this.whisperChats[senderId].push(msg);
            if (msg.from !== currentUser.uid) {
                this.showToast(`💬 ${msg.fromName}: ${msg.text.substring(0, 30)}...`, 'info', 2000);
                this.playSound('click');
            }
        });
    }

    // ========== FRIEND & WHISPER UI ==========
    showFriendsPanel() {
        let panel = document.getElementById('friendsPanel');
        if (!panel) {
            this.createFriendsPanel();
            panel = document.getElementById('friendsPanel');
        }
        if (panel) {
            panel.classList.toggle('hidden');
            if (!panel.classList.contains('hidden')) {
                this.updateFriendsUI();
            }
        }
    }

    createFriendsPanel() {
        const panel = document.createElement('div');
        panel.id = 'friendsPanel';
        panel.className = 'friends-panel hidden';
        panel.innerHTML = `
            <div class="friends-header">
                <h3>👥 Znajomi</h3>
                <button class="friends-close" onclick="document.getElementById('friendsPanel').classList.add('hidden')">✕</button>
            </div>
            <div id="friendsList" class="friends-list"></div>
        `;
        panel.style.cssText = `
            position: fixed;
            top: 200px;
            left: 20px;
            background: linear-gradient(180deg, #2a2a3e, #1a1a2e);
            border: 2px solid #4a4a6a;
            border-radius: 8px;
            padding: 15px;
            min-width: 220px;
            max-height: 300px;
            overflow-y: auto;
            z-index: 900;
            color: white;
            font-family: Arial, sans-serif;
        `;
        document.body.appendChild(panel);
        this.updateFriendsUI();
    }

    updateFriendsUI() {
        const list = document.getElementById('friendsList');
        if (!list) return;
        list.innerHTML = '';
        if (this.friendsList.length === 0) {
            list.innerHTML = '<div style="text-align:center;color:#888;padding:20px;">Brak znajomych</div>';
            return;
        }
        this.friendsList.forEach((friendId) => {
            const item = document.createElement('div');
            item.style.cssText = `
                background: rgba(255,255,255,0.05);
                padding: 10px;
                margin: 5px 0;
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: space-between;
            `;
            const online = this.otherPlayers[friendId] ? '🟢' : '🔴';
            item.innerHTML = `
                <span>${online} ${this.otherPlayers[friendId]?.name || friendId.substring(0, 8)}</span>
                <button onclick="game.sendWhisper('${friendId}', prompt('Wiadomość:'))" style="background:#4a90e2;border:none;color:white;padding:5px 10px;border-radius:3px;cursor:pointer;">💬</button>
            `;
            list.appendChild(item);
        });
    }


    drawOtherPlayers() {
        const count = Object.keys(this.otherPlayers).length;
        console.log('[Multiplayer] Drawing other players, count:', count, this.otherPlayers);
        for (let id in this.otherPlayers) {
            const other = this.otherPlayers[id];
            if (!other) continue;
            if (!Number.isFinite(other.currentMap)) other.currentMap = 1;
            if (other.currentMap !== this.currentMap) {
                console.log('[Multiplayer] Player', id, 'is on different map:', other.currentMap, 'vs', this.currentMap);
                continue;
            }
            console.log('[Multiplayer] Drawing player:', id, 'at', other.x, other.y);
            const centerX = other.x + this.player.width / 2;
            const centerY = other.y + this.player.height / 2;
            // Highlight selection
            if (this.selectedPlayerId && id === this.selectedPlayerId) {
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(other.x - 2, other.y - 2, this.player.width + 4, this.player.height + 4);
            }
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            this.ctx.beginPath();
            this.ctx.ellipse(centerX, centerY + 12, 10, 4, 0, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#d4a574';
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY - 8, 5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#c04000';
            this.ctx.fillRect(centerX - 7, centerY - 2, 14, 12);
            this.ctx.fillStyle = (this.selectedPlayerId && id === this.selectedPlayerId) ? '#00E1FF' : '#FFD700';
            this.ctx.font = 'bold 10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(other.name || 'Gracz', centerX, centerY - 18);
        }
    }
}

// ============================================
// AUTHENTICATION
// ============================================

function showAuthScreen() {
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('gameContainer').classList.add('hidden');
}

function showMainMenu() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');
    document.getElementById('gameContainer').classList.add('hidden');
}

function setupAuthListeners() {
    console.log('[Auth] Setting up auth listeners');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    console.log('[Auth] Elements:', { loginBtn, registerBtn, showRegisterBtn, showLoginBtn, logoutBtn });
    
    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    if (registerBtn) registerBtn.addEventListener('click', handleRegister);
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', () => {
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('registerForm').classList.remove('hidden');
        });
    }
    if (showLoginBtn) {
        showLoginBtn.addEventListener('click', () => {
            document.getElementById('registerForm').classList.add('hidden');
            document.getElementById('loginForm').classList.remove('hidden');
        });
    }
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    console.log('[Auth] Listeners attached');
}

// ============================================
// RANKING SYSTEM
// ============================================

function initRankingListeners() {
    const rankingBtn = document.getElementById('rankingBtn');
    const rankingModal = document.getElementById('rankingModal');
    const closeRankingBtn = document.getElementById('closeRanking');
    
    if (rankingBtn) {
        rankingBtn.addEventListener('click', showRanking);
    }
    
    if (closeRankingBtn) {
        closeRankingBtn.addEventListener('click', () => {
            rankingModal.classList.add('hidden');
        });
    }
    
    // Zamknij ranking klikając na tło
    if (rankingModal) {
        rankingModal.addEventListener('click', (e) => {
            if (e.target === rankingModal) {
                rankingModal.classList.add('hidden');
            }
        });
    }
}

function showRanking() {
    const rankingModal = document.getElementById('rankingModal');
    const rankingList = document.getElementById('rankingList');
    
    rankingModal.classList.remove('hidden');
    rankingList.innerHTML = '<div class="ranking-loading">Ładowanie rankingu...</div>';
    
    // Pobierz wszystkich graczy z bazy
    database.ref('users').once('value', (snapshot) => {
        const players = [];
        
        snapshot.forEach((childSnapshot) => {
            const userData = childSnapshot.val();
            if (userData && userData.player) {
                const player = userData.player;
                players.push({
                    name: player.name || 'Unknown',
                    level: player.level || 1
                });
            }
        });
        
        // Sortuj po level (malejąco)
        players.sort((a, b) => (b.level || 0) - (a.level || 0));
        
        // Weź top 20
        const topPlayers = players.slice(0, 20);
        
        // Renderuj ranking
        rankingList.innerHTML = '';
        topPlayers.forEach((player, index) => {
            const position = index + 1;
            const positionClass = position <= 3 ? `top${position}` : '';
            
            const rankingItem = document.createElement('div');
            rankingItem.className = 'ranking-item';
            rankingItem.innerHTML = `
                <div class="ranking-position ${positionClass}">${position}.</div>
                <div class="ranking-name">${escapeHtml(player.name)}</div>
                <div class="ranking-level">${player.level}LV</div>
            `;
            rankingList.appendChild(rankingItem);
        });
        
        if (topPlayers.length === 0) {
            rankingList.innerHTML = '<div class="ranking-loading">Brak graczy w rankingu</div>';
        }
    }).catch(error => {
        console.error('[Ranking] Error loading players:', error);
        rankingList.innerHTML = '<div class="ranking-loading">Błąd ładowania rankingu</div>';
    });
}

function handleLogin() {
    console.log('[Auth] handleLogin called');
    alert('handleLogin wywołane!'); // DEBUG
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    
    console.log('[Auth] Login attempt:', email);
    
    if (!email || !password) {
        errorEl.textContent = 'Wpisz email i hasło!';
        return;
    }
    
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            console.log('[Auth] Login success:', userCredential.user.email);
            errorEl.textContent = '';
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';
        })
        .catch(error => {
            console.error('[Auth] Login error:', error);
            errorEl.textContent = error.message;
        });
}

function handleRegister() {
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const password2 = document.getElementById('registerPassword2').value;
    const errorEl = document.getElementById('registerError');
    
    if (!email || !password || !password2) {
        errorEl.textContent = 'Wypełnij wszystkie pola!';
        return;
    }
    
    if (password !== password2) {
        errorEl.textContent = 'Hasła nie zgadzają się!';
        return;
    }
    
    if (password.length < 6) {
        errorEl.textContent = 'Hasło musi mieć co najmniej 6 znaków!';
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            console.log('[Auth] Register success:', userCredential.user.email);
            errorEl.textContent = '';
            document.getElementById('registerEmail').value = '';
            document.getElementById('registerPassword').value = '';
            document.getElementById('registerPassword2').value = '';
            // Login successful, auth listener will handle showing main menu
        })
        .catch(error => {
            console.error('[Auth] Register error:', error);
            errorEl.textContent = error.message;
        });
}

function handleLogout() {
    // Send system message before logout
    if (game?.selectedChar?.name) {
        sendSystemMessage(`${game.selectedChar.name} wylogował się z gry`);
    }
    
    // Usuń gracza z bazy przed wylogowaniem
    if (currentUser) {
        database.ref('users/' + currentUser.uid + '/player').remove().then(() => {
            console.log('[Auth] Player removed from database');
        });
    }
    
    auth.signOut().then(() => {
        console.log('[Auth] Logged out successfully');
        currentUser = null;
        playerId = null;
        isInGame = false;
    }).catch(error => {
        console.error('[Auth] Logout error:', error);
    });
}

// ============================================
// SYSTEM AKTUALIZACJI
// ============================================

let versionListener = null;
let lastNotifiedUpdateVersion = null;  // Zapamiętuj którą wersję już powiadomiłeś

function initUpdateCheck() {
    console.log('[Update] Initializing version check');
    
    // Nasłuchuj zmian wersji w czasie rzeczywistym
    database.ref('system/version').on('value', (snapshot) => {
        const latestVersion = snapshot.val();
        console.log('[Update] Version check:', latestVersion, 'vs', GAME_VERSION, 'isInGame:', isInGame);
        
        // Wyślij wiadomość jeśli:
        // 1. Jesteś w grze
        // 2. Wersja z Firebase jest inna niż wersja gry
        // 3. To jest inna wersja niż ostatnia którą powiadomiłeś
        if (isInGame && latestVersion && latestVersion !== GAME_VERSION && latestVersion !== lastNotifiedUpdateVersion) {
            console.log('[Update] WYSYLAM WIADOMOSC!');
            sendSystemMessage(`⚠️ AKTUALIZACJA: Dostępna nowa wersja gry (${latestVersion}). Proszę zrestartuj grę!`);
            lastNotifiedUpdateVersion = latestVersion;  // Zapamiętaj że o tej wersji już powiadomiłeś
        }
    }, (error) => {
        console.error('[Update] Error checking version:', error);
    });
}

// ============================================
// CHAT SYSTEM
// ============================================

function sendSystemMessage(text) {
    const message = {
        type: 'system',
        text: text,
        timestamp: Date.now()
    };
    
    console.log('[Chat] Sending system message:', text);
    
    database.ref('chat/messages').push(message).then(() => {
        console.log('[Chat] System message sent successfully');
    }).catch(error => {
        console.error('[Chat] System message error:', error);
    });
}

let displayedMessageIds = new Set();

function initChat() {
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    const chatMessages = document.getElementById('chatMessages');
    
    // Send message on button click
    chatSendBtn.addEventListener('click', sendChatMessage);
    
    // Send message on Enter key
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    
    // Load last 50 messages only once at start
    database.ref('chat/messages').orderByChild('timestamp').limitToLast(50).once('value', (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const messageId = childSnapshot.key;
            const message = childSnapshot.val();
            displayedMessageIds.add(messageId);
            displayChatMessage(message);
        });
    });
    
    // Listen for NEW messages after this moment
    database.ref('chat/messages').on('child_added', (snapshot) => {
        const messageId = snapshot.key;
        const message = snapshot.val();
        
        // Display only if we haven't displayed this message yet
        if (!displayedMessageIds.has(messageId)) {
            displayedMessageIds.add(messageId);
            displayChatMessage(message);
        }
    });
}

function sendChatMessage() {
    const chatInput = document.getElementById('chatInput');
    const messageText = chatInput.value.trim();
    
    if (!messageText || !currentUser) return;
    
    const message = {
        uid: currentUser.uid,
        sender: game?.selectedChar?.name || currentUser.email.split('@')[0],
        text: messageText,
        timestamp: Date.now()
    };
    
    database.ref('chat/messages').push(message).then(() => {
        chatInput.value = '';
        console.log('[Chat] Message sent');
    }).catch(error => {
        console.error('[Chat] Send error:', error);
    });
}

function displayChatMessage(message) {
    console.log('[Chat] Displaying message:', message);
    const chatMessages = document.getElementById('chatMessages');
    
    if (!chatMessages) {
        console.error('[Chat] chatMessages element not found!');
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = message.type === 'system' ? 'chat-message chat-system' : 'chat-message';
    
    const time = new Date(message.timestamp).toLocaleTimeString('pl-PL', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    if (message.type === 'system') {
        messageDiv.innerHTML = `
            <span class="chat-text">${escapeHtml(message.text)}</span>
            <span class="chat-time">${time}</span>
        `;
    } else {
        messageDiv.innerHTML = `
            <span class="chat-sender">${message.sender}:</span>
            <span class="chat-text">${escapeHtml(message.text)}</span>
            <span class="chat-time">${time}</span>
        `;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    console.log('[Chat] Message displayed');
    
    // Keep only last 50 messages in DOM
    while (chatMessages.children.length > 50) {
        chatMessages.removeChild(chatMessages.firstChild);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// INICJALIZACJA
// ============================================

let game;

window.addEventListener('load', () => {
    console.log('[Init] Page loaded, initializing...');
    game = new Game();
    initChat();
    initRankingListeners();
    
    // Poczekaj na inicjalizację Firebase auth
    setTimeout(() => {
        setupAuthListeners();
        console.log('[Init] Setup complete');
    }, 500);
});
