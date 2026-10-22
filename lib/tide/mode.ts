// Plan C: Tide's network is overloaded, so by default the app runs against a SIMULATED TideCloak
// (sign-in, roles, policy signing and the network's encrypt/decrypt checks). Set
// NEXT_PUBLIC_TIDE_MODE=live to use the real TideCloak realm and Tide network again.
export const TIDE_SIMULATED = process.env.NEXT_PUBLIC_TIDE_MODE !== 'live'
