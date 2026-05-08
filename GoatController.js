/**
 * GoatController.js v4 — Kaizen Pass
 *
 * Fixes:
 * - chaosTimer was never decremented (dead code — clicks now use a timestamp approach)
 * - decideNextBehavior no longer overrides direction (auto-mirror handles it in component)
 * - messageTimer no longer fights chaosMode refresh — cleaned up ordering
 * - setState now guards against CHAOS key missing from GOAT_STATES enum
 * - Passive speech moved to its own accumulator to avoid frame-0 coupling
 */

export const GOAT_STATES = {
    IDLE: 'IDLE',
    WALKING: 'WALKING',
    RUNNING: 'RUNNING',
    JUMPING: 'JUMPING',
    ATTACKING: 'ATTACKING',
    EATING: 'EATING',
    ALERT: 'ALERT',
    SURPRISED: 'SURPRISED',
    SLEEPING: 'SLEEPING',
    DRAGGING: 'DRAGGING'
};

export class GoatController {
    constructor(config = {}) {
        this.state = GOAT_STATES.IDLE;
        this.direction = 1;
        this.frame = 0;
        this.tick = 0;
        this.stateTime = 0;
        this.idleReturnTimer = 0;
        this.isMovedManually = false;
        this.passiveSpeakAccumulator = 0;

        this.onFrameChange = config.onFrameChange || (() => {});
        this.onMessageChange = config.onMessageChange || (() => {});
        this.onSpeak = config.onSpeak || (() => {});

        this.animations = {
            [GOAT_STATES.IDLE]:      ['idle_1', 'idle_1', 'idle_1', 'idle_2', 'idle_1', 'idle_6', 'idle_1'],
            [GOAT_STATES.ALERT]:     ['alerrt0', 'alert_1', 'confuse', 'surprised_2', 'surprised_5', 'alerrt0'],
            [GOAT_STATES.WALKING]:   ['idle_1', 'walk_2', 'idle_1', 'walk_4'],
            [GOAT_STATES.RUNNING]:   ['run1', 'run2', 'run3'],
            [GOAT_STATES.JUMPING]:   ['jump1', 'jump2', 'jump3', 'jump4'],
            [GOAT_STATES.ATTACKING]: ['atack1', 'atack2', 'atack1', 'atack2'],
            [GOAT_STATES.EATING]:    ['eat grass', 'eat grass 2', 'eat grass3'],
            [GOAT_STATES.SURPRISED]: ['surprised_1', 'surprised_4', 'surprised_1'],
            [GOAT_STATES.SLEEPING]:  ['relax', 'calm', 'sleep1', 'sleep2', 'sleeping', 'sleep2', 'sleep1'],
            [GOAT_STATES.DRAGGING]:  ['high jump'],
            'CHAOS':                 ['run1', 'run2', 'run3', 'jump1', 'jump2', 'jump3', 'jump4', 'high jump', 'high jump2']
        };

        const defaultPhrases = [
            "¿Me das una rama o te borro el System32?", "Soy el 'root' de esta pradera.",
            "Mi barba tiene mejor syntax highlighting que tu editor.", "¿Es esto un pull request o un pull de mi cola?",
            "No es un deadlock, es que me quedé mirando fijamente.", "Meee-moria RAM insuficiente para tanto pasto.",
            "Escalo montañas de legacy code sin arnés.", "¿Tienes el firmware de mis cuernos actualizado?",
            "Mi estómago tiene 4 núcleos de procesamiento.", "Runtime Error: Se acabó el trébol.",
            "Git commit -m 'Cabra rumiando'.", "¿Ese cable es Category 6? Sabe a pollo.",
            "No rumiando, solo procesando hilos en paralelo.", "Mi uptime es del 99.9% (el 0.1% estoy saltando).",
            "sudo apt-get install alfalfita.", "¿Esto es una nube o un rebaño de ovejas?",
            "Error 500: La cabra se comió el servidor.", "Experta en hardware (especialmente en masticarlo).",
            "Overclocking de pezuñas activado.", "Mi firewall es una cerca de madera.",
            "Debuggeando el jardín, encontré un gusano.", "Kernel panic: El lobo está cerca.",
            "Deploying mi cabeza contra la puerta.", "Mi GPU (Goat Processing Unit) es de última generación.",
            "¿JSON? Yo prefiero J-PASTO.", "Haciendo ping a la montaña más alta.",
            "Bit by bit, leaf by leaf.", "Docker es para barcos, yo prefiero el lodo.",
            "Mi DNS resuelve 'Pasto' a 'Comida'.", "No soy unstable, soy agile.",
            "Load balancer activado en mis cuatro patas.", "NullPointerException en el bebedero.",
            "Stack Overflow de alfalfa.", "Mi cache está llena de flores silvestres.",
            "Compilando... espera a que trague.", "Root access al huerto de tomates.",
            "Version 2.0: Ahora con cuernos de fibra de carbono.", "Responsive design: Salto y me ajusto a cualquier roca.",
            "Garbage collector oficial de este patio.", "Imprimiendo cuernos en PETG al 100% de infill.",
            "Mi ECU interna necesita un re-mapeo de rumiado.",
            "¿Viste mis pupilas rectangulares? Te veo en 4K.", "El pasto siempre es más verde en el localhost del vecino.",
            "No soy terca, soy persistente.", "¿Drogas? No, solo clorofila de la buena.",
            "Hice senderismo antes de que fuera cool.", "¿Esto es un botón o algo masticable?",
            "Si me caigo, es que entré en modo reposo.", "Mi deporte favorito es el parkour extremo.",
            "¿Tienes wifi? Porque siento una conexión con ese arbusto.", "Cuidado: Cabra con acceso a internet.",
            "He visto cosas que no creerías... y luego me las comí.", "No me toques los botones, tócame la barbilla.",
            "Status: Rumiando... 75% completado.", "Exit code 0: La cabra ha dejado el edificio."
        ];

        this.phrases = config.phrases || defaultPhrases;


        // Click detection — using timestamp array instead of a buggy timer
        this._clickTimestamps = [];

        this.phrasePool = []; // Pool of unused indices
        this.currentMessage = "";
        this.messageTimer = 0;
        this.isChaosMode = false;
        this.isBouncing = false;
        this.chaosDuration = 0;

        this.maxFrames = this.animations[this.state].length;
        this.frameDuration = 800;
    }

