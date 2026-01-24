# SAFE ZONE FIX - Dokumentacja Zmian

## Problem
Moby nie byłyby blokowane w safe zone wioski - pojawiały się na kamiennej podłodze i wbiegały do gracza.

## Rozwiązanie - 3 Elementy

### 1️⃣ SAFE_RECT w WORLD Coords
```javascript
const SAFE_RECT = { x: 160, y: 120, w: 520, h: 540 };
```

- **Właściwe współrzędne**: `(160, 120)` to górny-lewy punkt, `(680, 660)` to dolny-prawy
- **Pokrywa**: Całą kamienną podłogę wioski
- **Stosowana**: W `generateEnemies()` i `Enemy.update()`

### 2️⃣ NO SPAWN - Moby się NIE REDAJĄ w Safe Zone

**Plik**: `game.js` linia ~3205 (funkcja `generateEnemies()`)

```javascript
const insideSafe = (px, py) => {
    return px >= SAFE_RECT.x && px <= SAFE_RECT.x + SAFE_RECT.w &&
           py >= SAFE_RECT.y && py <= SAFE_RECT.y + SAFE_RECT.h;
};

// W pętli placeZone:
if (insideSafe(x, y)) {
    continue; // RETRY - losuj nowe współrzędne
}
```

**Efekt**: Jeśli wygenerowana pozycja jest w safe zone → pętla `while` losuje nową.

### 3️⃣ NO ENTER - Moby są WYPYCHANE z Safe Zone

**Plik**: `game.js` linia ~1028 (funkcja `Enemy.update()`)

```javascript
if (insideSafe(this.x, this.y)) {
    // Znajdź punkt poza safe zone
    const cx = SAFE_RECT.x + SAFE_RECT.w / 2;
    const cy = SAFE_RECT.y + SAFE_RECT.h / 2;
    const dx = this.x - cx;
    const dy = this.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    
    // Wypchnij na zewnątrz
    const pushDist = Math.max(SAFE_RECT.w, SAFE_RECT.h) / 2 + 20;
    this.x = cx + (dx / dist) * pushDist;
    this.y = cy + (dy / dist) * pushDist;
    
    this.isAggro = false;
    this.target = null;
    return; // Wyjdź z update
}
```

**Efekt**: Jeśli mob wbiegnie → natychmiast pcha go poza rect i resetuje AI.

### 4️⃣ DEBUG - Wizualizacja Safe Zone

**Plik**: `game.js` linia ~4853 (funkcja `draw()`)

```javascript
if (this.currentMap === 1) {
    const SAFE_RECT = { x: 160, y: 120, w: 520, h: 540 };
    
    this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(SAFE_RECT.x, SAFE_RECT.y, SAFE_RECT.w, SAFE_RECT.h);
    // Tekst w środku...
}
```

**Efekt**: Zielony prostokąt na mapie pokazuje dokładnie gdzie jest safe zone.

## Pliki Zmienione

1. **game.js**
   - Linia ~3205: Zdefiniowanie `SAFE_RECT` i `insideSafe()` w `generateEnemies()`
   - Linia ~1028: NO ENTER logika w `Enemy.update()`
   - Linia ~4853: Debug draw w `draw()`
   - Linia ~3173: Dodana funkcja `debugClearEnemiesCache()`

2. **game_mobs_fixed.js** (backup, ma same zmiany co game.js)
   - Analogiczne zmiany dla kompatybilności

## Instrukcja Testowania

### Krok 1: Wyczyść Cache Firebase
1. Otwórz **Console** (F12 → Console)
2. Wpisz: `window.gameManager?.debugClearEnemiesCache()`
3. Czekaj na logi: `[DEBUG] Cleared map X enemies template`

**Lub ręcznie**:
- Wejdź w Firebase Console (https://console.firebase.google.com)
- `Realtime Database` → `gameState/map1/enemiesTemplate`
- Usuń całą sekcję

### Krok 2: Przeładuj Grę
- Odśwież stronę (F5 lub Ctrl+R)
- W konsoli powinieneś zobaczyć:
  ```
  [SAFE_ZONE] SAFE_RECT: {x: 160, y: 120, w: 520, h: 540}
  Safe zone coords test: topLeft(160,120) bottomRight(680,660)
  ```

### Krok 3: Sprawdź Mapa w Grze
- Zaloguj się i wejdź na **Map 1 (Wioska)**
- **Zielony prostokąt** pojawi się na mapie - to jest safe zone
- Powinien dokładnie pokrywać **kamienną podłogę wioski**

### Krok 4: Testuj Mob Behavior
1. **NO SPAWN**: Poczekaj 2 sekundy - moby powinny pojawiać się POZA zielonym prostokątem
2. **NO ENTER**: Jeśli mob jakoś wbiegnie (edge case) - natychmiast będzie wypychany na zewnątrz
3. **Player Safe**: Gdy jesteś wewnątrz safe zone - moby Cię nie atakują
4. **Console Logs**: 
   - Jeśli mob jest wypychany: `[NO_ENTER] Enemy 'XYZ' pushed out from safe zone...`
   - Podczas ładowania: `[SAFE_ZONE] SAFE_RECT...` i `[Multiplayer] Generating new enemies...`

## Oryginalne Błędy (teraz naprawione)

### ❌ Błąd 1: SAFE_RADIUS był círcular
Stary kod używał `SAFE_RADIUS = 320` (koło wokół wioski).
**Problem**: Nie pokrywał dokładnie krawędzi kamieni + angażował matematykę na dwa miejsca.

### ❌ Błąd 2: NO SPAWN nie miał pętli retry
Stary kod zamiast `continue;` w pętli → żaden retry.
**Problem**: Moby mogły się tworzyć w dowolnym miejscu.

### ❌ Błąd 3: NO ENTER używał starych coords
Puszchem na `SAFE_RADIUS + 12` zamiast na dokładny edge rect.
**Problem**: Nie było gwarancji, że mob zostanie poza safe zone.

### ❌ Błąd 4: WORLD vs SCREEN coords
Sprawdzenia były w screen coords (po transformacji kamery).
**Problem**: Warunki nigdy nie trafiały prawidłowo.

## Rozszerzone Opcje (Przyszłość)

Jeśli chcesz dodać steering/avoidance (aby moby omijały safe zone na 40px):

```javascript
// W Enemy.update(), przed normalną AI:
const AVOID_DIST = 40;
if (!insideSafe(this.x, this.y)) {
    const dx = this.x - (SAFE_RECT.x + SAFE_RECT.w/2);
    const dy = this.y - (SAFE_RECT.y + SAFE_RECT.h/2);
    const distToSafe = Math.sqrt(dx*dx + dy*dy);
    
    if (distToSafe < Math.max(SAFE_RECT.w, SAFE_RECT.h)/2 + AVOID_DIST) {
        // Mob jest blisko safe zone - skręć mu trajektorię
        // (Nie implementowane teraz - zbyt skomplikowane)
    }
}
```

## Podsumowanie Logiki

| Sytuacja | Akcja |
|----------|-------|
| Mob do wygenerowania w safe zone | RETRY - losuj nowe coords |
| Mob już w safe zone (edge case) | WYPCHNIJ poza i reset AI |
| Gracz w safe zone | Mobs ignore (target=null) |
| Gracz poza, mob poza | Normalna AI |

---

**Data**: 24 styczeń 2026  
**Status**: ✅ Gotowe do testów
