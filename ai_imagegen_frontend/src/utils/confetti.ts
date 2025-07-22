import confetti from 'canvas-confetti';

export const launchConfetti = () => {
  const duration = 2 * 1000;
  const end = Date.now() + duration;

  const colors = ['#00ffff', '#66ff66', '#ff66cc', '#ffd700'];

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
};