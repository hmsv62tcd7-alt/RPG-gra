# Combat System Quick Start Guide

## How to Use

### **Selecting a Target**
1. **Click directly on any enemy** to select them as your target
2. You'll see a **pulsing red circle** around the selected enemy with 4 directional points
3. **Click empty space** to deselect the current target

### **Attacking**
Press **Key `1`** to perform a basic attack:
- **Wojownik (Warrior)**: Melee attack (40px range)
  - Automatically walks to target if too far
  - Once in range: Cios mieczy
- **Mag (Mage)**: Casts magic orb projectile (220px range)
  - Blue glowing projectile speed: 420px/s
  - Damage scales from INT stat
- **Hunter (Archer)**: Fires arrow projectile (260px range)
  - Yellow arrow speed: 520px/s (faster)
  - Damage scales from ZRN (Agility) + STR

### **Damage System**
Damage is calculated from your class stats + equipment bonuses, minus enemy defense:

```
Wojownik: STR × 2 + 5 + Eq.ATK - Enemy.DEF
Mag:      INT × 2 + 3 + Eq.ATK - Enemy.DEF
Hunter:   ZRN × 2 + STR + 2 + Eq.ATK - Enemy.DEF
```

### **Cooldowns** (time between attacks)
- Wojownik: 1000ms (1 second)
- Mag: 800ms (quickest caster)
- Hunter: 750ms (slightly faster than warrior)

### **Special Mechanics**
- **Warrior**: Auto-walks to melee range, must get close
- **Mage**: Stay back at 220px range, spam projectiles
- **Hunter**: Longest range (260px), medium damage
- **Minimum Damage**: Always 1 damage minimum, even to high-defense enemies

---

## Class Comparison

| Class | Attack Type | Range | Speed | Damage Stat | Best For |
|-------|-------------|-------|-------|------------|----------|
| Wojownik | Melee Sword | 40px | 1000ms | STR (strong) | Close combat |
| Mag | Magic Orb | 220px | 800ms | INT (mages) | Ranged casting |
| Hunter | Arrow | 260px | 750ms | ZRN+STR | Maximum range |

---

## Visual Feedback

### **Target Indicator**
When you select an enemy:
- **Outer ring**: Pulsates red (breathing effect)
- **Inner ring**: Solid red circle
- **4 dots**: Red points at N/E/S/W positions
- **Effect**: Updates in real-time as you move

### **Projectiles**
- **Magic Orb**: Blue sphere with trailing particles
- **Arrow**: Yellow triangle/arrow shape with yellow trailing particles

---

## Pro Tips

1. **Warrior**: Queue movement + attacks by clicking target → pressing `1` → target auto-walks then attacks
2. **Mage**: Keep distance! Use 220px range to stay safe from melee enemies
3. **Hunter**: Best range (260px) - position yourself to maximize distance
4. **Equipment**: Boost your ATK via better weapons to deal more damage
5. **Targeting**: Can quickly switch targets by clicking different enemies

---

## Keyboard Layout

```
Movement:
  W/↑ = Up
  A/← = Left
  S/↓ = Down
  D/→ = Right

Actions:
  1 = Attack/Cast
  I = Inventory
  C = Equipment (Ekwipunek)
  E = NPC Interaction
```

---

**READY TO COMBAT!** 🗡️⚔️🏹