    registerClick() {
        // Reset manual move state on click
        this.isMovedManually = false;
        this.idleReturnTimer = 0;

        if (this.isChaosMode) {
            if (!this.isBouncing) {
                this.isBouncing = true;
                // Message is already running in chaos — no need to set again
            }
            return;
        }

        // Use timestamps to count rapid clicks in the last 3.0 seconds
        const now = Date.now();
        this._clickTimestamps.push(now);
        this._clickTimestamps = this._clickTimestamps.filter(t => now - t < 3000);

        if (this._clickTimestamps.length >= 10) {
            this._clickTimestamps = [];
            this.isChaosMode = true;
            this.isBouncing = true;
            this.chaosDuration = 20000;
            this._setChaosMessage();
        }
    }

    _setChaosMessage() {
        this.currentMessage = "¡NO SE PUEDE LEER MIENTRAS GIRO! 😵‍💫";
        this.messageTimer = 99999; // Kept alive by chaos, cleared on reset
        this.onMessageChange(this.currentMessage);
    }

    update(deltaTime = 16) {
        this.tick += deltaTime;
        this.stateTime += deltaTime;

        // Auto-return timer (manual move)
        if (this.isMovedManually) {
            this.idleReturnTimer += deltaTime;
            if (this.idleReturnTimer > 60000) {
                this.isMovedManually = false;
                this.idleReturnTimer = 0;
                this.setState(GOAT_STATES.WALKING);
            }
        }

        // Chaos countdown
        if (this.isChaosMode) {
            this.chaosDuration -= deltaTime;
            if (this.chaosDuration <= 0) {
                this.resetChaos();
                return; // Skip rest of update this frame
            }
            // Keep chaos message alive — only set state, don't call onMessageChange every frame
            if (this.state !== 'CHAOS') this.setState('CHAOS');
        }

        // Message timer — don't tick it down during chaos (chaos manages its own)
        if (!this.isChaosMode && this.messageTimer > 0) {
            this.messageTimer -= deltaTime;
            if (this.messageTimer <= 0) {
                this.messageTimer = 0;
                this.currentMessage = "";
                this.onMessageChange("");
            }
        }

        // Passive speaking accumulator — fires every ~25-45s randomly
        if (!this.isChaosMode && this.state !== GOAT_STATES.DRAGGING && !this.currentMessage) {
            this.passiveSpeakAccumulator += deltaTime;
            const threshold = 25000 + Math.random() * 20000;
            if (this.passiveSpeakAccumulator > threshold && (this.state === GOAT_STATES.IDLE || this.state === GOAT_STATES.ALERT)) {
                this.passiveSpeakAccumulator = 0;
                this.speak();
            }
        }

        // Frame advance
        let effectiveDuration = this.frameDuration;
        if (this.isChaosMode) effectiveDuration = 150;
        else if (this.state === GOAT_STATES.RUNNING) effectiveDuration = 250;
        else if (this.state === GOAT_STATES.JUMPING) effectiveDuration = 400;
        else if (this.state === GOAT_STATES.ATTACKING) effectiveDuration = 350;
        else if (this.state === GOAT_STATES.DRAGGING) effectiveDuration = 400;

        if (this.tick >= effectiveDuration) {
            this.tick = 0;
            this.frame = (this.frame + 1) % this.maxFrames;

            // On loop completion, decide new behavior
            const minStateTime = this.state === GOAT_STATES.IDLE ? 3000 : 6000;
            if (this.frame === 0 && this.stateTime > minStateTime && !this.isChaosMode && this.state !== GOAT_STATES.DRAGGING) {
                this.decideNextBehavior();
            }

            this.onFrameChange(this.getCurrentFrameNumber());
        }
    }

