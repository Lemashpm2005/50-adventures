// Tiny dependency-free confetti burst, drawn on a full-screen canvas.
(function () {
  const canvas = document.getElementById("confettiCanvas");
  const ctx = canvas.getContext("2d");
  let particles = [];
  let running = false;

  const COLORS = ["#E8735C", "#D4A24C", "#2D6A4F", "#F3E9D2", "#74A57F", "#F2C14E"];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener("resize", resize);
  resize();

  function makeParticle() {
    return {
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
      w: 6 + Math.random() * 6,
      h: 8 + Math.random() * 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      vy: 2 + Math.random() * 3,
      vx: -1.5 + Math.random() * 3,
      rot: Math.random() * 360,
      vr: -8 + Math.random() * 16,
      shape: Math.random() > 0.5 ? "rect" : "circle",
    };
  }

  function step() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.02;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
    particles = particles.filter((p) => p.y < canvas.height + 30);
    if (particles.length > 0) {
      requestAnimationFrame(step);
    } else {
      running = false;
    }
  }

  window.burstConfetti = function (amount = 140) {
    for (let i = 0; i < amount; i++) particles.push(makeParticle());
    if (!running) {
      running = true;
      requestAnimationFrame(step);
    }
  };

  // A gentler, continuous rain used behind the "No/Yes" chase and the finale.
  let rainInterval = null;
  window.startConfettiRain = function () {
    if (rainInterval) return;
    rainInterval = setInterval(() => {
      for (let i = 0; i < 4; i++) particles.push(makeParticle());
      if (!running) {
        running = true;
        requestAnimationFrame(step);
      }
    }, 200);
  };
  window.stopConfettiRain = function () {
    clearInterval(rainInterval);
    rainInterval = null;
  };
})();