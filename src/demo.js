/* Two built-in themed word lists used without a model provider. */
var DEMO_SETS = {
  space: { title: 'Lost in Space', words: [['ASTRONAUT', 'Person in a spacesuit'], ['ORBIT', 'Path around a planet'], ['NEBULA', 'Stellar nursery of gas and dust'], ['GALAXY', 'The Milky Way, for one'], ['ROCKET', 'Launch vehicle'], ['COMET', 'Icy visitor with a tail'], ['SATURN', 'Ringed planet'], ['APOLLO', 'Program that put humans on the Moon'], ['GRAVITY', 'It keeps your feet on the ground'], ['METEOR', 'Shooting star'], ['MARS', 'The Red Planet'], ['LUNAR', 'Of the Moon'], ['QUASAR', 'Extremely luminous galactic core'], ['ECLIPSE', 'When the Moon blocks the Sun'], ['TELESCOPE', 'Hubble, e.g.'], ['COSMOS', 'The universe as an ordered whole'], ['PULSAR', 'Spinning neutron star that blinks'], ['VENUS', 'Hottest planet in the solar system']] },
  ocean: { title: 'Sea What I Did There', words: [['CORAL', 'Reef builder'], ['WHALE', 'Largest animal ever'], ['TIDE', 'It comes in and goes out'], ['SQUID', 'Inky cephalopod'], ['KELP', 'Underwater forest plant'], ['DOLPHIN', 'Clicking, clever mammal'], ['ABYSS', 'Deep-sea zone'], ['SHARK', 'Fin-tastic predator?'], ['PLANKTON', 'Drifting tiny organisms'], ['LAGOON', 'Sheltered body of water'], ['URCHIN', 'Spiny sea dweller'], ['OCTOPUS', 'Eight-armed escape artist'], ['SEAHORSE', 'Fish whose males carry the young'], ['ANCHOR', 'It keeps a ship in place'], ['CURRENT', 'Gulf Stream, e.g.'], ['NARWHAL', 'Unicorn of the sea']] },
};
function demoWords(theme) {
  var set = /ocean|sea|marine|beach|fish/i.test(theme) ? DEMO_SETS.ocean : DEMO_SETS.space;
  return { title: set.title, words: set.words.map(function (w) { return { answer: w[0], clue: w[1] }; }) };
}
