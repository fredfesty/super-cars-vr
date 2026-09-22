export const CONFIG = {
  // Car Physics (Super Cars II arcade feel)
  car: {
    maxSpeed: 30.0,             // Controllable arcade speed (~110 km/h display)
    reverseSpeed: -10.0,        // Max reverse speed
    acceleration: 15.0,         // Smooth progressive acceleration (was 38.0)
    braking: 35.0,              // Responsive braking
    reverseAccel: 12.0,         // Reverse acceleration
    naturalDecel: 16.0,         // Engine braking for crisp corner entry
    turnSpeed: 2.8,             // Steering rate
    gripFactor: 0.94,           // High grip for stable track holding
    driftThreshold: 16.0,       // Speed above which tires start sliding
    collisionBounce: 0.35,      // Controlled rebound against walls
    carRadius: 1.3,             // Collision boundary radius
    carLength: 3.2,
    carWidth: 1.8,
    spinDuration: 1.5,          // Seconds car is spun out when hit by a missile
    rampBoost: 15.0,            // Vertical launch velocity on jumps
    gravity: -36.0,             // Airborne gravity
    stuckThreshold: 2.5,        // Seconds car is stuck before auto-recovering onto road
  },

  // Controls
  controls: {
    invertSteer: true,          // Inverted steering enabled by default
  },

  // AI Drivers
  ai: {
    speeds: [27.5, 26.0, 24.5], // AI speeds matched to player (Player is 30.0)
    skillVariance: 0.12,
    collisionAvoidance: 3.5,
    rocketAggressiveness: 0.5,  // Chance of firing if player is in sight
    fireDistance: 40.0,
  },

  // Combat & Weapons
  weapon: {
    startAmmo: 0,               // Cars start with 0 ammunition (must collect on road)
    pickupAmmo: 4,              // Rockets gained per pickup (2 twin volleys)
    maxAmmo: 8,                 // Max rocket storage capacity
    pickupRespawnTime: 10.0,    // Seconds before an ammo crate respawns
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
