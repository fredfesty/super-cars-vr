import * as THREE from 'three';
import { CONFIG } from '../config.js';

export const RACE_STATE = {
  PRE_RACE: 'PRE_RACE',
  COUNTDOWN: 'COUNTDOWN',
  RACING: 'RACING',
  FINISHED: 'FINISHED',
};

/**
 * Race Manager for Super Cars II VR.
 * Coordinates 3-2-1-GO start gantry, checkpoints, lap progression,
 * live positions (1st - 4th), lap times, and race finish conditions.
 */
export class RaceManager {
  constructor(trackSpline, checkpoints, trackBuilder, soundManager) {
    this.spline = trackSpline;
    this.checkpoints = checkpoints;
    this.track = trackBuilder;
    this.sounds = soundManager;

    this.state = RACE_STATE.PRE_RACE;
    this.countdownTimer = 3.0;
    this.lastCountSecond = 4;

    this.cars = [];
    this.playerCar = null;

    this.lapStartTime = 0;
    this.currentLapTime = 0;
    this.bestLapTime = null;
    this.totalRaceTime = 0;

    // UI elements
    this.uiPosNumber = document.getElementById('pos-number');
    this.uiPosSuffix = document.getElementById('pos-suffix');
    this.uiLapCurrent = document.getElementById('lap-current');
    this.uiLapTime = document.getElementById('lap-time');
    this.uiBestTime = document.getElementById('best-time');
    this.uiCountdown = document.getElementById('countdown-overlay');
    this.uiRaceResults = document.getElementById('race-results');
    this.uiResultTitle = document.getElementById('result-title');
    this.uiResultDesc = document.getElementById('result-desc');
  }

  setupGrid(playerCar, aiCars) {
    this.playerCar = playerCar;
    this.cars = [playerCar, ...aiCars];

    // Grid starting slot coordinates (staggered grid on straight runway with plenty of space)
    const gridSlots = [
      { t: 0.988, offset: -2.6 }, // Player (Front row left)
      { t: 0.984, offset: 3.2 },  // AI 1 (Front row right)
      { t: 0.974, offset: -3.2 }, // AI 2 (Second row left)
      { t: 0.970, offset: 0.0 },  // AI 3 (Third row center)
    ];

    const up = new THREE.Vector3(0, 1, 0);

    this.cars.forEach((car, i) => {
      const slot = gridSlots[i];
      const pt = this.spline.getPointAt(slot.t);
      const tangent = this.spline.getTangentAt(slot.t).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const startPos = pt.clone().addScaledVector(normal, slot.offset);
      const yaw = Math.atan2(tangent.x, tangent.z);

      car.setPosition(startPos, yaw);
      car.lap = 1;
      car.checkpointIndex = 0;
      car.lapProgress = slot.t;
      car.totalDistance = slot.t;
      car.finished = false;
    });

    this.startCountdown();
  }

  startCountdown() {
    this.state = RACE_STATE.COUNTDOWN;
    this.countdownTimer = 3.5;
    this.lastCountSecond = 4;
    this.totalRaceTime = 0;
    this.currentLapTime = 0;

    if (this.uiRaceResults) {
      this.uiRaceResults.style.display = 'none';
    }
  }

  update(delta) {
    // 1. Handle Countdown
    if (this.state === RACE_STATE.COUNTDOWN) {
      this.countdownTimer -= delta;
      const secondLeft = Math.ceil(this.countdownTimer);

      if (secondLeft !== this.lastCountSecond && secondLeft >= 0) {
        this.lastCountSecond = secondLeft;

        if (this.uiCountdown) {
          if (secondLeft > 0) {
            this.uiCountdown.innerText = secondLeft;
            this.uiCountdown.className = 'show';
            if (this.sounds) this.sounds.playCountdownBeep(false);
            if (this.track) this.track.updateGantryLights(secondLeft);
          } else {
            this.uiCountdown.innerText = 'GO!';
            this.uiCountdown.className = 'go show';
            if (this.sounds) this.sounds.playCountdownBeep(true);
            if (this.track) this.track.updateGantryLights(0);
          }
        }
      }

      if (this.countdownTimer <= 0) {
        this.state = RACE_STATE.RACING;
        this.lapStartTime = performance.now();
        setTimeout(() => {
          if (this.uiCountdown) this.uiCountdown.className = '';
        }, 1200);
      }
      return;
    }

    if (this.state === RACE_STATE.RACING) {
      this.totalRaceTime += delta;
      this.currentLapTime += delta;

      // Update Lap Time display
      if (this.uiLapTime) {
        this.uiLapTime.innerText = this.formatTime(this.currentLapTime);
      }

      // Update progress for all cars
      this.cars.forEach(car => {
        this.updateCarProgress(car);
      });

      // Sort positions
      this.updateLeaderboard();
    }
  }