    resetChaos() {
        this.isChaosMode = false;
        this.isBouncing = false;
        this.chaosDuration = 0;
        this._clickTimestamps = [];
        this.currentMessage = "Uff... me mareé. 😵";
        this.messageTimer = 3000;
        this.onMessageChange(this.currentMessage);
        this.setState(GOAT_STATES.IDLE);
    }

    speak() {
        if (this.currentMessage) return; // Don't interrupt existing message

        // Refill and shuffle pool if empty
        if (this.phrasePool.length === 0) {
            this.phrasePool = Array.from({ length: this.phrases.length }, (_, i) => i);
            // Fisher-Yates shuffle
            for (let i = this.phrasePool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [this.phrasePool[i], this.phrasePool[j]] = [this.phrasePool[j], this.phrasePool[i]];
            }
        }

        const index = this.phrasePool.pop();
        this.currentMessage = this.phrases[index];
        this.messageTimer = 4500;
        this.onMessageChange(this.currentMessage);
        this.onSpeak();

        if (this.state !== GOAT_STATES.DRAGGING) {
            this.setState(GOAT_STATES.SURPRISED);
            setTimeout(() => {
                if (this.state === GOAT_STATES.SURPRISED) this.setState(GOAT_STATES.IDLE);
            }, 4000);
        }
    }

    decideNextBehavior() {
        const rand = Math.random();

        // If currently in a non-idle state, higher chance to return to IDLE
        if (this.state !== GOAT_STATES.IDLE) {
            if (rand < 0.4) {
                this.setState(GOAT_STATES.IDLE);
                return;
            }
        }

        // If IDLE or just finished another state, pick something new
        if (rand < 0.08) this.setState(GOAT_STATES.WALKING);
        else if (rand < 0.16) this.setState(GOAT_STATES.EATING);
        else if (rand < 0.24) this.setState(GOAT_STATES.ALERT);
        else if (rand < 0.32) this.setState(GOAT_STATES.SLEEPING);
        else if (rand < 0.38) this.setState(GOAT_STATES.RUNNING);
        else if (rand < 0.44) this.setState(GOAT_STATES.JUMPING);
        else if (rand < 0.50) this.setState(GOAT_STATES.ATTACKING);
        else this.setState(GOAT_STATES.IDLE);
    }

    setState(newState) {
        const anim = this.animations[newState];
        if (!anim) return; // Guard against unknown states
        if (this.state === newState) return; // No redundant setState
        this.state = newState;
        this.frame = 0;
        this.tick = 0;
        this.stateTime = 0;
        this.maxFrames = anim.length;
    }

    getCurrentFrameNumber() {
        const anim = this.animations[this.state];
        if (!anim || this.frame >= anim.length) return 'idle_1'; // Fallback
        return anim[this.frame];
    }
}
