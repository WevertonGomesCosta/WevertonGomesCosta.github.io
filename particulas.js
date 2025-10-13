/**
 * Script de Fundo com Partículas
 * Cria uma animação de partículas conectadas em um canvas.
 * Este script é autônomo e pode ser adicionado a qualquer página que contenha um elemento <canvas id="particle-canvas">.
 */
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) {
        // Se não houver canvas na página, o script não é executado.
        return;
    }

    const ctx = canvas.getContext('2d');
    let particles = [];

    // Define o tamanho do canvas para preencher a janela
    function setCanvasSize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    // Classe para representar uma única partícula
    class Particle {
        constructor(x, y, dX, dY, s) {
            this.x = x;
            this.y = y;
            this.dX = dX; // Direção X
            this.dY = dY; // Direção Y
            this.size = s;
        }

        // Desenha a partícula no canvas
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(148, 163, 184, 0.1)';
            ctx.fill();
        }

        // Atualiza a posição da partícula
        update() {
            // Inverte a direção se a partícula atingir as bordas
            if (this.x > canvas.width || this.x < 0) this.dX = -this.dX;
            if (this.y > canvas.height || this.y < 0) this.dY = -this.dY;
            this.x += this.dX;
            this.y += this.dY;
            this.draw();
        }
    }

    // Inicializa ou reinicializa as partículas
    function init() {
        particles = [];
        // A densidade de partículas se ajusta ao tamanho da tela
        let density = (canvas.width * canvas.height) / 15000;
        for (let i = 0; i < Math.min(density, 120); i++) {
            particles.push(new Particle(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                (Math.random() * 0.4) - 0.2,
                (Math.random() * 0.4) - 0.2,
                Math.random() * 2 + 1
            ));
        }
    }

    // Desenha linhas entre partículas próximas
    function connect() {
        for (let a = 0; a < particles.length; a++) {
            for (let b = a; b < particles.length; b++) {
                let distance = Math.sqrt(
                    (particles[a].x - particles[b].x) ** 2 + (particles[a].y - particles[b].y) ** 2
                );
                if (distance < 120) {
                    ctx.strokeStyle = `rgba(148, 163, 184, ${ (1 - (distance / 120)) * 0.2 })`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b].x, particles[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    // Loop de animação principal
    function animate() {
        requestAnimationFrame(animate);
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        particles.forEach(p => p.update());
        connect();
    }

    // Ouve o evento de redimensionamento da janela para reajustar o canvas
    window.addEventListener('resize', () => {
        setCanvasSize();
        init();
    });

    // Inicia a animação
    setCanvasSize();
    init();
    animate();
});