  updateCarProgress(car) {
    if (car.finished) return;

    // Project car position onto track spline
    // Find closest checkpoint
    let closestIndex = car.checkpointIndex;
    let minDist = Infinity;

    const numCP = this.checkpoints.length;
    // Check checkpoints around current index (+/- 2)
    for (let offset = -1; offset <= 2; offset++) {
      const idx = (car.checkpointIndex + offset + numCP) % numCP;
      const cp = this.checkpoints[idx];
      const d = car.position.distanceTo(cp.position);
      if (d < minDist) {
        minDist = d;
        closestIndex = idx;
      }
    }

    // Check if advancing to next checkpoint
    const nextExpected = (car.checkpointIndex + 1) % numCP;
    if (closestIndex === nextExpected) {
      car.checkpointIndex = nextExpected;

      // Lap completed if wrapping back to 0 from last checkpoint
      if (nextExpected === 0) {
        if (car.isPlayer) {
          this.onPlayerLapCompleted();
        } else {
          car.lap++;
          if (car.lap > CONFIG.race.totalLaps) {
            car.finished = true;
          }
        }
      }
    }

    // Approximate continuous spline progress (0.0 to 1.0)
    const baseT = this.checkpoints[car.checkpointIndex].t;
    car.lapProgress = baseT;
    car.totalDistance = (car.lap - 1) + baseT;
  }

  onPlayerLapCompleted() {
    // Record best lap
    if (!this.bestLapTime || this.currentLapTime < this.bestLapTime) {
      this.bestLapTime = this.currentLapTime;
      if (this.uiBestTime) {
        this.uiBestTime.innerText = `BEST: ${this.formatTime(this.bestLapTime)}`;
        this.uiBestTime.style.color = '#38bdf8';
      }
    }

    this.playerCar.lap++;
    this.currentLapTime = 0;

    if (this.playerCar.lap > CONFIG.race.totalLaps) {
      this.playerCar.lap = CONFIG.race.totalLaps;
      this.playerCar.finished = true;
      this.onRaceFinished();
    } else {
      if (this.uiLapCurrent) {
        this.uiLapCurrent.innerText = this.playerCar.lap;
      }
    }
  }

  updateLeaderboard() {
    // Sort descending by totalDistance
    const sorted = [...this.cars].sort((a, b) => b.totalDistance - a.totalDistance);

    sorted.forEach((car, rankIdx) => {
      car.rank = rankIdx + 1;
    });

    if (this.playerCar && this.uiPosNumber) {
      this.uiPosNumber.innerText = this.playerCar.rank;
      const suffixes = ['ST', 'ND', 'RD', 'TH'];
      this.uiPosSuffix.innerText = suffixes[this.playerCar.rank - 1] || 'TH';
    }
  }

  onRaceFinished() {
    this.state = RACE_STATE.FINISHED;

    if (this.uiRaceResults) {
      this.uiRaceResults.style.display = 'block';

      const rank = this.playerCar.rank;
      const suffixes = ['st', 'nd', 'rd', 'th'];
      const rankStr = `${rank}${suffixes[rank - 1] || 'th'}`;

      if (rank === 1) {
        this.uiResultTitle.innerText = '🏆 VICTORY! 🏆';
        this.uiResultTitle.style.color = '#facc15';
      } else {
        this.uiResultTitle.innerText = 'RACE FINISHED';
        this.uiResultTitle.style.color = '#38bdf8';
      }

      this.uiResultDesc.innerText = `You finished ${rankStr} in ${this.formatTime(this.totalRaceTime)}! Best Lap: ${this.formatTime(this.bestLapTime || this.totalRaceTime)}`;
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds * 100) % 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  isRacing() {
    return this.state === RACE_STATE.RACING;
  }
}
