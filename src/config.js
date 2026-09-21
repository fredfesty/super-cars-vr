export const CONFIG = {
  // Car Physics (Super Cars II arcade feel)
  car: {
    maxSpeed: 48.0,             // Top forward speed in world units/sec (~170 km/h display)
    reverseSpeed: -16.0,        // Max reverse speed
    acceleration: 38.0,         // Forward acceleration
    braking: 55.0,              // Foot brake strength
    reverseAccel: 22.0,         // Reverse acceleration
    naturalDecel: 12.0,         // Rolling resistance / engine braking
    turnSpeed: 3.2,             // Angular steering rate (radians/sec)
    gripFactor: 0.88,           // Sideways friction (lower = driftier, higher = grippier)
    driftThreshold: 20.0,       // Speed above which tires start sliding and emitting smoke
    collisionBounce: 0.45,      // Rebound elastic bounce against walls/rivals
    carRadius: 1.4,             // Collision boundary radius
    carLength: 3.2,
    carWidth: 1.8,
    spinDuration: 1.6,          // Seconds car is spun out when hit by a missile
    rampBoost: 16.0,            // Vertical launch velocity on jumps
    gravity: -36.0,             // Airborne gravity
  },

  // AI Drivers
  ai: {
    speeds: [43.0, 41.5, 39.5], // AI top speeds (Player is 48.0 for competitive challenge)
    skillVariance: 0.15,
    collisionAvoidance: 3.5,
    rocketAggressiveness: 0.65, // Chance of firing if player is in sight
    fireDistance: 45.0,
  },

  // Combat & Weapons
  weapon: {
    rocketSpeed: 75.0,
    rocketLifetime: 2.2,
    rocketRadius: 0.6,
    maxRockets: 8,
    cooldown: 0.8,              // Seconds between volleys
    explosionRadius: 4.0,
  },

  // Race Rules
  race: {
    totalLaps: 3,
    countdownSeconds: 3,
  },

  // Colors & Visuals
  colors: {
    player: 0x0ea5e9,           // Cyan/Electric Blue
    ai1: 0xef4444,              // Crimson Red
    ai2: 0xfacc15,              // Canary Yellow
    ai3: 0x22c55e,              // Viper Green
    asphalt: 0x1e2229,
    asphaltLine: 0xf8fafc,
    kerbRed: 0xdc2626,
    kerbWhite: 0xf1f5f9,
    barrierMetal: 0x94a3b8,
    grass: 0x14532d,
    groundDirt: 0x3f352b,
  },

  // Camera Settings
  camera: {
    drone: {
      height: 28.0,
      distance: 14.0,
      fov: 50,
      lookAhead: 8.0,
      lerpSpeed: 6.0,
    },
    chase: {
      height: 4.5,
      distance: 9.0,
      fov: 65,
      lookAhead: 12.0,
      lerpSpeed: 8.0,
    },
    bumper: {
      height: 1.2,
      distance: 0.2,
      fov: 80,
      lookAhead: 20.0,
      lerpSpeed: 18.0,
    }
  }
};
