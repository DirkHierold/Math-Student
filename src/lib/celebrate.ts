import confetti from "canvas-confetti"

// Runs for 2.5 s, or for as long as `keepGoing` returns true.
export const celebrate = (keepGoing?: () => boolean) => {
  const colors = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899"]
  const end = Date.now() + 2500
  const burst = () => {
    confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors, zIndex: 100, disableForReducedMotion: false })
    confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors, zIndex: 100, disableForReducedMotion: false })
    confetti({ particleCount: 3, spread: 120, startVelocity: 25, origin: { x: Math.random(), y: 0 }, colors, zIndex: 100, disableForReducedMotion: false })
    if (keepGoing ? keepGoing() : Date.now() < end) requestAnimationFrame(burst)
  }
  burst()
}
