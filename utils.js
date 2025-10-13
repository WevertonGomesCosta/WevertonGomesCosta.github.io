/**
 * @file utils.js
 * @description Contém scripts utilitários, incluindo um fundo de partículas e validação de formulário de contato.
 * @author Weverton C.
 * @version 4.0.0
 */

/**
 * Módulo para o efeito de fundo com partículas.
 * @namespace ParticleBackground
 */
const ParticleBackground = {
    canvas: null,
    ctx: null,
    particles: [],
    config: {
        PARTICLE_DENSITY: 15000, // Menor é mais denso
        MAX_PARTICLES: 120,
        CONNECTION_DISTANCE: 120,
        PARTICLE_COLOR: 'rgba(148, 163, 184, 0.1)',
        LINE_COLOR_BASE: '148, 163, 184',
    },

    /**
     * Inicializa o canvas e os listeners de evento.
     */
    init() {
        this.canvas = document.getElementById('particle-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.setCanvasSize();
        this.createParticles();
        this.animate();

        window.addEventListener('resize', () => {
            this.setCanvasSize();
            this.createParticles();
        });
    },

    /**
     * Define o tamanho do canvas para preencher a janela.
     */
    setCanvasSize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    /**
     * Cria o array de partículas com base na densidade e no tamanho do canvas.
     */
    createParticles() {
        this.particles = [];
        const density = (this.canvas.width * this.canvas.height) / this.config.PARTICLE_DENSITY;
        const particleCount = Math.min(density, this.config.MAX_PARTICLES);

        for (let i = 0; i < particleCount; i++) {
            this.particles.push(new Particle(this.canvas));
        }
    },

    /**
     * Conecta partículas que estão próximas umas das outras.
     */
    connectParticles() {
        const distSq = this.config.CONNECTION_DISTANCE * this.config.CONNECTION_DISTANCE;

        for (let a = 0; a < this.particles.length; a++) {
            for (let b = a + 1; b < this.particles.length; b++) {
                const dx = this.particles[a].x - this.particles[b].x;
                const dy = this.particles[a].y - this.particles[b].y;
                const distanceSquared = dx * dx + dy * dy;

                if (distanceSquared < distSq) {
                    const opacity = (1 - (distanceSquared / distSq)) * 0.2;
                    this.ctx.strokeStyle = `rgba(${this.config.LINE_COLOR_BASE}, ${opacity})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[a].x, this.particles[a].y);
                    this.ctx.lineTo(this.particles[b].x, this.particles[b].y);
                    this.ctx.stroke();
                }
            }
        }
    },

    /**
     * Loop de animação principal.
     */
    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.particles.forEach(p => p.update());
        this.connectParticles();
        requestAnimationFrame(() => this.animate());
    }
};

/**
 * Classe que representa uma única partícula.
 */
class Particle {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.dX = Math.random() * 0.4 - 0.2;
        this.dY = Math.random() * 0.4 - 0.2;
        this.size = Math.random() * 2 + 1;
    }

    draw() {
        const ctx = this.canvas.getContext('2d');
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = ParticleBackground.config.PARTICLE_COLOR;
        ctx.fill();
    }

    update() {
        if (this.x > this.canvas.width || this.x < 0) this.dX = -this.dX;
        if (this.y > this.canvas.height || this.y < 0) this.dY = -this.dY;

        this.x += this.dX;
        this.y += this.dY;
        this.draw();
    }
}


/**
 * Módulo para validação e envio do formulário de contato.
 * @namespace ContactForm
 */
const ContactForm = {
    form: null,
    statusElement: null,
    fields: ['name', 'email', 'subject', 'message'],

    /**
     * Inicializa o formulário e adiciona o listener de submit.
     */
    init() {
        this.form = document.getElementById("contact-form");
        if (!this.form) return;

        this.statusElement = document.getElementById("form-status");
        this.form.addEventListener("submit", this.handleSubmit.bind(this));
    },

    /**
     * Exibe uma mensagem de erro para um campo específico.
     * @param {HTMLElement} input - O elemento do campo de entrada.
     * @param {string} message - A mensagem de erro a ser exibida.
     */
    showError(input, message) {
        const formGroup = input.parentElement;
        const errorElement = formGroup.querySelector('.error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        input.classList.add('error');
    },

    /**
     * Limpa a mensagem de erro de um campo.
     * @param {HTMLElement} input - O elemento do campo de entrada.
     */
    clearError(input) {
        const formGroup = input.parentElement;
        const errorElement = formGroup.querySelector('.error-message');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        input.classList.remove('error');
    },

    /**
     * Valida todos os campos do formulário.
     * @returns {boolean} - Retorna true se o formulário for válido.
     */
    validate() {
        let isValid = true;
        // NOTA: Assume que 'translations' e 'currentLang' estão disponíveis globalmente.
        if (typeof translations === 'undefined' || typeof currentLang === 'undefined') {
            console.error("Variáveis de tradução (translations, currentLang) não encontradas.");
            return false;
        }

        this.fields.forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;

            const isEmailInvalid = (id === 'email' && !/^\S+@\S+\.\S+$/.test(input.value));
            const isEmpty = input.value.trim() === '';

            if (isEmpty || isEmailInvalid) {
                const errorKey = `form-${id}-error`;
                this.showError(input, translations[currentLang][errorKey] || 'Campo inválido.');
                isValid = false;
            } else {
                this.clearError(input);
            }
        });
        return isValid;
    },

    /**
     * Lida com o evento de envio do formulário.
     * @param {Event} event - O objeto do evento de envio.
     */
    async handleSubmit(event) {
        event.preventDefault();
        if (!this.statusElement) return;

        if (!this.validate()) {
            this.statusElement.textContent = '';
            return;
        }

        this.updateStatus(translations[currentLang].formSending, 'var(--accent)');
        const data = new FormData(event.target);

        try {
            const response = await fetch(event.target.action, {
                method: this.form.method,
                body: data,
                headers: { 'Accept': 'application/json' }
            });

            if (response.ok) {
                this.handleSuccess();
            } else {
                const responseData = await response.json();
                this.handleError(responseData);
            }
        } catch (error) {
            console.error("Erro ao enviar formulário:", error);
            this.updateStatus(translations[currentLang].formError, 'var(--error)');
        }
    },

    /**
     * Ações a serem tomadas quando o envio for bem-sucedido.
     */
    handleSuccess() {
        this.updateStatus(translations[currentLang].formSuccess, 'var(--primary)');
        this.form.reset();
        this.fields.forEach(id => {
            const input = document.getElementById(id);
            if(input) this.clearError(input);
        });
    },

    /**
     * Ações a serem tomadas quando ocorrer um erro no envio.
     * @param {object} responseData - Os dados da resposta de erro.
     */
    handleError(responseData) {
        const errorMessage = responseData.errors?.map(e => e.message).join(", ") || translations[currentLang].formError;
        this.updateStatus(errorMessage, 'var(--error)');
    },

    /**
     * Atualiza a mensagem de status do formulário.
     * @param {string} message - A mensagem a ser exibida.
     * @param {string} color - A cor do texto da mensagem.
     */
    updateStatus(message, color) {
        if (this.statusElement) {
            this.statusElement.textContent = message;
            this.statusElement.style.color = color;
        }
    }
};

// Inicializa os módulos quando o DOM estiver pronto.
document.addEventListener("DOMContentLoaded", () => {
    ParticleBackground.init();
    ContactForm.init();
});
