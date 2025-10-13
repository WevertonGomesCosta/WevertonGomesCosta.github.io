/**
 * @file utils.js
 * @description Contém scripts utilitários e autônomos como o gerador de PDF e o fundo de partículas.
 * @author Weverton C.
 * @version 3.0.0
 */

// --- Script de Fundo com Partículas ---
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    const setCanvasSize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };

    class Particle {
        constructor(x, y, dX, dY, s) { this.x=x; this.y=y; this.dX=dX; this.dY=dY; this.size=s; }
        draw() { ctx.beginPath(); ctx.arc(this.x,this.y,this.size,0,Math.PI*2); ctx.fillStyle='rgba(148,163,184,0.1)'; ctx.fill(); }
        update() { if(this.x>canvas.width||this.x<0)this.dX=-this.dX; if(this.y>canvas.height||this.y<0)this.dY=-this.dY; this.x+=this.dX; this.y+=this.dY; this.draw(); }
    }

    function init() {
        particles = [];
        let density = (canvas.width * canvas.height) / 15000;
        for (let i = 0; i < Math.min(density, 120); i++) {
            particles.push(new Particle(Math.random()*canvas.width, Math.random()*canvas.height, Math.random()*0.4-0.2, Math.random()*0.4-0.2, Math.random()*2+1));
        }
    }

    function connect() {
        for (let a = 0; a < particles.length; a++) {
            for (let b = a; b < particles.length; b++) {
                let dist = Math.sqrt((particles[a].x-particles[b].x)**2 + (particles[a].y-particles[b].y)**2);
                if (dist < 120) {
                    ctx.strokeStyle = `rgba(148,163,184,${(1-(dist/120))*0.2})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(particles[a].x, particles[a].y); ctx.lineTo(particles[b].x, particles[b].y); ctx.stroke();
                }
            }
        }
    }

    function animate() {
        requestAnimationFrame(animate);
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        particles.forEach(p => p.update());
        connect();
    }
    
    window.addEventListener('resize', () => { setCanvasSize(); init(); });
    setCanvasSize(); init(); animate();
});
